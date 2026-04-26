import { Router, type IRouter } from "express";
import { db, battleRequestsTable, activityHistoryTable, chatMessagesTable } from "@workspace/db";
import { eq, or, and } from "drizzle-orm";
import { runRoast } from "./roast";
import { comparativelyJudge } from "../lib/comparativeJudge";

const router: IRouter = Router();

router.get("/battle-requests", async (req, res) => {
  const userName = String(req.query.userName || "");
  if (!userName) return res.status(400).json({ error: "userName required" });
  const rows = await db.select().from(battleRequestsTable)
    .where(or(eq(battleRequestsTable.fromUser, userName), eq(battleRequestsTable.toUser, userName)));
  res.json({ requests: rows });
});

router.post("/battle-requests", async (req, res) => {
  const { fromUser, toUser, fromCoin } = req.body || {};
  if (!fromUser || !toUser || !fromCoin?.tokenIdea) {
    return res.status(400).json({ error: "fromUser, toUser, fromCoin.tokenIdea required" });
  }
  const [req_] = await db.insert(battleRequestsTable).values({
    fromUser, toUser, status: "pending", fromCoin,
  }).returning();

  await db.insert(chatMessagesTable).values({
    userName: "🤖 RoastBot",
    message: `⚔️ @${toUser} — ${fromUser} has challenged you to a battle with "${fromCoin.tokenName || fromCoin.tokenIdea}". Check your profile to respond!`,
  }).catch(() => {});

  res.status(201).json(req_);
});

router.post("/battle-requests/:id/accept", async (req, res) => {
  const id = Number(req.params.id);
  const { toCoin, userName } = req.body || {};
  if (!toCoin?.tokenIdea) return res.status(400).json({ error: "toCoin.tokenIdea required" });

  const [request] = await db.select().from(battleRequestsTable).where(
    and(eq(battleRequestsTable.id, id), eq(battleRequestsTable.toUser, userName))
  );
  if (!request || request.status !== "pending") return res.status(404).json({ error: "Request not found or not pending" });

  const fromCoin = request.fromCoin as any;
  const [a, b] = await Promise.all([runRoast({ ...fromCoin }), runRoast({ ...toCoin })]);
  const verdict = await comparativelyJudge(a, b, {
    labelA: `COIN A (@${request.fromUser})`,
    labelB: `COIN B (@${userName})`,
  });
  const winner = verdict.winner;
  const result = { a, b, winner, reason: verdict.reason };

  await db.update(battleRequestsTable).set({ status: "accepted", toCoin, result }).where(eq(battleRequestsTable.id, id));

  const coinName = `${fromCoin.tokenName || fromCoin.tokenIdea} vs ${toCoin.tokenName || toCoin.tokenIdea}`;
  await Promise.all([
    db.insert(activityHistoryTable).values({ userName: request.fromUser, type: "battle", coinName, score: a.score, verdict: a.verdict, result: a as any }),
    db.insert(activityHistoryTable).values({ userName, type: "battle", coinName, score: b.score, verdict: b.verdict, result: b as any }),
    db.insert(chatMessagesTable).values({ userName: "🤖 RoastBot", message: `⚔️ Battle result: ${request.fromUser} vs ${userName} on "${coinName}" — Winner: ${winner === "A" ? request.fromUser : userName} 🏆` }),
  ]).catch(() => {});

  res.json({ result, winner });
});

router.post("/battle-requests/:id/decline", async (req, res) => {
  const id = Number(req.params.id);
  const { userName } = req.body || {};
  await db.update(battleRequestsTable).set({ status: "declined" })
    .where(and(eq(battleRequestsTable.id, id), eq(battleRequestsTable.toUser, userName)));
  res.json({ ok: true });
});

export default router;
