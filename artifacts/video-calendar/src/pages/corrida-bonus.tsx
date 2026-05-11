import { useState } from "react";
import {
  format,
  startOfWeek,
  startOfMonth,
  addWeeks,
  addMonths,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Trophy,
  Medal,
  Flame,
  Zap,
  Flag,
  Target,
  Crown,
  Star,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useGetWeeklyReport,
  useGetMonthlyReport,
  getGetWeeklyReportQueryKey,
  getGetMonthlyReportQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { photoStorageUrl } from "@/lib/photo-storage";

type Period = "semana" | "mes";

const RACER_COLORS = [
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#8b5cf6",
  "#10b981",
];

import type { DuoReport } from "@workspace/api-client-react";

function PeriodNavigator({
  period,
  onPeriodChange,
  periodLabel,
  isCurrentPeriod,
  onPrev,
  onNext,
  onToday,
}: {
  period: Period;
  onPeriodChange: (p: Period) => void;
  periodLabel: string;
  isCurrentPeriod: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div className="flex items-center gap-2 self-start sm:self-auto">
      {/* Date navigator */}
      <div className="flex items-center rounded-lg border bg-muted p-1 gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium capitalize text-sm min-w-[130px] text-center px-1">
          {periodLabel}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={isCurrentPeriod}
          onClick={onNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant={isCurrentPeriod ? "ghost" : "secondary"}
          size="sm"
          className="text-xs h-7 px-2"
          disabled={isCurrentPeriod}
          onClick={onToday}
        >
          Hoje
        </Button>
      </div>

      {/* Period type selector */}
      <div className="flex items-center rounded-lg border bg-muted p-1 gap-1">
        <Button
          variant={period === "semana" ? "default" : "ghost"}
          size="sm"
          onClick={() => onPeriodChange("semana")}
        >
          Semana
        </Button>
        <Button
          variant={period === "mes" ? "default" : "ghost"}
          size="sm"
          onClick={() => onPeriodChange("mes")}
        >
          Mês
        </Button>
      </div>
    </div>
  );
}

function computeBonusWinner(duos: DuoReport[]): (DuoReport & { overage: number }) | null {
  const above = duos
    .map((d) => ({ ...d, overage: d.delivered - d.periodGoal }))
    .filter((d) => d.overage >= 0);
  if (above.length === 0) return null;
  return above.reduce((best, d) => (d.overage > best.overage ? d : best));
}

export default function CorridaBonus() {
  const [period, setPeriod] = useState<Period>("semana");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const today = new Date();
  const baseWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const targetWeekStart = addWeeks(baseWeekStart, weekOffset);
  const weekOf = format(targetWeekStart, "yyyy-MM-dd");

  const targetMonth = addMonths(startOfMonth(today), monthOffset);
  const monthOf = format(targetMonth, "yyyy-MM-01");

  const weekQuery = useGetWeeklyReport(
    { weekOf },
    { query: { queryKey: getGetWeeklyReportQueryKey({ weekOf }), enabled: period === "semana" } }
  );
  const monthQuery = useGetMonthlyReport(
    { monthOf },
    { query: { queryKey: getGetMonthlyReportQueryKey({ monthOf }), enabled: period === "mes" } }
  );

  const report = period === "semana" ? weekQuery.data : monthQuery.data;
  const isLoading = period === "semana" ? weekQuery.isLoading : monthQuery.isLoading;

  const duos: DuoReport[] = report?.byDuo ?? [];
  const sorted = [...duos].sort((a, b) => {
    const aMetGoal = a.delivered >= a.periodGoal;
    const bMetGoal = b.delivered >= b.periodGoal;
    if (aMetGoal && bMetGoal) return b.delivered - a.delivered;
    if (aMetGoal) return -1;
    if (bMetGoal) return 1;
    const pctA = a.periodGoal > 0 ? a.delivered / a.periodGoal : 0;
    const pctB = b.periodGoal > 0 ? b.delivered / b.periodGoal : 0;
    return pctB - pctA;
  });
  const bonusWinner = computeBonusWinner(sorted);
  const hasBonusWinner = bonusWinner !== null;

  const isCurrentPeriod = period === "semana" ? weekOffset === 0 : monthOffset === 0;

  const periodLabel =
    period === "semana"
      ? report
        ? `${format(parseISO(String(report.weekStart).slice(0, 10)), "dd/MM")} a ${format(parseISO(String(report.weekEnd).slice(0, 10)), "dd/MM")}`
        : format(targetWeekStart, "dd/MM")
      : report
      ? format(parseISO(String(report.weekStart).slice(0, 10)), "MMMM yyyy", { locale: ptBR })
      : format(targetMonth, "MMMM yyyy", { locale: ptBR });

  const representativeDailyGoal = duos[0]?.duo.dailyGoal ?? null;
  const goalLabel =
    period === "semana"
      ? representativeDailyGoal != null
        ? `Meta: ${representativeDailyGoal} vídeos/dia × 7 dias = ${representativeDailyGoal * 7} vídeos`
        : "Meta semanal"
      : representativeDailyGoal != null && report
      ? `Meta: ${representativeDailyGoal} vídeos/dia × ${new Date(String(report.weekEnd).slice(0, 10)).getDate()} dias = ${representativeDailyGoal * new Date(String(report.weekEnd).slice(0, 10)).getDate()} vídeos`
      : "Meta mensal";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Crown className="h-8 w-8 text-amber-500" />
            Corrida do Bônus
          </h1>
          <p className="text-muted-foreground mt-1">
            A dupla que bater a meta leva o bônus. Se todas baterem, ganha quem tiver a maior contagem.
          </p>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground mt-3">
            <Target className="h-4 w-4 text-primary" />
            {goalLabel}
          </span>
        </div>
        <PeriodNavigator
          period={period}
          onPeriodChange={(p) => { setPeriod(p); setWeekOffset(0); setMonthOffset(0); }}
          periodLabel={periodLabel}
          isCurrentPeriod={isCurrentPeriod}
          onPrev={() => period === "semana" ? setWeekOffset(o => o - 1) : setMonthOffset(o => o - 1)}
          onNext={() => period === "semana" ? setWeekOffset(o => o + 1) : setMonthOffset(o => o + 1)}
          onToday={() => period === "semana" ? setWeekOffset(0) : setMonthOffset(0)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Bonus banner */}
          {hasBonusWinner ? (
            <div className="relative overflow-hidden rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/5 px-6 py-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 shadow-md flex-shrink-0">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                      Bônus do período
                    </p>
                    <p className="text-xl font-extrabold text-amber-800 dark:text-amber-300">
                      {bonusWinner.duo.name}
                    </p>
                    <p className="text-sm text-amber-700/70 dark:text-amber-400/70">
                      {bonusWinner.duo.captador?.name ?? "—"} &amp;{" "}
                      {bonusWinner.duo.editor?.name ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="sm:ml-auto flex items-center gap-2 sm:flex-col sm:items-end">
                  <span className="text-2xl font-extrabold text-amber-700 dark:text-amber-300">
                    +{bonusWinner.overage}
                  </span>
                  <span className="text-xs text-amber-600/70 dark:text-amber-400/70">acima da meta</span>
                </div>
              </div>
              <Star className="absolute right-8 top-3 h-4 w-4 text-amber-400/50" />
              <Star className="absolute right-16 top-7 h-2.5 w-2.5 text-amber-400/30" />
              <Star className="absolute right-4 top-8 h-3 w-3 text-amber-400/40" />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-muted-foreground/25 bg-muted/20 px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted flex-shrink-0">
                  <Target className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">Nenhuma dupla atingiu a meta ainda</p>
                  <p className="text-sm text-muted-foreground/60">
                    Bônus disponível para a primeira dupla que superar a meta do período.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Duo cards */}
          <div className="space-y-3">
            {sorted.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  Nenhuma dupla cadastrada.
                </CardContent>
              </Card>
            ) : (
              sorted.map((d, idx) => {
                const pct = d.periodGoal > 0 ? (d.delivered / d.periodGoal) * 100 : 0;
                const fillPct = Math.min(100, pct);
                const racerColor = RACER_COLORS[idx % RACER_COLORS.length];
                const isBonusWinner = hasBonusWinner && bonusWinner.duo.id === d.duo.id;
                const isGoalMet = d.goalMet;
                const overage = d.delivered - d.periodGoal;
                const isHot = pct >= 75 && !isGoalMet;
                const racerLeft = isGoalMet ? 92 : Math.max(4, Math.min(pct, 88));
                const trackColor = isBonusWinner ? "#f59e0b" : isGoalMet ? "#10b981" : racerColor;

                return (
                  <div
                    key={d.duo.id}
                    className={`rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-px ${
                      isBonusWinner
                        ? "border-amber-300 bg-gradient-to-br from-amber-500/10 to-yellow-500/5"
                        : isGoalMet
                        ? "border-emerald-300 bg-emerald-500/5"
                        : idx === 0
                        ? "border-primary/20 bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Position */}
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center">
                          {idx === 0 ? (
                            <Trophy className="h-5 w-5 text-amber-500" />
                          ) : idx === 1 ? (
                            <Medal className="h-5 w-5 text-slate-400" />
                          ) : idx === 2 ? (
                            <Medal className="h-5 w-5 text-orange-400" />
                          ) : (
                            <span className="text-xs font-bold text-muted-foreground">{idx + 1}º</span>
                          )}
                        </div>
                        {/* Avatars stacked */}
                        <div className="relative h-9 w-13 flex-shrink-0">
                          <Avatar className="h-8 w-8 absolute left-0 top-0.5 border-2 border-background shadow-sm">
                            <AvatarImage src={photoStorageUrl(d.duo.captador?.photoUrl)} alt={d.duo.captador?.name} />
                            <AvatarFallback className="text-[10px] font-bold text-white" style={{ backgroundColor: trackColor }}>
                              {(d.duo.captador?.name ?? "?").substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <Avatar className="h-8 w-8 absolute left-5 top-0.5 border-2 border-background shadow-sm">
                            <AvatarImage src={photoStorageUrl(d.duo.editor?.photoUrl)} alt={d.duo.editor?.name} />
                            <AvatarFallback className="text-[10px] font-bold text-white" style={{ backgroundColor: trackColor }}>
                              {(d.duo.editor?.name ?? "?").substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate flex items-center gap-1.5 text-sm">
                            {d.duo.name}
                            {isBonusWinner && <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
                          </p>
                          <p className="text-xs text-muted-foreground/70 truncate">
                            {d.duo.captador?.name ?? "—"} · {d.duo.editor?.name ?? "—"}
                          </p>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isBonusWinner && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/30">
                            <Trophy className="h-3 w-3" /> Bônus
                          </span>
                        )}
                        {isGoalMet && !isBonusWinner && (
                          <span className="text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                            Meta ✓
                          </span>
                        )}
                        {isHot && <Flame className="h-4 w-4 text-orange-500" />}
                        {pct >= 50 && !isHot && !isGoalMet && <Zap className="h-4 w-4 text-amber-500" />}
                        <span
                          className={`text-sm font-bold px-2.5 py-0.5 rounded-full tabular-nums ${
                            isGoalMet
                              ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                              : isBonusWinner
                              ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {d.delivered}/{d.periodGoal}
                        </span>
                      </div>
                    </div>

                    {/* Race track */}
                    <div className="relative mb-4">
                      <div className="h-8 bg-muted/60 rounded-full overflow-hidden relative ring-1 ring-inset ring-border/50">
                        {/* Gradient fill */}
                        <div
                          className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-700"
                          style={{
                            width: `${fillPct}%`,
                            background: `linear-gradient(90deg, ${trackColor}55 0%, ${trackColor}99 100%)`,
                          }}
                        />
                        {/* Stripe overlay when goal exceeded */}
                        {isGoalMet && overage > 0 && (
                          <div
                            className="absolute inset-0 rounded-full"
                            style={{
                              background: `repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.08) 5px, rgba(255,255,255,0.08) 10px)`,
                            }}
                          />
                        )}
                        {/* Quarter marks */}
                        {[25, 50, 75].map((mark) => (
                          <div
                            key={mark}
                            className="absolute top-1 bottom-1 w-px bg-muted-foreground/15"
                            style={{ left: `${mark}%` }}
                          />
                        ))}
                        <div className="absolute inset-0 flex items-center px-3 gap-2">
                          <span className="text-xs font-semibold text-foreground/60">
                            {Math.round(pct)}%
                          </span>
                          {isGoalMet && overage > 0 && (
                            <span className="flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <TrendingUp className="h-3 w-3" />+{overage}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Racer token */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700"
                        style={{ left: `${racerLeft}%` }}
                      >
                        <div
                          className="h-8 w-8 rounded-full border-2 border-background shadow-md flex items-center justify-center text-white text-[10px] font-bold ring-2"
                          style={{ backgroundColor: trackColor, ringColor: trackColor + "40" }}
                        >
                          {d.duo.name.substring(0, 2).toUpperCase()}
                        </div>
                      </div>

                      {/* Finish flag */}
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1.5">
                        <Flag className={`h-4 w-4 ${isGoalMet ? "text-emerald-500" : "text-muted-foreground/30"}`} />
                      </div>
                    </div>

                    {/* Daily bars */}
                    <div className="border-t border-border/40 pt-3">
                      <div
                        className="grid gap-1"
                        style={{ gridTemplateColumns: `repeat(${Math.min(d.byDay.length, 31)}, 1fr)` }}
                      >
                        {d.byDay.map((day: any) => {
                          const dayStr = String(day.date).slice(0, 10);
                          const dayPct = d.duo.dailyGoal > 0
                            ? Math.min(100, (day.count / d.duo.dailyGoal) * 100)
                            : 0;
                          return (
                            <div key={dayStr} className="text-center">
                              <div className="text-[8px] text-muted-foreground/60 mb-0.5">
                                {d.byDay.length <= 7
                                  ? format(parseISO(dayStr), "EEE", { locale: ptBR })
                                  : format(parseISO(dayStr), "d")}
                              </div>
                              <div className={`bg-muted/50 rounded-sm relative overflow-hidden ${d.byDay.length > 7 ? "h-6" : "h-9"}`}>
                                <div
                                  className="absolute bottom-0 left-0 right-0 transition-all duration-500"
                                  style={{
                                    height: `${dayPct}%`,
                                    backgroundColor: trackColor,
                                    opacity: day.goalMet ? 0.9 : 0.5,
                                  }}
                                />
                                {d.byDay.length <= 14 && (
                                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-foreground/70">
                                    {day.count > 0 ? day.count : ""}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground/70 pt-3 border-t border-border/50">
            <span className="flex items-center gap-1.5"><Crown className="h-3.5 w-3.5 text-amber-500" /> Bônus</span>
            <span className="flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-emerald-500" /> Meta batida</span>
            <span className="flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-orange-500" /> Acima de 75%</span>
            <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-amber-500" /> Acima de 50%</span>
            <span className="flex items-center gap-1.5"><Flag className="h-3.5 w-3.5 text-muted-foreground/40" /> Linha de chegada</span>
          </div>
        </>
      )}
    </div>
  );
}
