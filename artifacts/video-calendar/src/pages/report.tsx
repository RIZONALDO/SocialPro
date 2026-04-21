import { useState } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  parseISO,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Printer, Flag, Trophy, Medal, Flame, Zap } from "lucide-react";
import {
  useGetWeeklyReport,
  useGetMonthlyReport,
  getGetWeeklyReportQueryKey,
  getGetMonthlyReportQueryKey,
} from "@workspace/api-client-react";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { photoStorageUrl } from "@/lib/photo-storage";

type PeriodMode = "semanal" | "mensal";

export default function Report() {
  const [mode, setMode] = useState<PeriodMode>("semanal");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Week controls
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekOf = format(weekStart, "yyyy-MM-dd");

  // Month controls
  const monthOf = format(startOfMonth(currentDate), "yyyy-MM-dd");

  const prevPeriod = () =>
    setCurrentDate(mode === "semanal" ? subWeeks(currentDate, 1) : subMonths(currentDate, 1));
  const nextPeriod = () =>
    setCurrentDate(mode === "semanal" ? addWeeks(currentDate, 1) : addMonths(currentDate, 1));

  const weekQuery = useGetWeeklyReport(
    { weekOf },
    { query: { queryKey: getGetWeeklyReportQueryKey({ weekOf }), enabled: mode === "semanal" } }
  );
  const monthQuery = useGetMonthlyReport(
    { monthOf },
    { query: { queryKey: getGetMonthlyReportQueryKey({ monthOf }), enabled: mode === "mensal" } }
  );

  const report = mode === "semanal" ? weekQuery.data : monthQuery.data;
  const isLoading = mode === "semanal" ? weekQuery.isLoading : monthQuery.isLoading;

  const handlePrint = () => window.print();

  // Build bar chart data:
  // - weekly: per day (7 bars)
  // - monthly: grouped by week (4–5 bars)
  const byDayRaw = report?.byDay ?? [];
  const barData =
    mode === "semanal"
      ? byDayRaw.map((d) => ({
          label: format(new Date(String(d.date).slice(0, 10) + "T12:00:00"), "EEEE", { locale: ptBR }),
          count: d.count,
        }))
      : (() => {
          const weeks: { label: string; count: number }[] = [];
          let i = 0;
          while (i < byDayRaw.length) {
            const chunk = byDayRaw.slice(i, i + 7);
            const firstDate = new Date(String(chunk[0].date).slice(0, 10) + "T12:00:00");
            const lastDate = new Date(String(chunk[chunk.length - 1].date).slice(0, 10) + "T12:00:00");
            weeks.push({
              label: `${format(firstDate, "d/M")} – ${format(lastDate, "d/M")}`,
              count: chunk.reduce((s, d) => s + d.count, 0),
            });
            i += 7;
          }
          return weeks;
        })();

  const periodTitle =
    mode === "semanal"
      ? report
        ? `${format(new Date(String(report.weekStart).slice(0, 10) + "T12:00:00"), "dd 'de' MMMM", { locale: ptBR })} a ${format(new Date(String(report.weekEnd).slice(0, 10) + "T12:00:00"), "dd 'de' MMMM, yyyy", { locale: ptBR })}`
        : ""
      : report
      ? format(new Date(String(report.weekStart).slice(0, 10) + "T12:00:00"), "MMMM 'de' yyyy", { locale: ptBR })
      : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Relatório</h1>
          {/* Weekly/Monthly toggle */}
          <div className="flex items-center rounded-lg border bg-muted p-1 gap-1">
            <Button
              variant={mode === "semanal" ? "default" : "ghost"}
              size="sm"
              onClick={() => { setMode("semanal"); setCurrentDate(new Date()); }}
            >
              Semanal
            </Button>
            <Button
              variant={mode === "mensal" ? "default" : "ghost"}
              size="sm"
              onClick={() => { setMode("mensal"); setCurrentDate(new Date()); }}
            >
              Mensal
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevPeriod}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {mode === "semanal" ? (
            <Input
              type="date"
              value={format(currentDate, "yyyy-MM-dd")}
              onChange={(e) => { if (e.target.value) setCurrentDate(new Date(e.target.value + "T12:00:00")); }}
              className="w-auto"
            />
          ) : (
            <Input
              type="month"
              value={format(currentDate, "yyyy-MM")}
              onChange={(e) => { if (e.target.value) setCurrentDate(new Date(e.target.value + "-01T12:00:00")); }}
              className="w-auto"
            />
          )}
          <Button variant="outline" size="icon" onClick={nextPeriod}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="default" onClick={handlePrint} className="ml-4">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      ) : report ? (
        <div className="print-area space-y-6 bg-background p-4 sm:p-0">
          <div className="text-center sm:text-left capitalize">
            <h2 className="text-2xl font-bold">{periodTitle}</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Vídeos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{report.totalVideos}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{mode === "semanal" ? "Por Dia" : "Por Semana"}</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" name="Vídeos" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Por Status</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {report.byStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={report.byStatus.map((s) => ({
                          name: STATUS_LABELS[s.status],
                          value: s.count,
                          color: getStatusColorHex(s.status),
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {report.byStatus.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={getStatusColorHex(report.byStatus[index].status)} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-muted-foreground">Sem dados de status</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Edição</CardTitle>
              </CardHeader>
              <CardContent>
                <ContributorList contributors={report.byEditor} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Captação</CardTitle>
              </CardHeader>
              <CardContent>
                <ContributorList contributors={report.byCaptador} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Roteiristas</CardTitle>
              </CardHeader>
              <CardContent>
                <ContributorList contributors={report.byRoteirista} />
              </CardContent>
            </Card>
          </div>

          {report.byDuo && report.byDuo.length > 0 && (
            <DuoRaceCard duos={report.byDuo} mode={mode} />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Todos os Vídeos ({report.videos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.videos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum vídeo neste {mode === "semanal" ? "período" : "mês"}.
                  </p>
                ) : (
                  <div className="divide-y">
                    {report.videos.map((video) => (
                      <div
                        key={video.id}
                        className="py-3 flex flex-col sm:flex-row gap-4 justify-between sm:items-center"
                      >
                        <div>
                          <p className="font-medium">{video.title}</p>
                          <div className="text-sm text-muted-foreground mt-1 space-x-2">
                            <span>
                              Entrega:{" "}
                              {format(
                                new Date(String(video.deliveryDate).slice(0, 10) + "T12:00:00"),
                                "dd/MM/yyyy"
                              )}
                            </span>
                            {video.client && <span>• Cliente: {video.client}</span>}
                            {video.platform && <span>• {video.platform}</span>}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[video.status]}`}
                          >
                            {STATUS_LABELS[video.status]}
                          </span>
                          {video.editor && (
                            <span
                              className="text-xs border px-2 py-1 rounded-md"
                              style={{ borderColor: video.editor.color }}
                            >
                              Ed: {video.editor.name}
                            </span>
                          )}
                          {video.captador && (
                            <span
                              className="text-xs border px-2 py-1 rounded-md"
                              style={{ borderColor: video.captador.color }}
                            >
                              Cap: {video.captador.name}
                            </span>
                          )}
                          {video.roteirista && (
                            <span
                              className="text-xs border px-2 py-1 rounded-md"
                              style={{ borderColor: video.roteirista.color }}
                            >
                              Rot: {video.roteirista.name}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function ContributorList({ contributors }: { contributors: any[] }) {
  if (contributors.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum</p>;
  }
  return (
    <div className="space-y-4">
      {contributors.map((c) => (
        <div key={c.member.id} className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={photoStorageUrl(c.member.photoUrl)} alt={c.member.name} />
            <AvatarFallback style={{ backgroundColor: c.member.color, color: "#fff" }}>
              {c.member.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-sm font-medium">{c.member.name}</div>
          <div className="text-sm text-muted-foreground">{c.count}</div>
        </div>
      ))}
    </div>
  );
}

const RACER_COLORS = [
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#8b5cf6",
  "#10b981",
];

function PositionBadge({ position }: { position: number }) {
  if (position === 1) return <Trophy className="h-5 w-5 text-amber-500 flex-shrink-0" />;
  if (position === 2) return <Medal className="h-5 w-5 text-slate-400 flex-shrink-0" />;
  if (position === 3) return <Medal className="h-5 w-5 text-orange-400 flex-shrink-0" />;
  return (
    <span className="text-sm font-bold text-muted-foreground w-5 text-center flex-shrink-0">
      {position}º
    </span>
  );
}

function DuoRaceCard({ duos, mode }: { duos: any[]; mode: PeriodMode }) {
  const sorted = [...duos].sort((a, b) => {
    const pctA = a.weekGoal > 0 ? a.delivered / a.weekGoal : 0;
    const pctB = b.weekGoal > 0 ? b.delivered / b.weekGoal : 0;
    return pctB - pctA;
  });

  const goalLabel = mode === "semanal" ? "meta semanal" : "meta mensal";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-primary" />
          <CardTitle>Corrida das Duplas</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Quem está mais perto de bater a {goalLabel}?
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorted.map((d, idx) => {
          const pct = d.weekGoal > 0 ? Math.min(100, (d.delivered / d.weekGoal) * 100) : 0;
          const racerColor = RACER_COLORS[idx % RACER_COLORS.length];
          const isFirst = idx === 0;
          const isFinished = d.goalMet;
          const isHot = pct >= 75 && !isFinished;
          const racerLeft = Math.max(0, Math.min(pct, 92));

          return (
            <div
              key={d.duo.id}
              className={`rounded-xl border-2 p-4 transition-all ${
                isFinished
                  ? "border-emerald-400 bg-emerald-50"
                  : isFirst
                  ? "border-primary/30 bg-primary/5"
                  : "border-transparent bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <PositionBadge position={idx + 1} />
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{d.duo.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {d.duo.captador?.name || "—"} + {d.duo.editor?.name || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isFinished && <Trophy className="h-4 w-4 text-emerald-600" />}
                  {isHot && <Flame className="h-4 w-4 text-orange-500" />}
                  {pct >= 50 && !isHot && !isFinished && (
                    <Zap className="h-4 w-4 text-amber-500" />
                  )}
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isFinished
                        ? "bg-emerald-200 text-emerald-800"
                        : "bg-background text-foreground border"
                    }`}
                  >
                    {d.delivered}/{d.weekGoal} vídeos
                  </span>
                </div>
              </div>

              <div className="relative">
                <div className="h-8 bg-muted rounded-full overflow-hidden relative">
                  <div
                    className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: isFinished ? "#10b981" : racerColor,
                      opacity: 0.25,
                    }}
                  />
                  {[25, 50, 75].map((mark) => (
                    <div
                      key={mark}
                      className="absolute top-0 bottom-0 w-px bg-muted-foreground/20"
                      style={{ left: `${mark}%` }}
                    />
                  ))}
                  <div className="absolute inset-0 flex items-center px-3">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {Math.round(pct)}%
                    </span>
                  </div>
                </div>
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700"
                  style={{ left: `${racerLeft}%` }}
                >
                  <div
                    className="h-8 w-8 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold select-none"
                    style={{ backgroundColor: isFinished ? "#10b981" : racerColor }}
                  >
                    {d.duo.name.substring(0, 2).toUpperCase()}
                  </div>
                </div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1">
                  <Flag
                    className={`h-5 w-5 ${
                      isFinished ? "text-emerald-600" : "text-muted-foreground/50"
                    }`}
                  />
                </div>
              </div>

              {/* Daily mini bars — only show for weekly (7 days) */}
              {mode === "semanal" && (
                <div className="grid grid-cols-7 gap-1 mt-3">
                  {d.byDay.map((day: any) => {
                    const dayStr = String(day.date).slice(0, 10);
                    const dayPct =
                      d.duo.dailyGoal > 0
                        ? Math.min(100, (day.count / d.duo.dailyGoal) * 100)
                        : 0;
                    return (
                      <div key={dayStr} className="text-center">
                        <div className="text-[9px] text-muted-foreground uppercase">
                          {format(new Date(dayStr + "T12:00:00"), "EEE", { locale: ptBR })}
                        </div>
                        <div className="h-10 bg-muted rounded relative overflow-hidden mt-0.5">
                          <div
                            className="absolute bottom-0 left-0 right-0 rounded transition-all"
                            style={{
                              height: `${dayPct}%`,
                              backgroundColor: day.goalMet ? "#10b981" : racerColor,
                              opacity: day.goalMet ? 1 : 0.6,
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold">
                            {day.count}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1 border-t">
          <span className="flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5 text-emerald-600" /> Meta batida
          </span>
          <span className="flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-orange-500" /> Acima de 75%
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-amber-500" /> Acima de 50%
          </span>
          <span className="flex items-center gap-1">
            <Flag className="h-3.5 w-3.5 text-muted-foreground/50" /> Linha de chegada
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusColorHex(status: string) {
  const map: Record<string, string> = {
    planejado: "#9ca3af",
    em_producao: "#60a5fa",
    em_edicao: "#fbbf24",
    entregue: "#34d399",
    publicado: "#c084fc",
  };
  return map[status] || "#9ca3af";
}
