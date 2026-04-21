import { pgTable, serial, text, integer, date, timestamp } from "drizzle-orm/pg-core";
import { teamMembersTable } from "./team-members";

export const videosTable = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  deliveryDate: date("delivery_date").notNull(),
  status: text("status").notNull().default("planejado"),
  client: text("client"),
  platform: text("platform"),
  durationSeconds: integer("duration_seconds"),
  notes: text("notes"),
  editorId: integer("editor_id").references(() => teamMembersTable.id, { onDelete: "set null" }),
  captadorId: integer("captador_id").references(() => teamMembersTable.id, { onDelete: "set null" }),
  roteiristaId: integer("roteirista_id").references(() => teamMembersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VideoRow = typeof videosTable.$inferSelect;
export type InsertVideo = typeof videosTable.$inferInsert;
