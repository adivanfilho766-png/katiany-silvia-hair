import type { SalonData } from "@/lib/repositories/salon-repository";

export type AdminSection = "agendamentos" | "agenda" | "servicos" | "horarios" | "configuracoes";
export type MutationMethod = "POST" | "PATCH" | "PUT" | "DELETE";

export type SaveAction = (
  path: string,
  method: MutationMethod,
  body?: unknown,
  successMessage?: string,
) => Promise<boolean>;

export interface AdminPanelProps {
  data: SalonData;
  save: SaveAction;
  isSaving: boolean;
}