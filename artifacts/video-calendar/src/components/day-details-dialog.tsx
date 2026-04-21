import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Edit2, Clock, User } from "lucide-react";
import { Video } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { STATUS_COLORS, STATUS_LABELS, ROLE_LABELS } from "@/lib/constants";

interface DayDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  videos: Video[];
  onAdd: () => void;
  onEdit: (video: Video) => void;
}

function formatDuration(s?: number | null) {
  if (!s) return null;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

export function DayDetailsDialog({ open, onOpenChange, date, videos, onAdd, onEdit }: DayDetailsDialogProps) {
  if (!date) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="capitalize">
                {format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </DialogTitle>
              <DialogDescription>
                {videos.length === 0
                  ? "Nenhum vídeo neste dia."
                  : `${videos.length} ${videos.length === 1 ? "vídeo" : "vídeos"} neste dia.`}
              </DialogDescription>
            </div>
            <Button size="sm" onClick={onAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {videos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Clique em "Adicionar" para criar um vídeo nesta data.
            </p>
          ) : (
            videos.map((v) => {
              const duration = formatDuration(v.durationSeconds);
              const people = [
                v.editor && { role: "editor", name: v.editor.name, color: v.editor.color },
                v.captador && { role: "captador", name: v.captador.name, color: v.captador.color },
                v.roteirista && { role: "roteirista", name: v.roteirista.name, color: v.roteirista.color },
              ].filter(Boolean) as Array<{ role: keyof typeof ROLE_LABELS; name: string; color?: string | null }>;

              return (
                <div key={v.id} className="border rounded-lg p-3 space-y-2 hover:bg-muted/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{v.title}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold border ${STATUS_COLORS[v.status]}`}>
                          {STATUS_LABELS[v.status]}
                        </span>
                        {v.client && <span>{v.client}</span>}
                        {v.platform && <span>· {v.platform}</span>}
                        {duration && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {duration}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(v)} title="Editar">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {people.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {people.map((p, i) => (
                        <div key={i} className="inline-flex items-center gap-1.5 text-xs bg-muted rounded-full px-2 py-1">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: p.color || "#9ca3af" }}
                          />
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{p.name}</span>
                          <span className="text-muted-foreground">{ROLE_LABELS[p.role]}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {v.notes && (
                    <p className="text-xs text-muted-foreground border-t pt-2 whitespace-pre-wrap">{v.notes}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
