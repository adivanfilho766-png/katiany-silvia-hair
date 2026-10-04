import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import type { Appointment } from "@/lib/types";
import { SalonRepositoryError, type CreateAppointmentInput, type SalonData, type SalonRepository } from "./salon-repository";

interface VersionedState {
  revision: number;
  state: SalonData;
}

async function readVersionedState(): Promise<VersionedState> {
  const { data, error } = await getSupabaseServerClient().rpc("read_salon_state");

  if (error) throw new SalonRepositoryError(`Supabase: ${error.message}`);
  if (!data || typeof data !== "object") throw new SalonRepositoryError("O banco não retornou o estado do salão.");

  const result = data as Record<string, unknown>;
  const { revision: rawRevision, ...state } = result;
  const revision = Number(rawRevision);

  if (!Number.isSafeInteger(revision) || !state.settings || !Array.isArray(state.services)) {
    throw new SalonRepositoryError("O estado salvo no banco está incompleto.");
  }

  return { revision, state: state as unknown as SalonData };
}

function throwDatabaseError(error: { code?: string; message: string }): never {
  if (error.code === "23P01" || error.code === "23505") {
    throw new SalonRepositoryError("Esse horário não está mais disponível. Escolha outro.", 409);
  }

  if (error.code === "P0001" || error.code === "22P02" || error.code === "23514") {
    throw new SalonRepositoryError(error.message, 400);
  }

  throw new SalonRepositoryError(`Supabase: ${error.message}`);
}

export const supabaseSalonRepository: SalonRepository = {
  async read() {
    return (await readVersionedState()).state;
  },

  async update(mutator) {
    const client = getSupabaseServerClient();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { revision, state } = await readVersionedState();
      const updated = mutator(structuredClone(state));
      const { error } = await client.rpc("replace_salon_state", {
        p_expected_revision: revision,
        p_state: updated,
      });

      if (!error) return updated;
      if (error.code === "40001") continue;
      throwDatabaseError(error);
    }

    throw new SalonRepositoryError("O sistema foi alterado por outra pessoa. Atualize a página e tente novamente.", 409);
  },

  async getAvailableTimes(date, serviceIds) {
    const { data, error } = await getSupabaseServerClient().rpc("get_available_times", {
      p_date: date,
      p_service_ids: serviceIds,
    });

    if (error) throwDatabaseError(error);

    return ((data ?? []) as { time_slot: string }[]).map((row) => row.time_slot.slice(0, 5));
  },

  async createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
    const { data, error } = await getSupabaseServerClient().rpc("create_public_appointment", {
      p_customer_name: input.customerName,
      p_customer_whatsapp: input.customerWhatsapp,
      p_appointment_date: input.appointmentDate,
      p_start_time: input.startTime,
      p_service_ids: input.serviceIds,
      p_notes: input.notes,
    });

    if (error) throwDatabaseError(error);
    if (!data || typeof data !== "object") throw new SalonRepositoryError("O banco não retornou o agendamento criado.");

    return data as Appointment;
  },
};