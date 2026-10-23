import {
  NextResponse,
} from "next/server";

import {
  getSupabaseServerClient,
} from "@/lib/supabase/server-client";

import {
  sendCustomerNotification,
} from "@/lib/services/push-service";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

type AppointmentRow = {
  id: string;
  appointment_date: string;
  start_time: string;
  status: string;
};

const REMINDER_TYPE =
  "CUSTOMER_24H";

const MIN_HOURS_BEFORE =
  23;

const MAX_HOURS_BEFORE =
  25;

function isAuthorized(
  request: Request
) {
  const expectedSecret =
    process.env
      .REMINDER_CRON_SECRET;

  if (!expectedSecret) {
    return false;
  }

  const authorization =
    request.headers.get(
      "authorization"
    );

  return (
    authorization ===
    `Bearer ${expectedSecret}`
  );
}

function appointmentTimestamp(
  date: string,
  time: string
) {
  /*
   * O salão está em Pernambuco.
   *
   * Recife usa UTC-03:00.
   *
   * O horário salvo no banco é
   * horário local do salão.
   */
  const normalizedTime =
    time.length === 5
      ? `${time}:00`
      : time;

  return new Date(
    `${date}T${normalizedTime}-03:00`
  ).getTime();
}

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

function normalizeTime(
  time: string
) {
  return time.slice(0, 5);
}

function differenceInHours(
  futureTimestamp: number,
  currentTimestamp: number
) {
  return (
    futureTimestamp -
    currentTimestamp
  ) / (
    1000 *
    60 *
    60
  );
}

export async function GET(
  request: Request
) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        message:
          "Não autorizado.",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const supabase =
      getSupabaseServerClient();

    const now =
      Date.now();

    /*
     * Como a busca roda em intervalos,
     * buscamos somente hoje + próximos
     * dois dias para não varrer toda
     * a tabela de appointments.
     */

    const recifeNow =
      new Date(
        now -
          3 *
            60 *
            60 *
            1000
      );

    const baseYear =
      recifeNow.getUTCFullYear();

    const baseMonth =
      recifeNow.getUTCMonth();

    const baseDay =
      recifeNow.getUTCDate();

    const fromDate =
      new Date(
        Date.UTC(
          baseYear,
          baseMonth,
          baseDay
        )
      );

    const untilDate =
      new Date(
        Date.UTC(
          baseYear,
          baseMonth,
          baseDay + 2
        )
      );

    function toDateString(
      value: Date
    ) {
      const year =
        value.getUTCFullYear();

      const month =
        String(
          value.getUTCMonth() +
            1
        ).padStart(
          2,
          "0"
        );

      const day =
        String(
          value.getUTCDate()
        ).padStart(
          2,
          "0"
        );

      return `${year}-${month}-${day}`;
    }

    const from =
      toDateString(
        fromDate
      );

    const until =
      toDateString(
        untilDate
      );

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "appointments"
        )
        .select(
          "id, appointment_date, start_time, status"
        )
        .eq(
          "status",
          "CONFIRMED"
        )
        .gte(
          "appointment_date",
          from
        )
        .lte(
          "appointment_date",
          until
        );

    if (error) {
      throw new Error(
        `Não foi possível carregar os agendamentos: ${error.message}`
      );
    }

    const appointments =
      (
        data ??
        []
      ) as AppointmentRow[];

    let eligible = 0;
    let alreadySent = 0;
    let sent = 0;
    let withoutSubscription = 0;
    let failed = 0;

    for (
      const appointment
      of appointments
    ) {
      const appointmentTime =
        appointmentTimestamp(
          appointment
            .appointment_date,
          appointment
            .start_time
        );

      if (
        !Number.isFinite(
          appointmentTime
        )
      ) {
        continue;
      }

      const hoursBefore =
        differenceInHours(
          appointmentTime,
          now
        );

      /*
       * O job roda várias vezes.
       *
       * A janela 23h–25h evita
       * perder o lembrete caso
       * uma execução atrase.
       */
      if (
        hoursBefore <
          MIN_HOURS_BEFORE ||
        hoursBefore >
          MAX_HOURS_BEFORE
      ) {
        continue;
      }

      eligible++;

      /*
       * Confere se esse lembrete
       * já foi enviado.
       */
      const {
        data:
          existingReminder,

        error:
          reminderCheckError,
      } =
        await supabase
          .from(
            "appointment_reminder_logs"
          )
          .select("id")
          .eq(
            "appointment_id",
            appointment.id
          )
          .eq(
            "reminder_type",
            REMINDER_TYPE
          )
          .maybeSingle();

      if (
        reminderCheckError
      ) {
        console.error(
          "Falha ao verificar lembrete existente:",
          appointment.id,
          reminderCheckError.message
        );

        failed++;

        continue;
      }

      if (
        existingReminder
      ) {
        alreadySent++;

        continue;
      }

      try {
        const result =
          await sendCustomerNotification(
            appointment.id,
            {
              title:
                "Seu horário é amanhã 💗",

              body:
                `Lembrete: você tem um agendamento no Katiany Silvia Hair em ` +
                `${formatDatePtBr(
                  appointment
                    .appointment_date
                )} às ` +
                `${normalizeTime(
                  appointment
                    .start_time
                )}.`,

              url: "/",

              appointmentId:
                appointment.id,

              type:
                "CUSTOMER_REMINDER_24H",
            }
          );

        if (
          result.sent <
          1
        ) {
          withoutSubscription++;

          /*
           * Não gravamos o log.
           *
           * Assim, se a cliente
           * ativar as notificações
           * ainda dentro da janela,
           * outra execução poderá
           * enviar o lembrete.
           */
          continue;
        }

        const {
          error:
            logError,
        } =
          await supabase
            .from(
              "appointment_reminder_logs"
            )
            .insert({
              appointment_id:
                appointment.id,

              reminder_type:
                REMINDER_TYPE,

              sent_at:
                new Date()
                  .toISOString(),
            });

        if (
          logError
        ) {
          /*
           * Se ocorrer corrida entre
           * duas execuções e o log
           * já existir, a constraint
           * UNIQUE protege o banco.
           */
          if (
            logError.code !==
            "23505"
          ) {
            throw new Error(
              `Push enviado, mas não foi possível registrar o lembrete: ${logError.message}`
            );
          }
        }

        sent++;
      } catch (
        reminderError
      ) {
        failed++;

        console.error(
          "Falha ao enviar lembrete de 24h:",
          appointment.id,
          reminderError
        );
      }
    }

    return NextResponse.json({
      success: true,

      checked:
        appointments.length,

      eligible,

      sent,

      alreadySent,

      withoutSubscription,

      failed,

      window: {
        minimumHours:
          MIN_HOURS_BEFORE,

        maximumHours:
          MAX_HOURS_BEFORE,
      },
    });
  } catch (error) {
    console.error(
      "Falha no processamento dos lembretes:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Não foi possível processar os lembretes.",
      },
      {
        status: 500,
      }
    );
  }
}