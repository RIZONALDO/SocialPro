import { useGetDashboardSummary } from "@workspace/api-client-react";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Dashboard() {
  const { data: summary, isLoading, error } = useGetDashboardSummary();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="col-span-4 h-96 rounded-xl" />
          <Skeleton className="col-span-3 h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Erro ao carregar dashboard.</p>
      </div>
    );
  }

  const pieData = summary.byStatus.map((s) => ({
    name: STATUS_LABELS[s.status],
    value: s.count,
    color: getStatusColorHex(s.status),
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vídeos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalVideos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregues nesta Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.deliveredThisWeek}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregues neste Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.deliveredThisMonth}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.upcomingCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Vídeos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {summary.recentVideos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum vídeo recente</p>
              ) : (
                summary.recentVideos.map((video) => (
                  <div key={video.id} className="flex items-center">
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{video.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Entrega: {format(new Date(video.deliveryDate), "dd 'de' MMM", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="ml-auto font-medium">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[video.status]}`}>
                        {STATUS_LABELS[video.status]}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted-foreground">Sem dados</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Contribuidores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary.topContributors.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center">Nenhum contribuidor</p>
                ) : (
                  summary.topContributors.map((c) => (
                    <div key={c.member.id} className="flex items-center gap-4">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback style={{ backgroundColor: c.member.color, color: "#fff" }}>
                          {c.member.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{c.member.name}</p>
                      </div>
                      <div className="font-medium text-sm">{c.count} vídeos</div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function getStatusColorHex(status: string) {
  const map: Record<string, string> = {
    planejado: "#f3f4f6", // gray-100
    em_producao: "#dbeafe", // blue-100
    em_edicao: "#fef3c7", // amber-100
    entregue: "#d1fae5", // emerald-100
    publicado: "#f3e8ff", // purple-100
  };
  return map[status] || "#f3f4f6";
}
