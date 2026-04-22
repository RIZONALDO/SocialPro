import { useState } from "react";
import { Plus, Trash2, Pencil, Mail, Phone } from "lucide-react";
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
import { ROLE_LABELS, ROLE_LABELS_PLURAL } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { PhotoCropUpload } from "@/components/photo-crop-upload";
import { photoStorageUrl } from "@/lib/photo-storage";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  role: z.nativeEnum(Role),
  color: z.string().min(1, "Cor é obrigatória"),
  photoUrl: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function MemberForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues: FormValues;
  onSubmit: (values: FormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <PhotoCropUpload
          currentPhotoUrl={form.watch("photoUrl")}
          name={form.watch("name")}
          color={form.watch("color")}
          onUploaded={(objectPath) =>
            form.setValue("photoUrl", objectPath, { shouldDirty: true, shouldValidate: true })
          }
        />
        <p className="text-xs text-center text-muted-foreground -mt-2">Clique na foto para alterar</p>

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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
              <FormControl>
                <Input type="email" placeholder="joao@exemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
              <FormControl>
                <Input type="tel" placeholder="(11) 99999-9999" {...field} />
              </FormControl>
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

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function EditMemberDialog({ member }: { member: TeamMember }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const updateMember = useUpdateTeamMember();

  const defaultValues: FormValues = {
    name: member.name,
    role: member.role as Role,
    color: member.color,
    photoUrl: member.photoUrl ?? "",
    email: member.email ?? "",
    phone: member.phone ?? "",
  };

  const onSubmit = (values: FormValues) => {
    updateMember.mutate(
      {
        id: member.id,
        data: {
          name: values.name,
          role: values.role,
          color: values.color,
          photoUrl: values.photoUrl || null,
          email: values.email || null,
          phone: values.phone || null,
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Editar membro">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Membro</DialogTitle>
        </DialogHeader>
        <MemberForm
          key={open ? member.id : `${member.id}-closed`}
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          isPending={updateMember.isPending}
        />
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

  const defaultCreateValues: FormValues = {
    name: "",
    role: "editor" as Role,
    color: "#3b82f6",
    photoUrl: "",
    email: "",
    phone: "",
  };

  const onSubmit = (values: FormValues) => {
    createMember.mutate(
      {
        data: {
          ...values,
          photoUrl: values.photoUrl || null,
          email: values.email || null,
          phone: values.phone || null,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTeamMembersQueryKey() });
          toast({ title: "Membro da equipe adicionado" });
          setIsDialogOpen(false);
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
            <MemberForm
              defaultValues={defaultCreateValues}
              onSubmit={onSubmit}
              isPending={createMember.isPending}
            />
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
                  <CardTitle className="text-lg">{ROLE_LABELS_PLURAL[roleKey as Role] ?? roleLabel}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {roleMembers.map(member => (
                    <div key={member.id} className="flex items-start justify-between group">
                      <div className="flex items-start gap-3 min-w-0">
                        <Avatar className="h-10 w-10 border-2 flex-shrink-0 mt-0.5" style={{ borderColor: member.color }}>
                          <AvatarImage src={photoStorageUrl(member.photoUrl)} alt={member.name} />
                          <AvatarFallback style={{ backgroundColor: member.color, color: "#fff" }}>
                            {member.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 space-y-0.5">
                          <p className="font-medium leading-none">{member.name}</p>
                          {member.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{member.email}</span>
                            </div>
                          )}
                          {member.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              <span>{member.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
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
