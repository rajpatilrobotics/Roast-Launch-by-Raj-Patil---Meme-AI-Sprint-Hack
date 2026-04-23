import { Router, type IRouter } from "express";
import { db, chatMessagesTable } from "@workspace/db";
import { desc, gt } from "drizzle-orm";

const router: IRouter = Router();

router.get("/chat", async (req, res) => {
  const messages = await db.select()
    .from(chatMessagesTable)
    .orderBy(desc(chatMessagesTable.createdAt))
    .limit(50);
  res.json({ messages: messages.reverse() });
});

router.post("/chat", async (req, res) => {
  const { userName, message } = req.body || {};
  if (!userName || !message) return res.status(400).json({ error: "userName and message required" });
  if (String(message).trim().length > 200) return res.status(400).json({ error: "Message too long" });
  const [msg] = await db.insert(chatMessagesTable).values({
    userName,
    message: String(message).trim(),
  }).returning();
  res.status(201).json(msg);
});

export default router;
