import { useState, useEffect, useCallback } from "react";
import { useListTeamMembers, getListTeamMembersQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Trash2, UserPlus, RefreshCw, KeyRound, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PASSWORD_RULES, isPasswordValid } from "@/lib/password-validation";
import { PasswordInput } from "@/components/ui/password-input";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AppUser {
  id: number;
  username: string;
  role: string;
  teamMemberId: number | null;
  name: string | null;
}

async function fetchUsers(): Promise<AppUser[]> {
  const res = await fetch(`${BASE}/api/users`, { credentials: "include" });
  if (!res.ok) return [];
  return res.json();
}

async function createUser(payload: {
  username: string; password: string; role: string; teamMemberId?: number;
}): Promise<string | null> {
  const res = await fetch(`${BASE}/api/auth/setup`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.ok) return null;
  return ((await res.json()) as { error?: string }).error ?? "Erro ao criar usuário";
}

async function updateUser(id: number, payload: { role?: string; teamMemberId?: number | null }): Promise<string | null> {
  const res = await fetch(`${BASE}/api/users/${id}`, {
    method: "PUT", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.ok) return null;
  return ((await res.json()) as { error?: string }).error ?? "Erro ao atualizar usuário";
}

async function resetUserPassword(id: number, newPassword: string): Promise<string | null> {
  const res = await fetch(`${BASE}/api/users/${id}/reset-password`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword }),
  });
  if (res.ok) return null;
  return ((await res.json()) as { error?: string }).error ?? "Erro ao redefinir senha";
}

async function deleteUser(id: number): Promise<string | null> {
  const res = await fetch(`${BASE}/api/users/${id}`, {
    method: "DELETE", credentials: "include",
  });
  if (res.ok) return null;
  return ((await res.json()) as { error?: string }).error ?? "Erro ao remover usuário";
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  operator: "Operador",
  member: "Membro",
  creator: "Creator",
};

