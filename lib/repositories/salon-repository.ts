import type {
  Appointment,
  BusinessSettings,
  ExtraSlot,
  ScheduleBlock,
  ScheduleRule,
  Service,
  ServiceCategory,
} from "@/lib/types";

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
}