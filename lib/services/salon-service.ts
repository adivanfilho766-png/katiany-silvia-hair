import "server-only";
import { randomUUID } from "node:crypto";
import type {
  Appointment,
  AppointmentStatus,
  BusinessSettings,
  ExtraSlot,
  ScheduleBlock,
  ScheduleBlockReason,
  SchedulePeriod,
  ScheduleRule,
  Service,
  ServiceCategory,
} from "@/lib/types";
import { getSalonRepository } from "@/lib/repositories";
import type { SalonData } from "@/lib/repositories/salon-repository";

export class SalonServiceError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

const blockReasons: ScheduleBlockReason[] = ["Almoço", "Compromisso", "Folga", "Horário pessoal", "Outro"];

function requireText(value: unknown, label: string, maximum = 240) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maximum) {
    throw new SalonServiceError(`${label} é obrigatório.`);
  }

  return value.trim();
}

function normalizePhone(value: unknown) {
  if (typeof value !== "string") {
    throw new SalonServiceError("Informe um número de WhatsApp válido.");
  }

  const digits = value.replace(/\D/g, "");
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;

  if (!/^55\d{10,11}$/.test(normalized)) {
    throw new SalonServiceError("Informe um número de WhatsApp válido com DDD.");
  }

  return normalized;
}

function displayPhone(normalized: string) {
  const local = normalized.slice(2);
  const area = local.slice(0, 2);
  const number = local.slice(2);

  return `+55 ${area} ${number.length === 9 ? `${number.slice(0, 5)}-${number.slice(5)}` : `${number.slice(0, 4)}-${number.slice(4)}`}`;
}

function validateTime(value: unknown, label: string) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new SalonServiceError(`${label} precisa estar no formato HH:MM.`);
  }

  return value;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function validateDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new SalonServiceError("Informe uma data válida.");
  }

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new SalonServiceError("Informe uma data válida.");
  }

  return value;
}

function validatePeriods(periods: unknown): SchedulePeriod[] {
  if (!Array.isArray(periods) || periods.length === 0) {
    throw new SalonServiceError("Adicione pelo menos um período de atendimento.");
  }

  const normalized = periods.map((period, index) => {
    const item = period as Record<string, unknown>;
    const startTime = validateTime(item.startTime, `Início do período ${index + 1}`);
    const endTime = validateTime(item.endTime, `Término do período ${index + 1}`);

    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      throw new SalonServiceError("O horário final deve ser posterior ao inicial.");
    }

    return { startTime, endTime };
  }).sort((left, right) => timeToMinutes(left.startTime) - timeToMinutes(right.startTime));

  normalized.forEach((period, index) => {
    if (index > 0 && timeToMinutes(normalized[index - 1].endTime) > timeToMinutes(period.startTime)) {
      throw new SalonServiceError("Os períodos do mesmo dia não podem se sobrepor.");
    }
  });

  return normalized;
}

