import { Router, type IRouter } from "express";
import { db, activityHistoryTable, coinVotesTable } from "@workspace/db";
import { gte, desc, sql, inArray } from "drizzle-orm";

const router: IRouter = Router();

let cache: { data: any; ts: number } | null = null;

router.get("/community/recap", async (_req, res) => {
  if (cache && Date.now() - cache.ts < 60 * 60 * 1000) return res.json(cache.data);

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const activity = await db.select({
    id: activityHistoryTable.id,
    userName: activityHistoryTable.userName,
    type: activityHistoryTable.type,
    coinName: activityHistoryTable.coinName,
    score: activityHistoryTable.score,
    verdict: activityHistoryTable.verdict,
  }).from(activityHistoryTable).where(gte(activityHistoryTable.createdAt, since));

  if (activity.length === 0) return res.json({ empty: true });

  const userCounts: Record<string, number> = {};
  for (const a of activity) userCounts[a.userName] = (userCounts[a.userName] || 0) + 1;
  const topUser = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0];

  const bestCoin = activity.filter((a) => a.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] ?? null;

  const ids = activity.map((a) => a.id);
  let mostLoved = null;
  if (ids.length > 0) {
    const votes = await db.select({ activityId: coinVotesTable.activityId, total: sql<number>`sum(value)::int` })
      .from(coinVotesTable).where(inArray(coinVotesTable.activityId, ids))
      .groupBy(coinVotesTable.activityId).orderBy(desc(sql`sum(value)`)).limit(1);
    if (votes[0]) {
      const loved = activity.find((a) => a.id === votes[0].activityId);
      if (loved) mostLoved = { ...loved, voteTotal: votes[0].total };
    }
  }

  const data = {
    totalActivity: activity.length,
    topUser: topUser ? { userName: topUser[0], count: topUser[1] } : null,
    bestCoin,
    mostLoved,
    weekStart: since.toISOString(),
    generatedAt: new Date().toISOString(),
    empty: false,
  };

  cache = { data, ts: Date.now() };
  res.json(data);
});

export default router;
