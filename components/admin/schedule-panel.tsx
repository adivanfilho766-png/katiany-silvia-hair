"use client";

import { useState } from "react";
import type { ScheduleRule } from "@/lib/types";
import type { AdminPanelProps } from "./panel-types";

const weekdays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

function copyRules(rules: ScheduleRule[]) {
  return rules.map((rule) => ({
    ...rule,
    periods: (rule.periods?.length ? rule.periods : [{ startTime: rule.startTime, endTime: rule.endTime }]).map((period) => ({ ...period })),
  }));
}

export default function SchedulePanel({ data, save, isSaving }: AdminPanelProps) {
  const [draft, setDraft] = useState(() => copyRules(data.scheduleRules));

  function updateRule(index: number, changes: Partial<ScheduleRule>) {
    setDraft((current) => current.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...changes } : rule));
  }

  function updatePeriod(ruleIndex: number, periodIndex: number, field: "startTime" | "endTime", value: string) {
    setDraft((current) => current.map((rule, index) => index !== ruleIndex ? rule : {
      ...rule,
      periods: (rule.periods ?? []).map((period, currentPeriod) => currentPeriod === periodIndex ? { ...period, [field]: value } : period),
    }));
  }

  function addPeriod(index: number) {
    const periods = draft[index].periods ?? [];
    const continuousDay = periods.length === 1 ? periods[0] : undefined;

    if (continuousDay && continuousDay.startTime < "12:00" && continuousDay.endTime > "14:00") {
      updateRule(index, {
        periods: [
          { ...continuousDay, endTime: "12:00" },
          { startTime: "14:00", endTime: continuousDay.endTime },
        ],
      });
      return;
    }

    const lastPeriod = periods.at(-1);
    const startTime = lastPeriod?.endTime ?? "14:00";
    const endTime = startTime < "23:00" ? "23:00" : "23:59";
    if (startTime < endTime) updateRule(index, { periods: [...periods, { startTime, endTime }] });
  }

  function removePeriod(ruleIndex: number, periodIndex: number) {
    updateRule(ruleIndex, { periods: draft[ruleIndex].periods?.filter((_, index) => index !== periodIndex) });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await save("/api/admin/schedule", "PUT", draft, "Horários atualizados com sucesso.");
  }

  return (
    <form className="admin-editor-stack" onSubmit={submit}>
      {draft.slice().sort((left, right) => left.weekday - right.weekday).map((rule) => {
        const ruleIndex = draft.findIndex((item) => item.weekday === rule.weekday);
        return (
          <section className="admin-panel schedule-day" key={rule.id}>
            <div className="admin-header-row">
              <h2>{weekdays[rule.weekday]}</h2>
              <label className="toggle-field"><input type="checkbox" checked={rule.enabled} onChange={(event) => updateRule(ruleIndex, { enabled: event.target.checked })} /> Atende neste dia</label>
            </div>
            {rule.enabled ? (
              <>
                <label className="interval-field">Intervalo padrão entre horários (minutos)
                  <input type="number" min={5} max={360} step={5} value={rule.slotIntervalMinutes} onChange={(event) => updateRule(ruleIndex, { slotIntervalMinutes: Number(event.target.value) })} required />
                </label>
                <div className="period-list">
                  {(rule.periods ?? []).map((period, periodIndex) => (
                    <div className="period-row" key={`${rule.id}-${periodIndex}`}>
                      <label>Início<input type="time" value={period.startTime} onChange={(event) => updatePeriod(ruleIndex, periodIndex, "startTime", event.target.value)} required /></label>
                      <label>Fim<input type="time" value={period.endTime} onChange={(event) => updatePeriod(ruleIndex, periodIndex, "endTime", event.target.value)} required /></label>
                      <button type="button" className="text-button danger" onClick={() => removePeriod(ruleIndex, periodIndex)} disabled={(rule.periods?.length ?? 0) <= 1}>REMOVER PERÍODO</button>
                    </div>
                  ))}
                </div>
                <button type="button" className="text-button" onClick={() => addPeriod(ruleIndex)}>+ ADICIONAR PERÍODO</button>
              </>
            ) : <p className="muted-copy">Este dia ficará fechado para novos agendamentos.</p>}
          </section>
        );
      })}
      <div className="admin-form-actions">
        <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? "SALVANDO..." : "SALVAR HORÁRIOS"}</button>
        <button type="button" className="secondary-button" disabled={isSaving} onClick={() => setDraft(copyRules(data.scheduleRules))}>CANCELAR</button>
      </div>
    </form>
  );
}