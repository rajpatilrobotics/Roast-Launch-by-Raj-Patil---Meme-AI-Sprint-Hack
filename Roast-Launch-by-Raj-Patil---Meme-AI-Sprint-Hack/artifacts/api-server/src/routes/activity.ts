import { Router, type IRouter } from "express";
import { db, activityHistoryTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/activity", async (_req, res) => {
  const rows = await db
    .select({
      id: activityHistoryTable.id,
      userName: activityHistoryTable.userName,
      type: activityHistoryTable.type,
      coinName: activityHistoryTable.coinName,
      score: activityHistoryTable.score,
      verdict: activityHistoryTable.verdict,
      createdAt: activityHistoryTable.createdAt,
    })
    .from(activityHistoryTable)
    .orderBy(desc(activityHistoryTable.createdAt))
    .limit(100);

  res.json({ activity: rows });
});

export default router;
