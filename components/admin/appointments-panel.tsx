"use client";

import { useMemo, useState } from "react";
import type { Appointment, AppointmentStatus } from "@/lib/types";
import { formatDatePtBr } from "@/lib/formatters";
import type { AdminPanelProps } from "./panel-types";

type Filter = "TODAY" | "UPCOMING" | AppointmentStatus | "ALL";

const filters: { id: Filter; label: string }[] = [
  { id: "TODAY", label: "Hoje" },
  { id: "UPCOMING", label: "Próximos" },
  { id: "PENDING", label: "Pendentes" },
  { id: "CONFIRMED", label: "Confirmados" },
  { id: "COMPLETED", label: "Concluídos" },
  { id: "CANCELLED", label: "Cancelados" },
  { id: "ALL", label: "Todos" },
];

const statusNames: Record<AppointmentStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

function getToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  if (local.length === 11) return `+55 (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  return `+55 ${local}`;
}

export default function AppointmentsPanel({ data, save, isSaving }: AdminPanelProps) {
  const [filter, setFilter] = useState<Filter>("TODAY");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [internalNotes, setInternalNotes] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);

  const selected = data.appointments.find((appointment) => appointment.id === selectedId) ?? null;

  const visibleAppointments = useMemo(() => {
    const today = getToday();
    const query = search.trim().toLocaleLowerCase("pt-BR");
    const phoneQuery = search.replace(/\D/g, "");

    return data.appointments
      .filter((appointment) => {
        if (filter === "TODAY" && appointment.appointmentDate !== today) return false;
        if (filter === "UPCOMING" && (appointment.appointmentDate < today || appointment.status === "CANCELLED" || appointment.status === "COMPLETED")) return false;
        if (["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].includes(filter) && appointment.status !== filter) return false;
        const matchesName = appointment.customerName.toLocaleLowerCase("pt-BR").includes(query);
        const matchesPhone = phoneQuery.length > 0 && appointment.customerWhatsapp.includes(phoneQuery);
        return !query || matchesName || matchesPhone;
      })
      .slice()
      .sort((left, right) => `${left.appointmentDate} ${left.startTime}`.localeCompare(`${right.appointmentDate} ${right.startTime}`));
  }, [data.appointments, filter, search]);

  async function updateStatus(appointment: Appointment, action: "CONFIRM" | "COMPLETE" | "CANCEL") {
    if (action === "CANCEL" && !window.confirm("Deseja realmente cancelar este agendamento?")) return;
    const success = action === "CONFIRM" ? "Agendamento confirmado." : action === "COMPLETE" ? "Atendimento concluído." : "Agendamento cancelado.";
    await save(`/api/admin/appointments/${appointment.id}`, "PATCH", { action }, success);
  }

  async function saveInternalNotes(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    await save(`/api/admin/appointments/${selected.id}`, "PATCH", { action: "NOTE", internalNotes }, "Observação interna salva.");
  }

  async function reschedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const success = await save(`/api/admin/appointments/${selected.id}`, "PATCH", {
      action: "RESCHEDULE",
      appointmentDate: rescheduleDate,
      startTime: rescheduleTime,
    }, "Agendamento reagendado com sucesso.");
    if (success) setIsRescheduling(false);
  }

  function beginReschedule(appointment: Appointment) {
    setRescheduleDate(appointment.appointmentDate);
    setRescheduleTime(appointment.startTime);
    setIsRescheduling(true);
  }

  function openAppointment(appointment: Appointment) {
    setInternalNotes(appointment.internalNotes ?? "");
    setIsRescheduling(false);
    setSelectedId(appointment.id);
  }

  return (
    <div className="admin-editor-stack">
      <section className="admin-panel">
        <div className="admin-header-row">
          <div><h2>Agendamentos</h2><p className="muted-copy">Busque clientes e acompanhe cada solicitação.</p></div>
          <label className="search-field">Buscar por nome ou WhatsApp<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome ou telefone" /></label>
        </div>
        <div className="filter-strip">
          {filters.map((item) => <button key={item.id} type="button" className={`filter-button ${filter === item.id ? "active" : ""}`} onClick={() => setFilter(item.id)}>{item.label}</button>)}
        </div>
        {!visibleAppointments.length ? <p className="empty-state">Nenhum agendamento encontrado.</p> : (
          <div className="admin-service-list">
            {visibleAppointments.map((appointment) => (
              <button type="button" className="appointment-row" key={appointment.id} onClick={() => openAppointment(appointment)}>
                <span><strong>{appointment.customerName}</strong><small>{formatDatePtBr(appointment.appointmentDate)} · {appointment.startTime}–{appointment.endTime}</small><small>{appointment.serviceNames.join(", ")}</small></span>
                <a className="admin-whatsapp-link" href={`https://wa.me/${appointment.customerWhatsapp}`} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>{formatWhatsapp(appointment.customerWhatsapp)}</a>
                <span className={`status-badge ${appointment.status.toLowerCase()}`}>{statusNames[appointment.status]}</span>
                {appointment.notes ? <small className="appointment-note">{appointment.notes}</small> : null}
              </button>
            ))}
          </div>
        )}
      </section>

      {selected ? (
        <div className="admin-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}>
          <section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="appointment-detail-title">
            <div className="admin-header-row">
              <div><p className="eyebrow">Detalhe do agendamento</p><h2 id="appointment-detail-title">{selected.customerName}</h2></div>
              <button type="button" className="text-button" onClick={() => setSelectedId(null)}>FECHAR</button>
            </div>
            <dl className="appointment-detail-grid">
              <div><dt>WhatsApp</dt><dd><a className="admin-whatsapp-link" href={`https://wa.me/${selected.customerWhatsapp}`} target="_blank" rel="noopener noreferrer">{formatWhatsapp(selected.customerWhatsapp)}</a></dd></div>
              <div><dt>Status</dt><dd>{statusNames[selected.status]}</dd></div>
              <div><dt>Data</dt><dd>{formatDatePtBr(selected.appointmentDate)}</dd></div>
              <div><dt>Horário</dt><dd>{selected.startTime}–{selected.endTime}</dd></div>
              <div className="form-span-two"><dt>Serviços</dt><dd>{selected.serviceNames.join(", ")}</dd></div>
              <div className="form-span-two"><dt>Observação da cliente</dt><dd>{selected.notes || "Nenhuma observação."}</dd></div>
            </dl>

            {selected.status === "PENDING" || selected.status === "CONFIRMED" ? (
              <div className="admin-row-actions appointment-actions">
                {selected.status === "PENDING" ? <button type="button" className="primary-button" disabled={isSaving} onClick={() => void updateStatus(selected, "CONFIRM")}>CONFIRMAR</button> : null}
                {selected.status === "CONFIRMED" ? <button type="button" className="primary-button" disabled={isSaving} onClick={() => void updateStatus(selected, "COMPLETE")}>CONCLUIR</button> : null}
                <button type="button" className="secondary-button" disabled={isSaving} onClick={() => beginReschedule(selected)}>REAGENDAR</button>
                <button type="button" className="secondary-button danger-button" disabled={isSaving} onClick={() => void updateStatus(selected, "CANCEL")}>CANCELAR AGENDAMENTO</button>
              </div>
            ) : selected.status === "CANCELLED" ? (
              <div className="admin-form-actions"><button type="button" className="secondary-button" disabled={isSaving} onClick={() => beginReschedule(selected)}>REAGENDAR</button></div>
            ) : null}

            {isRescheduling ? (
              <form className="admin-edit-form nested-form" onSubmit={reschedule}>
                <h3>Reagendar</h3>
                <div className="form-grid">
                  <label>Nova data<input type="date" value={rescheduleDate} onChange={(event) => setRescheduleDate(event.target.value)} required /></label>
                  <label>Novo horário<input type="time" value={rescheduleTime} onChange={(event) => setRescheduleTime(event.target.value)} required /></label>
                </div>
                <div className="admin-form-actions">
                  <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? "SALVANDO..." : "SALVAR NOVO HORÁRIO"}</button>
                  <button type="button" className="secondary-button" disabled={isSaving} onClick={() => setIsRescheduling(false)}>CANCELAR</button>
                </div>
              </form>
            ) : null}

            <form className="admin-edit-form nested-form" onSubmit={saveInternalNotes}>
              <label>Observação interna<textarea value={internalNotes} maxLength={1000} rows={3} onChange={(event) => setInternalNotes(event.target.value)} placeholder="Visível somente no painel administrativo" /></label>
              <div className="admin-form-actions"><button type="submit" className="secondary-button" disabled={isSaving}>{isSaving ? "SALVANDO..." : "SALVAR OBSERVAÇÃO"}</button></div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}