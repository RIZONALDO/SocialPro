import { Router, type IRouter } from "express";
import {
  GetWeeklyReportResponse,
  GetDashboardSummaryResponse,
} from "@workspace/api-zod";
import { fetchVideos, type VideoWithPeople } from "../lib/videos";
import { fetchDuos } from "../lib/duos";
import type { TeamMemberRow } from "@workspace/db";

const router: IRouter = Router();

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const offset = (day + 6) % 7; // Monday-based
  d.setDate(d.getDate() - offset);
  return d;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function groupContributions(
  videos: VideoWithPeople[],
  pick: (v: VideoWithPeople) => TeamMemberRow | null,
) {
  const map = new Map<number, { member: TeamMemberRow; count: number }>();
  for (const v of videos) {
    const m = pick(v);
    if (!m) continue;
    const cur = map.get(m.id);
    if (cur) cur.count += 1;
    else map.set(m.id, { member: m, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

function groupByStatus(videos: VideoWithPeople[]) {
  const m = new Map<string, number>();
  for (const v of videos) m.set(v.status, (m.get(v.status) ?? 0) + 1);
  return [...m.entries()].map(([status, count]) => ({ status, count }));
}

router.get("/reports/weekly", async (req, res): Promise<void> => {
  const weekOfRaw = typeof req.query["weekOf"] === "string" ? req.query["weekOf"] : undefined;
  const ref = weekOfRaw ? new Date(weekOfRaw) : new Date();
  const start = startOfWeekMonday(ref);
  const end = addDays(start, 6);
  const weekStart = toISODate(start);
  const weekEnd = toISODate(end);

  const videos = await fetchVideos({ from: weekStart, to: weekEnd });
  const duos = await fetchDuos();

  const byDay = Array.from({ length: 7 }, (_, i) => {
    const date = toISODate(addDays(start, i));
    const count = videos.filter((v) => String(v.deliveryDate) === date).length;
    return { date, count };
  });

  const deliveredVideos = videos.filter(
    (v) => v.status === "entregue" || v.status === "publicado",
  );

  const byDuo = duos.map((d) => {
    const matches = deliveredVideos.filter(
      (v) =>
        (d.captadorId == null || v.captadorId === d.captadorId) &&
        (d.editorId == null || v.editorId === d.editorId) &&
        (d.captadorId != null || d.editorId != null),
    );
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = toISODate(addDays(start, i));
      const count = matches.filter((v) => String(v.deliveryDate) === date).length;
      return { date, count, goalMet: count >= d.dailyGoal };
    });
    const weekGoal = d.dailyGoal * 7;
    return {
      duo: d,
      delivered: matches.length,
      weekGoal,
      goalMet: matches.length >= weekGoal,
      byDay: days,
    };
  });

  const report = {
    weekStart,
    weekEnd,
    totalVideos: videos.length,
    byStatus: groupByStatus(videos),
    byEditor: groupContributions(videos, (v) => v.editor),
    byCaptador: groupContributions(videos, (v) => v.captador),
    byRoteirista: groupContributions(videos, (v) => v.roteirista),
    byDay,
    byDuo,
    videos,
  };

  res.json(GetWeeklyReportResponse.parse(report));
});

router.get("/reports/summary", async (_req, res): Promise<void> => {
  const all = await fetchVideos();
  const today = new Date();
  const weekStart = startOfWeekMonday(today);
  const weekEnd = addDays(weekStart, 6);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const todayISO = toISODate(today);
  const wsISO = toISODate(weekStart);
  const weISO = toISODate(weekEnd);
  const msISO = toISODate(monthStart);
  const meISO = toISODate(monthEnd);

  const inRange = (d: string, a: string, b: string) => d >= a && d <= b;

  const deliveredThisWeek = all.filter(
    (v) => v.status === "entregue" || v.status === "publicado",
  ).filter((v) => inRange(String(v.deliveryDate), wsISO, weISO)).length;

  const deliveredThisMonth = all.filter(
    (v) => v.status === "entregue" || v.status === "publicado",
  ).filter((v) => inRange(String(v.deliveryDate), msISO, meISO)).length;

  const upcomingCount = all.filter(
    (v) => String(v.deliveryDate) >= todayISO && v.status !== "entregue" && v.status !== "publicado",
  ).length;

  const recentVideos = [...all]
    .sort((a, b) => String(b.deliveryDate).localeCompare(String(a.deliveryDate)))
    .slice(0, 8);

  const contribMap = new Map<number, { member: TeamMemberRow; count: number }>();
  for (const v of all) {
    for (const m of [v.editor, v.captador, v.roteirista]) {
      if (!m) continue;
      const cur = contribMap.get(m.id);
      if (cur) cur.count += 1;
      else contribMap.set(m.id, { member: m, count: 1 });
    }
  }
  const topContributors = [...contribMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const summary = {
    totalVideos: all.length,
    deliveredThisWeek,
    deliveredThisMonth,
    upcomingCount,
    byStatus: groupByStatus(all),
    recentVideos,
    topContributors,
  };

  res.json(GetDashboardSummaryResponse.parse(summary));
});

export default router;
