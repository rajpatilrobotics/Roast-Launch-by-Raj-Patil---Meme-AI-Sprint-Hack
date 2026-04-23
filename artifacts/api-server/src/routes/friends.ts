import { Router, type IRouter } from "express";
import { db, friendshipsTable, presenceTable, usersTable, dmMessagesTable, activityHistoryTable } from "@workspace/db";
import { and, eq, or, desc, ilike, ne, gte, sql, inArray } from "drizzle-orm";

const router: IRouter = Router();

function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function clean(name: unknown) {
  return String(name || "").trim();
}

router.post("/friends/request", async (req, res) => {
  const fromUser = clean(req.body?.fromUser);
  const toUser = clean(req.body?.toUser);
  if (!fromUser || !toUser) return res.status(400).json({ error: "fromUser and toUser required" });
  if (fromUser === toUser) return res.status(400).json({ error: "Cannot friend yourself" });

  const [a, b] = pair(fromUser, toUser);

  const existing = await db
    .select()
    .from(friendshipsTable)
    .where(and(eq(friendshipsTable.userA, a), eq(friendshipsTable.userB, b)))
    .limit(1);

  if (existing.length > 0) {
    const f = existing[0]!;
    if (f.status === "accepted") return res.json({ status: "accepted", friendship: f });
    if (f.status === "pending") {
      // If the other user previously requested, auto-accept!
      if (f.requestedBy !== fromUser) {
        const [updated] = await db
          .update(friendshipsTable)
          .set({ status: "accepted", acceptedAt: new Date() })
          .where(eq(friendshipsTable.id, f.id))
          .returning();
        return res.json({ status: "accepted", friendship: updated });
      }
      return res.json({ status: "pending", friendship: f });
    }
    if (f.status === "declined" || f.status === "removed") {
      const [updated] = await db
        .update(friendshipsTable)
        .set({ status: "pending", requestedBy: fromUser, createdAt: new Date(), acceptedAt: null })
        .where(eq(friendshipsTable.id, f.id))
        .returning();
      return res.json({ status: "pending", friendship: updated });
    }
  }

  const [created] = await db
    .insert(friendshipsTable)
    .values({ userA: a, userB: b, status: "pending", requestedBy: fromUser })
    .returning();
  res.json({ status: "pending", friendship: created });
});

router.post("/friends/accept", async (req, res) => {
  const userName = clean(req.body?.userName);
  const otherUser = clean(req.body?.otherUser);
  if (!userName || !otherUser) return res.status(400).json({ error: "userName and otherUser required" });
  const [a, b] = pair(userName, otherUser);

  const found = await db
    .select()
    .from(friendshipsTable)
    .where(and(eq(friendshipsTable.userA, a), eq(friendshipsTable.userB, b), eq(friendshipsTable.status, "pending")))
    .limit(1);
  if (found.length === 0) return res.status(404).json({ error: "no pending request" });
  const f = found[0]!;
  if (f.requestedBy === userName) return res.status(400).json({ error: "cannot accept your own request" });

  const [updated] = await db
    .update(friendshipsTable)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(eq(friendshipsTable.id, f.id))
    .returning();
  res.json({ status: "accepted", friendship: updated });
});

router.post("/friends/decline", async (req, res) => {
  const userName = clean(req.body?.userName);
  const otherUser = clean(req.body?.otherUser);
  if (!userName || !otherUser) return res.status(400).json({ error: "userName and otherUser required" });
  const [a, b] = pair(userName, otherUser);
  await db
    .update(friendshipsTable)
    .set({ status: "declined" })
    .where(and(eq(friendshipsTable.userA, a), eq(friendshipsTable.userB, b), eq(friendshipsTable.status, "pending")));
  res.json({ ok: true });
});

router.post("/friends/remove", async (req, res) => {
  const userName = clean(req.body?.userName);
  const otherUser = clean(req.body?.otherUser);
  if (!userName || !otherUser) return res.status(400).json({ error: "userName and otherUser required" });
  const [a, b] = pair(userName, otherUser);
  await db
    .update(friendshipsTable)
    .set({ status: "removed" })
    .where(and(eq(friendshipsTable.userA, a), eq(friendshipsTable.userB, b)));
  res.json({ ok: true });
});

router.get("/friends/status", async (req, res) => {
  const userName = clean(req.query.userName);
  const otherUser = clean(req.query.otherUser);
  if (!userName || !otherUser) return res.status(400).json({ error: "userName and otherUser required" });
  if (userName === otherUser) return res.json({ status: "self" });
  const [a, b] = pair(userName, otherUser);
  const found = await db
    .select()
    .from(friendshipsTable)
    .where(and(eq(friendshipsTable.userA, a), eq(friendshipsTable.userB, b)))
    .limit(1);
  if (found.length === 0) return res.json({ status: "none" });
  const f = found[0]!;
  if (f.status === "accepted") return res.json({ status: "friends" });
  if (f.status === "pending") {
    return res.json({ status: f.requestedBy === userName ? "outgoing" : "incoming" });
  }
  return res.json({ status: "none" });
});

