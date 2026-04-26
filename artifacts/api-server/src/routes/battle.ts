import { Router, type IRouter } from "express";
import { runRoast, type RoastResult } from "./roast";
import { comparativelyJudge } from "../lib/comparativeJudge";
import { db, activityHistoryTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/battle", async (req, res) => {
  const { coinA, coinB, userName } = req.body || {};
  if (!coinA?.tokenIdea || !coinB?.tokenIdea) {
    return res.status(400).json({ error: "coinA.tokenIdea and coinB.tokenIdea are required" });
  }

  const [a, b] = await Promise.all([runRoast(coinA), runRoast(coinB)]);
  const verdict = await comparativelyJudge(a, b);
  const winner = verdict.winner;
  const reason = verdict.reason;

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
