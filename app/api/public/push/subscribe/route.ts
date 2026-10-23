import {
  NextResponse,
} from "next/server";

import type {
  PushSubscription,
} from "web-push";

import {
  saveCustomerPushSubscription,
  sendCustomerNotification,
} from "@/lib/services/push-service";

export async function POST(
  request: Request
) {
  try {
    const body =
      await request
        .json()
        .catch(() => null);

    if (
      !body ||
      typeof body !==
        "object"
    ) {
      return NextResponse.json(
        {
          message:
            "Dados inválidos.",
        },
        {
          status: 400,
        }
      );
    }

    const appointmentId =
      "appointmentId" in
        body &&
      typeof body.appointmentId ===
        "string"
        ? body.appointmentId
        : "";

    const token =
      "token" in body &&
      typeof body.token ===
        "string"
        ? body.token
        : "";

    const subscription =
      "subscription" in body
        ? body.subscription
        : null;

    if (
      !appointmentId ||
      !token ||
      !subscription
    ) {
      return NextResponse.json(
        {
          message:
            "Dados de notificação incompletos.",
        },
        {
          status: 400,
        }
      );
    }

    await saveCustomerPushSubscription(
      appointmentId,
      token,
      subscription as PushSubscription
    );

    /*
     * Confirmação gratuita:
     * serve também para o cliente
     * saber que funcionou.
     */
    try {
      await sendCustomerNotification(
        appointmentId,
        {
          title:
            "Lembretes ativados 💗",

          body:
            "Você receberá avisos importantes sobre este agendamento.",

          url:
            "/",

          appointmentId,

          type:
            "CUSTOMER_NOTIFICATIONS_ENABLED",
        }
      );
    } catch (pushError) {
      console.error(
        "Subscription salva, mas a confirmação push falhou:",
        pushError
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Erro ao ativar notificações do cliente:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Não foi possível ativar os lembretes.",
      },
      {
        status: 500,
      }
    );
  }
}