router.get("/friends/list/:name", async (req, res) => {
  const name = clean(req.params.name);
  if (!name) return res.status(400).json({ error: "name required" });

  const rows = await db
    .select()
    .from(friendshipsTable)
    .where(and(
      or(eq(friendshipsTable.userA, name), eq(friendshipsTable.userB, name)),
      eq(friendshipsTable.status, "accepted"),
    ))
    .orderBy(desc(friendshipsTable.acceptedAt));

  const friendNames = rows.map((r) => (r.userA === name ? r.userB : r.userA));

  // Presence (online if seen in last 60s)
  const cutoff = new Date(Date.now() - 60_000);
  const presenceRows = friendNames.length
    ? await db
        .select({ userName: presenceTable.userName, lastSeen: presenceTable.lastSeen })
        .from(presenceTable)
        .where(gte(presenceTable.lastSeen, cutoff))
    : [];
  const onlineSet = new Set(presenceRows.map((p) => p.userName));

  const friends = rows.map((r) => {
    const other = r.userA === name ? r.userB : r.userA;
    return {
      userName: other,
      since: r.acceptedAt,
      online: onlineSet.has(other),
    };
  });

  res.json({ friends });
});

router.get("/friends/requests/:name", async (req, res) => {
  const name = clean(req.params.name);
  if (!name) return res.status(400).json({ error: "name required" });

  const rows = await db
    .select()
    .from(friendshipsTable)
    .where(and(
      or(eq(friendshipsTable.userA, name), eq(friendshipsTable.userB, name)),
      eq(friendshipsTable.status, "pending"),
    ))
    .orderBy(desc(friendshipsTable.createdAt));

  const incoming = rows
    .filter((r) => r.requestedBy !== name)
    .map((r) => ({ userName: r.requestedBy, sentAt: r.createdAt }));
  const outgoing = rows
    .filter((r) => r.requestedBy === name)
    .map((r) => ({ userName: r.userA === name ? r.userB : r.userA, sentAt: r.createdAt }));

  res.json({ incoming, outgoing });
});

router.get("/friends/search", async (req, res) => {
  const q = clean(req.query.q);
  const exclude = clean(req.query.exclude);
  const filter = clean(req.query.filter) || "all"; // all | online | new | active
  const limit = Math.min(Number(req.query.limit) || 100, 300);

  const conditions = [
    q ? ilike(usersTable.name, `%${q}%`) : undefined,
    exclude ? ne(usersTable.name, exclude) : undefined,
  ].filter(Boolean) as any[];

  const rows = await db
    .select({ name: usersTable.name, createdAt: usersTable.createdAt })
    .from(usersTable)
    .where(conditions.length ? and(...conditions) : (undefined as any))
    .limit(300);

  const names = rows.map((r) => r.name);
  if (names.length === 0) return res.json({ users: [] });

  // Online presence (last 60s)
  const cutoff = new Date(Date.now() - 60_000);
  const presenceRows = await db
    .select({ userName: presenceTable.userName })
    .from(presenceTable)
    .where(and(gte(presenceTable.lastSeen, cutoff), inArray(presenceTable.userName, names)));
  const onlineSet = new Set(presenceRows.map((p) => p.userName));

  // Activity counts (roasts + battles per user)
  const activityRows = await db
    .select({ userName: activityHistoryTable.userName, c: sql<number>`count(*)::int` })
    .from(activityHistoryTable)
    .where(inArray(activityHistoryTable.userName, names))
    .groupBy(activityHistoryTable.userName);
  const activityMap = new Map(activityRows.map((r) => [r.userName, r.c]));

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  let enriched = rows.map((r) => ({
    name: r.name,
    online: onlineSet.has(r.name),
    roastCount: activityMap.get(r.name) || 0,
    createdAt: r.createdAt as any as string,
    isNew: r.createdAt ? new Date(r.createdAt as any).getTime() > weekAgo : false,
  }));

  if (filter === "online") enriched = enriched.filter((u) => u.online);
  else if (filter === "new") enriched = enriched.filter((u) => u.isNew);
  else if (filter === "active") enriched = enriched.filter((u) => u.roastCount > 0);

  if (filter === "active") enriched.sort((a, b) => b.roastCount - a.roastCount);
  else if (filter === "online") enriched.sort((a, b) => b.roastCount - a.roastCount);
  else enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ users: enriched.slice(0, limit) });
});

// summary counts (unread DMs + incoming friend requests) for header badge
router.get("/friends/summary/:name", async (req, res) => {
  const name = clean(req.params.name);
  if (!name) return res.status(400).json({ error: "name required" });

  const [pendingRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(friendshipsTable)
    .where(and(
      or(eq(friendshipsTable.userA, name), eq(friendshipsTable.userB, name)),
      eq(friendshipsTable.status, "pending"),
      ne(friendshipsTable.requestedBy, name),
    ));

  const [unreadRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(dmMessagesTable)
    .where(and(
      ne(dmMessagesTable.fromUser, name),
      eq(dmMessagesTable.readByOther, 0),
      or(eq(dmMessagesTable.userA, name), eq(dmMessagesTable.userB, name)),
    ));

  res.json({
    pendingFriendRequests: pendingRow?.c ?? 0,
    unreadDMs: unreadRow?.c ?? 0,
  });
});

export default router;
