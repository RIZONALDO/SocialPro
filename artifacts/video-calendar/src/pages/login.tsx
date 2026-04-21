import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Video } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function checkHasUsers(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/auth/has-users`, { credentials: "include" });
    const data = await res.json();
    return data.hasUsers ?? false;
  } catch {
    return false;
  }
}

async function setupAdmin(email: string, password: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/api/auth/setup`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role: "admin" }),
    });
    if (res.ok) return null;
    const data = await res.json();
    return data.error ?? "Erro ao criar administrador";
  } catch {
    return "Erro de conexão";
  }
}

export default function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const { login } = useAuth();
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkHasUsers().then(setHasUsers);
  }, []);

  const isSetup = hasUsers === false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSetup) {
        const err = await setupAdmin(email, password);
        if (err) { setError(err); return; }
      }
      const err = await login(email, password);
      if (err) { setError(err); return; }
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  if (hasUsers === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Video className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-xl">
            {isSetup ? "Configuração Inicial" : "Entrar"}
          </CardTitle>
          {isSetup && (
            <CardDescription>
              Nenhum usuário cadastrado. Crie o primeiro administrador.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isSetup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Aguarde..." : isSetup ? "Criar administrador e entrar" : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
