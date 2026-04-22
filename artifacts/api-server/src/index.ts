import app from "./app";
import { logger } from "./lib/logger";
import { db, usersTable } from "@workspace/db";
import { like, eq, and } from "drizzle-orm";

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

migrateAdminUsername().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
});
