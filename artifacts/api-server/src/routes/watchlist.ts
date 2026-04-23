import { Router, type IRouter } from "express";
import { db, watchlistTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/watchlist", async (req, res) => {
  const userName = String(req.query.userName || "");
  if (!userName) return res.status(400).json({ error: "userName required" });
  const items = await db.select().from(watchlistTable).where(eq(watchlistTable.userName, userName));
  res.json({ items });
});

router.post("/watchlist", async (req, res) => {
  const { userName, coinIdea, coinName, ticker } = req.body || {};
  if (!userName || !coinIdea) return res.status(400).json({ error: "userName and coinIdea required" });
  const [item] = await db.insert(watchlistTable).values({ userName, coinIdea, coinName, ticker }).returning();
  res.status(201).json(item);
});

router.delete("/watchlist/:id", async (req, res) => {
  const id = Number(req.params.id);
  const userName = String(req.query.userName || "");
  await db.delete(watchlistTable).where(and(eq(watchlistTable.id, id), eq(watchlistTable.userName, userName)));
  res.json({ ok: true });
});

export default router;
