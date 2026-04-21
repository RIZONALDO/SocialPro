import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, videosTable } from "@workspace/db";
import {
  ListVideosQueryParams,
  ListVideosResponse,
  CreateVideoBody,
  GetVideoParams,
  GetVideoResponse,
  UpdateVideoParams,
  UpdateVideoBody,
  UpdateVideoResponse,
  DeleteVideoParams,
} from "@workspace/api-zod";
import { fetchVideos, fetchVideoById } from "../lib/videos";

const router: IRouter = Router();

router.get("/videos", async (req, res): Promise<void> => {
  const q = ListVideosQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const videos = await fetchVideos({
    from: q.data.from ? String(q.data.from) : undefined,
    to: q.data.to ? String(q.data.to) : undefined,
  });
  res.json(ListVideosResponse.parse(videos));
});

router.post("/videos", async (req, res): Promise<void> => {
  const parsed = CreateVideoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [inserted] = await db
    .insert(videosTable)
    .values({
      title: d.title,
      deliveryDate: String(d.deliveryDate),
      status: d.status,
      client: d.client ?? null,
      platform: d.platform ?? null,
      durationSeconds: d.durationSeconds ?? null,
      notes: d.notes ?? null,
      editorId: d.editorId ?? null,
      captadorId: d.captadorId ?? null,
      roteiristaId: d.roteiristaId ?? null,
    })
    .returning();
  const full = await fetchVideoById(inserted!.id);
  res.status(201).json(GetVideoResponse.parse(full));
});

router.get("/videos/:id", async (req, res): Promise<void> => {
  const params = GetVideoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const v = await fetchVideoById(params.data.id);
  if (!v) {
    res.status(404).json({ error: "Video not found" });
    return;
  }
  res.json(GetVideoResponse.parse(v));
});

router.patch("/videos/:id", async (req, res): Promise<void> => {
  const params = UpdateVideoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateVideoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const update: Record<string, unknown> = {};
  if (d.title !== undefined) update.title = d.title;
  if (d.deliveryDate !== undefined) update.deliveryDate = String(d.deliveryDate);
  if (d.status !== undefined) update.status = d.status;
  if (d.client !== undefined) update.client = d.client;
  if (d.platform !== undefined) update.platform = d.platform;
  if (d.durationSeconds !== undefined) update.durationSeconds = d.durationSeconds;
  if (d.notes !== undefined) update.notes = d.notes;
  if (d.editorId !== undefined) update.editorId = d.editorId;
  if (d.captadorId !== undefined) update.captadorId = d.captadorId;
  if (d.roteiristaId !== undefined) update.roteiristaId = d.roteiristaId;

  const [updated] = await db
    .update(videosTable)
    .set(update)
    .where(eq(videosTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Video not found" });
    return;
  }
  const full = await fetchVideoById(updated.id);
  res.json(UpdateVideoResponse.parse(full));
});

router.delete("/videos/:id", async (req, res): Promise<void> => {
  const params = DeleteVideoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .delete(videosTable)
    .where(eq(videosTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Video not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
