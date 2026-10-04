"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { getCalendarDays } from "@/lib/mock-data";
import { formatDatePtBr } from "@/lib/formatters";
import type { BusinessSettings, Service } from "@/lib/types";

const steps = ["Serviços", "Data", "Horário", "Seus dados", "Revisão"];

interface PublicSalonData {
  settings: BusinessSettings;
  services: Service[];
}

export default function AgendarPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availability, setAvailability] = useState<{ key: string; times: string[] }>({ key: "", times: [] });
  const [publicData, setPublicData] = useState<PublicSalonData | null>(null);
  const [error, setError] = useState("");

  const totalDuration = useMemo(
    () => selectedServices.reduce((total, id) => total + (publicData?.services.find((service) => service.id === id)?.estimatedDurationMinutes ?? 0), 0),
    [publicData, selectedServices],
  );
  const activeServices = useMemo(
    () => selectedServices.map((serviceId) => publicData?.services.find((service) => service.id === serviceId)).filter((service): service is Service => Boolean(service)),
    [publicData, selectedServices],
  );

  useEffect(() => {
    let isCurrent = true;
    fetch("/api/public/data", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível carregar os serviços.");
        return response.json() as Promise<PublicSalonData>;
      })
      .then((data) => { if (isCurrent) setPublicData(data); })
      .catch((requestError: unknown) => { if (isCurrent) setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar os serviços."); });

    return () => { isCurrent = false; };
  }, []);

  const availabilityKey = `${selectedDate}|${selectedServices.slice().sort().join(",")}`;
  const isLoadingAvailability = Boolean(selectedDate && selectedServices.length && availability.key !== availabilityKey);
  const availableTimes = availability.key === availabilityKey ? availability.times : [];

  useEffect(() => {
    if (!selectedDate || !selectedServices.length) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ date: selectedDate });
    selectedServices.forEach((serviceId) => params.append("serviceId", serviceId));
    fetch(`/api/public/availability?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível consultar os horários.");
        return response.json() as Promise<{ times: string[] }>;
      })
      .then(({ times }) => {
        setAvailability({ key: availabilityKey, times });
        setSelectedTime((current) => times.includes(current) ? current : "");
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "Não foi possível consultar os horários.");
      })
    return () => controller.abort();
  }, [availabilityKey, selectedDate, selectedServices]);

  const canMoveNext = currentStep === 1 ? selectedServices.length > 0 : currentStep === 2 ? !!selectedDate : currentStep === 3 ? !!selectedTime : currentStep === 4 ? !!customerName && !!customerWhatsapp : true;

  const handleSelectService = (serviceId: string) => {
    setSelectedServices((current) =>
      current.includes(serviceId) ? current.filter((id) => id !== serviceId) : [...current, serviceId],
    );
    setSelectedTime("");
  };

  const handleSubmit = async () => {
    if (!publicData || isSubmitting) return;
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/public/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, customerWhatsapp, appointmentDate: selectedDate, startTime: selectedTime, serviceIds: selectedServices, notes }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Não foi possível salvar. Tente novamente.");
      setIsSubmitted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível salvar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNext = () => {
    setCurrentStep((current) => Math.min(current + 1, steps.length));
  };

  const goBack = () => {
    setCurrentStep((current) => Math.max(current - 1, 1));
  };

  const whatsappMessage = `Olá! Gostaria de solicitar um agendamento no ${publicData?.settings.businessName ?? "Katiany Silvia Hair"}. 💗\n\nCLIENTE\nNome: ${customerName}\n\nSERVIÇOS\n• ${activeServices.map((service) => service.name).join("\n• ")}\n\nDATA\n${formatDatePtBr(selectedDate)}\n\nHORÁRIO\n${selectedTime}\n\nOBSERVAÇÃO\n${notes || "Nenhuma observação."}\n\nAguardo a confirmação do horário. 💗`;

  return (
    <main className="booking-shell">
      <header className="booking-header">
        <Link href="/" className="brand-link" aria-label="Voltar para Katiany Silvia Hair">
          <Image src={publicData?.settings.logoUrl || "/logo-katiany-silvia.png"} width={72} height={72} alt="" className="brand-logo" />
        </Link>
        <Link href="/" className="text-link">Voltar ao início</Link>
      </header>

      <section className="booking-card">
        <div className="booking-progress" aria-label="Progresso do agendamento">
          {steps.map((step, index) => (
            <div key={step} className={`progress-step ${currentStep >= index + 1 ? "active" : ""}`}>
              <span>{index + 1}</span>
              <small>{step}</small>
            </div>
          ))}
        </div>

        {!isSubmitted ? (
          <>
            <div className="booking-step-header">
              <p className="eyebrow">Etapa {currentStep} de {steps.length}</p>
              <h1>{steps[currentStep - 1]}</h1>
            </div>

            {currentStep === 1 && (
              <div className="selection-panel">
                <p className="muted-copy">Qual serviço você deseja realizar?</p>
                <div className="service-grid">
                  {(publicData?.services ?? []).map((service) => (
                    <button
                      type="button"
                      key={service.id}
                      className={`service-option ${selectedServices.includes(service.id) ? "selected" : ""}`}
                      aria-pressed={selectedServices.includes(service.id)}
                      onClick={() => handleSelectService(service.id)}
                    >
                      <span>{service.name}</span>
                      <small>{service.estimatedDurationMinutes} min</small>
                    </button>
                  ))}
                </div>
                {!publicData && !error ? <p className="muted-copy">Carregando serviços...</p> : null}
                {publicData?.services.length === 0 ? <p className="muted-copy">Nenhum serviço disponível no momento.</p> : null}

                {selectedServices.length > 0 && (
                  <div className="summary-box">
                    <strong>Duração total:</strong>
                    <span>{totalDuration} min</span>
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="calendar-grid">
                {getCalendarDays().map((day) => (
                  <button
                    key={day.iso}
                    data-date={day.iso}
                    type="button"
                    className={`date-option ${selectedDate === day.iso ? "selected" : ""} ${day.blocked ? "blocked" : ""}`}
                    aria-pressed={selectedDate === day.iso}
                    onClick={() => {
                      if (!day.blocked) {
                        setSelectedDate(day.iso);
                        setSelectedTime("");
                      }
                    }}
                    disabled={day.blocked}
                  >
                    <span>{day.label}</span>
                    <small>{day.monthName}</small>
                  </button>
                ))}
              </div>
            )}

            {currentStep === 3 && (
              <>
                <div className="slot-grid">
                  {availableTimes.map((slot) => (
                    <button
                      type="button"
                      key={slot}
                      className={`slot-option ${selectedTime === slot ? "selected" : ""}`}
                      aria-pressed={selectedTime === slot}
                      onClick={() => setSelectedTime(slot)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
                {isLoadingAvailability ? <p className="muted-copy">Consultando horários...</p> : null}
                {!isLoadingAvailability && !availableTimes.length ? <p className="muted-copy">Nenhum horário disponível nesta data.</p> : null}
              </>
            )}

            {currentStep === 4 && (
              <form className="customer-form" onSubmit={(event) => { event.preventDefault(); goNext(); }}>
                <label>
                  Nome completo
                  <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required />
                </label>
                <label>
                  WhatsApp
                  <input value={customerWhatsapp} onChange={(event) => setCustomerWhatsapp(event.target.value)} placeholder="(81) 99999-9999" required />
                </label>
                <label>
                  Observação opcional
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Existe algo sobre seu cabelo ou atendimento que você gostaria de informar?" rows={4} />
                </label>
              </form>
            )}

            {currentStep === 5 && (
              <div className="review-panel">
                <div className="review-card">
                  <p><strong>Serviços:</strong> {activeServices.map((service) => service.name).join(", ")}</p>
                  <p><strong>Data:</strong> {formatDatePtBr(selectedDate)}</p>
                  <p><strong>Horário:</strong> {selectedTime}</p>
                  <p><strong>Nome:</strong> {customerName}</p>
                  <p><strong>WhatsApp:</strong> {customerWhatsapp}</p>
                  <p><strong>Observação:</strong> {notes || "Nenhuma observação."}</p>
                </div>
              </div>
            )}

            <div className="booking-actions">
              {currentStep > 1 && (
                <button type="button" className="secondary-button" onClick={goBack}>
                  Voltar
                </button>
              )}

              {currentStep < steps.length ? (
                <button type="button" className="primary-button" onClick={goNext} disabled={!canMoveNext || isLoadingAvailability || !publicData}>
                  Continuar
                </button>
              ) : (
                <button type="button" className="primary-button" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : "Solicitar agendamento"}
                </button>
              )}
            </div>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
          </>
        ) : (
          <div className="success-panel">
            <div className="success-icon">💗</div>
            <h2>Solicitação enviada</h2>
            <p>Seu horário foi solicitado e será confirmado pelo {publicData?.settings.businessName ?? "salão"}. Aguarde nosso retorno pelo WhatsApp.</p>
            <div className="success-actions">
              <a
                className="primary-button"
                href={`https://wa.me/${publicData?.settings.whatsappNumber ?? ""}?text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noreferrer"
              >
                Enviar pelo WhatsApp
              </a>
              <Link href="/" className="secondary-button">Voltar ao início</Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
