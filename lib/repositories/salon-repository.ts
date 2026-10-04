import type {
  Appointment,
  BusinessSettings,
  ExtraSlot,
  ScheduleBlock,
  ScheduleRule,
  Service,
  ServiceCategory,
} from "@/lib/types";

export interface CreateAppointmentInput {
  customerName: string;
  customerWhatsapp: string;
  appointmentDate: string;
  startTime: string;
  serviceIds: string[];
  notes: string;
}

export interface SalonData {
  schemaVersion: 1;
  settings: BusinessSettings;
  categories: ServiceCategory[];
  services: Service[];
  scheduleRules: ScheduleRule[];
  appointments: Appointment[];
  blocks: ScheduleBlock[];
  extraSlots: ExtraSlot[];
}

export interface SalonRepository {
  read(): Promise<SalonData>;
  update(mutator: (current: SalonData) => SalonData): Promise<SalonData>;
  getAvailableTimes(date: string, serviceIds: string[]): Promise<string[]>;
  createAppointment(input: CreateAppointmentInput): Promise<Appointment>;
}

export class SalonRepositoryError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
    this.name = "SalonRepositoryError";
  }
}