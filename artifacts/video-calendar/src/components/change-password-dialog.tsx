import { useState } from "react";
import { KeyRound, Check, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PASSWORD_RULES, isPasswordValid } from "@/lib/password-validation";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiChangePassword(currentPassword: string, newPassword: string): Promise<string | null> {
  const res = await fetch(`${BASE}/api/auth/change-password`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (res.ok) return null;
  const data = await res.json();
  return (data as { error?: string }).error ?? "Erro ao alterar senha";
}


function ChangePasswordForm({
  onSuccess,
  forced,
}: {
  onSuccess: () => void;
  forced?: boolean;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid(next)) {
      toast({ title: "A senha não atende aos requisitos", variant: "destructive" });
      return;
    }
    if (next !== confirm) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    setLoading(true);
    const err = await apiChangePassword(current, next);
    setLoading(false);
    if (err) {
      toast({ title: err, variant: "destructive" });
    } else {
      toast({ title: "Senha alterada com sucesso" });
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {forced && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2.5 text-sm text-yellow-700 dark:text-yellow-400">
          <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Uma senha temporária foi definida para sua conta. Por segurança, crie uma nova senha antes de continuar.
          </span>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="cp-current">Senha atual</Label>
        <PasswordInput
          id="cp-current"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cp-new">Nova senha</Label>
        <PasswordInput
          id="cp-new"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
        {next.length > 0 && (
          <ul className="mt-1.5 space-y-1">
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.test(next);
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
      <div className="space-y-1.5">
        <Label htmlFor="cp-confirm">Confirmar nova senha</Label>
        <PasswordInput
          id="cp-confirm"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {confirm.length > 0 && next !== confirm && (
          <p className="text-xs text-destructive mt-1">As senhas não coincidem</p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        {!forced && (
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading || !isPasswordValid(next) || next !== confirm}>
          {loading ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </div>
    </form>
  );
}

interface Props {
  collapsed?: boolean;
}

export function ChangePasswordDialog({ collapsed = false }: Props) {
  const [open, setOpen] = useState(false);

  const trigger = (
    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" title="Trocar senha">
      <KeyRound className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Trocar senha</DialogTitle>
        </DialogHeader>
        <ChangePasswordForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function ForcedChangePasswordDialog({ onDone }: { onDone: () => void }) {
  return (
    <Dialog open modal>
      <DialogContent
        className="sm:max-w-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideClose
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-yellow-500" />
            Troque sua senha
          </DialogTitle>
        </DialogHeader>
        <ChangePasswordForm onSuccess={onDone} forced />
      </DialogContent>
    </Dialog>
  );
}
