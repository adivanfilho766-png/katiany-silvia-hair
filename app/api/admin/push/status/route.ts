import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  ADMIN_SESSION_COOKIE,
  isValidAdminSession,
} from "@/lib/admin-session";

import {
  hasAdminPushSubscription,
} from "@/lib/services/push-service";

async function isAdminAuthenticated() {
  const cookieStore = await cookies();

  return isValidAdminSession(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  );
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

  const endpoint =
    body &&
    typeof body === "object" &&
    "endpoint" in body &&
    typeof body.endpoint === "string"
      ? body.endpoint
      : null;

  if (!endpoint) {
    return NextResponse.json({
      subscribed: false,
    });
  }

  try {
    const subscribed =
      await hasAdminPushSubscription(endpoint);

    return NextResponse.json({
      subscribed,
    });
  } catch (error) {
    console.error(
      "Erro ao consultar status push:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Não foi possível consultar as notificações.",
      },
      { status: 500 }
    );
  }
}