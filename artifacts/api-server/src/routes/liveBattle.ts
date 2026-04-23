import { Router, type IRouter } from "express";
import {
  db,
  presenceTable,
  liveBattleRoomsTable,
  activityHistoryTable,
} from "@workspace/db";
import { and, desc, eq, gte, ne, or, sql } from "drizzle-orm";
import { textGen } from "../lib/textGen";
import { runRoast, type RoastResult } from "./roast";

const router: IRouter = Router();

const ONLINE_WINDOW_MS = 30_000;
const ROOM_PENDING_TTL_MS = 45_000;
const ROOM_SUBMIT_TTL_MS = 90_000;

router.post("/presence/ping", async (req, res) => {
  const userName = String(req.body?.userName || "").trim();
  if (!userName) return res.status(400).json({ error: "userName required" });
  try {
    await db
      .insert(presenceTable)
      .values({ userName, lastSeen: new Date() })
      .onConflictDoUpdate({ target: presenceTable.userName, set: { lastSeen: new Date() } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "ping failed" });
  }
});

router.get("/presence/online", async (req, res) => {
  const exclude = String(req.query.exclude || "");
  const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS);
  try {
    const rows = await db
      .select({ userName: presenceTable.userName, lastSeen: presenceTable.lastSeen })
      .from(presenceTable)
      .where(and(gte(presenceTable.lastSeen, cutoff), exclude ? ne(presenceTable.userName, exclude) : undefined as any))
      .orderBy(desc(presenceTable.lastSeen))
      .limit(50);
    res.json({ users: rows });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "online fetch failed" });
  }
});

router.post("/live-battle/invite", async (req, res) => {
  const hostUser = String(req.body?.hostUser || "").trim();
  const opponentUser = String(req.body?.opponentUser || "").trim();
  if (!hostUser || !opponentUser) return res.status(400).json({ error: "hostUser and opponentUser required" });
  if (hostUser === opponentUser) return res.status(400).json({ error: "cannot invite yourself" });
  try {
    // cancel any stale pending invites between these two
    const cutoff = new Date(Date.now() - ROOM_PENDING_TTL_MS);
    await db
      .update(liveBattleRoomsTable)
      .set({ status: "expired" })
      .where(and(eq(liveBattleRoomsTable.status, "pending"), sql`${liveBattleRoomsTable.createdAt} < ${cutoff}`));

    const [room] = await db
      .insert(liveBattleRoomsTable)
      .values({ hostUser, opponentUser, status: "pending" })
      .returning();
    res.json({ room });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "invite failed" });
  }
});

router.get("/live-battle/inbox", async (req, res) => {
  const userName = String(req.query.userName || "").trim();
  if (!userName) return res.status(400).json({ error: "userName required" });
  try {
    const cutoff = new Date(Date.now() - ROOM_PENDING_TTL_MS);
    const rows = await db
      .select()
      .from(liveBattleRoomsTable)
      .where(and(
        eq(liveBattleRoomsTable.opponentUser, userName),
        eq(liveBattleRoomsTable.status, "pending"),
        gte(liveBattleRoomsTable.createdAt, cutoff),
      ))
      .orderBy(desc(liveBattleRoomsTable.createdAt))
      .limit(5);
    res.json({ invites: rows });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "inbox failed" });
  }
});

router.get("/live-battle/active", async (req, res) => {
  const userName = String(req.query.userName || "").trim();
  if (!userName) return res.status(400).json({ error: "userName required" });
  try {
    const cutoff = new Date(Date.now() - ROOM_SUBMIT_TTL_MS - 60_000);
    const rows = await db
      .select()
      .from(liveBattleRoomsTable)
      .where(and(
        or(eq(liveBattleRoomsTable.hostUser, userName), eq(liveBattleRoomsTable.opponentUser, userName)),
        or(eq(liveBattleRoomsTable.status, "active"), eq(liveBattleRoomsTable.status, "judging")),
        gte(liveBattleRoomsTable.createdAt, cutoff),
      ))
      .orderBy(desc(liveBattleRoomsTable.createdAt))
      .limit(1);
    res.json({ room: rows[0] || null });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "active fetch failed" });
  }
});