function ensureUniqueName<T extends { id: string; name: string }>(items: T[], name: string, id?: string) {
  if (items.some((item) => item.id !== id && item.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) {
    throw new SalonServiceError("Já existe um item com esse nome.", 409);
  }
}

function createSlug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function getSalonData() {
  return getSalonRepository().read();
}

export async function updateSettings(input: Partial<BusinessSettings>) {
  return getSalonRepository().update((data) => {
    const name = requireText(input.businessName, "Nome do salão", 100);
    const normalizedWhatsapp = normalizePhone(input.whatsapp ?? data.settings.whatsapp);
    const logoUrl = typeof input.logoUrl === "string" ? input.logoUrl.trim() : data.settings.logoUrl;

    if (!logoUrl.startsWith("/") || logoUrl.startsWith("//") || logoUrl.includes("..")) {
      throw new SalonServiceError("Informe o caminho de um arquivo dentro da pasta pública.");
    }

    const nextSettings: BusinessSettings = {
      ...data.settings,
      businessName: name,
      subtitle: requireText(input.subtitle, "Subtítulo", 120),
      description: requireText(input.description, "Descrição", 280),
      whatsappNumber: normalizedWhatsapp,
      whatsapp: displayPhone(normalizedWhatsapp),
      instagram: requireText(input.instagram, "Instagram", 120),
      street: requireText(input.street, "Endereço", 180),
      address: requireText(input.address, "Localidade", 120),
      openingText: requireText(input.openingText, "Texto de funcionamento", 280),
      logoUrl: logoUrl.slice(0, 500),
      primaryColor: requireColor(input.primaryColor, "Cor principal"),
      secondaryColor: requireColor(input.secondaryColor, "Cor secundária"),
      accentColor: requireColor(input.accentColor, "Cor de destaque"),
    };

    return { ...data, settings: nextSettings };
  });
}

function requireColor(value: unknown, label: string) {
  if (typeof value !== "string" || !/^#[\da-f]{6}$/i.test(value)) {
    throw new SalonServiceError(`${label} inválida.`);
  }

  return value;
}

export async function saveService(input: Partial<Service>, id?: string) {
  const serviceId = id ?? randomUUID();
  const name = requireText(input.name, "Nome do serviço", 120);
  const description = requireText(input.description, "Descrição", 280);
  const duration = Number(input.estimatedDurationMinutes);
  const sortOrder = Number(input.sortOrder);

  if (!Number.isInteger(duration) || duration < 5 || duration > 600) {
    throw new SalonServiceError("A duração deve ser entre 5 e 600 minutos.");
  }

  if (!Number.isInteger(sortOrder) || sortOrder < 1) {
    throw new SalonServiceError("A ordem deve ser um número positivo.");
  }

  return getSalonRepository().update((data) => {
    if (!data.categories.some((category) => category.id === input.categoryId)) {
      throw new SalonServiceError("Selecione uma categoria válida.");
    }

    ensureUniqueName(data.services, name, serviceId);
    const service: Service = {
      id: serviceId,
      categoryId: input.categoryId as string,
      name,
      description,
      estimatedDurationMinutes: duration,
      active: Boolean(input.active),
      sortOrder,
    };
    const existingIndex = data.services.findIndex((item) => item.id === serviceId);
    const nextServices = [...data.services];

    if (existingIndex >= 0) {
      nextServices[existingIndex] = service;
    } else {
      nextServices.push(service);
    }

    return { ...data, services: nextServices.sort((left, right) => left.sortOrder - right.sortOrder) };
  });
}

export async function deleteService(id: string) {
  return getSalonRepository().update((data) => {
    if (!data.services.some((service) => service.id === id)) {
      throw new SalonServiceError("O serviço não foi encontrado.", 404);
    }

    return { ...data, services: data.services.filter((service) => service.id !== id) };
  });
}

export async function saveCategory(input: Partial<ServiceCategory>, id?: string) {
  const categoryId = id ?? randomUUID();
  const name = requireText(input.name, "Nome da categoria", 100);
  const sortOrder = Number(input.sortOrder);

  if (!Number.isInteger(sortOrder) || sortOrder < 1) {
    throw new SalonServiceError("A ordem deve ser um número positivo.");
  }

  return getSalonRepository().update((data) => {
    ensureUniqueName(data.categories, name, categoryId);
    const category: ServiceCategory = {
      id: categoryId,
      name,
      slug: createSlug(name),
      sortOrder,
      active: Boolean(input.active),
    };
    const existingIndex = data.categories.findIndex((item) => item.id === categoryId);
    const nextCategories = [...data.categories];

    if (existingIndex >= 0) {
      nextCategories[existingIndex] = category;
    } else {
      nextCategories.push(category);
    }

    return { ...data, categories: nextCategories.sort((left, right) => left.sortOrder - right.sortOrder) };
  });
}

export async function deleteCategory(id: string) {
  return getSalonRepository().update((data) => {
    if (data.services.some((service) => service.categoryId === id)) {
      throw new SalonServiceError("Esta categoria possui serviços vinculados.", 409);
    }

    if (!data.categories.some((category) => category.id === id)) {
      throw new SalonServiceError("A categoria não foi encontrada.", 404);
    }

    return { ...data, categories: data.categories.filter((category) => category.id !== id) };
  });
}

export async function updateSchedule(input: unknown) {
  if (!Array.isArray(input) || input.length !== 7) {
    throw new SalonServiceError("Configure os sete dias da semana.");
  }

  const rules = input.map((value) => {
    const rule = value as Record<string, unknown>;
    const weekday = Number(rule.weekday);
    const slotIntervalMinutes = Number(rule.slotIntervalMinutes);

    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !Number.isInteger(slotIntervalMinutes) || slotIntervalMinutes < 5 || slotIntervalMinutes > 360) {
      throw new SalonServiceError("Confira o dia da semana e o intervalo dos horários.");
    }

    const periods = rule.enabled ? validatePeriods(rule.periods) : [];
    const startTime = periods[0]?.startTime ?? "09:00";
    const endTime = periods.at(-1)?.endTime ?? "17:00";

    return {
      id: `weekday-${weekday}`,
      weekday,
      enabled: Boolean(rule.enabled),
      startTime,
      endTime,
      slotIntervalMinutes,
      periods,
    } satisfies ScheduleRule;
  }).sort((left, right) => left.weekday - right.weekday);

  if (new Set(rules.map((rule) => rule.weekday)).size !== 7) {
    throw new SalonServiceError("Configure cada dia da semana uma única vez.");
  }

  return getSalonRepository().update((data) => ({ ...data, scheduleRules: rules }));
}

