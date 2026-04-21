import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULTS = { appName: "Calendário de Vídeos", logoUrl: null as string | null };

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return row?.value ?? null;
}

async function setSetting(key: string, value: string | null): Promise<void> {
  if (value === null) {
    await db.delete(settingsTable).where(eq(settingsTable.key, key));
    return;
  }
  await db
    .insert(settingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value } });
}

router.get("/settings", async (_req, res): Promise<void> => {
  const appName = (await getSetting("appName")) ?? DEFAULTS.appName;
  const logoUrl = await getSetting("logoUrl");
  res.json({ appName, logoUrl });
});

router.put("/settings", async (req, res): Promise<void> => {
  const { appName, logoUrl } = req.body as { appName?: string; logoUrl?: string | null };
  if (appName !== undefined) await setSetting("appName", appName || DEFAULTS.appName);
  if (logoUrl !== undefined) await setSetting("logoUrl", logoUrl || null);
  const savedName = (await getSetting("appName")) ?? DEFAULTS.appName;
  const savedLogo = await getSetting("logoUrl");
  res.json({ appName: savedName, logoUrl: savedLogo });
});

export default router;
