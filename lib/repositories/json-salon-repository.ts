import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  businessSettings,
  defaultAppointments,
  scheduleRules,
  serviceCategories,
  services,
} from "@/lib/mock-data";
import type { Appointment, ScheduleRule } from "@/lib/types";
import type { SalonData, SalonRepository } from "./salon-repository";

const dataDirectory = join(process.cwd(), ".data");
const dataFile = join(dataDirectory, "salon-data.json");

function normalizeScheduleRule(rule: ScheduleRule): ScheduleRule {
  return {
    ...rule,
    periods: rule.periods?.length
      ? rule.periods
      : [{ startTime: rule.startTime, endTime: rule.endTime }],
  };
}

function seedData(): SalonData {
  const seededAppointments: Appointment[] = defaultAppointments.map((appointment) => ({
    ...appointment,
    serviceIds: services.filter((service) => appointment.serviceNames.includes(service.name)).map((service) => service.id),
    internalNotes: "",
  }));

  return {
    schemaVersion: 1,
    settings: { ...businessSettings },
    categories: serviceCategories.map((category) => ({ ...category })),
    services: services.map((service) => ({ ...service })),
    scheduleRules: scheduleRules.map(normalizeScheduleRule),
    appointments: seededAppointments,
    blocks: [],
    extraSlots: [],
  };
}

let initialization: Promise<SalonData> | null = null;
let transactionQueue: Promise<void> = Promise.resolve();

function normalizeData(parsed: SalonData): SalonData {
  const normalizePhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits && !digits.startsWith("55") ? `55${digits}` : digits;
  };
  const settings = parsed.settings ?? businessSettings;
  const whatsappNumber = normalizePhone(settings.whatsappNumber || settings.whatsapp);
  const localPhone = whatsappNumber.startsWith("55") ? whatsappNumber.slice(2) : whatsappNumber;
  const areaCode = localPhone.slice(0, 2);
  const phoneBody = localPhone.slice(2);
  const whatsapp = `+55 ${areaCode} ${phoneBody.length === 9 ? `${phoneBody.slice(0, 5)}-${phoneBody.slice(5)}` : `${phoneBody.slice(0, 4)}-${phoneBody.slice(4)}`}`;

  return {
    ...parsed,
    settings: { ...businessSettings, ...settings, whatsapp, whatsappNumber },
    scheduleRules: parsed.scheduleRules.map(normalizeScheduleRule),
    blocks: parsed.blocks ?? [],
    extraSlots: parsed.extraSlots ?? [],
    appointments: parsed.appointments.map((appointment) => ({
      ...appointment,
      customerWhatsapp: normalizePhone(appointment.customerWhatsapp),
      serviceIds: appointment.serviceIds ?? [],
      internalNotes: appointment.internalNotes ?? "",
    })),
  };
}

async function writeAtomically(data: SalonData) {
  await mkdir(dataDirectory, { recursive: true });
  const temporaryFile = join(dataDirectory, `salon-data-${process.pid}-${Date.now()}.tmp`);
  await writeFile(temporaryFile, JSON.stringify(data, null, 2), "utf8");
  await rename(temporaryFile, dataFile);
}

async function readOrSeed() {
  if (!initialization) {
    initialization = (async () => {
      try {
        const contents = await readFile(dataFile, "utf8");
        const parsed = JSON.parse(contents) as SalonData;
        const normalized = normalizeData(parsed);
        if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
          await writeAtomically(normalized);
        }
        return normalized;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }

        const initialData = seedData();
        await writeAtomically(initialData);
        return initialData;
      }
    })();
  }

  return initialization;
}

async function readCurrentData() {
  await readOrSeed();
  return normalizeData(JSON.parse(await readFile(dataFile, "utf8")) as SalonData);
}

export const jsonSalonRepository: SalonRepository = {
  async read() {
    await transactionQueue;
    const data = await readCurrentData();
    return structuredClone(data);
  },

  async update(mutator) {
    const operation = transactionQueue.then(async () => {
      const current = await readCurrentData();
      const updated = mutator(structuredClone(current));
      await writeAtomically(updated);
      return structuredClone(updated);
    });

    transactionQueue = operation.then(() => undefined, () => undefined);
    return operation;
  },
};