export async function saveBlock(input: Partial<ScheduleBlock>, id?: string) {
  const blockId = id ?? randomUUID();
  const date = validateDate(input.date);
  const wholeDay = Boolean(input.wholeDay);
  const reason = input.reason;

  if (!blockReasons.includes(reason as ScheduleBlockReason)) {
    throw new SalonServiceError("Selecione um motivo válido para o bloqueio.");
  }

  const startTime = wholeDay ? "00:00" : validateTime(input.startTime, "Hora inicial");
  const endTime = wholeDay ? "23:59" : validateTime(input.endTime, "Hora final");

  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    throw new SalonServiceError("A hora final deve ser posterior à inicial.");
  }

  const block: ScheduleBlock = {
    id: blockId,
    date,
    startTime,
    endTime,
    wholeDay,
    reason: reason as ScheduleBlockReason,
    notes: typeof input.notes === "string" ? input.notes.trim().slice(0, 300) : "",
  };

  return getSalonRepository().update((data) => {
    const existingIndex = data.blocks.findIndex((item) => item.id === blockId);
    const blocks = [...data.blocks];

    if (existingIndex >= 0) {
      blocks[existingIndex] = block;
    } else {
      blocks.push(block);
    }

    return { ...data, blocks };
  });
}

export async function deleteBlock(id: string) {
  return getSalonRepository().update((data) => ({ ...data, blocks: data.blocks.filter((block) => block.id !== id) }));
}

export async function saveExtraSlot(input: Partial<ExtraSlot>, id?: string) {
  const slotId = id ?? randomUUID();
  const date = validateDate(input.date);
  const startTime = validateTime(input.startTime, "Hora do encaixe");
  const endTime = validateTime(input.endTime, "Limite do encaixe");

  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    throw new SalonServiceError("O limite do encaixe deve ser posterior ao horário inicial.");
  }

  const extraSlot: ExtraSlot = {
    id: slotId,
    date,
    startTime,
    endTime,
    notes: typeof input.notes === "string" ? input.notes.trim().slice(0, 300) : "",
  };

  return getSalonRepository().update((data) => ({ ...data, extraSlots: [...data.extraSlots, extraSlot] }));
}

