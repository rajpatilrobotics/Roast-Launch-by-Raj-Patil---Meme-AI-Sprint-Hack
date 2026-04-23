import { Router, type IRouter } from "express";
import { db, dmMessagesTable, friendshipsTable, presenceTable } from "@workspace/db";
import { and, eq, or, desc, asc, sql, gte, ne } from "drizzle-orm";

const router: IRouter = Router();

function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}
const clean = (v: unknown) => String(v || "").trim();

// in-memory typing heartbeats: key = `${userA}:${userB}:${typer}` → expiresAtMs
const typingMap = new Map<string, number>();
const TYPING_TTL_MS = 4500;
function pruneTyping() {
  const now = Date.now();
  for (const [k, exp] of typingMap) if (exp < now) typingMap.delete(k);
}

async function areFriends(a: string, b: string) {
  const [x, y] = pair(a, b);
  const r = await db
    .select({ id: friendshipsTable.id })
    .from(friendshipsTable)
    .where(and(eq(friendshipsTable.userA, x), eq(friendshipsTable.userB, y), eq(friendshipsTable.status, "accepted")))
    .limit(1);
  return r.length > 0;
}

router.post("/dm/send", async (req, res) => {
  const fromUser = clean(req.body?.fromUser);
  const toUser = clean(req.body?.toUser);
  const body = clean(req.body?.body).slice(0, 1000);
  if (!fromUser || !toUser || !body) return res.status(400).json({ error: "fromUser, toUser, body required" });
  if (fromUser === toUser) return res.status(400).json({ error: "Cannot DM yourself" });

  const friends = await areFriends(fromUser, toUser);
  if (!friends) return res.status(403).json({ error: "You can only DM friends" });

  const [a, b] = pair(fromUser, toUser);
  const [msg] = await db
    .insert(dmMessagesTable)
    .values({ userA: a, userB: b, fromUser, body })
    .returning();
  res.json({ message: msg });
});

router.get("/dm/messages", async (req, res) => {
  const userName = clean(req.query.userName);
  const otherUser = clean(req.query.otherUser);
  if (!userName || !otherUser) return res.status(400).json({ error: "userName and otherUser required" });

  const [a, b] = pair(userName, otherUser);
  const rows = await db
    .select()
    .from(dmMessagesTable)
    .where(and(eq(dmMessagesTable.userA, a), eq(dmMessagesTable.userB, b)))
    .orderBy(asc(dmMessagesTable.createdAt))
    .limit(200);

  // mark as read
  await db
    .update(dmMessagesTable)
    .set({ readByOther: 1 })
    .where(and(
      eq(dmMessagesTable.userA, a),
      eq(dmMessagesTable.userB, b),
      ne(dmMessagesTable.fromUser, userName),
      eq(dmMessagesTable.readByOther, 0),
    ));

  res.json({ messages: rows });
});

router.get("/dm/conversations/:name", async (req, res) => {
  const name = clean(req.params.name);
  if (!name) return res.status(400).json({ error: "name required" });

  // friends list (accepted)
  const friendRows = await db
    .select()
    .from(friendshipsTable)
    .where(and(
      or(eq(friendshipsTable.userA, name), eq(friendshipsTable.userB, name)),
      eq(friendshipsTable.status, "accepted"),
    ));

  const friendNames = friendRows.map((r) => (r.userA === name ? r.userB : r.userA));
  if (friendNames.length === 0) return res.json({ conversations: [] });

  // For each friend get last message + unread count
  const cutoff = new Date(Date.now() - 60_000);
  const presenceRows = await db
    .select({ userName: presenceTable.userName, lastSeen: presenceTable.lastSeen })
    .from(presenceTable)
    .where(gte(presenceTable.lastSeen, cutoff));
  const onlineSet = new Set(presenceRows.map((p) => p.userName));

  const convos = await Promise.all(
    friendNames.map(async (other) => {
      const [a, b] = pair(name, other);
      const last = await db
        .select()
        .from(dmMessagesTable)
        .where(and(eq(dmMessagesTable.userA, a), eq(dmMessagesTable.userB, b)))
        .orderBy(desc(dmMessagesTable.createdAt))
        .limit(1);
      const [unreadRow] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(dmMessagesTable)
        .where(and(
          eq(dmMessagesTable.userA, a),
          eq(dmMessagesTable.userB, b),
          ne(dmMessagesTable.fromUser, name),
          eq(dmMessagesTable.readByOther, 0),
        ));
      return {
        otherUser: other,
        online: onlineSet.has(other),
        lastMessage: last[0]
          ? {
              fromUser: last[0].fromUser,
              body: last[0].body,
              createdAt: last[0].createdAt,
            }
          : null,
        unread: unreadRow?.c ?? 0,
      };
    }),
  );

  convos.sort((x, y) => {
    const xt = x.lastMessage ? new Date(x.lastMessage.createdAt as any).getTime() : 0;
    const yt = y.lastMessage ? new Date(y.lastMessage.createdAt as any).getTime() : 0;
    return yt - xt;
  });

  res.json({ conversations: convos });
});

router.post("/dm/typing", async (req, res) => {
  const fromUser = clean(req.body?.fromUser);
  const toUser = clean(req.body?.toUser);
  if (!fromUser || !toUser || fromUser === toUser) return res.json({ ok: true });
  const friends = await areFriends(fromUser, toUser);
  if (!friends) return res.status(403).json({ error: "not friends" });
  const [a, b] = pair(fromUser, toUser);
  typingMap.set(`${a}:${b}:${fromUser}`, Date.now() + TYPING_TTL_MS);
  res.json({ ok: true });
});

router.get("/dm/typing", (req, res) => {
  pruneTyping();
  const userName = clean(req.query.userName);
  const otherUser = clean(req.query.otherUser);
  if (!userName || !otherUser) return res.json({ typing: false });
  const [a, b] = pair(userName, otherUser);
  const exp = typingMap.get(`${a}:${b}:${otherUser}`) || 0;
  res.json({ typing: exp > Date.now() });
});

export default router;
