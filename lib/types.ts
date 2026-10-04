export type AppointmentStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export interface BusinessSettings {
  businessName: string;
  subtitle: string;
  description: string;
  instagram: string;
  whatsapp: string;
  whatsappNumber: string;
  address: string;
  street: string;
  openingText: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  active: boolean;
}

export interface Service {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  estimatedDurationMinutes: number;
  active: boolean;
  sortOrder: number;
}

export interface GalleryItem {
  id: string;
  imageUrl: string;
  category: string;
  caption: string;
  featured: boolean;
  active: boolean;
  sortOrder: number;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ScheduleRule {
  id: string;
  weekday: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
  slotIntervalMinutes: number;
  periods?: SchedulePeriod[];
}

export interface SchedulePeriod {
  startTime: string;
  endTime: string;
}

export type ScheduleBlockReason = "Almoço" | "Compromisso" | "Folga" | "Horário pessoal" | "Outro";

export interface ScheduleBlock {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  wholeDay: boolean;
  reason: ScheduleBlockReason;
  notes: string;
}

export interface ExtraSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
}

export interface Appointment {
  id: string;
  customerName: string;
  customerWhatsapp: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  serviceNames: string[];
  serviceIds?: string[];
  internalNotes?: string;
}

export interface Differentiator {
  title: string;
  description: string;
}
