import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import {
  useCreateVideo,
  useUpdateVideo,
  useListTeamMembers,
  useListDuos,
  getListDuosQueryKey,
  VideoStatus,
  Video,
  getGetDashboardSummaryQueryKey,
  getListVideosQueryKey,
  getGetWeeklyReportQueryKey
} from "@workspace/api-client-react";
import { STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Users } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  deliveryDate: z.date({
    required_error: "Data de entrega é obrigatória",
  }),
  status: z.nativeEnum(VideoStatus),
  client: z.string().optional(),
  platform: z.string().optional(),
  durationSeconds: z.coerce.number().optional().nullable(),
  editorId: z.coerce.number().optional().nullable(),
  captadorId: z.coerce.number().optional().nullable(),
  roteiristaId: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

interface VideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video?: Video | null;
  defaultDate?: Date | null;
  duplicateFrom?: Video | null;
}

export function VideoDialog({ open, onOpenChange, video, defaultDate, duplicateFrom }: VideoDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createVideo = useCreateVideo();
  const updateVideo = useUpdateVideo();
  const { data: teamMembers } = useListTeamMembers();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      deliveryDate: defaultDate || new Date(),
      status: "planejado",
      client: "",
      platform: "",
      durationSeconds: null,
      editorId: null,
      captadorId: null,
      roteiristaId: null,
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (video) {
        form.reset({
          title: video.title,
          deliveryDate: new Date(video.deliveryDate),
          status: video.status,
          client: video.client || "",
          platform: video.platform || "",
          durationSeconds: video.durationSeconds,
          editorId: video.editorId,
          captadorId: video.captadorId,
          roteiristaId: video.roteiristaId,
          notes: video.notes || "",
        });
      } else if (duplicateFrom) {
        form.reset({
          title: `${duplicateFrom.title} (cópia)`,
          deliveryDate: new Date(),
          status: "planejado",
          client: duplicateFrom.client || "",
          platform: duplicateFrom.platform || "",
          durationSeconds: duplicateFrom.durationSeconds,
          editorId: duplicateFrom.editorId,
          captadorId: duplicateFrom.captadorId,
          roteiristaId: duplicateFrom.roteiristaId,
          notes: duplicateFrom.notes || "",
        });
      } else {
        form.reset({
          title: "",
          deliveryDate: defaultDate || new Date(),
          status: "planejado",
          client: "",
          platform: "",
          durationSeconds: null,
          editorId: null,
          captadorId: null,
          roteiristaId: null,
          notes: "",
        });
      }
    }
  }, [open, video, defaultDate, duplicateFrom, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const payload = {
      ...values,
      deliveryDate: format(values.deliveryDate, "yyyy-MM-dd"),
      client: values.client || null,
      platform: values.platform || null,
      durationSeconds: values.durationSeconds || null,
      editorId: values.editorId || null,
      captadorId: values.captadorId || null,
      roteiristaId: values.roteiristaId || null,
      notes: values.notes || null,
    };

    if (video) {
      updateVideo.mutate(
        { id: video.id, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetWeeklyReportQueryKey() });
            toast({ title: "Vídeo atualizado com sucesso" });
            onOpenChange(false);
          },
        }
      );
    } else {
      createVideo.mutate(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetWeeklyReportQueryKey() });
            toast({ title: "Vídeo criado com sucesso" });
            onOpenChange(false);
          },
        }
      );
    }
  };

  const { data: duos } = useListDuos({ query: { queryKey: getListDuosQueryKey() } });

  const watchedEditorId = form.watch("editorId");
  const watchedCaptadorId = form.watch("captadorId");

  // Auto-fill captador when editor is selected
  useEffect(() => {
    if (!watchedEditorId || !duos) return;
    const duo = duos.find((d) => d.editorId === watchedEditorId);
    if (duo?.captadorId != null && form.getValues("captadorId") !== duo.captadorId) {
      form.setValue("captadorId", duo.captadorId);
    }
  }, [watchedEditorId, duos]);

  // Auto-fill editor when captador is selected
  useEffect(() => {
    if (!watchedCaptadorId || !duos) return;
    const duo = duos.find((d) => d.captadorId === watchedCaptadorId);
    if (duo?.editorId != null && form.getValues("editorId") !== duo.editorId) {
      form.setValue("editorId", duo.editorId);
    }
  }, [watchedCaptadorId, duos]);

  // Find the duo that matches the current editor+captador combination
  const matchedDuo = duos?.find(
    (d) =>
      d.editorId === watchedEditorId &&
      d.captadorId === watchedCaptadorId &&
      watchedEditorId != null &&
      watchedCaptadorId != null
  ) ?? null;

  const isPending = createVideo.isPending || updateVideo.isPending;

  const editors = teamMembers?.filter((m) => m.role === "editor") ?? [];
  const captadores = teamMembers?.filter((m) => m.role === "captador") ?? [];
  const roteiristas = teamMembers?.filter((m) => m.role === "roteirista") ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{video ? "Editar Vídeo" : duplicateFrom ? "Duplicar Vídeo" : "Novo Vídeo"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Campanha de Inverno" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="deliveryDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Entrega</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="client"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do cliente" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plataforma</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Instagram, YouTube" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="editorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Editor</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))}
                      value={field.value ? field.value.toString() : "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {editors.map((member) => (
                          <SelectItem key={member.id} value={member.id.toString()}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="captadorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Captador</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))}
                      value={field.value ? field.value.toString() : "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {captadores.map((member) => (
                          <SelectItem key={member.id} value={member.id.toString()}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roteiristaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roteirista</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))}
                      value={field.value ? field.value.toString() : "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {roteiristas.map((member) => (
                          <SelectItem key={member.id} value={member.id.toString()}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {matchedDuo && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                <Users className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-muted-foreground">Dupla detectada:</span>
                  <span className="font-semibold text-primary">{matchedDuo.name}</span>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações adicionais..." {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
