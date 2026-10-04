"use client";

import { useEffect, useState } from "react";
import type { SalonData } from "@/lib/repositories/salon-repository";
import type { AdminPanelProps, AdminSection, MutationMethod } from "./panel-types";
import AppointmentsPanel from "./appointments-panel";
import AgendaPanel from "./agenda-panel";
import ServicesPanel from "./services-panel";
import SchedulePanel from "./schedule-panel";
import SettingsPanel from "./settings-panel";

const sectionNames: Record<AdminSection, string> = {
  agendamentos: "Agendamentos",
  agenda: "Agenda do dia",
  servicos: "Serviços e categorias",
  horarios: "Horários de atendimento",
  configuracoes: "Configurações do salão",
};

export default function AdminWorkspace({ section }: { section: AdminSection }) {
  const [data, setData] = useState<SalonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);

  async function refreshData() {
    const response = await fetch("/api/admin/data", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message ?? "Não foi possível carregar os dados.");
    setData(result as SalonData);
  }

  useEffect(() => {
    let isCurrent = true;
    fetch("/api/admin/data", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message ?? "Não foi possível carregar os dados.");
        if (isCurrent) setData(result as SalonData);
      })
      .catch((error: unknown) => {
        if (isCurrent) setFeedback({ message: error instanceof Error ? error.message : "Não foi possível carregar os dados.", error: true });
      })
      .finally(() => { if (isCurrent) setIsLoading(false); });

    return () => { isCurrent = false; };
  }, []);

  async function save(path: string, method: MutationMethod, body?: unknown, successMessage = "Alterações salvas com sucesso.") {
    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await fetch(path, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message ?? "Não foi possível salvar. Tente novamente.");
      await refreshData();
      setFeedback({ message: successMessage, error: false });
      return true;
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : "Não foi possível salvar. Tente novamente.", error: true });
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  let panel: React.ReactNode = null;
  const props: AdminPanelProps | null = data ? { data, save, isSaving } : null;

  if (props) {
    if (section === "agendamentos") panel = <AppointmentsPanel {...props} />;
    if (section === "agenda") panel = <AgendaPanel {...props} />;
    if (section === "servicos") panel = <ServicesPanel {...props} />;
    if (section === "horarios") panel = <SchedulePanel {...props} />;
    if (section === "configuracoes") panel = <SettingsPanel {...props} />;
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header-row">
        <div>
          <p className="eyebrow">Painel administrativo</p>
          <h1>{sectionNames[section]}</h1>
        </div>
      </header>
      {feedback ? <p className={`admin-feedback ${feedback.error ? "error" : "success"}`} role="status">{feedback.message}</p> : null}
      {isLoading ? <p className="muted-copy">Carregando dados...</p> : null}
      {!isLoading && !data ? <p className="form-error">{feedback?.message ?? "Não foi possível carregar os dados."}</p> : panel}
    </div>
  );
}