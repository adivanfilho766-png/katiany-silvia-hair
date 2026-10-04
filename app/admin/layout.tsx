import Link from "next/link";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-brand">Katiany Silvia Hair</Link>
        <nav className="admin-nav">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/agendamentos">Agendamentos</Link>
          <Link href="/admin/agenda">Agenda</Link>
          <Link href="/admin/servicos">Serviços</Link>
          <Link href="/admin/horarios">Horários</Link>
          <Link href="/admin/configuracoes">Configurações</Link>
        </nav>
        <form action="/api/admin/logout" method="post">
          <button type="submit" className="secondary-button">SAIR</button>
        </form>
      </aside>
      <main className="admin-content">{children}</main>
    </div>
  );
}
