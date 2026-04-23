import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

function loadKeys(): string[] {
  const multi = process.env["GEMINI_API_KEYS"];
  const single = process.env["GEMINI_API_KEY"];
  const raw = (multi || single || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

const KEYS = loadKeys();
let cursor = 0;

export function hasGemini(): boolean {
  return KEYS.length > 0;
}

function ensureKeys() {
  if (KEYS.length === 0) throw new Error("GEMINI_API_KEY (or GEMINI_API_KEYS) is required");
}

function nextKey(): { key: string; index: number } {
  const index = cursor % KEYS.length;
  cursor = (cursor + 1) % KEYS.length;
  return { key: KEYS[index]!, index };
}

export function keyCount(): number {
  return KEYS.length;
}

type ModelOpts = Parameters<GoogleGenerativeAI["getGenerativeModel"]>[0];

function buildModel(key: string, opts: ModelOpts): GenerativeModel {
  return new GoogleGenerativeAI(key).getGenerativeModel(opts);
}

function isRetryable(e: any): boolean {
  const msg = String(e?.message || e);
  return msg.includes("429") || msg.includes("403") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED");
}

export async function generateWithRotation(opts: ModelOpts, prompt: string): Promise<string> {
  ensureKeys();
  let lastErr: any;
  for (let attempt = 0; attempt < KEYS.length; attempt++) {
    const { key, index } = nextKey();
    try {
      const m = buildModel(key, opts);
      const res = await m.generateContent(prompt);
      return res.response.text().trim();
    } catch (e: any) {
      lastErr = e;
      const msg = String(e?.message || e).slice(0, 200);
      console.warn(`[gemini] key #${index} failed: ${msg}`);
      if (!isRetryable(e)) throw e;
    }
  }
  throw lastErr;
}

const IMAGE_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-2.5-flash-image-preview",
];

async function tryImageModel(
  key: string,
  model: string,
  prompt: string,
): Promise<{ mimeType: string; base64: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    const err: any = new Error(`HTTP ${r.status}: ${txt.slice(0, 200)}`);
    err.status = r.status;
    throw err;
  }
  const j: any = await r.json();
  const parts = j?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) {
    if (p?.inlineData?.data) {
      return {
        mimeType: p.inlineData.mimeType || "image/png",
        base64: p.inlineData.data as string,
      };
    }
  }
  throw new Error("No image returned");
}

export async function generateImageWithRotation(
  prompt: string,
): Promise<{ mimeType: string; base64: string }> {
  ensureKeys();
  let lastErr: any;
  for (let attempt = 0; attempt < KEYS.length; attempt++) {
    const { key, index } = nextKey();
    for (const model of IMAGE_MODELS) {
      try {
        return await tryImageModel(key, model, prompt);
      } catch (e: any) {
        lastErr = e;
        const msg = String(e?.message || e).slice(0, 200);
        console.warn(`[gemini-image] key #${index} model ${model} failed: ${msg}`);
        if (e?.status === 404) continue;
        if (!isRetryable(e)) break;
      }
    }
  }
  throw lastErr;
}
