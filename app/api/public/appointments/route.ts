import {
  NextResponse,
} from "next/server";

import {
  apiError,
  parseJson,
} from "@/lib/api-response";

import {
  createAppointment,
} from "@/lib/services/salon-service";

import {
  createCustomerNotificationToken,
  sendAdminNotification,
} from "@/lib/services/push-service";

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

export async function POST(
  request: Request
) {
  try {
    /*
     * Primeiro cria o agendamento.
     */
    const appointment =
      await createAppointment(
        await parseJson(
          request
        )
      );

    /*
     * Prepara um token seguro para
     * permitir que somente a cliente
     * deste appointment ative push.
     *
     * Se isso falhar, não perdemos
     * o agendamento.
     */
    let notificationToken:
      | string
      | null = null;

    try {
      notificationToken =
        await createCustomerNotificationToken(
          appointment.id
        );
    } catch (
      tokenError
    ) {
      console.error(
        "Agendamento criado, mas não foi possível preparar os lembretes:",
        tokenError
      );
    }

    /*
     * Push administrativo.
     */
    try {
      const serviceText =
        appointment
          .serviceNames
          .length === 1
          ? appointment
              .serviceNames[0]
          : appointment
              .serviceNames
              .join(", ");

      await sendAdminNotification({
        title:
          "Novo agendamento 💗",

        body:
          `${appointment.customerName} solicitou ${serviceText} · ` +
          `${formatDatePtBr(
            appointment.appointmentDate
          )} às ${appointment.startTime}`,

        url:
          "/admin/agendamentos",

        appointmentId:
          appointment.id,

        type:
          "NEW_APPOINTMENT",
      });
    } catch (
      pushError
    ) {
      console.error(
        "Agendamento criado, mas a notificação push administrativa falhou:",
        pushError
      );
    }

    return NextResponse.json(
      {
        ...appointment,

        notificationToken,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    return apiError(
      error
    );
  }
}