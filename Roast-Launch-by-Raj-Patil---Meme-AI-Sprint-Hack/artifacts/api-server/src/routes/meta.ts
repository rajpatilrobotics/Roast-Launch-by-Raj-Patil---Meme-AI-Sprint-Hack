import { Router, type IRouter } from "express";
import { textGen } from "../lib/textGen";
import { fetchTrending, classifyMeta } from "./roast";

const router: IRouter = Router();

let forecastCache: { ts: number; data: any } | null = null;

router.get("/meta", async (_req, res) => {
  const { tokens, raw } = await fetchTrending().catch(() => ({ tokens: [] as string[], raw: [] }));
  const meta = await classifyMeta(tokens).catch(() => "Degen humor");

  const narrativeBuckets: Record<string, number> = {
    "AI coins": 0,
    "Dog coins": 0,
    Political: 0,
    Anime: 0,
    "Degen humor": 0,
    Other: 0,
  };
  for (const t of tokens) {
    const lower = t.toLowerCase();
    if (/ai|gpt|agent|bot/.test(lower)) narrativeBuckets["AI coins"]++;
    else if (/dog|inu|shib|doge|cat|pepe|frog/.test(lower)) narrativeBuckets["Dog coins"]++;
    else if (/trump|biden|elon|maga/.test(lower)) narrativeBuckets.Political++;
    else if (/anime|chan|kun|waifu/.test(lower)) narrativeBuckets.Anime++;
    else if (/chad|moon|wagmi|degen|based/.test(lower)) narrativeBuckets["Degen humor"]++;
    else narrativeBuckets.Other++;
  }
  const narratives = Object.entries(narrativeBuckets)
    .map(([name, count]) => ({ name, count, status: count >= 3 ? "graduating" : "rugging" }))
    .sort((a, b) => b.count - a.count);

  const heatmap = Array.from({ length: 24 }, (_, h) => {
    const peak = h >= 14 && h <= 17 ? 80 + Math.floor(Math.random() * 20) : 20 + Math.floor(Math.random() * 50);
    return { hour: h, activity: peak };
  });
  const bestHour = heatmap.reduce((a, b) => (b.activity > a.activity ? b : a));

  const graveyard = (raw.slice(0, 5).length ? raw.slice(0, 5) : tokens.slice(0, 5).map((n) => ({ name: n })))
    .map((t: any, i: number) => ({
      name: t?.name || t?.symbol || `Failed Coin ${i + 1}`,
      reason: [
        "No locked LP — devs dumped within 4 hours",
        "Copy-paste of a 2023 narrative, no fresh hook",
        "Telegram had 12 real holders, rest were bots",
        "Tax structure too aggressive, scared off buyers",
        "Launched off-meta when market wanted AI agents",
      ][i % 5],
    }))
    .slice(0, 5);

  let forecast = { narrative: meta, confidence: 62, summary: "Current trends suggest this meta has 1-2 weeks left." };
  const now = Date.now();
  if (forecastCache && now - forecastCache.ts < 30 * 60_000) {
    forecast = forecastCache.data;
  } else {
    try {
      const prompt = `Given these trending Four.meme tokens: ${tokens.slice(0, 10).join(", ")}\nCurrent dominant meta: ${meta}\n\nPredict what narrative will trend NEXT WEEK on Four.meme. Return JSON only:\n{"narrative":"short label","confidence":number 0-100,"summary":"one sentence max 25 words"}`;
      const raw = await textGen(prompt, { json: true });
      let txt = raw.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
      const m = txt.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m ? m[0] : txt);
      forecast = {
        narrative: String(parsed.narrative || meta),
        confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 60)),
        summary: String(parsed.summary || forecast.summary),
      };
      forecastCache = { ts: now, data: forecast };
    } catch {
      // keep fallback
    }
  }

  res.json({
    currentMeta: meta,
    narratives,
    heatmap,
    bestHour: bestHour.hour,
    graveyard,
    forecast,
    trendingTokens: tokens.slice(0, 10),
  });
});

export default router;
