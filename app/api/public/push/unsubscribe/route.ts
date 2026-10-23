import {
  NextResponse,
} from "next/server";

import {
  removeCustomerPushSubscription,
} from "@/lib/services/push-service";

export async function DELETE(
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

    const endpoint =
      "endpoint" in body &&
      typeof body.endpoint ===
        "string"
        ? body.endpoint
        : "";

    if (
      !appointmentId ||
      !token ||
      !endpoint
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

    await removeCustomerPushSubscription(
      appointmentId,
      token,
      endpoint
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Erro ao desativar notificações do cliente:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Não foi possível desativar os lembretes.",
      },
      {
        status: 500,
      }
    );
  }
}