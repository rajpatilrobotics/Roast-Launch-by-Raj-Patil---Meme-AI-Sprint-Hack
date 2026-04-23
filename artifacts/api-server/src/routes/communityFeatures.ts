import { Router, type IRouter } from "express";
import {
  db,
  activityHistoryTable,
  coinVotesTable,
  dailyBattlesTable,
  dailyBattleVotesTable,
  dailyChallengeCompletionsTable,
} from "@workspace/db";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";

const router: IRouter = Router();

const CHALLENGES = [
  { narrative: "Anime", prompt: "Roast a coin in the Anime narrative today", emoji: "🌸", reward: "+50 XP" },
  { narrative: "AI coins", prompt: "Roast an AI agent coin that's destined to rug", emoji: "🤖", reward: "+50 XP" },
  { narrative: "Dog coins", prompt: "Roast a Doge variant that no one asked for", emoji: "🐕", reward: "+50 XP" },
  { narrative: "Degen humor", prompt: "Roast the most absurd degen coin you can think of", emoji: "🎰", reward: "+50 XP" },
  { narrative: "Real-world", prompt: "Roast a coin based on something annoying in your daily life", emoji: "☕", reward: "+50 XP" },
  { narrative: "Food", prompt: "Roast a food-themed coin that should never exist", emoji: "🍕", reward: "+50 XP" },
  { narrative: "Sci-fi", prompt: "Roast a sci-fi coin from the year 2099", emoji: "🛸", reward: "+50 XP" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function dayIndex(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  return Math.floor(d.getTime() / 86_400_000);
}

router.get("/community/daily-challenge", async (req, res) => {
  const userName = String(req.query.userName || "");
  const date = todayStr();
  const challenge = CHALLENGES[dayIndex(date) % CHALLENGES.length];

  let completed = false;
  let participants = 0;
  try {
    const all = await db
      .select({ id: dailyChallengeCompletionsTable.id, userName: dailyChallengeCompletionsTable.userName })
      .from(dailyChallengeCompletionsTable)
      .where(eq(dailyChallengeCompletionsTable.date, date));
    participants = new Set(all.map((c) => c.userName)).size;
    if (userName) {
      completed = all.some((c) => c.userName === userName);
    }
  } catch {}
  res.json({ date, ...challenge, completed, participants });
});

router.post("/community/daily-challenge/complete", async (req, res) => {
  const userName = String(req.body?.userName || "");
  const activityId = Number(req.body?.activityId || 0);
  if (!userName || !activityId) return res.status(400).json({ error: "userName and activityId required" });
  const date = todayStr();
  try {
    const existing = await db
      .select({ id: dailyChallengeCompletionsTable.id })
      .from(dailyChallengeCompletionsTable)
      .where(and(eq(dailyChallengeCompletionsTable.date, date), eq(dailyChallengeCompletionsTable.userName, userName)));
    if (existing.length === 0) {
      await db.insert(dailyChallengeCompletionsTable).values({ date, userName, activityId });
    }
    res.json({ ok: true, alreadyCompleted: existing.length > 0 });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "failed" });
  }
});

router.get("/community/roast-of-the-week", async (_req, res) => {
  const since = new Date(Date.now() - 7 * 86_400_000);
  try {
    const rows = await db
      .select({
        id: activityHistoryTable.id,
        userName: activityHistoryTable.userName,
        type: activityHistoryTable.type,
        coinName: activityHistoryTable.coinName,
        score: activityHistoryTable.score,
        verdict: activityHistoryTable.verdict,
        createdAt: activityHistoryTable.createdAt,
        votes: sql<number>`coalesce(sum(${coinVotesTable.value}), 0)`.as("votes"),
      })
      .from(activityHistoryTable)
      .leftJoin(coinVotesTable, eq(coinVotesTable.activityId, activityHistoryTable.id))
      .where(gte(activityHistoryTable.createdAt, since))
      .groupBy(activityHistoryTable.id)
      .orderBy(desc(sql`votes`), desc(activityHistoryTable.score))
      .limit(1);
    if (rows.length === 0) return res.json({ winner: null });
    const w = rows[0];
    res.json({ winner: { ...w, votes: Number(w.votes) || 0 } });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "failed" });
  }
});

