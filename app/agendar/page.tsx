"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { formatDatePtBr } from "@/lib/formatters";
import type {
  BusinessSettings,
  Service,
} from "@/lib/types";

const steps = [
  "Serviços",
  "Data",
  "Horário",
  "Seus dados",
  "Revisão",
];

interface PublicSalonData {
  settings: BusinessSettings;
  services: Service[];
}

type DayAvailability =
  | "available"
  | "closed"
  | "full";

interface MonthAvailabilityResponse {
  days: Record<string, DayAvailability>;
}

const WEEKDAY_LABELS = [
  "D",
  "S",
  "T",
  "Q",
  "Q",
  "S",
  "S",
];

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function addDays(
  date: Date,
  amount: number
) {
  const next = new Date(date);

  next.setDate(
    next.getDate() + amount
  );

  return next;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createMonthGrid(
  month: Date
) {
  const firstDay = new Date(
    month.getFullYear(),
    month.getMonth(),
    1
  );

  const lastDay = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0
  );

  const days: Array<Date | null> = [];

  for (
    let index = 0;
    index < firstDay.getDay();
    index++
  ) {
    days.push(null);
  }

  for (
    let day = 1;
    day <= lastDay.getDate();
    day++
  ) {
    days.push(
      new Date(
        month.getFullYear(),
        month.getMonth(),
        day
      )
    );
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat(
    (4 - (base64String.length % 4)) % 4
  );

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((char) => char.charCodeAt(0))
  );
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalonePwa() {
  const standaloneNavigator = navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    standaloneNavigator.standalone === true
  );
}

