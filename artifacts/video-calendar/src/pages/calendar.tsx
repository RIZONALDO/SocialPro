import { useState } from "react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isToday, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useListVideos, getListVideosQueryKey, Video, useGetSettings, getGetSettingsQueryKey, useUpdateVideo, getGetDashboardSummaryQueryKey, getGetWeeklyReportQueryKey } from "@workspace/api-client-react";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { VideoDialog } from "@/components/video-dialog";
import { DayDetailsDialog } from "@/components/day-details-dialog";
import { useToast } from "@/hooks/use-toast";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [dayDetailsOpen, setDayDetailsOpen] = useState(false);
  const [dayDetailsDate, setDayDetailsDate] = useState<Date | null>(null);
  const [draggingVideoId, setDraggingVideoId] = useState<number | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateVideo = useUpdateVideo();

  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const calendarTitle = settings?.calendarClientName
    ? `Calendário ${settings.calendarClientName}`
    : "Calendário";

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const { data: videos = [] } = useListVideos(
    { from: format(monthStart, "yyyy-MM-dd"), to: format(monthEnd, "yyyy-MM-dd") },
    { query: { queryKey: getListVideosQueryKey({ from: format(monthStart, "yyyy-MM-dd"), to: format(monthEnd, "yyyy-MM-dd") }) } }
  );

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleDayClick = (day: Date) => {
    if (draggingVideoId !== null) return;
    setDayDetailsDate(day);
    setDayDetailsOpen(true);
  };

  const handleVideoClick = (e: React.MouseEvent, video: Video) => {
    e.stopPropagation();
    setSelectedDate(parseISO(video.deliveryDate));
    setSelectedVideo(video);
    setIsDialogOpen(true);
  };

  const handleAddOnDay = () => {
    setSelectedDate(dayDetailsDate);
    setSelectedVideo(null);
    setDayDetailsOpen(false);
    setIsDialogOpen(true);
  };

  const handleEditFromDay = (video: Video) => {
    setSelectedDate(parseISO(video.deliveryDate));
    setSelectedVideo(video);
    setDayDetailsOpen(false);
    setIsDialogOpen(true);
  };

  const dayVideosForDetails = dayDetailsDate
    ? videos.filter(v => isSameDay(parseISO(v.deliveryDate), dayDetailsDate))
    : [];

  const openNewVideoDialog = () => {
    setSelectedDate(new Date());
    setSelectedVideo(null);
    setIsDialogOpen(true);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, video: Video) => {
    e.dataTransfer.setData("videoId", video.id.toString());
    e.dataTransfer.effectAllowed = "move";
    setDraggingVideoId(video.id);
  };

  const handleDragEnd = () => {
    setDraggingVideoId(null);
    setDragOverDay(null);
  };

  const handleDragOver = (e: React.DragEvent, dayIso: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDay(dayIso);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverDay(null);
    }
  };

  const handleDrop = (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    const videoId = parseInt(e.dataTransfer.getData("videoId"));
    const video = videos.find(v => v.id === videoId);
    setDraggingVideoId(null);
    setDragOverDay(null);
    if (!video) return;
    const newDate = format(day, "yyyy-MM-dd");
    if (newDate === video.deliveryDate) return;
    updateVideo.mutate(
      { id: videoId, data: { deliveryDate: newDate } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetWeeklyReportQueryKey() });
          toast({ title: "Data atualizada" });
        },
      }
    );
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{calendarTitle}</h1>
        <Button onClick={openNewVideoDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Vídeo
        </Button>
      </div>

      <div className="flex items-center justify-between py-4">
        <h2 className="text-xl font-semibold capitalize">
          {format(currentDate, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pb-2">
        {(Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={`inline-block h-3 w-3 rounded-sm border ${STATUS_COLORS[s]}`} />
            <span className="text-xs text-muted-foreground">{STATUS_LABELS[s]}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayName) => (
          <div key={dayName} className="bg-muted rounded-lg py-2 text-center text-sm font-semibold text-muted-foreground">
            {dayName}
          </div>
        ))}

        {Array.from({ length: monthStart.getDay() }).map((_, index) => (
          <div key={`empty-${index}`} className="bg-muted/30 rounded-lg min-h-[120px] p-2" />
        ))}

        {days.map((day) => {
          const dayIso = day.toISOString();
          const dayVideos = videos.filter(v => isSameDay(parseISO(v.deliveryDate), day));
          const isDropTarget = dragOverDay === dayIso;
          return (
            <div
              key={dayIso}
              onClick={() => handleDayClick(day)}
              onDragOver={(e) => handleDragOver(e, dayIso)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day)}
              className={`bg-card border rounded-lg min-h-[120px] p-2 cursor-pointer transition-colors hover:bg-muted/50 ${
                isToday(day) ? "ring-2 ring-primary" : ""
              } ${isDropTarget ? "ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-950/30" : ""}`}
            >
              <div className={`text-sm font-medium ${isToday(day) ? "text-primary" : ""}`}>
                {format(day, "d")}
              </div>
              <div className="mt-2 flex flex-col gap-1">
                {dayVideos.map(video => (
                  <div
                    key={video.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, video)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => handleVideoClick(e, video)}
                    className={`truncate rounded px-1.5 py-0.5 text-xs font-medium cursor-grab active:cursor-grabbing transition-opacity ${STATUS_COLORS[video.status]} ${
                      draggingVideoId === video.id ? "opacity-40" : ""
                    }`}
                    title={video.title}
                  >
                    {video.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {Array.from({ length: monthEnd.getDay() === 0 ? 0 : 6 - monthEnd.getDay() }).map((_, index) => (
          <div key={`empty-end-${index}`} className="bg-muted/30 rounded-lg min-h-[120px] p-2" />
        ))}
      </div>

      <DayDetailsDialog
        open={dayDetailsOpen}
        onOpenChange={setDayDetailsOpen}
        date={dayDetailsDate}
        videos={dayVideosForDetails}
        onAdd={handleAddOnDay}
        onEdit={handleEditFromDay}
      />

      <VideoDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        video={selectedVideo}
        defaultDate={selectedDate}
      />
    </div>
  );
}
