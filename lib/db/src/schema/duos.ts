import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { teamMembersTable } from "./team-members";

export const duosTable = pgTable("duos", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  captadorId: integer("captador_id").references(() => teamMembersTable.id, { onDelete: "set null" }),
  editorId: integer("editor_id").references(() => teamMembersTable.id, { onDelete: "set null" }),
  dailyGoal: integer("daily_goal").notNull().default(4),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DuoRow = typeof duosTable.$inferSelect;
export type InsertDuo = typeof duosTable.$inferInsert;
