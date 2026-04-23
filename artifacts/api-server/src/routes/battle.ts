import { Router, type IRouter } from "express";
import { textGen } from "../lib/textGen";
import { runRoast, type RoastResult } from "./roast";
import { db, activityHistoryTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/battle", async (req, res) => {
  const { coinA, coinB, userName } = req.body || {};
  if (!coinA?.tokenIdea || !coinB?.tokenIdea) {
    return res.status(400).json({ error: "coinA.tokenIdea and coinB.tokenIdea are required" });
  }

  const [a, b] = await Promise.all([runRoast(coinA), runRoast(coinB)]);

  let winner: "A" | "B" = a.score >= b.score ? "A" : "B";
  let reason = `Higher Survive Score (${a.score} vs ${b.score})`;
  try {
    const prompt = `Two meme coin ideas just got roasted. Pick the WINNER and explain why in one punchy sentence (max 25 words).

COIN A: "${a.tokenIdea}" — Score ${a.score}/100, Verdict ${a.verdict}, Rug Prob ${a.rugProbability}%
COIN B: "${b.tokenIdea}" — Score ${b.score}/100, Verdict ${b.verdict}, Rug Prob ${b.rugProbability}%

Reply ONLY as JSON: {"winner":"A"|"B","reason":"..."}`;
    const raw = await textGen(prompt, { json: true });
    let txt = raw.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
    const m = txt.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : txt);
    if (parsed.winner === "A" || parsed.winner === "B") winner = parsed.winner;
    if (typeof parsed.reason === "string") reason = parsed.reason;
  } catch (e) {
    // fallback already set
  }

  const winnerRoast: RoastResult = winner === "A" ? a : b;
  const loserRoast: RoastResult = winner === "A" ? b : a;

  if (userName) {
    const coinName = `${a.tokenName || a.tokenIdea.slice(0, 20)} vs ${b.tokenName || b.tokenIdea.slice(0, 20)}`;
    db.insert(activityHistoryTable).values({
      userName,
      type: "battle",
      coinName,
      score: winnerRoast.score,
      verdict: winnerRoast.verdict,
      result: { a, b, winner, reason, winnerRoast, loserRoast } as any,
    }).catch(() => {});
  }

  res.json({ a, b, winner, reason, winnerRoast, loserRoast });
});

export default router;
