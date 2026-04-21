import { db, duosTable, teamMembersTable, type DuoRow, type TeamMemberRow } from "@workspace/db";
import { eq } from "drizzle-orm";

export type DuoWithMembers = DuoRow & {
  captador: TeamMemberRow | null;
  editor: TeamMemberRow | null;
};

export async function fetchDuos(): Promise<DuoWithMembers[]> {
  const rows = await db.select().from(duosTable).orderBy(duosTable.createdAt);
  if (rows.length === 0) return [];
  const memberIds = new Set<number>();
  for (const r of rows) {
    if (r.captadorId) memberIds.add(r.captadorId);
    if (r.editorId) memberIds.add(r.editorId);
  }
  const members = memberIds.size
    ? await db.select().from(teamMembersTable)
    : [];
  const byId = new Map(members.map((m) => [m.id, m]));
  return rows.map((r) => ({
    ...r,
    captador: r.captadorId ? byId.get(r.captadorId) ?? null : null,
    editor: r.editorId ? byId.get(r.editorId) ?? null : null,
  }));
}

export async function fetchDuoById(id: number): Promise<DuoWithMembers | null> {
  const [row] = await db.select().from(duosTable).where(eq(duosTable.id, id));
  if (!row) return null;
  const all = await fetchDuos();
  return all.find((d) => d.id === id) ?? null;
}
