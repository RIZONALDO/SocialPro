import { useState } from "react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
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
            <Card>
              <CardHeader>
                <CardTitle>Duplas — Meta Diária</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {report.byDuo.map((d) => (
                    <div key={d.duo.id} className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold">{d.duo.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.duo.captador?.name || "—"} <span className="opacity-50">+</span> {d.duo.editor?.name || "—"}
                            <span className="mx-2">•</span>
                            Meta: {d.duo.dailyGoal}/dia ({d.weekGoal}/semana)
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            d.goalMet ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {d.delivered} / {d.weekGoal} {d.goalMet ? "— meta batida" : ""}
                        </span>
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {d.byDay.map((day) => {
                          const pct = d.duo.dailyGoal > 0 ? Math.min(100, (day.count / d.duo.dailyGoal) * 100) : 0;
                          return (
                            <div key={day.date} className="text-center">
                              <div className="text-[10px] text-muted-foreground uppercase">
                                {format(parseISO(day.date), "EEE", { locale: ptBR })}
                              </div>
                              <div className="h-16 bg-muted rounded relative overflow-hidden mt-1">
                                <div
                                  className={`absolute bottom-0 left-0 right-0 ${
                                    day.goalMet ? "bg-emerald-500" : "bg-amber-400"
                                  }`}
                                  style={{ height: `${pct}%` }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                                  {day.count}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