router.post("/live-battle/respond", async (req, res) => {
  const roomId = Number(req.body?.roomId);
  const userName = String(req.body?.userName || "").trim();
  const accept = !!req.body?.accept;
  if (!roomId || !userName) return res.status(400).json({ error: "roomId and userName required" });
  try {
    const [room] = await db.select().from(liveBattleRoomsTable).where(eq(liveBattleRoomsTable.id, roomId));
    if (!room) return res.status(404).json({ error: "room not found" });
    if (room.opponentUser !== userName) return res.status(403).json({ error: "not your invite" });
    if (room.status !== "pending") return res.status(400).json({ error: `room is ${room.status}` });
    const newStatus = accept ? "active" : "declined";
    const [updated] = await db
      .update(liveBattleRoomsTable)
      .set({ status: newStatus, startedAt: accept ? new Date() : null })
      .where(eq(liveBattleRoomsTable.id, roomId))
      .returning();
    res.json({ room: updated });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "respond failed" });
  }
});

router.get("/live-battle/room/:id", async (req, res) => {
  const roomId = Number(req.params.id);
  if (!roomId) return res.status(400).json({ error: "invalid id" });
  try {
    const [room] = await db.select().from(liveBattleRoomsTable).where(eq(liveBattleRoomsTable.id, roomId));
    if (!room) return res.status(404).json({ error: "room not found" });
    res.json({ room });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "fetch failed" });
  }
});

router.get("/live-battle/history", async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  try {
    const rows = await db
      .select()
      .from(liveBattleRoomsTable)
      .where(eq(liveBattleRoomsTable.status, "done"))
      .orderBy(desc(liveBattleRoomsTable.createdAt))
      .limit(limit);
    res.json({ battles: rows });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "history fetch failed" });
  }
});

router.get("/live-battle/leaderboard", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(liveBattleRoomsTable)
      .where(eq(liveBattleRoomsTable.status, "done"))
      .orderBy(desc(liveBattleRoomsTable.createdAt))
      .limit(500);
    const stats = new Map<
      string,
      { userName: string; wins: number; losses: number; battles: number; bestScore: number; lastBattle: string | null }
    >();
    for (const r of rows) {
      const result: any = r.result || {};
      const winner = result.winnerUser as string | undefined;
      const loser = result.loserUser as string | undefined;
      const winnerScore = Number(result?.winnerRoast?.score || 0);
      const loserScore = Number(result?.loserRoast?.score || 0);
      const ts = r.createdAt ? new Date(r.createdAt as any).toISOString() : null;
      if (winner) {
        const s = stats.get(winner) || { userName: winner, wins: 0, losses: 0, battles: 0, bestScore: 0, lastBattle: null };
        s.wins += 1;
        s.battles += 1;
        if (winnerScore > s.bestScore) s.bestScore = winnerScore;
        if (!s.lastBattle || (ts && ts > s.lastBattle)) s.lastBattle = ts;
        stats.set(winner, s);
      }
      if (loser) {
        const s = stats.get(loser) || { userName: loser, wins: 0, losses: 0, battles: 0, bestScore: 0, lastBattle: null };
        s.losses += 1;
        s.battles += 1;
        if (loserScore > s.bestScore) s.bestScore = loserScore;
        if (!s.lastBattle || (ts && ts > s.lastBattle)) s.lastBattle = ts;
        stats.set(loser, s);
      }
    }
    const leaderboard = [...stats.values()]
      .map((s) => ({ ...s, winRate: s.battles ? Math.round((s.wins / s.battles) * 100) : 0 }))
      .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || b.bestScore - a.bestScore)
      .slice(0, 20);
    res.json({ leaderboard, totalBattles: rows.length });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "leaderboard fetch failed" });
  }
});

