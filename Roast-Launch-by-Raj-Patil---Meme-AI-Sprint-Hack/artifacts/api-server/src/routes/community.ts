import { Router, type IRouter } from "express";
import { db, reactionsTable, commentsTable, coinVotesTable, activityHistoryTable, chatMessagesTable } from "@workspace/db";
import { eq, and, inArray, sql, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/community/summary", async (req, res) => {
  const idsParam = String(req.query.ids || "");
  const userName = String(req.query.userName || "");
  const ids = idsParam.split(",").map(Number).filter(Boolean);
  if (ids.length === 0) return res.json({ summary: {} });

  const [allReactions, myReactions, allVotes, myVotes, allComments] = await Promise.all([
    db.select({ activityId: reactionsTable.activityId, emoji: reactionsTable.emoji })
      .from(reactionsTable).where(inArray(reactionsTable.activityId, ids)),
    userName
      ? db.select({ activityId: reactionsTable.activityId, emoji: reactionsTable.emoji })
          .from(reactionsTable)
          .where(and(inArray(reactionsTable.activityId, ids), eq(reactionsTable.userName, userName)))
      : Promise.resolve([]),
    db.select({ activityId: coinVotesTable.activityId, value: coinVotesTable.value })
      .from(coinVotesTable).where(inArray(coinVotesTable.activityId, ids)),
    userName
      ? db.select({ activityId: coinVotesTable.activityId, value: coinVotesTable.value })
          .from(coinVotesTable)
          .where(and(inArray(coinVotesTable.activityId, ids), eq(coinVotesTable.userName, userName)))
      : Promise.resolve([]),
    db.select({ activityId: commentsTable.activityId })
      .from(commentsTable).where(inArray(commentsTable.activityId, ids)),
  ]);

  const summary: Record<number, any> = {};
  for (const id of ids) {
    const reactionCounts: Record<string, number> = {};
    allReactions.filter((r) => r.activityId === id).forEach((r) => {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
    });
    const myReactionEmojis = myReactions.filter((r) => r.activityId === id).map((r) => r.emoji);
    const voteTotal = allVotes.filter((v) => v.activityId === id).reduce((s, v) => s + v.value, 0);
    const myVote = (myVotes as any[]).find((v: any) => v.activityId === id)?.value ?? 0;
    const commentCount = allComments.filter((c) => c.activityId === id).length;
    summary[id] = { reactions: reactionCounts, myReactions: myReactionEmojis, voteTotal, myVote, commentCount };
  }
  res.json({ summary });
});

router.post("/community/reactions", async (req, res) => {
  const { activityId, userName, emoji } = req.body || {};
  if (!activityId || !userName || !emoji) return res.status(400).json({ error: "activityId, userName, emoji required" });

  const existing = await db.select({ id: reactionsTable.id })
    .from(reactionsTable)
    .where(and(eq(reactionsTable.activityId, activityId), eq(reactionsTable.userName, userName), eq(reactionsTable.emoji, emoji)));

  if (existing.length > 0) {
    await db.delete(reactionsTable).where(eq(reactionsTable.id, existing[0].id));
    return res.json({ added: false });
  } else {
    await db.insert(reactionsTable).values({ activityId, userName, emoji });
    return res.json({ added: true });
  }
});

router.get("/community/comments/:activityId", async (req, res) => {
  const activityId = Number(req.params.activityId);
  const comments = await db.select()
    .from(commentsTable)
    .where(eq(commentsTable.activityId, activityId))
    .orderBy(commentsTable.createdAt);
  res.json({ comments });
});

router.post("/community/comments", async (req, res) => {
  const { activityId, userName, text } = req.body || {};
  if (!activityId || !userName || !text) return res.status(400).json({ error: "activityId, userName, text required" });
  if (String(text).trim().length > 280) return res.status(400).json({ error: "Too long" });

  const [comment] = await db.insert(commentsTable).values({
    activityId,
    userName,
    text: String(text).trim(),
  }).returning();
  res.status(201).json(comment);
});

router.post("/community/votes", async (req, res) => {
  const { activityId, userName, value } = req.body || {};
  if (!activityId || !userName || ![-1, 0, 1].includes(Number(value))) {
    return res.status(400).json({ error: "activityId, userName, value (-1/0/1) required" });
  }
  const numValue = Number(value);
  const existing = await db.select({ id: coinVotesTable.id, value: coinVotesTable.value })
    .from(coinVotesTable)
    .where(and(eq(coinVotesTable.activityId, activityId), eq(coinVotesTable.userName, userName)));

  if (existing.length > 0) {
    if (numValue === 0 || existing[0].value === numValue) {
      await db.delete(coinVotesTable).where(eq(coinVotesTable.id, existing[0].id));
    } else {
      await db.update(coinVotesTable).set({ value: numValue }).where(eq(coinVotesTable.id, existing[0].id));
    }
  } else if (numValue !== 0) {
    await db.insert(coinVotesTable).values({ activityId, userName, value: numValue });
  }
  res.json({ ok: true });
});

router.get("/community/leaderboard", async (_req, res) => {
  const rows = await db
    .select({
      userName: activityHistoryTable.userName,
      total: sql<number>`count(*)::int`,
      avgScore: sql<number>`round(avg(score))::int`,
      roastCount: sql<number>`count(case when type = 'roast' then 1 end)::int`,
      battleCount: sql<number>`count(case when type = 'battle' then 1 end)::int`,
    })
    .from(activityHistoryTable)
    .groupBy(activityHistoryTable.userName)
    .orderBy(desc(sql`count(*)`))
    .limit(10);
  res.json({ leaderboard: rows });
});

router.post("/community/challenges", async (req, res) => {
  const { fromUser, toUser, coinName, score } = req.body || {};
  if (!fromUser || !toUser) return res.status(400).json({ error: "fromUser and toUser required" });
  const message = `⚔️ @${toUser} — ${fromUser} challenges you to beat their score on "${coinName}" (${score ?? "??"}/100). Think you can do better?`;
  await db.insert(chatMessagesTable).values({ userName: "🤖 RoastBot", message });
  res.json({ ok: true });
});

export default router;
