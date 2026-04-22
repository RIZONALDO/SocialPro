import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, User, Lock, AlertCircle, Eye, EyeOff, Check, X } from "lucide-react";
import { photoStorageUrl } from "@/components/photo-upload";
import { PASSWORD_RULES } from "@/lib/password-validation";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface BrandInfo {
  prosocialIconUrl: string | null;
}

async function fetchBrand(): Promise<BrandInfo> {
  try {
    const res = await fetch(`${BASE}/api/settings`, { credentials: "include" });
    if (!res.ok) return { prosocialIconUrl: null };
    const data = await res.json();
    return { prosocialIconUrl: data.prosocialIconUrl ?? null };
  } catch {
    return { prosocialIconUrl: null };
  }
}

async function checkHasUsers(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/auth/has-users`, { credentials: "include" });
    const data = await res.json();
    return data.hasUsers ?? false;
  } catch {
    return false;
  }
}

async function setupAdmin(username: string, password: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/api/auth/setup`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role: "admin" }),
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
  const [brand, setBrand] = useState<BrandInfo | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([checkHasUsers(), fetchBrand()]).then(([users, b]) => {
      setHasUsers(users);
      setBrand(b);
    });
  }, []);

  const isSetup = hasUsers === false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSetup) {
        const err = await setupAdmin(username, password);
        if (err) { setError(err); return; }
      }
      const err = await login(username, password);
      if (err) { setError(err); return; }
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  if (hasUsers === null || brand === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <div className="text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  const prosocialSrc = photoStorageUrl(brand.prosocialIconUrl);

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Left panel — ProSocial branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-primary p-12 gap-6">
        <div className="flex flex-col items-center gap-5 text-primary-foreground">
          {prosocialSrc ? (
            <img
              src={prosocialSrc}
              alt="ProSocial"
              className="h-32 w-32 object-contain rounded-2xl shadow-2xl"
            />
          ) : (
            <div className="h-32 w-32 flex items-center justify-center rounded-2xl bg-primary-foreground/10 shadow-2xl">
              <Video className="h-16 w-16 text-primary-foreground" />
            </div>
          )}
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">ProSocial</h1>
            <p className="mt-2 text-primary-foreground/70 text-sm">Gestão de produção de vídeos</p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex flex-col items-center gap-3">
          {prosocialSrc ? (
            <img
              src={prosocialSrc}
              alt="ProSocial"
              className="h-16 w-16 object-contain rounded-xl shadow-md"
            />
          ) : (
            <div className="h-16 w-16 flex items-center justify-center rounded-xl bg-primary shadow-md">
              <Video className="h-8 w-8 text-primary-foreground" />
            </div>
          )}
          <span className="font-semibold text-lg">ProSocial</span>
        </div>

        <div className="w-full max-w-sm space-y-8">
          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              {isSetup ? "Configuração inicial" : "Bem-vindo de volta"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSetup
                ? "Crie a conta do administrador para começar."
                : "Entre com seu usuário e senha para continuar."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Usuário
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="seu.usuario"
                  required
                  className="pl-9 h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isSetup ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pl-9 pr-10 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {isSetup && password.length > 0 && (
                <ul className="mt-1.5 space-y-1">
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

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 font-semibold"
              disabled={loading}
            >
              {loading
                ? "Aguarde..."
                : isSetup
                ? "Criar conta e entrar"
                : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
