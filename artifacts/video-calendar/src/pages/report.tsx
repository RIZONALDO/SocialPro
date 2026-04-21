import { useState } from "react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Printer, Flag, Trophy, Medal, Flame, Zap } from "lucide-react";
import { useGetWeeklyReport, getGetWeeklyReportQueryKey } from "@workspace/api-client-react";
import { STATUS_LABELS, ROLE_LABELS, STATUS_COLORS } from "@/lib/constants";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Report() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Start of week (Monday) to end of week (Sunday)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekOf = format(weekStart, "yyyy-MM-dd");

  const { data: report, isLoading } = useGetWeeklyReport(
    { weekOf },
    { query: { queryKey: getGetWeeklyReportQueryKey({ weekOf }) } }
  );

  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
        <h1 className="text-3xl font-bold tracking-tight">Relatório Semanal</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={format(currentDate, "yyyy-MM-dd")}
              onChange={(e) => {
                if (e.target.value) {
                  setCurrentDate(parseISO(e.target.value));
                }
              }}
              className="w-auto"
            />
          </div>
          <Button variant="outline" size="icon" onClick={nextWeek}>
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
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold">
              Relatório: {format(parseISO(report.weekStart), "dd 'de' MMMM", { locale: ptBR })} a{" "}
              {format(parseISO(report.weekEnd), "dd 'de' MMMM, yyyy", { locale: ptBR })}
            </h2>
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
                <CardTitle>Por Dia</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.byDay.map(d => ({ ...d, dayName: format(parseISO(d.date), "EEEE", { locale: ptBR }) }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dayName" />
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
                        data={report.byStatus.map(s => ({
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
                        {report.byStatus.map((entry, index) => (
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
                <CardTitle>Editores</CardTitle>
              </CardHeader>
              <CardContent>
                <ContributorList contributors={report.byEditor} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Captadores</CardTitle>
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
            <DuoRaceCard duos={report.byDuo} />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Todos os Vídeos ({report.videos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.videos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum vídeo nesta semana.</p>
                ) : (
                  <div className="divide-y">
                    {report.videos.map(video => (
                      <div key={video.id} className="py-3 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                        <div>
                          <p className="font-medium">{video.title}</p>
                          <div className="text-sm text-muted-foreground mt-1 space-x-2">
                            <span>Entrega: {format(parseISO(video.deliveryDate), "dd/MM/yyyy")}</span>
                            {video.client && <span>• Cliente: {video.client}</span>}
                            {video.platform && <span>• {video.platform}</span>}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[video.status]}`}>
                            {STATUS_LABELS[video.status]}
                          </span>
                          {video.editor && (
                            <span className="text-xs border px-2 py-1 rounded-md" style={{ borderColor: video.editor.color }}>
                              Ed: {video.editor.name}
                            </span>
                          )}
                          {video.captador && (
                            <span className="text-xs border px-2 py-1 rounded-md" style={{ borderColor: video.captador.color }}>
                              Cap: {video.captador.name}
                            </span>
                          )}
                          {video.roteirista && (
                            <span className="text-xs border px-2 py-1 rounded-md" style={{ borderColor: video.roteirista.color }}>
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
      {contributors.map(c => (
        <div key={c.member.id} className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
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
  "#6366f1", // indigo
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#10b981", // emerald
];

function PositionBadge({ position }: { position: number }) {
  if (position === 1) return <Trophy className="h-5 w-5 text-amber-500 flex-shrink-0" />;
  if (position === 2) return <Medal className="h-5 w-5 text-slate-400 flex-shrink-0" />;
  if (position === 3) return <Medal className="h-5 w-5 text-orange-400 flex-shrink-0" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center flex-shrink-0">{position}º</span>;
}

function DuoRaceCard({ duos }: { duos: any[] }) {
  const sorted = [...duos].sort((a, b) => {
    const pctA = a.weekGoal > 0 ? a.delivered / a.weekGoal : 0;
    const pctB = b.weekGoal > 0 ? b.delivered / b.weekGoal : 0;
    return pctB - pctA;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-primary" />
          <CardTitle>Corrida das Duplas</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">Quem está mais perto de bater a meta semanal?</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorted.map((d, idx) => {
          const pct = d.weekGoal > 0 ? Math.min(100, (d.delivered / d.weekGoal) * 100) : 0;
          const racerColor = RACER_COLORS[idx % RACER_COLORS.length];
          const isFirst = idx === 0;
          const isFinished = d.goalMet;
          const isHot = pct >= 75 && !isFinished;
          const racerLeft = Math.max(0, Math.min(pct, 92)); // keep racer visible

          return (
            <div key={d.duo.id} className={`rounded-xl border-2 p-4 transition-all ${
              isFinished ? "border-emerald-400 bg-emerald-50" : isFirst ? "border-primary/30 bg-primary/5" : "border-transparent bg-muted/40"
            }`}>
              {/* Header row */}
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
                  {pct >= 50 && !isHot && !isFinished && <Zap className="h-4 w-4 text-amber-500" />}
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isFinished ? "bg-emerald-200 text-emerald-800" : "bg-background text-foreground border"
                  }`}>
                    {d.delivered}/{d.weekGoal} vídeos
                  </span>
                </div>
              </div>

              {/* Race track */}
              <div className="relative">
                {/* Track background */}
                <div className="h-8 bg-muted rounded-full overflow-hidden relative">
                  {/* Filled portion */}
                  <div
                    className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: isFinished ? "#10b981" : racerColor,
                      opacity: 0.25,
                    }}
                  />
                  {/* Goal marker lines (25%, 50%, 75%) */}
                  {[25, 50, 75].map(mark => (
                    <div
                      key={mark}
                      className="absolute top-0 bottom-0 w-px bg-muted-foreground/20"
                      style={{ left: `${mark}%` }}
                    />
                  ))}
                  {/* Percentage label inside bar */}
                  <div className="absolute inset-0 flex items-center px-3">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {Math.round(pct)}%
                    </span>
                  </div>
                </div>

                {/* Racer icon positioned on the track */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700"
                  style={{ left: `${racerLeft}%` }}
                >
                  <div
                    className="h-8 w-8 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold select-none"
                    style={{ backgroundColor: isFinished ? "#10b981" : racerColor }}
                    title={d.duo.name}
                  >
                    {d.duo.name.substring(0, 2).toUpperCase()}
                  </div>
                </div>

                {/* Finish flag */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1">
                  <Flag className={`h-5 w-5 ${isFinished ? "text-emerald-600" : "text-muted-foreground/50"}`} />
                </div>
              </div>

              {/* Daily mini bars */}
              <div className="grid grid-cols-7 gap-1 mt-3">
                {d.byDay.map((day: any) => {
                  const dayPct = d.duo.dailyGoal > 0 ? Math.min(100, (day.count / d.duo.dailyGoal) * 100) : 0;
                  return (
                    <div key={day.date} className="text-center">
                      <div className="text-[9px] text-muted-foreground uppercase">
                        {format(parseISO(day.date), "EEE", { locale: ptBR })}
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
            </div>
          );
        })}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1 border-t">
          <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5 text-emerald-600" /> Meta batida</span>
          <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-orange-500" /> Acima de 75%</span>
          <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-amber-500" /> Acima de 50%</span>
          <span className="flex items-center gap-1"><Flag className="h-3.5 w-3.5 text-muted-foreground/50" /> Linha de chegada</span>
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusColorHex(status: string) {
  const map: Record<string, string> = {
    planejado: "#9ca3af", // gray-400
    em_producao: "#60a5fa", // blue-400
    em_edicao: "#fbbf24", // amber-400
    entregue: "#34d399", // emerald-400
    publicado: "#c084fc", // purple-400
  };
  return map[status] || "#9ca3af";
}
