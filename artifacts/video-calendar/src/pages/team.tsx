import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";

import {
  useListTeamMembers,
  getListTeamMembersQueryKey,
  useCreateTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember,
  Role,
  type TeamMember,
} from "@workspace/api-client-react";
import { ROLE_LABELS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { DuosSection } from "@/components/duos-section";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  role: z.nativeEnum(Role),
  color: z.string().min(1, "Cor é obrigatória"),
  photoUrl: z.string().url("URL inválida").optional().or(z.literal("")),
});

function EditMemberDialog({ member }: { member: TeamMember }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const updateMember = useUpdateTeamMember();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: member.name,
      role: member.role as Role,
      color: member.color,
      photoUrl: member.photoUrl ?? "",
    },
  });

  const handleOpen = (o: boolean) => {
    if (o) {
      form.reset({
        name: member.name,
        role: member.role as Role,
        color: member.color,
        photoUrl: member.photoUrl ?? "",
      });
    }
    setOpen(o);
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    updateMember.mutate(
      {
        id: member.id,
        data: {
          name: values.name,
          role: values.role,
          color: values.color,
          photoUrl: values.photoUrl || null,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListTeamMembersQueryKey() });
          toast({ title: "Membro atualizado" });
          setOpen(false);
        },
      }
    );
  };

  const photoUrl = form.watch("photoUrl");

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Editar membro">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Membro</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex justify-center">
              <Avatar className="h-20 w-20 border-2" style={{ borderColor: form.watch("color") }}>
                <AvatarImage src={photoUrl || undefined} alt={form.watch("name")} />
                <AvatarFallback style={{ backgroundColor: form.watch("color"), color: "#fff", fontSize: "1.5rem" }}>
                  {form.watch("name").substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: João Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Função</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor (UI)</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input type="color" className="w-12 h-10 p-1" {...field} />
                      <Input type="text" className="flex-1" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Foto (URL da imagem)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={updateMember.isPending}>
                {updateMember.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Team() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: members = [], isLoading } = useListTeamMembers({
    query: { queryKey: getListTeamMembersQueryKey() }
  });

  const createMember = useCreateTeamMember();
  const deleteMember = useDeleteTeamMember();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      role: "editor" as Role,
      color: "#3b82f6",
      photoUrl: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createMember.mutate(
      { data: { ...values, photoUrl: values.photoUrl || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTeamMembersQueryKey() });
          toast({ title: "Membro da equipe adicionado" });
          setIsDialogOpen(false);
          form.reset();
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este membro?")) {
      deleteMember.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTeamMembersQueryKey() });
          toast({ title: "Membro excluído" });
        }
      });
    }
  };

  const groupedMembers = members.reduce((acc, member) => {
    if (!acc[member.role]) acc[member.role] = [];
    acc[member.role]!.push(member);
    return acc;
  }, {} as Record<string, typeof members>);

  const createPhotoUrl = form.watch("photoUrl");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Equipe</h1>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Membro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Membro</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex justify-center">
                  <Avatar className="h-16 w-16 border-2" style={{ borderColor: form.watch("color") }}>
                    <AvatarImage src={createPhotoUrl || undefined} />
                    <AvatarFallback style={{ backgroundColor: form.watch("color"), color: "#fff", fontSize: "1.2rem" }}>
                      {form.watch("name").substring(0, 2).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: João Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Função</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(ROLE_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor (UI)</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input type="color" className="w-12 h-10 p-1" {...field} />
                          <Input type="text" className="flex-1" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="photoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Foto (URL da imagem)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createMember.isPending}>
                    {createMember.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card text-muted-foreground">
          Nenhum membro cadastrado.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(ROLE_LABELS).map(([roleKey, roleLabel]) => {
            const roleMembers = groupedMembers[roleKey] || [];
            if (roleMembers.length === 0) return null;

            return (
              <Card key={roleKey}>
                <CardHeader>
                  <CardTitle className="text-lg">{roleLabel}s</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {roleMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2" style={{ borderColor: member.color }}>
                          <AvatarImage src={member.photoUrl ?? undefined} alt={member.name} />
                          <AvatarFallback style={{ backgroundColor: member.color, color: "#fff" }}>
                            {member.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium leading-none">{member.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <EditMemberDialog member={member} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(member.id)}
                          disabled={deleteMember.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="pt-6 border-t">
        <DuosSection />
      </div>
    </div>
  );
}
