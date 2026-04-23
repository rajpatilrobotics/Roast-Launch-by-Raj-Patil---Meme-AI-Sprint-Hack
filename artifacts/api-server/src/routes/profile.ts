import { Router, type IRouter } from "express";
import { db, activityHistoryTable, coinVotesTable } from "@workspace/db";
import { eq, desc, sql, inArray } from "drizzle-orm";

const router: IRouter = Router();

router.get("/community/user/:name", async (req, res) => {
  const name = req.params.name;

  const activity = await db.select({
    id: activityHistoryTable.id,
    userName: activityHistoryTable.userName,
    type: activityHistoryTable.type,
    coinName: activityHistoryTable.coinName,
    score: activityHistoryTable.score,
    verdict: activityHistoryTable.verdict,
    createdAt: activityHistoryTable.createdAt,
  }).from(activityHistoryTable)
    .where(eq(activityHistoryTable.userName, name))
    .orderBy(desc(activityHistoryTable.createdAt))
    .limit(30);

  const stats = await db.select({
    total: sql<number>`count(*)::int`,
    avgScore: sql<number>`round(avg(score))::int`,
    roastCount: sql<number>`count(case when type = 'roast' then 1 end)::int`,
    battleCount: sql<number>`count(case when type = 'battle' then 1 end)::int`,
  }).from(activityHistoryTable).where(eq(activityHistoryTable.userName, name));

  const activityIds = activity.map((a) => a.id);
  let totalVotesReceived = 0;
  if (activityIds.length > 0) {
    const voteResult = await db.select({ total: sql<number>`sum(value)::int` })
      .from(coinVotesTable)
      .where(inArray(coinVotesTable.activityId, activityIds));
    totalVotesReceived = voteResult[0]?.total ?? 0;
  }

  const topCoin = activity.filter((a) => a.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] ?? null;

  res.json({
    userName: name,
    stats: { ...stats[0], totalVotesReceived },
    activity,
    topCoin,
  });
});

export default router;
