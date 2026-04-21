import { and, eq, gte, lte, desc } from "drizzle-orm";
import { db, videosTable, teamMembersTable, type VideoRow, type TeamMemberRow } from "@workspace/db";

export type VideoWithPeople = VideoRow & {
  editor: TeamMemberRow | null;
  captador: TeamMemberRow | null;
  roteirista: TeamMemberRow | null;
};

export async function fetchVideos(opts: { from?: string; to?: string } = {}): Promise<VideoWithPeople[]> {
  const conds = [];
  if (opts.from) conds.push(gte(videosTable.deliveryDate, opts.from));
  if (opts.to) conds.push(lte(videosTable.deliveryDate, opts.to));
  const where = conds.length ? and(...conds) : undefined;

  const rows = await db
    .select()
    .from(videosTable)
    .where(where)
    .orderBy(desc(videosTable.deliveryDate));

  const members = await db.select().from(teamMembersTable);
  const byId = new Map(members.map((m) => [m.id, m] as const));

  return rows.map((v) => ({
    ...v,
    editor: v.editorId != null ? byId.get(v.editorId) ?? null : null,
    captador: v.captadorId != null ? byId.get(v.captadorId) ?? null : null,
    roteirista: v.roteiristaId != null ? byId.get(v.roteiristaId) ?? null : null,
  }));
}

export async function fetchVideoById(id: number): Promise<VideoWithPeople | null> {
  const [row] = await db.select().from(videosTable).where(eq(videosTable.id, id));
  if (!row) return null;
  const members = await db.select().from(teamMembersTable);
  const byId = new Map(members.map((m) => [m.id, m] as const));
  return {
    ...row,
    editor: row.editorId != null ? byId.get(row.editorId) ?? null : null,
    captador: row.captadorId != null ? byId.get(row.captadorId) ?? null : null,
    roteirista: row.roteiristaId != null ? byId.get(row.roteiristaId) ?? null : null,
  };
}
