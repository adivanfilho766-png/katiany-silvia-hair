import {
  NextResponse,
} from "next/server";

import {
  apiError,
  parseJson,
} from "@/lib/api-response";

import {
  updateAppointment,
} from "@/lib/services/salon-service";

import {
  sendAdminNotification,
  sendCustomerNotification,
} from "@/lib/services/push-service";

type Context = {
  params: Promise<{
    appointmentId: string;
  }>;
};

function formatDatePtBr(
  date: string
) {
  const [
    year,
    month,
    day,
  ] = date.split("-");

  if (
    !year ||
    !month ||
    !day
  ) {
    return date;
  }

  return `${day}/${month}/${year}`;
}

export async function PATCH(
  request: Request,
  context: Context
) {
  try {
    const {
      appointmentId,
    } =
      await context.params;

    const body =
      (await parseJson(
        request
      )) as Parameters<
        typeof updateAppointment
      >[1];

    /*
     * Primeiro salva a alteração real.
     */
    const appointment =
      await updateAppointment(
        appointmentId,
        body
      );

    /*
     * Só dispara notificações
     * após reagendamento confirmado
     * pelo banco.
     */
    if (
      body.action ===
      "RESCHEDULE"
    ) {
      /*
       * ADMIN
       */
      try {
        await sendAdminNotification({
          title:
            "Agendamento reagendado 🔄",

          body:
            `${appointment.customerName} · ` +
            `${formatDatePtBr(
              appointment.appointmentDate
            )} às ${appointment.startTime}`,

          url:
            "/admin/agendamentos",

          appointmentId:
            appointment.id,

          type:
            "APPOINTMENT_RESCHEDULED",
        });
      } catch (
        pushError
      ) {
        console.error(
          "Reagendamento salvo, mas o push administrativo falhou:",
          pushError
        );
      }

      /*
       * CLIENTE
       */
      try {
        await sendCustomerNotification(
          appointment.id,
          {
            title:
              "Seu agendamento foi reagendado 🔄",

            body:
              `Seu novo horário é ` +
              `${formatDatePtBr(
                appointment.appointmentDate
              )} às ${appointment.startTime}. 💗`,

            url:
              "/",

            appointmentId:
              appointment.id,

            type:
              "CUSTOMER_APPOINTMENT_RESCHEDULED",
          }
        );
      } catch (
        pushError
      ) {
        console.error(
          "Reagendamento salvo, mas o push do cliente falhou:",
          pushError
        );
      }
    }

    return NextResponse.json(
      appointment
    );
  } catch (error) {
    return apiError(
      error
    );
  }
}