export function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const { data: members = [] } = useListTeamMembers({ query: { queryKey: getListTeamMembersQueryKey() } });
  const { toast } = useToast();

  // Create form
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("member");
  const [teamMemberId, setTeamMemberId] = useState<string>("none");
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editTarget, setEditTarget] = useState<AppUser | null>(null);
  const [editRole, setEditRole] = useState("member");
  const [editMemberId, setEditMemberId] = useState<string>("none");
  const [editing, setEditing] = useState(false);

  // Reset password dialog
  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Delete confirmation dialog
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoadingUsers(true);
    setUsers(await fetchUsers());
    setLoadingUsers(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid(password)) {
      toast({ title: "A senha não atende aos requisitos de segurança", variant: "destructive" });
      return;
    }
    setCreating(true);
    const err = await createUser({
      username, password, role,
      teamMemberId: teamMemberId !== "none" ? Number(teamMemberId) : undefined,
    });
    setCreating(false);
    if (err) { toast({ title: err, variant: "destructive" }); }
    else {
      toast({ title: "Usuário criado com sucesso" });
      setUsername(""); setPassword(""); setRole("member"); setTeamMemberId("none");
      await load();
    }
  };

  const openEdit = (u: AppUser) => {
    setEditTarget(u);
    setEditRole(u.role);
    setEditMemberId(u.teamMemberId ? String(u.teamMemberId) : "none");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditing(true);
    const err = await updateUser(editTarget.id, {
      role: editRole,
      teamMemberId: editMemberId !== "none" ? Number(editMemberId) : null,
    });
    setEditing(false);
    if (err) { toast({ title: err, variant: "destructive" }); }
    else {
      toast({ title: "Usuário atualizado" });
      setEditTarget(null);
      await load();
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    if (!isPasswordValid(resetPassword)) {
      toast({ title: "A senha não atende aos requisitos de segurança", variant: "destructive" });
      return;
    }
    setResetting(true);
    const err = await resetUserPassword(resetTarget.id, resetPassword);
    setResetting(false);
    if (err) { toast({ title: err, variant: "destructive" }); }
    else {
      toast({ title: `Senha de ${resetTarget.name ?? resetTarget.username} redefinida` });
      setResetTarget(null); setResetPassword("");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const err = await deleteUser(deleteTarget.id);
    setDeleting(false);
    if (err) { toast({ title: err, variant: "destructive" }); }
    else {
      toast({ title: "Usuário removido" });
      setDeleteTarget(null);
      await load();
    }
  };

  const usedMemberIds = new Set(
    users.filter(u => editTarget ? u.id !== editTarget.id : true).map(u => u.teamMemberId).filter(Boolean)
  );

  return (
    <div className="space-y-6">

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(v) => { if (!v) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar — {editTarget?.name ?? editTarget?.username}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Perfil de acesso</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador (acesso total)</SelectItem>
                  <SelectItem value="operator">Operador (cadastra vídeos)</SelectItem>
                  <SelectItem value="member">Membro (só Corrida do Bônus)</SelectItem>
                  <SelectItem value="creator">Creator (só Corrida do Bônus)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Membro da equipe</Label>
              <Select value={editMemberId} onValueChange={setEditMemberId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {members
                    .filter(m => !usedMemberIds.has(m.id))
                    .map(m => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name} ({m.role})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
              <Button type="submit" disabled={editing}>{editing ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(v) => { if (!v) { setResetTarget(null); setResetPassword(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Redefinir senha — {resetTarget?.name ?? resetTarget?.username}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="reset-pw">Nova senha</Label>
              <PasswordInput id="reset-pw" value={resetPassword}
                onChange={e => setResetPassword(e.target.value)}
                required autoFocus />
              {resetPassword.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(resetPassword);
                    return (
                      <li key={rule.id} className={`flex items-center gap-1.5 text-xs ${ok ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                        {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetTarget(null)}>Cancelar</Button>
              <Button type="submit" disabled={resetting || !isPasswordValid(resetPassword)}>
                {resetting ? "Salvando..." : "Redefinir"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover usuário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o acesso de{" "}
              <strong>{deleteTarget?.name ?? deleteTarget?.username}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Existing users */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Usuários cadastrados</p>
          <Button variant="ghost" size="icon" onClick={load} title="Atualizar">
            <RefreshCw className={`h-3.5 w-3.5 ${loadingUsers ? "animate-spin" : ""}`} />
          </Button>
        </div>
        {loadingUsers ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{u.name ?? u.username}</p>
                  <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                </div>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">
                    {ROLE_LABELS[u.role] ?? u.role}
                  </Badge>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary h-8 w-8"
                    title="Editar" onClick={() => openEdit(u)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary h-8 w-8"
                    title="Redefinir senha" onClick={() => { setResetTarget(u); setResetPassword(""); }}>
                    <KeyRound className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8"
                    title="Remover" onClick={() => setDeleteTarget(u)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create new user */}
      <form onSubmit={handleCreate} className="space-y-4 border rounded-md p-4">
        <p className="text-sm font-medium flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Novo usuário
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="u-username">Usuário</Label>
            <Input id="u-username" type="text" autoCapitalize="none"
              value={username} onChange={e => setUsername(e.target.value)}
              placeholder="ex: joao.silva" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-password">Senha inicial</Label>
            <PasswordInput id="u-password"
              value={password} onChange={e => setPassword(e.target.value)}
              required />
            {password.length > 0 && (
              <ul className="mt-1 space-y-1">
                {PASSWORD_RULES.map((rule) => {
                  const ok = rule.test(password);
                  return (
                    <li key={rule.id} className={`flex items-center gap-1.5 text-xs ${ok ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Perfil de acesso</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador (acesso total)</SelectItem>
                <SelectItem value="operator">Operador (cadastra vídeos)</SelectItem>
                <SelectItem value="member">Membro (só Corrida do Bônus)</SelectItem>
                <SelectItem value="creator">Creator (só Corrida do Bônus)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Membro da equipe (opcional)</Label>
            <Select value={teamMemberId} onValueChange={setTeamMemberId}>
              <SelectTrigger><SelectValue placeholder="Vincular a membro..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {members
                  .filter(m => !usedMemberIds.has(m.id))
                  .map(m => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.role})</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={creating || !isPasswordValid(password)}>{creating ? "Criando..." : "Criar usuário"}</Button>
        </div>
      </form>
    </div>
  );
}
