import Link from "next/link";
import { getSalonData } from "@/lib/services/salon-service";
import { getDashboardSummary } from "@/lib/services/salon-service";
import { formatDatePtBr } from "@/lib/formatters";

const weekdayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

function whatsappDigits(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function formatWhatsapp(phone: string) {
  const digits = whatsappDigits(phone).slice(2);

  if (digits.length === 11) {
    return `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  return `+55 ${digits}`;
}

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const data = await getSalonData();
  const today = new Intl.DateTimeFormat("en-CA").format(new Date());
  const summary = getDashboardSummary(data, today);

  return (
    <div className="admin-dashboard">
      <header className="admin-header-row">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Agenda e atendimentos</h1>
        </div>
        <Link href="/agendar" className="primary-button">Visualizar site</Link>
      </header>

      <section className="admin-metrics">
        <article className="metric-card">
          <span>Agendamentos hoje</span>
          <strong>{summary.today}</strong>
        </article>
        <article className="metric-card">
          <span>Pendentes</span>
          <strong>{summary.pending}</strong>
        </article>
        <article className="metric-card">
          <span>Confirmados</span>
          <strong>{summary.confirmed}</strong>
        </article>
        <article className="metric-card">
          <span>Próximos atendimentos</span>
          <strong>{summary.upcoming.length}</strong>
        </article>
      </section>

      <section className="admin-panel-grid">
        <div className="admin-panel" id="agendamentos">
          <h2>Agenda</h2>
          <div className="mini-list">
            {summary.upcoming.map((appointment) => (
                <div key={appointment.id} className="mini-list-item">
                <div>
                  <strong>{appointment.customerName}</strong>
                    <small>{formatDatePtBr(appointment.appointmentDate)} · {appointment.startTime}</small>
                    <a
                      className="admin-whatsapp-link"
                      href={`https://wa.me/${whatsappDigits(appointment.customerWhatsapp)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {formatWhatsapp(appointment.customerWhatsapp)}
                    </a>
                </div>
                <span className={`status-badge ${appointment.status.toLowerCase()}`}>{appointment.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-panel">
          <h2>Atalhos</h2>
          <div className="shortcut-grid">
            <Link href="/admin/agenda">Agenda</Link>
            <Link href="/admin/agendamentos">Agendamentos</Link>
            <Link href="/admin/servicos">Serviços</Link>
            <Link href="/admin/horarios">Horários</Link>
            <Link href="/admin/configuracoes">Configurações</Link>
          </div>
        </div>
      </section>

      <section className="admin-panel" id="servicos">
        <h2>Serviços ativos</h2>
        <div className="admin-service-list">
          {data.services.filter((service) => service.active).slice(0, 6).map((service) => (
            <div key={service.id} className="admin-service-item">
              <span>{service.name}</span>
              <small>{service.estimatedDurationMinutes} min</small>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-panel-grid">
        <div className="admin-panel" id="agenda">
          <h2 id="horarios">Dias e horários</h2>
          <div className="admin-service-list">
            {data.scheduleRules.map((rule) => (
              <div key={rule.id} className="admin-service-item">
                <span>{weekdayNames[rule.weekday]}</span>
                <small>{rule.enabled ? (rule.periods ?? [{ startTime: rule.startTime, endTime: rule.endTime }]).map((period) => `${period.startTime} às ${period.endTime}`).join(" · ") : "Fechado"}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-panel" id="configuracoes">
          <h2>Configurações do salão</h2>
          <div className="admin-service-list">
            <div className="admin-service-item"><span>Nome</span><small>{data.settings.businessName}</small></div>
            <div className="admin-service-item">
              <span>WhatsApp</span>
              <a href={`https://wa.me/${data.settings.whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                {data.settings.whatsapp}
              </a>
            </div>
            <div className="admin-service-item"><span>Instagram</span><small>{data.settings.instagram}</small></div>
            <div className="admin-service-item"><span>Endereço</span><small>{data.settings.street}, {data.settings.address}</small></div>
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <h2>Categorias de serviços</h2>
        <div className="admin-service-list">
          {data.categories.map((category) => (
            <div key={category.id} className="admin-service-item">
              <span>{category.name}</span>
              <small>{category.active ? "Ativa" : "Inativa"}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