export default function AgendarPage() {
  const [
    currentStep,
    setCurrentStep,
  ] = useState(1);

  const [
    selectedServices,
    setSelectedServices,
  ] = useState<string[]>([]);

  const [
    selectedDate,
    setSelectedDate,
  ] = useState("");

  const [
    selectedTime,
    setSelectedTime,
  ] = useState("");

  const [
    customerName,
    setCustomerName,
  ] = useState("");

  const [
    customerWhatsapp,
    setCustomerWhatsapp,
  ] = useState("");

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    isSubmitted,
    setIsSubmitted,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    availability,
    setAvailability,
  ] = useState<{
    key: string;
    times: string[];
  }>({
    key: "",
    times: [],
  });

  const [
    monthAvailability,
    setMonthAvailability,
  ] = useState<{
    key: string;
    days: Record<
      string,
      DayAvailability
    >;
  }>({
    key: "",
    days: {},
  });

  const [
    publicData,
    setPublicData,
  ] = useState<PublicSalonData | null>(
    null
  );

  const [
    error,
    setError,
  ] = useState("");

  const [
    createdAppointmentId,
    setCreatedAppointmentId,
  ] = useState("");

  const [
    notificationToken,
    setNotificationToken,
  ] = useState("");

  const [
    isEnablingCustomerNotifications,
    setIsEnablingCustomerNotifications,
  ] = useState(false);

  const [
    customerNotificationsEnabled,
    setCustomerNotificationsEnabled,
  ] = useState(false);

  const [
    customerNotificationMessage,
    setCustomerNotificationMessage,
  ] = useState("");

  const [
    customerNotificationError,
    setCustomerNotificationError,
  ] = useState(false);

  /*
   * =====================================================
   * CALENDÁRIO
   * =====================================================
   */

  const today = useMemo(
    () => startOfDay(new Date()),
    []
  );

  const lastAllowedDate = useMemo(
    () => addDays(today, 90),
    [today]
  );

  const [
    visibleMonth,
    setVisibleMonth,
  ] = useState(
    () =>
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
  );

  const calendarDays =
    useMemo(
      () =>
        createMonthGrid(
          visibleMonth
        ),
      [visibleMonth]
    );

  const canGoPreviousMonth =
    useMemo(() => {
      const currentMonth =
        new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );

      return (
        visibleMonth >
        currentMonth
      );
    }, [
      today,
      visibleMonth,
    ]);

  const canGoNextMonth =
    useMemo(() => {
      const limitMonth =
        new Date(
          lastAllowedDate.getFullYear(),
          lastAllowedDate.getMonth(),
          1
        );

      return (
        visibleMonth <
        limitMonth
      );
    }, [
      lastAllowedDate,
      visibleMonth,
    ]);

  function goPreviousMonth() {
    if (!canGoPreviousMonth) {
      return;
    }

    setVisibleMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() - 1,
          1
        )
    );
  }

  function goNextMonth() {
    if (!canGoNextMonth) {
      return;
    }

    setVisibleMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + 1,
          1
        )
    );
  }

  /*
   * =====================================================
   * SERVIÇOS
   * =====================================================
   */

  const totalDuration = useMemo(
    () =>
      selectedServices.reduce(
        (total, id) =>
          total +
          (publicData?.services.find(
            (service) =>
              service.id === id
          )
            ?.estimatedDurationMinutes ??
            0),
        0
      ),
    [
      publicData,
      selectedServices,
    ]
  );

  const activeServices =
    useMemo(
      () =>
        selectedServices
          .map((serviceId) =>
            publicData?.services.find(
              (service) =>
                service.id ===
                serviceId
            )
          )
          .filter(
            (
              service
            ): service is Service =>
              Boolean(service)
          ),
      [
        publicData,
        selectedServices,
      ]
    );

  /*
   * =====================================================
   * DADOS PÚBLICOS
   * =====================================================
   */

  useEffect(() => {
    let isCurrent = true;

    fetch("/api/public/data", {
      cache: "no-store",
    })
      .then(
        async (response) => {
          if (!response.ok) {
            throw new Error(
              "Não foi possível carregar os serviços."
            );
          }

          return response.json() as Promise<PublicSalonData>;
        }
      )
      .then((data) => {
        if (isCurrent) {
          setPublicData(data);
        }
      })
      .catch(
        (
          requestError: unknown
        ) => {
          if (isCurrent) {
            setError(
              requestError instanceof
                Error
                ? requestError.message
                : "Não foi possível carregar os serviços."
            );
          }
        }
      );

    return () => {
      isCurrent = false;
    };
  }, []);

  /*
   * =====================================================
   * DISPONIBILIDADE MENSAL
   * =====================================================
   */

  const monthAvailabilityKey =
    `${
      visibleMonth.getFullYear()
    }-${
      visibleMonth.getMonth() + 1
    }|${selectedServices
      .slice()
      .sort()
      .join(",")}`;

  const isLoadingMonthAvailability =
    Boolean(
      selectedServices.length &&
        monthAvailability.key !==
          monthAvailabilityKey
    );

  const currentMonthDays =
    monthAvailability.key ===
    monthAvailabilityKey
      ? monthAvailability.days
      : {};

  useEffect(() => {
    if (
      !selectedServices.length
    ) {
      return;
    }

    const controller =
      new AbortController();

    const params =
      new URLSearchParams({
        year: String(
          visibleMonth.getFullYear()
        ),
        month: String(
          visibleMonth.getMonth() +
            1
        ),
      });

    selectedServices.forEach(
      (serviceId) => {
        params.append(
          "serviceId",
          serviceId
        );
      }
    );

    fetch(
      `/api/public/month-availability?${params}`,
      {
        cache: "no-store",
        signal:
          controller.signal,
      }
    )
      .then(
        async (response) => {
          const result =
            (await response
              .json()
              .catch(() => ({}))) as
              Partial<MonthAvailabilityResponse> & {
                message?: string;
              };

          if (!response.ok) {
            throw new Error(
              result.message ??
                "Não foi possível consultar a disponibilidade do mês."
            );
          }

          return result;
        }
      )
      .then((result) => {
        const days =
          result.days ?? {};

        setMonthAvailability({
          key:
            monthAvailabilityKey,
          days,
        });

        if (
          selectedDate &&
          days[selectedDate] &&
          days[selectedDate] !==
            "available"
        ) {
          setSelectedDate("");
          setSelectedTime("");
        }
      })
      .catch(
        (
          requestError: unknown
        ) => {
          if (
            !controller.signal
              .aborted
          ) {
            setError(
              requestError instanceof
                Error
                ? requestError.message
                : "Não foi possível consultar a disponibilidade do mês."
            );
          }
        }
      );

    return () =>
      controller.abort();
  }, [
    monthAvailabilityKey,
    selectedDate,
    selectedServices,
    visibleMonth,
  ]);

  /*
   * =====================================================
   * HORÁRIOS DA DATA ESCOLHIDA
   * =====================================================
   */

  const availabilityKey =
    `${selectedDate}|${selectedServices
      .slice()
      .sort()
      .join(",")}`;

  const isLoadingAvailability =
    Boolean(
      selectedDate &&
        selectedServices.length &&
        availability.key !==
          availabilityKey
    );

  const availableTimes =
    availability.key ===
    availabilityKey
      ? availability.times
      : [];

  useEffect(() => {
    if (
      !selectedDate ||
      !selectedServices.length
    ) {
      return;
    }

    const controller =
      new AbortController();

    const params =
      new URLSearchParams({
        date: selectedDate,
      });

    selectedServices.forEach(
      (serviceId) =>
        params.append(
          "serviceId",
          serviceId
        )
    );

    fetch(
      `/api/public/availability?${params}`,
      {
        cache: "no-store",
        signal:
          controller.signal,
      }
    )
      .then(
        async (response) => {
          if (!response.ok) {
            throw new Error(
              "Não foi possível consultar os horários."
            );
          }

          return response.json() as Promise<{
            times: string[];
          }>;
        }
      )
      .then(
        ({ times }) => {
          setAvailability({
            key:
              availabilityKey,
            times,
          });

          setSelectedTime(
            (current) =>
              times.includes(
                current
              )
                ? current
                : ""
          );
        }
      )
      .catch(
        (
          requestError: unknown
        ) => {
          if (
            !controller.signal
              .aborted
          ) {
            setError(
              requestError instanceof
                Error
                ? requestError.message
                : "Não foi possível consultar os horários."
            );
          }
        }
      );

    return () =>
      controller.abort();
  }, [
    availabilityKey,
    selectedDate,
    selectedServices,
  ]);

  /*
   * =====================================================
   * NAVEGAÇÃO DO FORMULÁRIO
   * =====================================================
   */

  const canMoveNext =
    currentStep === 1
      ? selectedServices.length > 0
      : currentStep === 2
        ? Boolean(selectedDate)
        : currentStep === 3
          ? Boolean(selectedTime)
          : currentStep === 4
            ? Boolean(
                customerName &&
                  customerWhatsapp
              )
            : true;

  function handleSelectService(
    serviceId: string
  ) {
    setSelectedServices(
      (current) =>
        current.includes(serviceId)
          ? current.filter(
              (id) =>
                id !== serviceId
            )
          : [
              ...current,
              serviceId,
            ]
    );

    setSelectedDate("");
    setSelectedTime("");
  }

  function goNext() {
    setCurrentStep(
      (current) =>
        Math.min(
          current + 1,
          steps.length
        )
    );
  }

  function goBack() {
    setCurrentStep(
      (current) =>
        Math.max(
          current - 1,
          1
        )
    );
  }

  /*
   * =====================================================
   * CRIAÇÃO DO AGENDAMENTO
   * =====================================================
   */

  async function handleSubmit() {
    if (
      !publicData ||
      isSubmitting
    ) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/public/appointments",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              {
                customerName,
                customerWhatsapp,

                appointmentDate:
                  selectedDate,

                startTime:
                  selectedTime,

                serviceIds:
                  selectedServices,

                notes,
              }
            ),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ??
            "Não foi possível salvar. Tente novamente."
        );
      }

      setCreatedAppointmentId(
        typeof result.id === "string"
          ? result.id
          : ""
      );

      setNotificationToken(
        typeof result.notificationToken === "string"
          ? result.notificationToken
          : ""
      );

      setIsSubmitted(true);
    } catch (requestError) {
      setError(
        requestError instanceof
          Error
          ? requestError.message
          : "Não foi possível salvar. Tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  /*
   * =====================================================
   * LEMBRETES DO CLIENTE
   * =====================================================
   */

  async function enableCustomerNotifications() {
    if (
      !createdAppointmentId ||
      !notificationToken ||
      isEnablingCustomerNotifications
    ) {
      return;
    }

    setIsEnablingCustomerNotifications(true);
    setCustomerNotificationMessage("");
    setCustomerNotificationError(false);

    try {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        throw new Error(
          "Este dispositivo não oferece suporte a notificações push."
        );
      }

      if (isIosDevice() && !isStandalonePwa()) {
        setCustomerNotificationError(true);
        setCustomerNotificationMessage(
          "No iPhone, adicione este site à Tela de Início e abra pelo ícone instalado para ativar os lembretes."
        );
        return;
      }

      const publicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!publicKey) {
        throw new Error(
          "As notificações ainda não estão configuradas neste ambiente."
        );
      }

      let permission = Notification.permission;

      if (permission === "default") {
        permission = await Notification.requestPermission();
      }

      if (permission === "denied") {
        throw new Error(
          "As notificações estão bloqueadas neste dispositivo. Libere a permissão nas configurações do navegador para receber lembretes."
        );
      }

      if (permission !== "granted") {
        throw new Error(
          "A permissão para notificações não foi concedida."
        );
      }

      const registration =
        await navigator.serviceWorker.ready;

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription =
          await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey:
              urlBase64ToUint8Array(publicKey),
          });
      }

      const response = await fetch(
        "/api/public/push/subscribe",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            appointmentId: createdAppointmentId,
            token: notificationToken,
            subscription: subscription.toJSON(),
          }),
        }
      );

      const result: {
        success?: boolean;
        message?: string;
      } = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message ??
            "Não foi possível ativar os lembretes."
        );
      }

      setCustomerNotificationsEnabled(true);
      setCustomerNotificationError(false);
      setCustomerNotificationMessage(
        "Lembretes ativados neste dispositivo. Você será avisado sobre alterações importantes deste agendamento. 💗"
      );
    } catch (notificationError) {
      setCustomerNotificationError(true);
      setCustomerNotificationMessage(
        notificationError instanceof Error
          ? notificationError.message
          : "Não foi possível ativar os lembretes."
      );
    } finally {
      setIsEnablingCustomerNotifications(false);
    }
  }

  /*
   * =====================================================
   * WHATSAPP
   * =====================================================
   */

  const whatsappMessage =
    `Olá! Gostaria de solicitar um agendamento no ${
      publicData?.settings
        .businessName ??
      "Katiany Silvia Hair"
    }. 💗\n\n` +
    `CLIENTE\n` +
    `Nome: ${customerName}\n\n` +
    `SERVIÇOS\n` +
    `• ${activeServices
      .map(
        (service) =>
          service.name
      )
      .join("\n• ")}\n\n` +
    `DATA\n` +
    `${formatDatePtBr(
      selectedDate
    )}\n\n` +
    `HORÁRIO\n` +
    `${selectedTime}\n\n` +
    `OBSERVAÇÃO\n` +
    `${
      notes ||
      "Nenhuma observação."
    }\n\n` +
    `Aguardo a confirmação do horário. 💗`;

  /*
   * =====================================================
   * INTERFACE
   * =====================================================
   */

  return (
    <main className="booking-shell">
      <header className="booking-header">
        <Link
          href="/"
          className="brand-link"
          aria-label="Voltar para Katiany Silvia Hair"
        >
          <Image
            src={
              publicData?.settings
                .logoUrl ||
              "/logo-katiany-silvia.png"
            }
            width={72}
            height={72}
            alt=""
            className="brand-logo"
          />
        </Link>

        <Link
          href="/"
          className="text-link"
        >
          Voltar ao início
        </Link>
      </header>

      <section className="booking-card">
        <div
          className="booking-progress"
          aria-label="Progresso do agendamento"
        >
          {steps.map(
            (step, index) => (
              <div
                key={step}
                className={`progress-step ${
                  currentStep >=
                  index + 1
                    ? "active"
                    : ""
                }`}
              >
                <span>
                  {index + 1}
                </span>

                <small>
                  {step}
                </small>
              </div>
            )
          )}
        </div>

        {!isSubmitted ? (
          <>
            <div className="booking-step-header">
              <p className="eyebrow">
                Etapa{" "}
                {currentStep} de{" "}
                {steps.length}
              </p>

              <h1>
                {
                  steps[
                    currentStep -
                      1
                  ]
                }
              </h1>
            </div>

            {currentStep ===
            1 ? (
              <div className="selection-panel">
                <p className="muted-copy">
                  Qual serviço
                  você deseja
                  realizar?
                </p>

                <div className="service-grid">
                  {(
                    publicData?.services ??
                    []
                  ).map(
                    (service) => (
                      <button
                        type="button"
                        key={
                          service.id
                        }
                        className={`service-option ${
                          selectedServices.includes(
                            service.id
                          )
                            ? "selected"
                            : ""
                        }`}
                        aria-pressed={selectedServices.includes(
                          service.id
                        )}
                        onClick={() =>
                          handleSelectService(
                            service.id
                          )
                        }
                      >
                        <span>
                          {
                            service.name
                          }
                        </span>

                        <small>
                          {
                            service.estimatedDurationMinutes
                          }{" "}
                          min
                        </small>
                      </button>
                    )
                  )}
                </div>

                {!publicData &&
                !error ? (
                  <p className="muted-copy">
                    Carregando
                    serviços...
                  </p>
                ) : null}

                {publicData
                  ?.services
                  .length ===
                0 ? (
                  <p className="muted-copy">
                    Nenhum
                    serviço
                    disponível no
                    momento.
                  </p>
                ) : null}

                {selectedServices.length >
                0 ? (
                  <div className="summary-box">
                    <strong>
                      Duração
                      total:
                    </strong>

                    <span>
                      {
                        totalDuration
                      }{" "}
                      min
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {currentStep ===
            2 ? (
              <div className="calendar-panel">
                <div className="calendar-month-header">
                  <button
                    type="button"
                    className="calendar-nav-button"
                    onClick={
                      goPreviousMonth
                    }
                    disabled={
                      !canGoPreviousMonth
                    }
                    aria-label="Mês anterior"
                  >
                    ‹
                  </button>

                  <strong>
                    {
                      MONTH_NAMES[
                        visibleMonth.getMonth()
                      ]
                    }{" "}
                    {visibleMonth.getFullYear()}
                  </strong>

                  <button
                    type="button"
                    className="calendar-nav-button"
                    onClick={
                      goNextMonth
                    }
                    disabled={
                      !canGoNextMonth
                    }
                    aria-label="Próximo mês"
                  >
                    ›
                  </button>
                </div>

                <div className="calendar-weekdays">
                  {WEEKDAY_LABELS.map(
                    (
                      label,
                      index
                    ) => (
                      <span
                        key={`${label}-${index}`}
                      >
                        {label}
                      </span>
                    )
                  )}
                </div>

                <div className="calendar-month-grid">
                  {calendarDays.map(
                    (
                      day,
                      index
                    ) => {
                      if (!day) {
                        return (
                          <span
                            key={`empty-${index}`}
                            className="calendar-empty-day"
                            aria-hidden="true"
                          />
                        );
                      }

                      const iso =
                        toIsoDate(
                          day
                        );

                      const outsideRange =
                        day <
                          today ||
                        day >
                          lastAllowedDate;

                      const status =
                        currentMonthDays[
                          iso
                        ];

                      const isClosed =
                        status ===
                        "closed";

                      const isFull =
                        status ===
                        "full";

                      const isAvailable =
                        status ===
                        "available";

                      const isSelected =
                        selectedDate ===
                        iso;

                      const disabled =
                        outsideRange ||
                        isClosed ||
                        isFull ||
                        isLoadingMonthAvailability ||
                        (!status &&
                          selectedServices.length >
                            0);

                      let statusText =
                        "";

                      if (
                        !outsideRange
                      ) {
                        if (
                          isClosed
                        ) {
                          statusText =
                            "Fechado";
                        } else if (
                          isFull
                        ) {
                          statusText =
                            "Sem horários";
                        }
                      }

                      const classes = [
                        "calendar-day",

                        isSelected
                          ? "selected"
                          : "",

                        isClosed
                          ? "closed"
                          : "",

                        isFull
                          ? "full"
                          : "",

                        isAvailable
                          ? "available"
                          : "",
                      ]
                        .filter(
                          Boolean
                        )
                        .join(" ");

                      return (
                        <button
                          key={iso}
                          type="button"
                          data-date={
                            iso
                          }
                          className={
                            classes
                          }
                          aria-pressed={
                            isSelected
                          }
                          aria-label={
                            statusText
                              ? `${formatDatePtBr(
                                  iso
                                )} - ${statusText}`
                              : formatDatePtBr(
                                  iso
                                )
                          }
                          disabled={
                            disabled
                          }
                          onClick={() => {
                            if (
                              disabled
                            ) {
                              return;
                            }

                            setSelectedDate(
                              iso
                            );

                            setSelectedTime(
                              ""
                            );

                            setError(
                              ""
                            );
                          }}
                        >
                          <span>
                            {day.getDate()}
                          </span>

                          {statusText ? (
                            <small className="calendar-day-status">
                              {
                                statusText
                              }
                            </small>
                          ) : null}
                        </button>
                      );
                    }
                  )}
                </div>

                {isLoadingMonthAvailability ? (
                  <p className="calendar-help muted-copy">
                    Verificando
                    horários do
                    mês...
                  </p>
                ) : (
                  <p className="calendar-help muted-copy">
                    Você pode
                    agendar até
                    90 dias à
                    frente.
                  </p>
                )}

                <div className="calendar-legend">
                  <span className="calendar-legend-item">
                    <span className="calendar-legend-dot" />
                    Disponível
                  </span>

                  <span className="calendar-legend-item">
                    <span className="calendar-legend-dot full" />
                    Sem horários
                  </span>

                  <span className="calendar-legend-item">
                    <span className="calendar-legend-dot closed" />
                    Fechado
                  </span>
                </div>
              </div>
            ) : null}

            {currentStep ===
            3 ? (
              <>
                <div className="slot-grid">
                  {availableTimes.map(
                    (slot) => (
                      <button
                        type="button"
                        key={
                          slot
                        }
                        className={`slot-option ${
                          selectedTime ===
                          slot
                            ? "selected"
                            : ""
                        }`}
                        aria-pressed={
                          selectedTime ===
                          slot
                        }
                        onClick={() =>
                          setSelectedTime(
                            slot
                          )
                        }
                      >
                        {slot}
                      </button>
                    )
                  )}
                </div>

                {isLoadingAvailability ? (
                  <p className="muted-copy">
                    Consultando
                    horários...
                  </p>
                ) : null}

                {!isLoadingAvailability &&
                selectedDate &&
                !availableTimes.length ? (
                  <p className="muted-copy">
                    Nenhum horário
                    disponível
                    nesta data.
                    Volte e
                    escolha outro
                    dia.
                  </p>
                ) : null}
              </>
            ) : null}

            {currentStep ===
            4 ? (
              <form
                className="customer-form"
                onSubmit={(
                  event
                ) => {
                  event.preventDefault();
                  goNext();
                }}
              >
                <label>
                  Nome completo

                  <input
                    value={
                      customerName
                    }
                    onChange={(
                      event
                    ) =>
                      setCustomerName(
                        event
                          .target
                          .value
                      )
                    }
                    required
                  />
                </label>

                <label>
                  WhatsApp

                  <input
                    value={
                      customerWhatsapp
                    }
                    onChange={(
                      event
                    ) =>
                      setCustomerWhatsapp(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="(81) 99999-9999"
                    required
                  />
                </label>

                <label>
                  Observação
                  opcional

                  <textarea
                    value={
                      notes
                    }
                    onChange={(
                      event
                    ) =>
                      setNotes(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Existe algo sobre seu cabelo ou atendimento que você gostaria de informar?"
                    rows={4}
                  />
                </label>
              </form>
            ) : null}

            {currentStep ===
            5 ? (
              <div className="review-panel">
                <div className="review-card">
                  <p>
                    <strong>
                      Serviços:
                    </strong>{" "}
                    {activeServices
                      .map(
                        (
                          service
                        ) =>
                          service.name
                      )
                      .join(", ")}
                  </p>

                  <p>
                    <strong>
                      Data:
                    </strong>{" "}
                    {formatDatePtBr(
                      selectedDate
                    )}
                  </p>

                  <p>
                    <strong>
                      Horário:
                    </strong>{" "}
                    {
                      selectedTime
                    }
                  </p>

                  <p>
                    <strong>
                      Nome:
                    </strong>{" "}
                    {
                      customerName
                    }
                  </p>

                  <p>
                    <strong>
                      WhatsApp:
                    </strong>{" "}
                    {
                      customerWhatsapp
                    }
                  </p>

                  <p>
                    <strong>
                      Observação:
                    </strong>{" "}
                    {notes ||
                      "Nenhuma observação."}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="booking-actions">
              {currentStep >
              1 ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    goBack
                  }
                >
                  Voltar
                </button>
              ) : null}

              {currentStep <
              steps.length ? (
                <button
                  type="button"
                  className="primary-button"
                  onClick={
                    goNext
                  }
                  disabled={
                    !canMoveNext ||
                    isLoadingAvailability ||
                    isLoadingMonthAvailability ||
                    !publicData
                  }
                >
                  Continuar
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  onClick={
                    handleSubmit
                  }
                  disabled={
                    isSubmitting
                  }
                >
                  {isSubmitting
                    ? "Salvando..."
                    : "Solicitar agendamento"}
                </button>
              )}
            </div>

            {error ? (
              <p
                className="form-error"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </>
        ) : (
          <div className="success-panel">
            <div className="success-icon">
              💗
            </div>

            <h2>
              Solicitação
              enviada
            </h2>

            <p>
              Seu horário foi
              solicitado e será
              confirmado pelo{" "}
              {publicData
                ?.settings
                .businessName ??
                "salão"}
              . Aguarde nosso
              retorno pelo
              WhatsApp.
            </p>

            {notificationToken ? (
              <div className="review-card">
                <p>
                  <strong>🔔 Lembretes gratuitos</strong>
                </p>

                <p>
                  Ative as notificações para ser avisado gratuitamente se este horário for reagendado e sobre lembretes importantes do atendimento.
                </p>

                {!customerNotificationsEnabled ? (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={enableCustomerNotifications}
                    disabled={isEnablingCustomerNotifications}
                  >
                    {isEnablingCustomerNotifications
                      ? "ATIVANDO..."
                      : "ATIVAR LEMBRETES DESTE AGENDAMENTO"}
                  </button>
                ) : null}

                {customerNotificationMessage ? (
                  <p
                    className={
                      customerNotificationError
                        ? "form-error"
                        : "muted-copy"
                    }
                    role="status"
                  >
                    {customerNotificationMessage}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="muted-copy">
                O agendamento foi salvo, mas os lembretes automáticos não estão disponíveis para esta solicitação.
              </p>
            )}

            <div className="success-actions">
              <a
                className="primary-button"
                href={`https://wa.me/${
                  publicData
                    ?.settings
                    .whatsappNumber ??
                  ""
                }?text=${encodeURIComponent(
                  whatsappMessage
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                Enviar pelo
                WhatsApp
              </a>

              <Link
                href="/"
                className="secondary-button"
              >
                Voltar ao início
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}