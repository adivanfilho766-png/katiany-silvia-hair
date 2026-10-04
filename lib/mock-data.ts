import type { Appointment, BusinessSettings, Differentiator, FaqItem, GalleryItem, ScheduleRule, Service, ServiceCategory } from "@/lib/types";

export const businessSettings: BusinessSettings = {
  businessName: "Katiany Silvia Hair",
  subtitle: "Espaço da Beleza",
  description: "Atendimento personalizado para cabelos, cílios e sobrancelhas.",
  instagram: "@katianysilviahairr",
  whatsapp: "+55 81 99905-3120",
  whatsappNumber: "5581999053120",
  address: "Aver-o-Mar",
  street: "Rua José Carlos de Paula",
  openingText: "Realçando sua beleza e sua autoestima.",
  logoUrl: "/logo-katiany-silvia.png",
  primaryColor: "#f6dfe6",
  secondaryColor: "#f7eef2",
  accentColor: "#c5787e",
};

export const serviceCategories: ServiceCategory[] = [
  { id: "progressivas", name: "Progressivas e alinhamento", slug: "progressivas-e-alinhamento", sortOrder: 1, active: true },
  { id: "tratamentos", name: "Tratamentos capilares", slug: "tratamentos-capilares", sortOrder: 2, active: true },
  { id: "escovas", name: "Escova e finalização", slug: "escova-e-finalizacao", sortOrder: 3, active: true },
  { id: "beleza", name: "Beleza", slug: "beleza", sortOrder: 4, active: true },
];

export const services: Service[] = [
  { id: "progressiva-nb-absolus", categoryId: "progressivas", name: "Progressiva sem formol NB Absolus", description: "Alinhamento suave e cuidado com os fios.", estimatedDurationMinutes: 180, active: true, sortOrder: 1 },
  { id: "progressiva-pro-liss", categoryId: "progressivas", name: "Progressiva sem formol Pro Liss My Phios", description: "Ideal para quem busca redução de volume e efeito liso mais eficiente.", estimatedDurationMinutes: 180, active: true, sortOrder: 2 },
  { id: "progressiva-prohall", categoryId: "progressivas", name: "Progressiva sem formol Prohall Select One", description: "Cuidado com os fios em uma fórmula pensada para manter o cabelo saudável.", estimatedDurationMinutes: 180, active: true, sortOrder: 3 },
  { id: "selagem-prohall", categoryId: "progressivas", name: "Selagem Prohall", description: "Finalização com brilho e maciez.", estimatedDurationMinutes: 120, active: true, sortOrder: 4 },
  { id: "botox-capilar", categoryId: "progressivas", name: "Botox capilar", description: "Hidratação profunda e reconstrução para fios danificados.", estimatedDurationMinutes: 120, active: true, sortOrder: 5 },
  { id: "mirra-profissional", categoryId: "tratamentos", name: "Mirra Profissional", description: "Tratamento com foco em brilho e maciez.", estimatedDurationMinutes: 60, active: true, sortOrder: 6 },
  { id: "my-phios-sos", categoryId: "tratamentos", name: "My Phios S.O.S", description: "Cuidado intenso para fios fragilizados.", estimatedDurationMinutes: 60, active: true, sortOrder: 7 },
  { id: "nb-nutricao", categoryId: "tratamentos", name: "NB Nutrição", description: "Nutrição capilar para cabelos ressecados.", estimatedDurationMinutes: 60, active: true, sortOrder: 8 },
  { id: "prohall-mask", categoryId: "tratamentos", name: "Prohall Mask", description: "Máscara de tratamento para recuperar a estrutura dos fios.", estimatedDurationMinutes: 60, active: true, sortOrder: 9 },
  { id: "prohall-blond", categoryId: "tratamentos", name: "Prohall Blond", description: "Cuidado específico para cabelos com luzes e processos químicos.", estimatedDurationMinutes: 60, active: true, sortOrder: 10 },
  { id: "pro-hair-banana-mel", categoryId: "tratamentos", name: "Pro Hair Banana e Mel", description: "Tratamento hidratante com foco em brilho e suavidade.", estimatedDurationMinutes: 60, active: true, sortOrder: 11 },
  { id: "cauterizacao", categoryId: "tratamentos", name: "Cauterização", description: "Tratamento profissional para fios com necessidade de reconstrução.", estimatedDurationMinutes: 60, active: true, sortOrder: 12 },
  { id: "escova", categoryId: "escovas", name: "Escova", description: "Finalização leve e prática para o dia a dia.", estimatedDurationMinutes: 60, active: true, sortOrder: 13 },
  { id: "escova-chapinha", categoryId: "escovas", name: "Escova e chapinha", description: "Resultado mais definido com acabamento sofisticado.", estimatedDurationMinutes: 60, active: true, sortOrder: 14 },
  { id: "finalizacao-ombro", categoryId: "escovas", name: "Finalização para cabelo no ombro", description: "Atendimento com foco em acabamento e movimento.", estimatedDurationMinutes: 60, active: true, sortOrder: 15 },
  { id: "finalizacao-abaixo-ombro", categoryId: "escovas", name: "Finalização para cabelo abaixo do ombro", description: "Finalização adaptada ao comprimento e ao tipo de fio.", estimatedDurationMinutes: 60, active: true, sortOrder: 16 },
  { id: "finalizacao-cintura", categoryId: "escovas", name: "Finalização para cabelo na cintura", description: "Atendimento mais detalhado para cabelos longos.", estimatedDurationMinutes: 60, active: true, sortOrder: 17 },
  { id: "finalizacao-abaixo-cintura", categoryId: "escovas", name: "Finalização para cabelo abaixo da cintura", description: "Finalização para cabelos longuíssimos com atenção ao acabamento.", estimatedDurationMinutes: 60, active: true, sortOrder: 18 },
  { id: "cilios", categoryId: "beleza", name: "Cílios", description: "Cuidados e destaque para a área dos olhos.", estimatedDurationMinutes: 60, active: true, sortOrder: 19 },
  { id: "sobrancelha", categoryId: "beleza", name: "Sobrancelhas", description: "Design e finalização para harmonizar o olhar.", estimatedDurationMinutes: 30, active: true, sortOrder: 20 },
];

