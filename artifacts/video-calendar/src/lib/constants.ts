import { Role, VideoStatus } from "@workspace/api-client-react";

export const STATUS_LABELS: Record<VideoStatus, string> = {
  planejado: "Planejado",
  em_producao: "Em produção",
  em_edicao: "Em edição",
  entregue: "Entregue",
  publicado: "Publicado",
  cancelado: "Cancelado",
};

export const ROLE_LABELS: Record<Role, string> = {
  editor: "Edição",
  captador: "Captação",
  roteirista: "Roteirista",
  outro: "Outro",
};

export const ROLE_LABELS_PLURAL: Record<Role, string> = {
  editor: "Edições",
  captador: "Captações",
  roteirista: "Roteiristas",
  outro: "Outros",
};

export const STATUS_COLORS: Record<VideoStatus, string> = {
  planejado: "bg-gray-100 text-gray-800 border-gray-200",
  em_producao: "bg-blue-100 text-blue-800 border-blue-200",
  em_edicao: "bg-amber-100 text-amber-800 border-amber-200",
  entregue: "bg-emerald-100 text-emerald-800 border-emerald-200",
  publicado: "bg-purple-100 text-purple-800 border-purple-200",
  cancelado: "bg-red-100 text-red-800 border-red-200",
};
