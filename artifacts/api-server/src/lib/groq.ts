import Groq from "groq-sdk";

function loadKeys(): string[] {
  const multi = process.env["GROQ_API_KEYS"];
  const single = process.env["GROQ_API_KEY"];
  const raw = (multi || single || "").trim();
  if (!raw) return [];
  return raw.split(",").map((k) => k.trim()).filter(Boolean);
}

const KEYS = loadKeys();
let cursor = 0;

export function hasGroq(): boolean {
  return KEYS.length > 0;
}

function nextKey(): { key: string; index: number } {
  const index = cursor % KEYS.length;
  cursor = (cursor + 1) % KEYS.length;
  return { key: KEYS[index]!, index };
}

function isRetryable(e: any): boolean {
  const msg = String(e?.message || e);
  const status = e?.status || e?.response?.status;
  return (
    status === 429 ||
    status === 503 ||
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("quota")
  );
}

const PRIMARY_MODEL = "llama-3.3-70b-versatile";
const FALLBACK_MODEL = "llama-3.1-8b-instant";

export async function groqText(
  prompt: string,
  opts: { json?: boolean; system?: string } = {},
): Promise<string> {
  if (KEYS.length === 0) throw new Error("GROQ_API_KEY not configured");
  let lastErr: any;
  const models = [PRIMARY_MODEL, FALLBACK_MODEL];
  for (let attempt = 0; attempt < KEYS.length; attempt++) {
    const { key, index } = nextKey();
    for (const model of models) {
      try {
        const client = new Groq({ apiKey: key });
        const res = await client.chat.completions.create({
          model,
          messages: [
            ...(opts.system ? [{ role: "system" as const, content: opts.system }] : []),
            { role: "user" as const, content: prompt },
          ],
          ...(opts.json ? { response_format: { type: "json_object" as const } } : {}),
          temperature: 1.0,
          top_p: 0.95,
        });
        const txt = res.choices?.[0]?.message?.content?.trim() || "";
        if (txt) return txt;
        throw new Error("Empty response");
      } catch (e: any) {
        lastErr = e;
        const msg = String(e?.message || e).slice(0, 200);
        console.warn(`[groq] key #${index} model ${model} failed: ${msg}`);
        if (!isRetryable(e)) break;
      }
    }
  }
  throw lastErr;
}
