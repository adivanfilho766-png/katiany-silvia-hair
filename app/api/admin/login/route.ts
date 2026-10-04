import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE, createAdminSessionToken } from "@/lib/admin-session";

function matchesCredential(candidate: string, expected: string) {
  const candidateHash = createHash("sha256").update(candidate).digest();
  const expectedHash = createHash("sha256").update(expected).digest();

  return timingSafeEqual(candidateHash, expectedHash);
}

export async function POST(request: Request) {
  const expectedEmail = process.env.ADMIN_EMAIL;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  const sessionToken = createAdminSessionToken();

  if (!expectedEmail || !expectedPassword || !sessionToken) {
    return NextResponse.json({ message: "Login administrativo não configurado." }, { status: 503 });
  }

  const body: unknown = await request.json().catch(() => null);

  if (typeof body !== "object" || body === null || !("email" in body) || !("password" in body)) {
    return NextResponse.json({ message: "Informe e-mail e senha." }, { status: 400 });
  }

  const { email, password } = body;

  if (typeof email !== "string" || typeof password !== "string"
    || !matchesCredential(email.trim(), expectedEmail)
    || !matchesCredential(password, expectedPassword)) {
    return NextResponse.json({ message: "Credenciais inválidas." }, { status: 401 });
  }

  const response = NextResponse.json({ success: true }, { status: 200 });
  response.headers.set("Cache-Control", "no-store");

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
  });

  return response;
}
