import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  ADMIN_SESSION_COOKIE,
  isValidAdminSession,
} from "@/lib/admin-session";

import {
  sendAdminNotification,
} from "@/lib/services/push-service";

async function isAdminAuthenticated() {
  const cookieStore = await cookies();

  return isValidAdminSession(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  );
}

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { message: "Não autorizado." },
      { status: 401 }
    );
  }

  try {
    const result =
      await sendAdminNotification({
        title: "Notificações ativadas 💗",
        body:
          "O Katiany Silvia Hair já pode avisar você sobre novos agendamentos.",
        url: "/admin",
        type: "TEST",
      });

    if (result.total === 0) {
      return NextResponse.json(
        {
          message:
            "Nenhum dispositivo está inscrito para receber notificações.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
      total: result.total,
    });
  } catch (error) {
    console.error(
      "Erro ao enviar push de teste:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Não foi possível enviar a notificação de teste.",
      },
      { status: 500 }
    );
  }
}