router.get("/community/daily-battle", async (req, res) => {
  const userName = String(req.query.userName || "");
  const date = todayStr();
  try {
    let [battle] = await db.select().from(dailyBattlesTable).where(eq(dailyBattlesTable.date, date));

    if (!battle) {
      const since = new Date(Date.now() - 24 * 3600_000);
      const top = await db
        .select({
          id: activityHistoryTable.id,
          userName: activityHistoryTable.userName,
          coinName: activityHistoryTable.coinName,
          score: activityHistoryTable.score,
          votes: sql<number>`coalesce(sum(${coinVotesTable.value}), 0)`.as("votes"),
        })
        .from(activityHistoryTable)
        .leftJoin(coinVotesTable, eq(coinVotesTable.activityId, activityHistoryTable.id))
        .where(and(gte(activityHistoryTable.createdAt, since), eq(activityHistoryTable.type, "roast")))
        .groupBy(activityHistoryTable.id)
        .orderBy(desc(sql`votes`), desc(activityHistoryTable.score))
        .limit(2);
      if (top.length < 2) return res.json({ battle: null, message: "Need at least 2 roasts in the last 24h" });
      const [created] = await db
        .insert(dailyBattlesTable)
        .values({ date, coinAId: top[0].id, coinBId: top[1].id })
        .returning();
      battle = created;
    }

    const [coinA, coinB] = await Promise.all([
      db.select().from(activityHistoryTable).where(eq(activityHistoryTable.id, battle.coinAId)).then((r) => r[0]),
      db.select().from(activityHistoryTable).where(eq(activityHistoryTable.id, battle.coinBId)).then((r) => r[0]),
    ]);

    const votes = await db
      .select({ side: dailyBattleVotesTable.side, userName: dailyBattleVotesTable.userName })
      .from(dailyBattleVotesTable)
      .where(eq(dailyBattleVotesTable.battleId, battle.id));
    const votesA = votes.filter((v) => v.side === "A").length;
    const votesB = votes.filter((v) => v.side === "B").length;
    const myVote = userName ? votes.find((v) => v.userName === userName)?.side ?? null : null;

    res.json({
      battle: {
        id: battle.id,
        date: battle.date,
        coinA: coinA ? { id: coinA.id, userName: coinA.userName, coinName: coinA.coinName, score: coinA.score, verdict: coinA.verdict } : null,
        coinB: coinB ? { id: coinB.id, userName: coinB.userName, coinName: coinB.coinName, score: coinB.score, verdict: coinB.verdict } : null,
        votesA,
        votesB,
        myVote,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "failed" });
  }
});

router.post("/community/daily-battle/vote", async (req, res) => {
  const battleId = Number(req.body?.battleId);
  const userName = String(req.body?.userName || "");
  const side = String(req.body?.side || "");
  if (!battleId || !userName || (side !== "A" && side !== "B")) {
    return res.status(400).json({ error: "battleId, userName and side(A|B) required" });
  }
  try {
    const existing = await db
      .select({ id: dailyBattleVotesTable.id, side: dailyBattleVotesTable.side })
      .from(dailyBattleVotesTable)
      .where(and(eq(dailyBattleVotesTable.battleId, battleId), eq(dailyBattleVotesTable.userName, userName)));
    if (existing.length > 0) {
      await db
        .update(dailyBattleVotesTable)
        .set({ side })
        .where(eq(dailyBattleVotesTable.id, existing[0].id));
    } else {
      await db.insert(dailyBattleVotesTable).values({ battleId, userName, side });
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "failed" });
  }
});

export default router;
