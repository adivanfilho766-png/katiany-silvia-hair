import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { PushSubscription } from "web-push";

import {
  ADMIN_SESSION_COOKIE,
  isValidAdminSession,
} from "@/lib/admin-session";

import {
  saveAdminPushSubscription,
} from "@/lib/services/push-service";

async function isAdminAuthenticated() {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    ADMIN_SESSION_COOKIE
  )?.value;

  return isValidAdminSession(token);
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { message: "Não autorizado." },
      { status: 401 }
    );
  }

  const body = await request
    .json()
    .catch(() => null);

  if (
    !body ||
    typeof body !== "object" ||
    !("subscription" in body)
  ) {
    return NextResponse.json(
      { message: "Subscription inválida." },
      { status: 400 }
    );
  }

  try {
    await saveAdminPushSubscription(
      body.subscription as PushSubscription,
      typeof body.deviceName === "string"
        ? body.deviceName
        : undefined
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Erro ao salvar push subscription:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Não foi possível ativar as notificações.",
      },
      { status: 500 }
    );
  }
}