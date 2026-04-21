import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Search, Edit2, Trash2, Copy } from "lucide-react";
import { useListVideos, getListVideosQueryKey, useDeleteVideo, useUpdateVideo, getGetDashboardSummaryQueryKey, getGetWeeklyReportQueryKey, VideoStatus, Video } from "@workspace/api-client-react";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VideoDialog } from "@/components/video-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function VideoList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<number | null>(null);
  const [duplicateSource, setDuplicateSource] = useState<Video | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: videos = [], isLoading } = useListVideos(undefined, {
    query: { queryKey: getListVideosQueryKey() }
  });
  
  const deleteVideo = useDeleteVideo();
  const updateVideo = useUpdateVideo();

  const handleStatusChange = (video: Video, newStatus: VideoStatus) => {
    if (newStatus === video.status) return;
    updateVideo.mutate(
      { id: video.id, data: { status: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetWeeklyReportQueryKey() });
          toast({ title: "Status atualizado" });
        },
      }
    );
  };

  const filteredVideos = videos.filter(v => {
    const matchesSearch = (v.title?.toLowerCase().includes(searchTerm.toLowerCase())) || 
                          (v.client?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "todos" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (video: Video) => {
    setSelectedVideo(video);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedVideo(null);
    setDuplicateSource(null);
    setIsDialogOpen(true);
  };

  const handleDuplicate = (video: Video) => {
    setSelectedVideo(null);
    setDuplicateSource(video);
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    if (videoToDelete) {
      deleteVideo.mutate({ id: videoToDelete }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
          toast({ title: "Vídeo excluído com sucesso" });
          setVideoToDelete(null);
        }
      });
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Lista de Vídeos</h1>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Vídeo
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por título ou cliente..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg flex-1 overflow-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Entrega</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Plataforma</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Carregando vídeos...
                </TableCell>
              </TableRow>
            ) : filteredVideos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum vídeo encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredVideos.map((video) => (
                <TableRow key={video.id}>
                  <TableCell className="font-medium">{video.title}</TableCell>
                  <TableCell>{format(parseISO(video.deliveryDate), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  <TableCell>
                    <Select value={video.status} onValueChange={(v) => handleStatusChange(video, v as VideoStatus)}>
                      <SelectTrigger className={`h-7 w-[140px] border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[video.status]}`}>
                        <SelectValue>{STATUS_LABELS[video.status]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{video.client || "-"}</TableCell>
                  <TableCell>{video.platform || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicate(video)} title="Duplicar">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(video)} title="Editar">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setVideoToDelete(video.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <VideoDialog
        open={isDialogOpen}
        onOpenChange={(o) => { setIsDialogOpen(o); if (!o) setDuplicateSource(null); }}
        video={selectedVideo}
        duplicateFrom={duplicateSource}
      />

      <AlertDialog open={!!videoToDelete} onOpenChange={(o) => !o && setVideoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este vídeo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteVideo.isPending}>
              {deleteVideo.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
