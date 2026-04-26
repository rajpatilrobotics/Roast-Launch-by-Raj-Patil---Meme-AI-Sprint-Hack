import { Router, type IRouter } from "express";
import { db, usersTable, insertUserSchema } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../lib/password";

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

// Combined signup + login endpoint.
// - If user does not exist → create with password (signup).
// - If user exists → verify password (login). Returns 401 on mismatch.
router.post("/users", async (req, res) => {
  const parsed = insertUserSchema.safeParse({ name: String(req.body?.name || "").trim() });
  if (!parsed.success) return res.status(400).json({ error: "name required" });

  const password = String(req.body?.password || "");
  if (password.length < 4) {
    return res.status(400).json({ error: "Password must be at least 4 characters" });
  }
  if (password.length > 128) {
    return res.status(400).json({ error: "Password too long" });
  }

  const existing = await db
    .select({ id: usersTable.id, name: usersTable.name, passwordHash: usersTable.passwordHash })
    .from(usersTable)
    .where(eq(usersTable.name, parsed.data.name))
    .limit(1);

  if (existing.length > 0) {
    const user = existing[0];
    if (!user.passwordHash) {
      return res.status(409).json({
        error: "This account has no password set. Pick a different username.",
      });
    }
    if (!verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Wrong password" });
    }
    return res.status(200).json({ id: user.id, name: user.name, mode: "login" });
  }

  const passwordHash = hashPassword(password);
  const [user] = await db
    .insert(usersTable)
    .values({ name: parsed.data.name, passwordHash })
    .returning({ id: usersTable.id, name: usersTable.name });
  res.status(201).json({ ...user, mode: "signup" });
});

export default router;
