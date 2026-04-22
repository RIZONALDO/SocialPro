import { useState, useRef } from "react";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUpload } from "@workspace/object-storage-web";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Camera, Loader2 } from "lucide-react";
import { photoStorageUrl } from "@/components/photo-upload";
import { useToast } from "@/hooks/use-toast";
import { UserManagement } from "@/components/user-management";

function ImageUpload({
  currentUrl,
  label,
  description,
  onUploaded,
}: {
  currentUrl?: string | null;
  label: string;
  description: string;
  onUploaded: (path: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useUpload({ onSuccess: (r) => onUploaded(r.objectPath) });

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    e.target.value = "";
  };

  const src = photoStorageUrl(currentUrl);

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative group cursor-pointer rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 transition-colors flex items-center justify-center h-20 w-20 overflow-hidden bg-muted/30"
        onClick={() => !isUploading && inputRef.current?.click()}
      >
        {src ? (
          <img src={src} alt={label} className="h-full w-full object-contain p-1" />
        ) : (
          <Camera className="h-7 w-7 text-muted-foreground/50" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
          {isUploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} disabled={isUploading} />
      </div>
      <div className="text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">{label}</p>
        <p>{description}</p>
        {src && (
          <button
            type="button"
            className="text-destructive hover:underline text-xs"
            onClick={() => onUploaded("")}
          >
            Remover
          </button>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();

  const [appName, setAppName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [calendarClientName, setCalendarClientName] = useState("");
  const [prosocialIconUrl, setProsocialIconUrl] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  if (settings && !initialized) {
    setAppName(settings.appName ?? "");
    setLogoUrl(settings.logoUrl ?? null);
    setCalendarClientName(settings.calendarClientName ?? "");
    setProsocialIconUrl(settings.prosocialIconUrl ?? null);
    setInitialized(true);
  }

  const save = () => {
    updateSettings.mutate(
      {
        data: {
          appName: appName || "Minha Produtora",
          logoUrl: logoUrl || null,
          calendarClientName: calendarClientName || null,
          prosocialIconUrl: prosocialIconUrl || null,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          toast({ title: "Configurações salvas" });
        },
      }
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-1">Personalize a identidade visual do sistema.</p>
      </div>

      {/* ProSocial (app identity) */}
      <Card>
        <CardHeader>
          <CardTitle>ProSocial</CardTitle>
          <CardDescription>
            Ícone do app que aparece na tela de login e no rodapé da barra lateral. O nome "ProSocial" é fixo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUpload
            currentUrl={prosocialIconUrl}
            label="Ícone ProSocial"
            description="Clique para enviar o ícone do app."
            onUploaded={(path) => setProsocialIconUrl(path || null)}
          />
        </CardContent>
      </Card>

      {/* Produtora (client identity) */}
      <Card>
        <CardHeader>
          <CardTitle>Produtora</CardTitle>
          <CardDescription>Nome e logo da empresa cuja agenda você gerencia. Aparecem no topo da barra lateral.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ImageUpload
            currentUrl={logoUrl}
            label="Logo da produtora"
            description="Clique para enviar o logo da empresa."
            onUploaded={(path) => setLogoUrl(path || null)}
          />
          <div className="space-y-2">
            <Label htmlFor="appName">Nome da produtora</Label>
            <Input
              id="appName"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Minha Produtora"
            />
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Calendário</CardTitle>
          <CardDescription>
            O nome do calendário é sempre <strong>Calendário</strong> seguido do nome do cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Nome do cliente</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Calendário</span>
              <Input
                id="clientName"
                value={calendarClientName}
                onChange={(e) => setCalendarClientName(e.target.value)}
                placeholder="Nome do cliente"
                className="flex-1"
              />
            </div>
          </div>
          {calendarClientName && (
            <div className="rounded-md bg-muted px-4 py-3 text-sm">
              Prévia: <span className="font-semibold">Calendário {calendarClientName}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={save} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
          <CardDescription>
            Gerencie quem tem acesso ao sistema. Membros da equipe só visualizam a Corrida do Bônus.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserManagement />
        </CardContent>
      </Card>
    </div>
  );
}