router.post("/live-battle/submit", async (req, res) => {
  const roomId = Number(req.body?.roomId);
  const userName = String(req.body?.userName || "").trim();
  const coin = req.body?.coin;
  if (!roomId || !userName || !coin?.tokenIdea) {
    return res.status(400).json({ error: "roomId, userName, coin.tokenIdea required" });
  }
  try {
    const [room] = await db.select().from(liveBattleRoomsTable).where(eq(liveBattleRoomsTable.id, roomId));
    if (!room) return res.status(404).json({ error: "room not found" });
    if (room.status !== "active") return res.status(400).json({ error: `room is ${room.status}` });
    const isHost = room.hostUser === userName;
    const isOpp = room.opponentUser === userName;
    if (!isHost && !isOpp) return res.status(403).json({ error: "not in this room" });

    const updates: any = {};
    if (isHost) {
      if (room.hostCoin) return res.json({ room });
      updates.hostCoin = coin;
    } else {
      if (room.opponentCoin) return res.json({ room });
      updates.opponentCoin = coin;
    }

    const [updated] = await db
      .update(liveBattleRoomsTable)
      .set(updates)
      .where(eq(liveBattleRoomsTable.id, roomId))
      .returning();

    // both submitted? trigger judging async
    if (updated.hostCoin && updated.opponentCoin && updated.status === "active") {
      await db.update(liveBattleRoomsTable).set({ status: "judging" }).where(eq(liveBattleRoomsTable.id, roomId));
      void judgeRoom(roomId);
    }
    res.json({ room: updated });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "submit failed" });
  }
});

async function judgeRoom(roomId: number) {
  try {
    const [room] = await db.select().from(liveBattleRoomsTable).where(eq(liveBattleRoomsTable.id, roomId));
    if (!room || !room.hostCoin || !room.opponentCoin) return;
    const coinA: any = room.hostCoin;
    const coinB: any = room.opponentCoin;
    const [a, b] = await Promise.all([
      runRoast({ tokenIdea: coinA.tokenIdea, tokenName: coinA.tokenName, ticker: coinA.ticker, userName: room.hostUser }),
      runRoast({ tokenIdea: coinB.tokenIdea, tokenName: coinB.tokenName, ticker: coinB.ticker, userName: room.opponentUser }),
    ]);

    let winner: "A" | "B" = a.score >= b.score ? "A" : "B";
    let reason = `Higher Survive Score (${a.score} vs ${b.score})`;
    try {
      const prompt = `Two meme coin ideas just got roasted in a LIVE battle. Pick the WINNER and explain in one punchy sentence (max 25 words).

COIN A (@${room.hostUser}): "${a.tokenIdea}" — Score ${a.score}/100, Verdict ${a.verdict}, Rug ${a.rugProbability}%
COIN B (@${room.opponentUser}): "${b.tokenIdea}" — Score ${b.score}/100, Verdict ${b.verdict}, Rug ${b.rugProbability}%

Reply ONLY as JSON: {"winner":"A"|"B","reason":"..."}`;
      const raw = await textGen(prompt, { json: true });
      const txt = raw.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
      const m = txt.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m ? m[0] : txt);
      if (parsed.winner === "A" || parsed.winner === "B") winner = parsed.winner;
      if (typeof parsed.reason === "string") reason = parsed.reason;
    } catch {}

    const winnerUser = winner === "A" ? room.hostUser : room.opponentUser;
    const loserUser = winner === "A" ? room.opponentUser : room.hostUser;
    const winnerRoast: RoastResult = winner === "A" ? a : b;
    const loserRoast: RoastResult = winner === "A" ? b : a;

    const result = { a, b, winner, reason, winnerUser, loserUser, winnerRoast, loserRoast };

    await db
      .update(liveBattleRoomsTable)
      .set({ status: "done", result: result as any })
      .where(eq(liveBattleRoomsTable.id, roomId));

    const coinName = `🔴 LIVE: @${room.hostUser} vs @${room.opponentUser}`;
    await db.insert(activityHistoryTable).values({
      userName: winnerUser,
      type: "battle",
      coinName,
      score: winnerRoast.score,
      verdict: winnerRoast.verdict,
      result: result as any,
    }).catch(() => {});
  } catch (e) {
    console.error("[live-battle] judge failed", e);
    await db
      .update(liveBattleRoomsTable)
      .set({ status: "error", result: { error: String((e as any)?.message || e) } as any })
      .where(eq(liveBattleRoomsTable.id, roomId))
      .catch(() => {});
  }
}

export default router;
