import { useState, useEffect, useCallback } from "react";
import { useListTeamMembers, getListTeamMembersQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  username: string;
  password: string;
  role: string;
  teamMemberId?: number;
}): Promise<string | null> {
  const res = await fetch(`${BASE}/api/auth/setup`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.ok) return null;
  const data = await res.json();
  return (data as { error?: string }).error ?? "Erro ao criar usuário";
}

async function deleteUser(id: number): Promise<string | null> {
  const res = await fetch(`${BASE}/api/users/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (res.ok) return null;
  const data = await res.json();
  return (data as { error?: string }).error ?? "Erro ao remover usuário";
}

export function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const { data: members = [] } = useListTeamMembers({
    query: { queryKey: getListTeamMembersQueryKey() },
  });
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("member");
  const [teamMemberId, setTeamMemberId] = useState<string>("none");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoadingUsers(true);
    const data = await fetchUsers();
    setUsers(data);
    setLoadingUsers(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const err = await createUser({
      username,
      password,
      role,
      teamMemberId: teamMemberId && teamMemberId !== "none" ? Number(teamMemberId) : undefined,
    });
    setCreating(false);
    if (err) {
      toast({ title: err, variant: "destructive" });
    } else {
      toast({ title: "Usuário criado com sucesso" });
      setUsername("");
      setPassword("");
      setRole("member");
      setTeamMemberId("none");
      await load();
    }
  };

  const handleDelete = async (id: number, name: string | null) => {
    if (!confirm(`Remover acesso de ${name ?? "usuário"}?`)) return;
    const err = await deleteUser(id);
    if (err) {
      toast({ title: err, variant: "destructive" });
    } else {
      toast({ title: "Usuário removido" });
      await load();
    }
  };

  const usedMemberIds = new Set(users.map((u) => u.teamMemberId).filter(Boolean));

  return (
    <div className="space-y-6">
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
                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                  <Badge
                    variant={u.role === "admin" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {u.role === "admin" ? "Admin" : u.role === "operator" ? "Operador" : "Membro"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                    onClick={() => handleDelete(u.id, u.name)}
                  >
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
            <Input
              id="u-username"
              type="text"
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex: joao.silva"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-password">Senha inicial</Label>
            <Input
              id="u-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Perfil de acesso</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador (acesso total)</SelectItem>
                <SelectItem value="operator">Operador (cadastra vídeos)</SelectItem>
                <SelectItem value="member">Membro (só Corrida do Bônus)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Membro da equipe (opcional)</Label>
            <Select value={teamMemberId} onValueChange={setTeamMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="Vincular a membro..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {members
                  .filter((m) => !usedMemberIds.has(m.id))
                  .map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name} ({m.role})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={creating}>
            {creating ? "Criando..." : "Criar usuário"}
          </Button>
        </div>
      </form>
    </div>
  );
}
