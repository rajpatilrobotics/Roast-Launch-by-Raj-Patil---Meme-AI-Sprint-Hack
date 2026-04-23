import { Router, type IRouter } from "express";
import { db, usersTable, insertUserSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/users/check", async (req, res) => {
  const name = String(req.query.name || "").trim();
  if (!name) return res.status(400).json({ error: "name required" });

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.name, name))
    .limit(1);

  res.json({ taken: existing.length > 0 });
});

router.post("/users", async (req, res) => {
  const parsed = insertUserSchema.safeParse({ name: String(req.body?.name || "").trim() });
  if (!parsed.success) return res.status(400).json({ error: "name required" });

  const existing = await db
    .select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.name, parsed.data.name))
    .limit(1);

  if (existing.length > 0) {
    return res.status(409).json({ error: "Name already taken" });
  }

  const [user] = await db.insert(usersTable).values(parsed.data).returning();
  res.status(201).json(user);
});

export default router;
