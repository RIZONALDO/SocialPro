import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { db, usersTable, teamMembersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

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
  let photoUrl: string | null = null;
  if (user.teamMemberId) {
    const [member] = await db.select().from(teamMembersTable).where(eq(teamMembersTable.id, user.teamMemberId));
    name = member?.name ?? null;
    photoUrl = member?.photoUrl ?? null;
  }
  return res.json({ id: user.id, username: user.username, role: user.role, teamMemberId: user.teamMemberId, name, photoUrl });
});

// POST /api/auth/login
router.post("/auth/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username.toLowerCase().trim()));
  if (!user) {
    return res.status(401).json({ error: "Usuário ou senha inválidos" });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Usuário ou senha inválidos" });
  }
  (req.session as { userId?: number }).userId = user.id;
  let name: string | null = null;
  let photoUrl: string | null = null;
  if (user.teamMemberId) {
    const [member] = await db.select().from(teamMembersTable).where(eq(teamMembersTable.id, user.teamMemberId));
    name = member?.name ?? null;
    photoUrl = member?.photoUrl ?? null;
  }
  return res.json({ id: user.id, username: user.username, role: user.role, teamMemberId: user.teamMemberId, name, photoUrl });
});

// POST /api/auth/logout
router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {});
  res.json({ ok: true });
});

// POST /api/auth/change-password — logged-in user changes their own password
router.post("/auth/change-password", async (req, res) => {
  const session = req.session as { userId?: number };
  if (!session.userId) return res.status(401).json({ error: "Não autenticado" });

  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "A nova senha deve ter pelo menos 6 caracteres" });
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!user) return res.status(401).json({ error: "Sessão inválida" });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Senha atual incorreta" });

  const hash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.id, session.userId));
  return res.json({ ok: true });
});

// POST /api/auth/setup — create first admin or any user (admin only after first user)
router.post("/auth/setup", async (req, res) => {
  const { username, password, role, teamMemberId } = req.body as {
    username?: string;
    password?: string;
    role?: string;
    teamMemberId?: number;
  };
  if (!username || !password) {
    return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
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

  const [exists] = await db.select().from(usersTable).where(eq(usersTable.username, username.toLowerCase().trim()));
  if (exists) {
    return res.status(409).json({ error: "Nome de usuário já cadastrado" });
  }

  const hash = await bcrypt.hash(password, 12);
  const [created] = await db
    .insert(usersTable)
    .values({
      username: username.toLowerCase().trim(),
      passwordHash: hash,
      role: isFirst ? "admin" : (role === "admin" ? "admin" : role === "operator" ? "operator" : "member"),
      teamMemberId: teamMemberId ?? null,
    })
    .returning();

  return res.status(201).json({ id: created.id, username: created.username, role: created.role });
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
    username: usersTable.username,
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

// POST /api/users/:id/reset-password — admin resets another user's password
router.post("/users/:id/reset-password", async (req, res) => {
  const session = req.session as { userId?: number };
  if (!session.userId) return res.status(401).json({ error: "Não autenticado" });
  const [caller] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!caller || caller.role !== "admin") return res.status(403).json({ error: "Sem permissão" });

  const targetId = Number(req.params.id);
  const { newPassword } = req.body as { newPassword?: string };
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "A nova senha deve ter pelo menos 6 caracteres" });
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.id, targetId));
  return res.json({ ok: true });
});

// PUT /api/users/:id — update role and/or teamMemberId (admin only)
router.put("/users/:id", async (req, res) => {
  const session = req.session as { userId?: number };
  if (!session.userId) return res.status(401).json({ error: "Não autenticado" });
  const [caller] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!caller || caller.role !== "admin") return res.status(403).json({ error: "Sem permissão" });

  const targetId = Number(req.params.id);
  const { role, teamMemberId } = req.body as { role?: string; teamMemberId?: number | null };

  // Prevent removing admin role from self if we would be the last admin
  if (role && role !== "admin" && targetId === session.userId) {
    const admins = await db.select().from(usersTable).where(eq(usersTable.role, "admin"));
    if (admins.length <= 1) {
      return res.status(400).json({ error: "Não é possível remover o papel de administrador do único admin do sistema" });
    }
  }

  const updates: Record<string, unknown> = {};
  if (role !== undefined) {
    updates.role = role === "admin" ? "admin" : role === "operator" ? "operator" : "member";
  }
  if (teamMemberId !== undefined) {
    updates.teamMemberId = teamMemberId ?? null;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Nada para atualizar" });
  }

  await db.update(usersTable).set(updates).where(eq(usersTable.id, targetId));
  return res.json({ ok: true });
});

// DELETE /api/users/:id — remove a user (admin only, cannot delete self, cannot delete last admin)
router.delete("/users/:id", async (req, res) => {
  const session = req.session as { userId?: number };
  if (!session.userId) return res.status(401).json({ error: "Não autenticado" });
  const [caller] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!caller || caller.role !== "admin") return res.status(403).json({ error: "Sem permissão" });

  const targetId = Number(req.params.id);
  if (targetId === session.userId) return res.status(400).json({ error: "Não é possível remover sua própria conta" });

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, targetId));
  if (target?.role === "admin") {
    const admins = await db.select().from(usersTable).where(eq(usersTable.role, "admin"));
    if (admins.length <= 1) {
      return res.status(400).json({ error: "Não é possível remover o único administrador do sistema" });
    }
  }

  await db.delete(usersTable).where(eq(usersTable.id, targetId));
  return res.json({ ok: true });
});

export default router;
