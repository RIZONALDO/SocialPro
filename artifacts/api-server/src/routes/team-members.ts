import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, teamMembersTable } from "@workspace/db";
import {
  CreateTeamMemberBody,
  DeleteTeamMemberParams,
  ListTeamMembersResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const PALETTE = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#0ea5e9",
];

router.get("/team-members", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(teamMembersTable)
    .orderBy(teamMembersTable.name);
  res.json(ListTeamMembersResponse.parse(rows));
});

router.post("/team-members", async (req, res): Promise<void> => {
  const parsed = CreateTeamMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const color = data.color ?? PALETTE[Math.floor(Math.random() * PALETTE.length)]!;
  const [row] = await db
    .insert(teamMembersTable)
    .values({ name: data.name, role: data.role, color })
    .returning();
  res.status(201).json(row);
});

router.delete("/team-members/:id", async (req, res): Promise<void> => {
  const params = DeleteTeamMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .delete(teamMembersTable)
    .where(eq(teamMembersTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Team member not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
