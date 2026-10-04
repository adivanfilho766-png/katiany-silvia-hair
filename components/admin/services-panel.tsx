"use client";

import { useState } from "react";
import type { Service, ServiceCategory } from "@/lib/types";
import type { AdminPanelProps } from "./panel-types";

type ServiceDraft = Partial<Service>;
type CategoryDraft = Partial<ServiceCategory>;

function newService(data: AdminPanelProps["data"]): ServiceDraft {
  return {
    name: "",
    categoryId: data.categories.find((category) => category.active)?.id ?? "",
    description: "",
    estimatedDurationMinutes: 60,
    active: true,
    sortOrder: Math.max(0, ...data.services.map((service) => service.sortOrder)) + 1,
  };
}

function newCategory(data: AdminPanelProps["data"]): CategoryDraft {
  return {
    name: "",
    sortOrder: Math.max(0, ...data.categories.map((category) => category.sortOrder)) + 1,
    active: true,
  };
}

export default function ServicesPanel({ data, save, isSaving }: AdminPanelProps) {
  const [serviceDraft, setServiceDraft] = useState<ServiceDraft | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft | null>(null);

  async function submitService(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!serviceDraft) return;
    const isEditing = Boolean(serviceDraft.id);
    const path = isEditing ? `/api/admin/services/${serviceDraft.id}` : "/api/admin/services";
    const saved = await save(path, isEditing ? "PATCH" : "POST", serviceDraft, isEditing ? "Serviço atualizado com sucesso." : "Serviço criado com sucesso.");
    if (saved) setServiceDraft(null);
  }

  async function submitCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categoryDraft) return;
    const isEditing = Boolean(categoryDraft.id);
    const path = isEditing ? `/api/admin/categories/${categoryDraft.id}` : "/api/admin/categories";
    const saved = await save(path, isEditing ? "PATCH" : "POST", categoryDraft, isEditing ? "Categoria atualizada com sucesso." : "Categoria criada com sucesso.");
    if (saved) setCategoryDraft(null);
  }

  async function toggleService(service: Service) {
    await save(`/api/admin/services/${service.id}`, "PATCH", { ...service, active: !service.active }, service.active ? "Serviço desativado." : "Serviço ativado.");
  }

  async function toggleCategory(category: ServiceCategory) {
    await save(`/api/admin/categories/${category.id}`, "PATCH", { ...category, active: !category.active }, category.active ? "Categoria desativada." : "Categoria ativada.");
  }

  async function removeService(service: Service) {
    if (!window.confirm(`Tem certeza que deseja excluir “${service.name}”?`)) return;
    await save(`/api/admin/services/${service.id}`, "DELETE", undefined, "Serviço excluído.");
  }

  async function removeCategory(category: ServiceCategory) {
    if (!window.confirm(`Tem certeza que deseja excluir a categoria “${category.name}”?`)) return;
    await save(`/api/admin/categories/${category.id}`, "DELETE", undefined, "Categoria excluída.");
  }

  return (
    <div className="admin-editor-stack">
      <section className="admin-panel">
        <div className="admin-header-row">
          <div><h2>Serviços</h2><p className="muted-copy">Gerencie os serviços exibidos no agendamento.</p></div>
          <button type="button" className="primary-button" onClick={() => { setServiceDraft(newService(data)); setCategoryDraft(null); }}>+ NOVO SERVIÇO</button>
        </div>
        {!data.services.length ? <p className="empty-state">Nenhum serviço cadastrado.</p> : (
          <div className="admin-service-list">
            {data.services.slice().sort((left, right) => left.sortOrder - right.sortOrder).map((service) => (
              <article key={service.id} className="admin-service-item admin-service-row">
                <div><strong>{service.name}</strong><small>{data.categories.find((category) => category.id === service.categoryId)?.name ?? "Sem categoria"} · {service.estimatedDurationMinutes} min</small></div>
                <span className={`status-badge ${service.active ? "confirmed" : ""}`}>{service.active ? "Ativo" : "Inativo"}</span>
                <div className="admin-row-actions">
                  <button type="button" className="text-button" onClick={() => { setServiceDraft({ ...service }); setCategoryDraft(null); }}>EDITAR</button>
                  <button type="button" className="text-button" onClick={() => void toggleService(service)} disabled={isSaving}>{service.active ? "DESATIVAR" : "ATIVAR"}</button>
                  <button type="button" className="text-button danger" onClick={() => void removeService(service)} disabled={isSaving}>EXCLUIR</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {serviceDraft ? (
        <form className="admin-panel admin-edit-form" onSubmit={submitService}>
          <h2>{serviceDraft.id ? "Editar serviço" : "Novo serviço"}</h2>
          <div className="form-grid">
            <label>Nome<input value={serviceDraft.name ?? ""} maxLength={120} onChange={(event) => setServiceDraft((current) => ({ ...current, name: event.target.value }))} required /></label>
            <label>Categoria<select value={serviceDraft.categoryId ?? ""} onChange={(event) => setServiceDraft((current) => ({ ...current, categoryId: event.target.value }))} required>
              {data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select></label>
            <label className="form-span-two">Descrição<textarea value={serviceDraft.description ?? ""} maxLength={280} rows={2} onChange={(event) => setServiceDraft((current) => ({ ...current, description: event.target.value }))} required /></label>
            <label>Duração estimada (minutos)<input type="number" min={5} max={600} step={5} value={serviceDraft.estimatedDurationMinutes ?? 60} onChange={(event) => setServiceDraft((current) => ({ ...current, estimatedDurationMinutes: Number(event.target.value) }))} required /></label>
            <label>Ordem de exibição<input type="number" min={1} value={serviceDraft.sortOrder ?? 1} onChange={(event) => setServiceDraft((current) => ({ ...current, sortOrder: Number(event.target.value) }))} required /></label>
            <label className="toggle-field"><input type="checkbox" checked={Boolean(serviceDraft.active)} onChange={(event) => setServiceDraft((current) => ({ ...current, active: event.target.checked }))} /> Ativo</label>
          </div>
          <div className="admin-form-actions">
            <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? "SALVANDO..." : "SALVAR"}</button>
            <button type="button" className="secondary-button" disabled={isSaving} onClick={() => setServiceDraft(null)}>CANCELAR</button>
          </div>
        </form>
      ) : null}

      <section className="admin-panel">
        <div className="admin-header-row">
          <div><h2>Categorias</h2><p className="muted-copy">Categorias com serviços vinculados não podem ser excluídas.</p></div>
          <button type="button" className="secondary-button" onClick={() => { setCategoryDraft(newCategory(data)); setServiceDraft(null); }}>+ NOVA CATEGORIA</button>
        </div>
        {!data.categories.length ? <p className="empty-state">Nenhuma categoria cadastrada.</p> : (
          <div className="admin-service-list">
            {data.categories.slice().sort((left, right) => left.sortOrder - right.sortOrder).map((category) => (
              <article key={category.id} className="admin-service-item admin-service-row">
                <div><strong>{category.name}</strong><small>Ordem {category.sortOrder}</small></div>
                <span className={`status-badge ${category.active ? "confirmed" : ""}`}>{category.active ? "Ativa" : "Inativa"}</span>
                <div className="admin-row-actions">
                  <button type="button" className="text-button" onClick={() => { setCategoryDraft({ ...category }); setServiceDraft(null); }}>EDITAR</button>
                  <button type="button" className="text-button" onClick={() => void toggleCategory(category)} disabled={isSaving}>{category.active ? "DESATIVAR" : "ATIVAR"}</button>
                  <button type="button" className="text-button danger" onClick={() => void removeCategory(category)} disabled={isSaving}>EXCLUIR</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {categoryDraft ? (
        <form className="admin-panel admin-edit-form" onSubmit={submitCategory}>
          <h2>{categoryDraft.id ? "Editar categoria" : "Nova categoria"}</h2>
          <div className="form-grid">
            <label>Nome<input value={categoryDraft.name ?? ""} maxLength={100} onChange={(event) => setCategoryDraft((current) => ({ ...current, name: event.target.value }))} required /></label>
            <label>Ordem de exibição<input type="number" min={1} value={categoryDraft.sortOrder ?? 1} onChange={(event) => setCategoryDraft((current) => ({ ...current, sortOrder: Number(event.target.value) }))} required /></label>
            <label className="toggle-field"><input type="checkbox" checked={Boolean(categoryDraft.active)} onChange={(event) => setCategoryDraft((current) => ({ ...current, active: event.target.checked }))} /> Ativa</label>
          </div>
          <div className="admin-form-actions">
            <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? "SALVANDO..." : "SALVAR"}</button>
            <button type="button" className="secondary-button" disabled={isSaving} onClick={() => setCategoryDraft(null)}>CANCELAR</button>
          </div>
        </form>
      ) : null}
    </div>
  );
}