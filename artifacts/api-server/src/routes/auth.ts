import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, teamMembersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/auth/me
router.get("/auth/me", async (req, res) => {
  const session = req.session as { userId?: number };
  if (!session.userId) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!user) {
    (req.session as Record<string, unknown>).userId = undefined;
    return res.status(401).json({ error: "Sessão inválida" });
  }
  let name: string | null = null;
  if (user.teamMemberId) {
    const [member] = await db.select().from(teamMembersTable).where(eq(teamMembersTable.id, user.teamMemberId));
    name = member?.name ?? null;
  }
  return res.json({ id: user.id, email: user.email, role: user.role, teamMemberId: user.teamMemberId, name });
});

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha são obrigatórios" });
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
  if (!user) {
    return res.status(401).json({ error: "Email ou senha inválidos" });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Email ou senha inválidos" });
  }
  (req.session as { userId?: number }).userId = user.id;
  let name: string | null = null;
  if (user.teamMemberId) {
    const [member] = await db.select().from(teamMembersTable).where(eq(teamMembersTable.id, user.teamMemberId));
    name = member?.name ?? null;
  }
  return res.json({ id: user.id, email: user.email, role: user.role, teamMemberId: user.teamMemberId, name });
});

// POST /api/auth/logout
router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {});
  res.json({ ok: true });
});

// POST /api/auth/setup — create first admin or any user (admin only after first user)
router.post("/auth/setup", async (req, res) => {
  const { email, password, role, teamMemberId } = req.body as {
    email?: string;
    password?: string;
    role?: string;
    teamMemberId?: number;
  };
  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha são obrigatórios" });
  }

  const existing = await db.select().from(usersTable).limit(1);
  const isFirst = existing.length === 0;

  if (!isFirst) {
    const session = req.session as { userId?: number };
    if (!session.userId) return res.status(401).json({ error: "Não autorizado" });
    const [caller] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
    if (!caller || caller.role !== "admin") {
      return res.status(403).json({ error: "Apenas administradores podem criar usuários" });
    }
  }

  const [exists] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
  if (exists) {
    return res.status(409).json({ error: "Email já cadastrado" });
  }

  const hash = await bcrypt.hash(password, 12);
  const [created] = await db
    .insert(usersTable)
    .values({
      email: email.toLowerCase().trim(),
      passwordHash: hash,
      role: isFirst ? "admin" : (role === "admin" ? "admin" : "member"),
      teamMemberId: teamMemberId ?? null,
    })
    .returning();

  return res.status(201).json({ id: created.id, email: created.email, role: created.role });
});

// GET /api/auth/has-users — check if any user exists (to show setup screen)
router.get("/auth/has-users", async (_req, res) => {
  const existing = await db.select().from(usersTable).limit(1);
  return res.json({ hasUsers: existing.length > 0 });
});

// GET /api/users — list all users (admin only)
router.get("/users", async (req, res) => {
  const session = req.session as { userId?: number };
  if (!session.userId) return res.status(401).json({ error: "Não autenticado" });
  const [caller] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!caller || caller.role !== "admin") return res.status(403).json({ error: "Sem permissão" });

  const users = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    role: usersTable.role,
    teamMemberId: usersTable.teamMemberId,
    createdAt: usersTable.createdAt,
  }).from(usersTable);

  const members = await db.select().from(teamMembersTable);
  const byId = new Map(members.map((m) => [m.id, m]));

  return res.json(users.map((u) => ({
    ...u,
    name: u.teamMemberId ? (byId.get(u.teamMemberId)?.name ?? null) : null,
  })));
});

// DELETE /api/users/:id — remove a user (admin only, cannot delete self)
router.delete("/users/:id", async (req, res) => {
  const session = req.session as { userId?: number };
  if (!session.userId) return res.status(401).json({ error: "Não autenticado" });
  const [caller] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!caller || caller.role !== "admin") return res.status(403).json({ error: "Sem permissão" });

  const targetId = Number(req.params.id);
  if (targetId === session.userId) return res.status(400).json({ error: "Não é possível remover sua própria conta" });

  await db.delete(usersTable).where(eq(usersTable.id, targetId));
  return res.json({ ok: true });
});

export default router;
