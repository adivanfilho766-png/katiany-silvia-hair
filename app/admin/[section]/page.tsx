import { notFound } from "next/navigation";
import AdminWorkspace from "@/components/admin/admin-workspace";
import type { AdminSection } from "@/components/admin/panel-types";

const sections = new Set<AdminSection>(["agendamentos", "agenda", "servicos", "horarios", "configuracoes"]);

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.has(section as AdminSection)) notFound();
  return <AdminWorkspace section={section as AdminSection} />;
}