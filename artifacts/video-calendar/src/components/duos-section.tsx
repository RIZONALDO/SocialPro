import { useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDuos,
  getListDuosQueryKey,
  useCreateDuo,
  useDeleteDuo,
  useListTeamMembers,
  getListTeamMembersQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DuosSection() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [captadorId, setCaptadorId] = useState<string>("");
  const [editorId, setEditorId] = useState<string>("");
  const [dailyGoal, setDailyGoal] = useState<number>(4);

  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: duos = [] } = useListDuos({ query: { queryKey: getListDuosQueryKey() } });
  const { data: members = [] } = useListTeamMembers({ query: { queryKey: getListTeamMembersQueryKey() } });
  const createDuo = useCreateDuo();
  const deleteDuo = useDeleteDuo();

  const captadores = members.filter((m) => m.role === "captador");
  const editores = members.filter((m) => m.role === "editor");

  const reset = () => {
    setName("");
    setCaptadorId("");
    setEditorId("");
    setDailyGoal(4);
  };

  const submit = () => {
    if (!name.trim()) {
      toast({ title: "Informe um nome para a dupla" });
      return;
    }
    createDuo.mutate(
      {
        data: {
          name: name.trim(),
          captadorId: captadorId ? parseInt(captadorId) : null,
          editorId: editorId ? parseInt(editorId) : null,
          dailyGoal,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListDuosQueryKey() });
          toast({ title: "Dupla criada" });
          reset();
          setOpen(false);
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Excluir esta dupla?")) return;
    deleteDuo.mutate({ id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListDuosQueryKey() });
        toast({ title: "Dupla excluída" });
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-5 w-5" /> Duplas
        </h2>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Nova Dupla
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Dupla</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome da dupla</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Dupla Alpha" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Captador</Label>
                  <Select value={captadorId} onValueChange={setCaptadorId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {captadores.map((m) => (
                        <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Editor</Label>
                  <Select value={editorId} onValueChange={setEditorId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {editores.map((m) => (
                        <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Meta diária de vídeos</Label>
                <Input
                  type="number"
                  min={1}
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(parseInt(e.target.value || "0"))}
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={submit} disabled={createDuo.isPending}>
                  {createDuo.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {duos.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-card text-muted-foreground text-sm">
          Nenhuma dupla cadastrada. Crie uma para acompanhar a meta de entregas.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {duos.map((d) => (
            <Card key={d.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{d.name}</CardTitle>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(d.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: d.captador?.color || "#d1d5db" }}
                  />
                  <span className="text-muted-foreground">Captador:</span>
                  <span className="font-medium">{d.captador?.name || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: d.editor?.color || "#d1d5db" }}
                  />
                  <span className="text-muted-foreground">Editor:</span>
                  <span className="font-medium">{d.editor?.name || "—"}</span>
                </div>
                <div className="text-muted-foreground pt-1">
                  Meta: <span className="font-semibold text-foreground">{d.dailyGoal} vídeos/dia</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