export async function deleteExtraSlot(id: string) {
  return getSalonRepository().update((data) => ({ ...data, extraSlots: data.extraSlots.filter((slot) => slot.id !== id) }));
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

function getServiceDuration(data: SalonData, serviceIds: string[]) {
  if (!serviceIds.length) {
    throw new SalonServiceError("Selecione pelo menos um serviço.");
  }

  const selected = serviceIds.map((id) => data.services.find((service) => service.id === id && service.active));

  if (selected.some((service) => !service)) {
    throw new SalonServiceError("Um ou mais serviços selecionados não estão disponíveis.");
  }

  return selected.reduce((total, service) => total + (service?.estimatedDurationMinutes ?? 0), 0);
}

function slotIsAvailable(data: SalonData, date: string, startTime: string, duration: number, ignoreAppointmentId?: string) {
  const start = timeToMinutes(startTime);
  const end = start + duration;

  const blocked = data.blocks.some((block) => block.date === date
    && overlaps(start, end, timeToMinutes(block.startTime), timeToMinutes(block.endTime)));
  if (blocked) return false;

  const occupied = data.appointments.some((appointment) => appointment.id !== ignoreAppointmentId
    && appointment.appointmentDate === date
    && (appointment.status === "PENDING" || appointment.status === "CONFIRMED")
    && overlaps(start, end, timeToMinutes(appointment.startTime), timeToMinutes(appointment.endTime)));
  if (occupied) return false;

  return true;
}

export function getAvailableTimes(data: SalonData, dateValue: string, serviceIds: string[], ignoreAppointmentId?: string) {
  const date = validateDate(dateValue);
  const duration = getServiceDuration(data, serviceIds);
  const localDate = new Date(`${date}T12:00:00`);
  const weekday = localDate.getDay();
  const rule = data.scheduleRules.find((item) => item.weekday === weekday && item.enabled);
  const candidates = new Set<string>();

  if (rule) {
    const periods = rule.periods?.length ? rule.periods : [{ startTime: rule.startTime, endTime: rule.endTime }];

    for (const period of periods) {
      const periodStart = timeToMinutes(period.startTime);
      const periodEnd = timeToMinutes(period.endTime);
      for (let start = periodStart; start + duration <= periodEnd; start += rule.slotIntervalMinutes) {
        candidates.add(minutesToTime(start));
      }
    }
  }

  for (const extraSlot of data.extraSlots.filter((slot) => slot.date === date)) {
    if (timeToMinutes(extraSlot.startTime) + duration <= timeToMinutes(extraSlot.endTime)) {
      candidates.add(extraSlot.startTime);
    }
  }

  return [...candidates]
    .filter((time) => slotIsAvailable(data, date, time, duration, ignoreAppointmentId))
    .sort((left, right) => timeToMinutes(left) - timeToMinutes(right));
}

export async function createAppointment(input: {
  customerName?: unknown;
  customerWhatsapp?: unknown;
  appointmentDate?: unknown;
  startTime?: unknown;
  serviceIds?: unknown;
  notes?: unknown;
}) {
  const customerName = requireText(input.customerName, "Nome", 120);
  const customerWhatsapp = normalizePhone(input.customerWhatsapp);
  const appointmentDate = validateDate(input.appointmentDate);
  const startTime = validateTime(input.startTime, "Horário");
  const serviceIds = Array.isArray(input.serviceIds) ? input.serviceIds.filter((id): id is string => typeof id === "string") : [];
  const notes = typeof input.notes === "string" ? input.notes.trim().slice(0, 1000) : "";
  let created: Appointment | undefined;

  await getSalonRepository().update((data) => {
    const duration = getServiceDuration(data, serviceIds);

    if (!getAvailableTimes(data, appointmentDate, serviceIds).includes(startTime)) {
      throw new SalonServiceError("Esse horário não está mais disponível. Escolha outro.", 409);
    }

    const selectedServices = serviceIds.map((id) => data.services.find((service) => service.id === id)!);
    created = {
      id: randomUUID(),
      customerName,
      customerWhatsapp,
      appointmentDate,
      startTime,
      endTime: minutesToTime(timeToMinutes(startTime) + duration),
      status: "PENDING",
      notes,
      createdAt: new Date().toISOString(),
      serviceNames: selectedServices.map((service) => service.name),
      serviceIds,
      internalNotes: "",
    };

    return { ...data, appointments: [...data.appointments, created] };
  });

  if (!created) throw new SalonServiceError("Não foi possível criar o agendamento.", 500);
  return created;
}

export async function updateAppointment(id: string, input: {
  action?: unknown;
  appointmentDate?: unknown;
  startTime?: unknown;
  internalNotes?: unknown;
}) {
  let updated: Appointment | undefined;

  await getSalonRepository().update((data) => {
    const index = data.appointments.findIndex((appointment) => appointment.id === id);
    if (index < 0) throw new SalonServiceError("Agendamento não encontrado.", 404);

    const current = data.appointments[index];
    const next = { ...current };
    const action = input.action;

    if (typeof input.internalNotes === "string") {
      next.internalNotes = input.internalNotes.trim().slice(0, 1000);
    }

    if (action === "CONFIRM" && current.status === "PENDING") {
      next.status = "CONFIRMED";
    } else if (action === "COMPLETE" && current.status === "CONFIRMED") {
      next.status = "COMPLETED";
    } else if (action === "CANCEL" && (current.status === "PENDING" || current.status === "CONFIRMED")) {
      next.status = "CANCELLED";
    } else if (action === "RESCHEDULE" && (current.status === "PENDING" || current.status === "CONFIRMED" || current.status === "CANCELLED")) {
      const appointmentDate = validateDate(input.appointmentDate);
      const startTime = validateTime(input.startTime, "Horário");
      const serviceIds = current.serviceIds?.length
        ? current.serviceIds
        : data.services.filter((service) => current.serviceNames.includes(service.name)).map((service) => service.id);
      const duration = serviceIds.reduce((sum, serviceId) => sum + (data.services.find((service) => service.id === serviceId)?.estimatedDurationMinutes ?? 0), 0);

      if (!getAvailableTimes(data, appointmentDate, serviceIds, id).includes(startTime)) {
        throw new SalonServiceError("Esse horário não está disponível para reagendamento.", 409);
      }

      next.appointmentDate = appointmentDate;
      next.startTime = startTime;
      next.endTime = minutesToTime(timeToMinutes(startTime) + duration);
      if (current.status === "CANCELLED") next.status = "PENDING";
    } else if (action !== "NOTE") {
      throw new SalonServiceError("Essa ação não está disponível para o status atual do agendamento.", 409);
    }

    const appointments = [...data.appointments];
    appointments[index] = next;
    updated = next;
    return { ...data, appointments };
  });

  if (!updated) throw new SalonServiceError("Não foi possível atualizar o agendamento.", 500);
  return updated;
}

export function getDashboardSummary(data: SalonData, today: string) {
  const todayAppointments = data.appointments.filter((appointment) => appointment.appointmentDate === today);
  const upcoming = data.appointments
    .filter((appointment) => appointment.appointmentDate >= today && appointment.status !== "CANCELLED" && appointment.status !== "COMPLETED")
    .sort((left, right) => `${left.appointmentDate} ${left.startTime}`.localeCompare(`${right.appointmentDate} ${right.startTime}`))
    .slice(0, 5);

  return {
    today: todayAppointments.length,
    pending: data.appointments.filter((appointment) => appointment.status === "PENDING").length,
    confirmed: data.appointments.filter((appointment) => appointment.status === "CONFIRMED").length,
    upcoming,
    activeServices: data.services.filter((service) => service.active).length,
  };
}

export function isAppointmentStatus(value: unknown): value is AppointmentStatus {
  return value === "PENDING" || value === "CONFIRMED" || value === "COMPLETED" || value === "CANCELLED";
}