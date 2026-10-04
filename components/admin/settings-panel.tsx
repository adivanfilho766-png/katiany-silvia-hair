"use client";

import { useState } from "react";
import type { BusinessSettings } from "@/lib/types";
import type { AdminPanelProps } from "./panel-types";

export default function SettingsPanel({ data, save, isSaving }: AdminPanelProps) {
  const [draft, setDraft] = useState<BusinessSettings>(data.settings);

  function update(field: keyof BusinessSettings, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await save("/api/admin/settings", "PATCH", draft, "Configurações atualizadas com sucesso.");
  }

  return (
    <form className="admin-panel admin-edit-form" onSubmit={submit}>
      <div className="form-grid">
        <label>Nome do salão<input value={draft.businessName} maxLength={100} onChange={(event) => update("businessName", event.target.value)} required /></label>
        <label>Subtítulo<input value={draft.subtitle} maxLength={120} onChange={(event) => update("subtitle", event.target.value)} required /></label>
        <label className="form-span-two">Descrição curta<textarea value={draft.description} maxLength={280} rows={2} onChange={(event) => update("description", event.target.value)} required /></label>
        <label>WhatsApp<input type="tel" value={draft.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} required /></label>
        <label>Instagram<input value={draft.instagram} maxLength={120} onChange={(event) => update("instagram", event.target.value)} required /></label>
        <label>Endereço<input value={draft.street} maxLength={180} onChange={(event) => update("street", event.target.value)} required /></label>
        <label>Bairro/localidade<input value={draft.address} maxLength={120} onChange={(event) => update("address", event.target.value)} required /></label>
        <label className="form-span-two">Texto de funcionamento<textarea value={draft.openingText} maxLength={280} rows={2} onChange={(event) => update("openingText", event.target.value)} required /></label>
        <label className="form-span-two">Logo (caminho dentro de public)<input value={draft.logoUrl} maxLength={500} onChange={(event) => update("logoUrl", event.target.value)} /></label>
        <label className="color-field">Cor principal<input type="color" value={draft.primaryColor} onChange={(event) => update("primaryColor", event.target.value)} /></label>
        <label className="color-field">Cor secundária<input type="color" value={draft.secondaryColor} onChange={(event) => update("secondaryColor", event.target.value)} /></label>
        <label className="color-field">Cor de destaque<input type="color" value={draft.accentColor} onChange={(event) => update("accentColor", event.target.value)} /></label>
      </div>
      <div className="admin-form-actions">
        <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}</button>
        <button type="button" className="secondary-button" disabled={isSaving} onClick={() => setDraft(data.settings)}>CANCELAR</button>
      </div>
    </form>
  );
}