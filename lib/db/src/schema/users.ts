import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { teamMembersTable } from "./team-members";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("member"),
  teamMemberId: integer("team_member_id").references(() => teamMembersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
});

export type UserRow = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
