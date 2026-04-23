import { Router, type IRouter } from "express";
import { generateImageWithRotation, hasGemini } from "../lib/gemini";

const router: IRouter = Router();

const cache = new Map<string, { ts: number; mimeType: string; base64: string }>();
const TTL_MS = 30 * 60_000;

async function generateWithPollinations(
  prompt: string,
  seed: number,
): Promise<{ mimeType: string; base64: string }> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&nologo=true&seed=${seed}&model=flux`;
  const r = await fetch(url, { headers: { Accept: "image/*" } });
  if (!r.ok) {
    throw new Error(`Pollinations HTTP ${r.status}`);
  }
  const mimeType = r.headers.get("content-type") || "image/jpeg";
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 1000) {
    throw new Error("Pollinations returned empty image");
  }
  return { mimeType, base64: buf.toString("base64") };
}

router.post("/meme-image", async (req, res) => {
  const { tokenName, caption } = req.body || {};
  if (!caption || typeof caption !== "string") {
    return res.status(400).json({ error: "caption required" });
  }
  const name = (typeof tokenName === "string" && tokenName.trim()) || "Your Coin";
  const key = `${name}::${caption}`.toLowerCase();
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.ts < TTL_MS) {
    return res.json({ mimeType: hit.mimeType, base64: hit.base64, cached: true });
  }

  const prompt = `Square 1:1 crypto meme image for a BNB Chain meme token called "${name}". Caption: "${caption}". Style: bold cartoon meme art, vivid orange and green degen colors, rockets/charts/chads/pepes/doges as appropriate, big bold meme text reading "${caption}" with thick black outline so it stays readable, "${name}" as a small watermark badge in the corner. No real people, no real logos, no NSFW. Square, sharp, social-media ready.`;
  const seed = Math.floor(Math.abs(hash(key)) % 1_000_000);

  // Try Pollinations first (free, no quota), fall back to Gemini if it fails.
  try {
    const { mimeType, base64 } = await generateWithPollinations(prompt, seed);
    cache.set(key, { ts: now, mimeType, base64 });
    return res.json({ mimeType, base64, provider: "pollinations" });
  } catch (e: any) {
    console.warn("[meme-image] pollinations failed:", String(e?.message || e).slice(0, 200));
  }

  if (hasGemini()) {
    try {
      const { mimeType, base64 } = await generateImageWithRotation(prompt);
      cache.set(key, { ts: now, mimeType, base64 });
      return res.json({ mimeType, base64, provider: "gemini" });
    } catch (e: any) {
      const msg = String(e?.message || e).slice(0, 300);
      console.error("[meme-image] gemini fallback error:", msg);
      const status = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") ? 429 : 500;
      return res.status(status).json({ error: msg });
    }
  }

  return res.status(502).json({ error: "All image providers failed" });
});

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

export default router;
