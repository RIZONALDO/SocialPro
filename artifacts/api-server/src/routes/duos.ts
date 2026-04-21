import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, duosTable } from "@workspace/db";
import {
  ListDuosResponse,
  CreateDuoBody,
  UpdateDuoParams,
  UpdateDuoBody,
  UpdateDuoResponse,
  DeleteDuoParams,
} from "@workspace/api-zod";
import { fetchDuos, fetchDuoById } from "../lib/duos";

const router: IRouter = Router();

router.get("/duos", async (_req, res): Promise<void> => {
  const duos = await fetchDuos();
  res.json(ListDuosResponse.parse(duos));
});

router.post("/duos", async (req, res): Promise<void> => {
  const parsed = CreateDuoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [inserted] = await db
    .insert(duosTable)
    .values({
      name: d.name,
      captadorId: d.captadorId ?? null,
      editorId: d.editorId ?? null,
      dailyGoal: d.dailyGoal ?? 4,
    })
    .returning();
  const full = await fetchDuoById(inserted!.id);
  res.status(201).json(full);
});

router.patch("/duos/:id", async (req, res): Promise<void> => {
  const params = UpdateDuoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateDuoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const update: Record<string, unknown> = {};
  if (d.name !== undefined) update.name = d.name;
  if (d.captadorId !== undefined) update.captadorId = d.captadorId;
  if (d.editorId !== undefined) update.editorId = d.editorId;
  if (d.dailyGoal !== undefined) update.dailyGoal = d.dailyGoal;
  const [updated] = await db
    .update(duosTable)
    .set(update)
    .where(eq(duosTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Duo not found" });
    return;
  }
  const full = await fetchDuoById(updated.id);
  res.json(UpdateDuoResponse.parse(full));
});

router.delete("/duos/:id", async (req, res): Promise<void> => {
  const params = DeleteDuoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .delete(duosTable)
    .where(eq(duosTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Duo not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
