import { useState } from "react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isSameMonth, isToday, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useListVideos, getListVideosQueryKey, Video, useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { VideoDialog } from "@/components/video-dialog";
import { DayDetailsDialog } from "@/components/day-details-dialog";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [dayDetailsOpen, setDayDetailsOpen] = useState(false);
  const [dayDetailsDate, setDayDetailsDate] = useState<Date | null>(null);
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

      <div className="grid grid-cols-7 gap-px rounded-lg bg-border border overflow-hidden">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayName) => (
          <div key={dayName} className="bg-muted py-2 text-center text-sm font-semibold text-muted-foreground">
            {dayName}
          </div>
        ))}
        
        {Array.from({ length: monthStart.getDay() }).map((_, index) => (
          <div key={`empty-${index}`} className="bg-background min-h-[120px] p-2 opacity-50" />
        ))}
        
        {days.map((day) => {
          const dayVideos = videos.filter(v => (v.status === "entregue" || v.status === "cancelado") && isSameDay(parseISO(v.deliveryDate), day));
          return (
            <div
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              className={`bg-background min-h-[120px] p-2 cursor-pointer transition-colors hover:bg-muted/50 ${
                isToday(day) ? "ring-2 ring-primary ring-inset" : ""
              }`}
            >
              <div className={`text-sm font-medium ${isToday(day) ? "text-primary" : ""}`}>
                {format(day, "d")}
              </div>
              <div className="mt-2 flex flex-col gap-1">
                {dayVideos.map(video => (
                  <div
                    key={video.id}
                    onClick={(e) => handleVideoClick(e, video)}
                    className={`truncate rounded px-1.5 py-0.5 text-xs font-medium cursor-pointer ${STATUS_COLORS[video.status]}`}
                    title={video.title}
                  >
                    {video.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        
        {Array.from({ length: 6 - monthEnd.getDay() }).map((_, index) => (
          <div key={`empty-end-${index}`} className="bg-background min-h-[120px] p-2 opacity-50" />
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