export const differentiators: Differentiator[] = [
  { title: "Atendimento personalizado", description: "Cada cabelo é avaliado individualmente." },
  { title: "Produtos profissionais", description: "Produtos selecionados conforme a necessidade dos fios." },
  { title: "Cuidado em cada detalhe", description: "Atendimento feito com atenção, carinho e responsabilidade." },
  { title: "Agendamento fácil", description: "Escolha seu serviço e solicite seu horário pelo celular." },
];

export const faqs: FaqItem[] = [
  { question: "Os valores são fixos?", answer: "Não. Alguns procedimentos variam conforme comprimento, volume, condição dos fios e produto utilizado. A avaliação é feita individualmente." },
  { question: "O agendamento pelo site já está confirmado?", answer: "A solicitação reserva o horário no sistema, mas a confirmação final será feita pelo salão." },
  { question: "Posso escolher mais de um serviço?", answer: "Sim." },
  { question: "Preciso fazer avaliação antes?", answer: "Alguns procedimentos podem precisar de avaliação prévia. Se necessário, entraremos em contato pelo WhatsApp." },
];

export const galleryItems: GalleryItem[] = [
  { id: "g1", imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80", category: "Progressivas", caption: "Resultado elegante e com movimento natural.", featured: true, active: true, sortOrder: 1 },
  { id: "g2", imageUrl: "https://images.unsplash.com/photo-1521590832167-7b6a7d4d2d08?auto=format&fit=crop&w=900&q=80", category: "Botox", caption: "Hidratação e brilho para fios saudáveis.", featured: false, active: true, sortOrder: 2 },
  { id: "g3", imageUrl: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=900&q=80", category: "Tratamentos", caption: "Cuidados que realçam a autoestima.", featured: false, active: true, sortOrder: 3 },
  { id: "g4", imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80", category: "Escovas", caption: "Acabamento clean e prático para o dia a dia.", featured: true, active: true, sortOrder: 4 },
  { id: "g5", imageUrl: "https://images.unsplash.com/photo-1521590832167-7b6a7d4d2d08?auto=format&fit=crop&w=900&q=80", category: "Antes e depois", caption: "Transformação com cuidado individualizado.", featured: false, active: true, sortOrder: 5 },
];

export const scheduleRules: ScheduleRule[] = [
  { id: "mon", weekday: 1, enabled: true, startTime: "09:00", endTime: "18:00", slotIntervalMinutes: 60 },
  { id: "tue", weekday: 2, enabled: true, startTime: "09:00", endTime: "18:00", slotIntervalMinutes: 60 },
  { id: "wed", weekday: 3, enabled: true, startTime: "09:00", endTime: "18:00", slotIntervalMinutes: 60 },
  { id: "thu", weekday: 4, enabled: true, startTime: "09:00", endTime: "18:00", slotIntervalMinutes: 60 },
  { id: "fri", weekday: 5, enabled: true, startTime: "09:00", endTime: "18:00", slotIntervalMinutes: 60 },
  { id: "sat", weekday: 6, enabled: true, startTime: "09:00", endTime: "14:00", slotIntervalMinutes: 60 },
  { id: "sun", weekday: 0, enabled: false, startTime: "09:00", endTime: "12:00", slotIntervalMinutes: 60 },
];

export const defaultAppointments: Appointment[] = [
  {
    id: "appt-1001",
    customerName: "Marina Costa",
    customerWhatsapp: "81999991234",
    appointmentDate: getRelativeDate(2),
    startTime: "10:00",
    endTime: "11:00",
    status: "PENDING",
    notes: "Queria manter o comprimento e dar brilho.",
    createdAt: "2026-10-03T09:00:00.000Z",
    serviceNames: ["Escova", "Sobrancelhas"],
  },
  {
    id: "appt-1002",
    customerName: "Lívia Souza",
    customerWhatsapp: "81981234567",
    appointmentDate: getRelativeDate(3),
    startTime: "14:00",
    endTime: "16:00",
    status: "CONFIRMED",
    notes: "Cabelo com volume, precisa de hidratação profissional.",
    createdAt: "2026-10-01T17:15:00.000Z",
    serviceNames: ["Botox capilar", "Mirra Profissional"],
  },
  {
    id: "appt-1003",
    customerName: "Ana Paula",
    customerWhatsapp: "81998765432",
    appointmentDate: getRelativeDate(4),
    startTime: "09:00",
    endTime: "11:30",
    status: "PENDING",
    notes: "Quero uma progressiva sem formol.",
    createdAt: "2026-10-02T10:00:00.000Z",
    serviceNames: ["Progressiva sem formol Prohall Select One"],
  },
];

export function getServiceById(id: string) {
  return services.find((service) => service.id === id);
}

export function getServiceTotalDuration(serviceIds: string[]) {
  return serviceIds.reduce((total, id) => total + (getServiceById(id)?.estimatedDurationMinutes ?? 0), 0);
}

export function getRelativeDate(offset: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getCalendarDays() {
  return Array.from({ length: 15 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index + 1);
    const dayNumber = date.getDate();
    const monthName = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date);
    const dayName = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    return { iso, label: `${dayName}, ${dayNumber}`, monthName, blocked: false };
  });
}

export const bookingTimeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
