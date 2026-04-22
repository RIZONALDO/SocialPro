import app from "./app";
import { logger } from "./lib/logger";
import { db, usersTable, settingsTable } from "@workspace/db";
import { like, eq, and } from "drizzle-orm";

/** Emergency reset: if ADMIN_PASSWORD_RESET env var is set, update admin password then clear expectation */
async function emergencyAdminPasswordReset() {
  const newPassword = process.env["ADMIN_PASSWORD_RESET"];
  if (!newPassword) return;
  try {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash(newPassword, 12);
    const [admin] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.role, "admin"))
      .limit(1);
    if (admin) {
      await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.id, admin.id));
      logger.info({ username: admin.username }, "Emergency admin password reset applied");
    }
  } catch (err) {
    logger.warn({ err }, "Emergency admin password reset failed");
  }
}

/** One-time migration: set appName to "ProSocial" if it was the old default or unset */
async function migrateAppName() {
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "appName"));
    if (!row || row.value === "Minha Produtora") {
      await db
        .insert(settingsTable)
        .values({ key: "appName", value: "ProSocial" })
        .onConflictDoUpdate({ target: settingsTable.key, set: { value: "ProSocial" } });
      logger.info("App name set to ProSocial");
    }
  } catch (err) {
    logger.warn({ err }, "App name migration skipped");
  }
}

/** One-time migration: rename email-format admin usernames to "admin" */
async function migrateAdminUsername() {
  try {
    const [emailAdmin] = await db
      .select()
      .from(usersTable)
      .where(and(like(usersTable.username, "%@%"), eq(usersTable.role, "admin")))
      .limit(1);

    if (emailAdmin) {
      // Check if "admin" username already exists
      const [existing] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.username, "admin"))
        .limit(1);

      const targetUsername = existing ? "admin_legacy" : "admin";
      await db
        .update(usersTable)
        .set({ username: targetUsername })
        .where(eq(usersTable.id, emailAdmin.id));

      logger.info(
        { from: emailAdmin.username, to: targetUsername },
        "Migrated admin username from email format"
      );
    }
  } catch (err) {
    logger.warn({ err }, "Admin username migration skipped");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

emergencyAdminPasswordReset()
  .then(() => migrateAdminUsername())
  .then(() => migrateAppName())
  .then(() => {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
    });
  });
