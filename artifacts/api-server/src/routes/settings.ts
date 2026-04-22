import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULTS = { appName: "ProSocial", logoUrl: null as string | null, calendarClientName: null as string | null };

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
  const calendarClientName = await getSetting("calendarClientName");
  res.json({ appName, logoUrl, calendarClientName });
});

router.put("/settings", async (req, res): Promise<void> => {
  const { appName, logoUrl, calendarClientName } = req.body as { appName?: string; logoUrl?: string | null; calendarClientName?: string | null };
  if (appName !== undefined) await setSetting("appName", appName || DEFAULTS.appName);
  if (logoUrl !== undefined) await setSetting("logoUrl", logoUrl || null);
  if (calendarClientName !== undefined) await setSetting("calendarClientName", calendarClientName || null);
  const savedName = (await getSetting("appName")) ?? DEFAULTS.appName;
  const savedLogo = await getSetting("logoUrl");
  const savedClientName = await getSetting("calendarClientName");
  res.json({ appName: savedName, logoUrl: savedLogo, calendarClientName: savedClientName });
});

export default router;
