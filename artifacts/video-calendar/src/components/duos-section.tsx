import { useState } from "react";
import { Plus, Trash2, Users, Pencil } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDuos,
  getListDuosQueryKey,
  useCreateDuo,
  useUpdateDuo,
  useDeleteDuo,
  useListTeamMembers,
  getListTeamMembersQueryKey,
  type Duo,
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

const NONE = "__none__";

interface DuoFormFields {
  name: string;
  captadorId: string;
  editorId: string;
  dailyGoal: number;
}

function DuoForm({
  fields,
  onChange,
  captadores,
  editores,
}: {
  fields: DuoFormFields;
  onChange: (f: Partial<DuoFormFields>) => void;
  captadores: { id: number; name: string }[];
  editores: { id: number; name: string }[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Nome da dupla</Label>
        <Input
          value={fields.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Ex: Dupla Alpha"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Captador</Label>
          <Select
            value={fields.captadorId || NONE}
            onValueChange={(v) => onChange({ captadorId: v === NONE ? "" : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>— nenhum —</SelectItem>
              {captadores.map((m) => (
                <SelectItem key={m.id} value={m.id.toString()}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Editor</Label>
          <Select
            value={fields.editorId || NONE}
            onValueChange={(v) => onChange({ editorId: v === NONE ? "" : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>— nenhum —</SelectItem>
              {editores.map((m) => (
                <SelectItem key={m.id} value={m.id.toString()}>
                  {m.name}
                </SelectItem>
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
          value={fields.dailyGoal}
          onChange={(e) =>
            onChange({ dailyGoal: parseInt(e.target.value || "1") || 1 })
          }
        />
      </div>
    </div>
  );
}

function EditDuoDialog({
  duo,
  captadores,
  editores,
}: {
  duo: Duo;
  captadores: { id: number; name: string }[];
  editores: { id: number; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<DuoFormFields>({
    name: duo.name,
    captadorId: duo.captadorId?.toString() ?? "",
    editorId: duo.editorId?.toString() ?? "",
    dailyGoal: duo.dailyGoal,
  });

  const qc = useQueryClient();
  const { toast } = useToast();
  const updateDuo = useUpdateDuo();

  const handleOpen = (o: boolean) => {
    if (o) {
      setFields({
        name: duo.name,
        captadorId: duo.captadorId?.toString() ?? "",
        editorId: duo.editorId?.toString() ?? "",
        dailyGoal: duo.dailyGoal,
      });
    }
    setOpen(o);
  };

  const save = () => {
    if (!fields.name.trim()) {
      toast({ title: "Informe um nome para a dupla" });
      return;
    }
    updateDuo.mutate(
      {
        id: duo.id,
        data: {
          name: fields.name.trim(),
          captadorId: fields.captadorId ? parseInt(fields.captadorId) : null,
          editorId: fields.editorId ? parseInt(fields.editorId) : null,
          dailyGoal: fields.dailyGoal,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListDuosQueryKey() });
          toast({ title: "Dupla atualizada" });
          setOpen(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Editar dupla">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Dupla</DialogTitle>
        </DialogHeader>
        <DuoForm
          fields={fields}
          onChange={(f) => setFields((prev) => ({ ...prev, ...f }))}
          captadores={captadores}
          editores={editores}
        />
        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={updateDuo.isPending}>
            {updateDuo.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DuosSection() {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<DuoFormFields>({
    name: "",
    captadorId: "",
    editorId: "",
    dailyGoal: 4,
  });

  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: duos = [] } = useListDuos({
    query: { queryKey: getListDuosQueryKey() },
  });
  const { data: members = [] } = useListTeamMembers({
    query: { queryKey: getListTeamMembersQueryKey() },
  });
  const createDuo = useCreateDuo();
  const deleteDuo = useDeleteDuo();

  const captadores = members.filter((m) => m.role === "captador");
  const editores = members.filter((m) => m.role === "editor");

  const resetFields = () =>
    setFields({ name: "", captadorId: "", editorId: "", dailyGoal: 4 });

  const submit = () => {
    if (!fields.name.trim()) {
      toast({ title: "Informe um nome para a dupla" });
      return;
    }
    createDuo.mutate(
      {
        data: {
          name: fields.name.trim(),
          captadorId: fields.captadorId ? parseInt(fields.captadorId) : null,
          editorId: fields.editorId ? parseInt(fields.editorId) : null,
          dailyGoal: fields.dailyGoal,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListDuosQueryKey() });
          toast({ title: "Dupla criada" });
          resetFields();
          setOpen(false);
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Excluir esta dupla?")) return;
    deleteDuo.mutate(
      { id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListDuosQueryKey() });
          toast({ title: "Dupla excluída" });
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-5 w-5" /> Duplas
        </h2>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) resetFields();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Nova Dupla
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Dupla</DialogTitle>
            </DialogHeader>
            <DuoForm
              fields={fields}
              onChange={(f) => setFields((prev) => ({ ...prev, ...f }))}
              captadores={captadores}
              editores={editores}
            />
            <div className="flex justify-end pt-2">
              <Button onClick={submit} disabled={createDuo.isPending}>
                {createDuo.isPending ? "Salvando..." : "Salvar"}
              </Button>
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
                  <div className="flex items-center gap-1">
                    <EditDuoDialog
                      duo={d}
                      captadores={captadores}
                      editores={editores}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      title="Excluir dupla"
                      onClick={() => handleDelete(d.id)}
                      disabled={deleteDuo.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
                  Meta:{" "}
                  <span className="font-semibold text-foreground">
                    {d.dailyGoal} vídeos/dia
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
