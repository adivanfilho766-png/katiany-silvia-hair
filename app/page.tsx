import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { getSalonData } from "@/lib/services/salon-service";

export const dynamic = "force-dynamic";

const categoryDescriptions: Record<string, string> = {
  progressivas: "Procedimentos para alinhamento e redução de volume.",
  tratamentos: "Cuidados específicos conforme a necessidade dos fios.",
  escovas: "Finalização e cuidado para diferentes comprimentos.",
  beleza: "Serviços de cílios e sobrancelhas.",
};

const publicFaqs = [
  {
    question: "O agendamento é confirmado na hora?",
    answer: "A solicitação será confirmada pelo salão pelo WhatsApp.",
  },
  {
    question: "Posso solicitar mais de um serviço?",
    answer: "Sim. Selecione todos os serviços desejados durante o agendamento.",
  },
  {
    question: "Preciso de avaliação antes do procedimento?",
    answer: "Alguns procedimentos podem precisar de avaliação. O salão orientará você pelo WhatsApp.",
  },
];

export default async function HomePage() {
  const salon = await getSalonData();
  const { settings } = salon;
  const mapQuery = encodeURIComponent(`${settings.street}, ${settings.address}`);
  const categoriesWithServices = salon.categories
    .filter((category) => category.active)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((category) => ({
      ...category,
      items: salon.services
        .filter((service) => service.categoryId === category.id && service.active)
        .sort((left, right) => left.sortOrder - right.sortOrder),
    }));

  return (
    <main
      className="public-shell"
      style={{
        "--site-primary": settings.primaryColor,
        "--site-secondary": settings.secondaryColor,
        "--site-accent": settings.accentColor,
      } as CSSProperties}
    >
      <header className="topbar">
        <div className="container topbar-inner">
          <Link href="/" className="brand-link" aria-label="Katiany Silvia Hair home">
            <Image src={settings.logoUrl || "/logo-katiany-silvia.png"} width={72} height={72} alt="" className="brand-logo" />
          </Link>

          <nav className="main-nav" aria-label="Navegação principal">
            <a href="#inicio">Início</a>
            <a href="#servicos">Serviços</a>
            <a href="#agendamento">Como agendar</a>
            <a href="#localizacao">Localização</a>
          </nav>

          <Link href="/agendar" className="primary-button nav-button">
            AGENDAR HORÁRIO
          </Link>

          <Link href="/admin" className="admin-access-link">
            <span className="admin-access-full">ÁREA ADMINISTRATIVA</span>
            <span className="admin-access-compact">Painel</span>
          </Link>
        </div>
      </header>

      <section id="inicio" className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1>{settings.businessName}</h1>
            <p className="subtitle">{settings.subtitle}</p>
            <p className="lead">{settings.openingText}</p>
            <div className="hero-actions">
              <Link href="/agendar" className="primary-button">
                AGENDAR HORÁRIO
              </Link>
            </div>
          </div>

          <div className="hero-logo-wrap">
            <Image
              src={settings.logoUrl || "/logo-katiany-silvia.png"}
              width={520}
              height={520}
              alt={`${settings.businessName}, ${settings.subtitle}`}
              className="hero-logo"
              priority
            />
          </div>
        </div>
      </section>

      <section id="sobre" className="info-section">
        <div className="container intro-copy">
          <p className="eyebrow">Atendimento personalizado</p>
          <p>{settings.description}</p>
        </div>
      </section>

      <section id="servicos" className="services-section">
        <div className="container">
          <div className="section-heading">
            <p className="eyebrow">Serviços</p>
            <h2>Escolha o que deseja agendar</h2>
          </div>

          <div className="service-group-list">
            {categoriesWithServices.map((category) => (
              <article key={category.id} className="service-category">
                <h3>{category.name}</h3>
                <p>{categoryDescriptions[category.id]}</p>
                <ul>
                  {(category.id === "escovas"
                    ? ["Escova", "Escova e chapinha", "Finalização conforme comprimento"]
                    : category.items.map((item) => item.name)
                  ).map((serviceName) => (
                    <li key={serviceName}>{serviceName}</li>
                  ))}
                </ul>
                <Link href="/agendar" className="service-booking-link">
                  Agendar serviço
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="agendamento" className="how-it-works-section">
        <div className="container">
          <div className="section-heading">
            <p className="eyebrow">Como funciona o agendamento</p>
            <h2>Simples, rápido e pensado para você</h2>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <span>1</span>
              <h3>Escolha o serviço</h3>
              <p>Selecione um ou mais procedimentos que deseja realizar.</p>
            </div>
            <div className="step-card">
              <span>2</span>
              <h3>Defina a data</h3>
              <p>Veja os dias disponíveis e escolha o melhor momento.</p>
            </div>
            <div className="step-card">
              <span>3</span>
              <h3>Confirme a solicitação</h3>
              <p>Envie seus dados e aguarde a confirmação pelo WhatsApp.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="faq-section">
        <div className="container faq-grid">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2>Perguntas frequentes</h2>
          </div>

          <div className="faq-list">
            {publicFaqs.map((item) => (
              <div key={item.question} className="faq-item">
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="localizacao" className="location-section">
        <div className="container location-grid">
          <div>
            <p className="eyebrow">Localização</p>
            <h2>Encontre {settings.businessName}</h2>
            <p>{settings.address}</p>
            <p>{settings.street}</p>
            <p>WhatsApp: {settings.whatsapp}</p>
            <a href={`https://instagram.com/${settings.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer">
              Instagram: {settings.instagram}
            </a>
          </div>

          <div className="map-panel">
            <iframe
              className="map-frame"
              title="Localização do Espaço Katiany Hair no Google Maps"
              src={`https://www.google.com/maps?q=${mapQuery}&z=17&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              className="map-directions"
            >
              Abrir rota no Google Maps
            </a>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container cta-box">
          <div>
            <p className="eyebrow">Agende seu horário</p>
            <h2>Seu cabelo merece cuidado especial.</h2>
          </div>
          <Link href="/agendar" className="primary-button">
            AGENDAR HORÁRIO
          </Link>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <Image
              src={settings.logoUrl || "/logo-katiany-silvia.png"}
              width={144}
              height={144}
              alt="Logo Katiany Silvia Hair"
              className="footer-logo"
            />
            <p>{settings.subtitle}</p>
          </div>
          <div>
            <p>Instagram</p>
            <a href={`https://instagram.com/${settings.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer">
              {settings.instagram}
            </a>
          </div>
          <div>
            <p>WhatsApp</p>
            <a href={`https://wa.me/${settings.whatsappNumber}`}>{settings.whatsapp}</a>
          </div>
          <div>
            <p>Endereço</p>
            <p>{settings.address} · {settings.street}</p>
          </div>
        </div>
      </footer>

      <Link href="/agendar" className="floating-cta">AGENDAR HORÁRIO</Link>
    </main>
  );
}
