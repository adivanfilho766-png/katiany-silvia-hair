"use client";

import { useState } from "react";
import type { ExtraSlot, ScheduleBlock, ScheduleBlockReason } from "@/lib/types";
import { formatDatePtBr } from "@/lib/formatters";
import type { AdminPanelProps } from "./panel-types";

const reasons: ScheduleBlockReason[] = ["Almoço", "Compromisso", "Folga", "Horário pessoal", "Outro"];

function getToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function newBlock(date: string, wholeDay = false): Partial<ScheduleBlock> {
  return { date, startTime: "12:00", endTime: "13:00", wholeDay, reason: wholeDay ? "Folga" : "Almoço", notes: "" };
}

export default function AgendaPanel({ data, save, isSaving }: AdminPanelProps) {
  const [date, setDate] = useState(getToday);
  const [blockDraft, setBlockDraft] = useState<Partial<ScheduleBlock> | null>(null);
  const [extraDraft, setExtraDraft] = useState<Partial<ExtraSlot> | null>(null);

  const dayAppointments = data.appointments.filter((appointment) => appointment.appointmentDate === date && appointment.status !== "CANCELLED")
    .sort((left, right) => left.startTime.localeCompare(right.startTime));
  const dayBlocks = data.blocks.filter((block) => block.date === date).sort((left, right) => left.startTime.localeCompare(right.startTime));
  const dayExtras = data.extraSlots.filter((slot) => slot.date === date).sort((left, right) => left.startTime.localeCompare(right.startTime));

  async function submitBlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!blockDraft) return;
    const isEditing = Boolean(blockDraft.id);
    const path = isEditing ? `/api/admin/blocks/${blockDraft.id}` : "/api/admin/blocks";
    const saved = await save(path, isEditing ? "PATCH" : "POST", blockDraft, blockDraft.wholeDay ? "Dia bloqueado com sucesso." : "Horário bloqueado com sucesso.");
    if (saved) setBlockDraft(null);
  }

  async function submitExtra(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!extraDraft) return;
    const saved = await save("/api/admin/extra-slots", "POST", extraDraft, "Encaixe criado com sucesso.");
    if (saved) setExtraDraft(null);
  }

  async function removeBlock(block: ScheduleBlock) {
    if (!window.confirm("Tem certeza que deseja remover este bloqueio?")) return;
    await save(`/api/admin/blocks/${block.id}`, "DELETE", undefined, "Bloqueio removido.");
  }

  async function removeExtra(slot: ExtraSlot) {
    if (!window.confirm("Tem certeza que deseja remover este encaixe?")) return;
    await save(`/api/admin/extra-slots/${slot.id}`, "DELETE", undefined, "Encaixe removido.");
  }

  return (
    <div className="admin-editor-stack">
      <section className="admin-panel">
        <div className="admin-header-row">
          <div><h2>Agenda diária</h2><p className="muted-copy">Consulte reservas, bloqueios e encaixes do dia.</p></div>
          <label>Data<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        </div>
        {!dayAppointments.length && !dayBlocks.length && !dayExtras.length ? <p className="empty-state">Nenhum agendamento ou bloqueio para este dia.</p> : (
          <div className="admin-service-list">
            {dayAppointments.map((appointment) => (
              <article className="admin-service-item" key={appointment.id}>
                <span><strong>{appointment.startTime}–{appointment.endTime} · {appointment.customerName}</strong><small>{appointment.serviceNames.join(", ")}</small></span>
                <span className={`status-badge ${appointment.status.toLowerCase()}`}>{appointment.status}</span>
              </article>
            ))}
            {dayBlocks.map((block) => (
              <article className="admin-service-item" key={block.id}>
                <span><strong>{block.wholeDay ? "Dia inteiro" : `${block.startTime}–${block.endTime}`} · {block.reason}</strong><small>{block.notes || "Bloqueio"}</small></span>
                <div className="admin-row-actions">
                  <button type="button" className="text-button" onClick={() => { setBlockDraft({ ...block }); setExtraDraft(null); }}>EDITAR</button>
                  <button type="button" className="text-button danger" onClick={() => void removeBlock(block)} disabled={isSaving}>REMOVER</button>
                </div>
              </article>
            ))}
            {dayExtras.map((slot) => (
              <article className="admin-service-item" key={slot.id}>
                <span><strong>{slot.startTime}–{slot.endTime} · Encaixe</strong><small>{slot.notes || "Horário excepcional"}</small></span>
                <button type="button" className="text-button danger" onClick={() => void removeExtra(slot)} disabled={isSaving}>REMOVER</button>
              </article>
            ))}
          </div>
        )}
      </section>

      {!blockDraft && !extraDraft ? (
        <div className="admin-form-actions admin-agenda-actions">
          <button type="button" className="secondary-button" onClick={() => { setBlockDraft(newBlock(date)); setExtraDraft(null); }}>+ BLOQUEAR HORÁRIO</button>
          <button type="button" className="secondary-button" onClick={() => { setBlockDraft(newBlock(date, true)); setExtraDraft(null); }}>BLOQUEAR DIA INTEIRO</button>
          <button type="button" className="primary-button" onClick={() => { setExtraDraft({ date, startTime: "19:00", endTime: "20:00", notes: "" }); setBlockDraft(null); }}>+ CRIAR ENCAIXE</button>
        </div>
      ) : null}

      {blockDraft ? (
        <form className="admin-panel admin-edit-form" onSubmit={submitBlock}>
          <h2>{blockDraft.id ? "Editar bloqueio" : blockDraft.wholeDay ? "Bloquear dia inteiro" : "Bloquear horário"}</h2>
          <div className="form-grid">
            <label>Data<input type="date" value={blockDraft.date ?? date} onChange={(event) => setBlockDraft((current) => ({ ...current, date: event.target.value }))} required /></label>
            <label>Motivo<select value={blockDraft.reason ?? "Outro"} onChange={(event) => setBlockDraft((current) => ({ ...current, reason: event.target.value as ScheduleBlockReason }))}>{reasons.map((reason) => <option key={reason}>{reason}</option>)}</select></label>
            {!blockDraft.wholeDay ? <>
              <label>Hora inicial<input type="time" value={blockDraft.startTime ?? ""} onChange={(event) => setBlockDraft((current) => ({ ...current, startTime: event.target.value }))} required /></label>
              <label>Hora final<input type="time" value={blockDraft.endTime ?? ""} onChange={(event) => setBlockDraft((current) => ({ ...current, endTime: event.target.value }))} required /></label>
            </> : null}
            <label className="form-span-two">Observação<textarea value={blockDraft.notes ?? ""} maxLength={300} rows={2} onChange={(event) => setBlockDraft((current) => ({ ...current, notes: event.target.value }))} /></label>
          </div>
          <div className="admin-form-actions">
            <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? "SALVANDO..." : "SALVAR BLOQUEIO"}</button>
            <button type="button" className="secondary-button" disabled={isSaving} onClick={() => setBlockDraft(null)}>CANCELAR</button>
          </div>
        </form>
      ) : null}

      {extraDraft ? (
        <form className="admin-panel admin-edit-form" onSubmit={submitExtra}>
          <h2>Criar encaixe</h2>
          <div className="form-grid">
            <label>Data<input type="date" value={extraDraft.date ?? date} onChange={(event) => setExtraDraft((current) => ({ ...current, date: event.target.value }))} required /></label>
            <label>Horário<input type="time" value={extraDraft.startTime ?? ""} onChange={(event) => setExtraDraft((current) => ({ ...current, startTime: event.target.value }))} required /></label>
            <label>Disponível até<input type="time" value={extraDraft.endTime ?? ""} onChange={(event) => setExtraDraft((current) => ({ ...current, endTime: event.target.value }))} required /></label>
            <label>Observação<input value={extraDraft.notes ?? ""} maxLength={300} onChange={(event) => setExtraDraft((current) => ({ ...current, notes: event.target.value }))} /></label>
          </div>
          <p className="muted-copy">O encaixe fica disponível mesmo fora do horário regular, respeitando a duração do serviço.</p>
          <div className="admin-form-actions">
            <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? "SALVANDO..." : "SALVAR ENCAIXE"}</button>
            <button type="button" className="secondary-button" disabled={isSaving} onClick={() => setExtraDraft(null)}>CANCELAR</button>
          </div>
        </form>
      ) : null}

      <section className="admin-panel">
        <h2>Resumo do dia {date ? formatDatePtBr(date) : ""}</h2>
        <p>{dayAppointments.length} agendamento(s) · {dayBlocks.length} bloqueio(s) · {dayExtras.length} encaixe(s)</p>
      </section>
    </div>
  );
}