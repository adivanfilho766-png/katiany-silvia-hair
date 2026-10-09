import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "katiany_admin_session";

// 7 dias
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  return secret && Buffer.byteLength(secret) >= 32
    ? secret
    : null;
}

export function createAdminSessionToken() {
  const secret = getSessionSecret();

  if (!secret) {
    return null;
  }

  const expiresAt = String(
    Date.now() + ADMIN_SESSION_MAX_AGE * 1000
  );

  const signature = createHmac("sha256", secret)
    .update(expiresAt)
    .digest("base64url");

  return `${expiresAt}.${signature}`;
}

export function isValidAdminSession(token?: string) {
  const secret = getSessionSecret();

  if (!secret || !token) {
    return false;
  }

  const [expiresAt, signature, extraPart] = token.split(".");

  if (
    !expiresAt ||
    !signature ||
    extraPart ||
    !/^\d{13}$/.test(expiresAt)
  ) {
    return false;
  }

  if (Number(expiresAt) <= Date.now()) {
    return false;
  }

  const expectedSignature = createHmac(
    "sha256",
    secret
  )
    .update(expiresAt)
    .digest();

  const receivedSignature = Buffer.from(
    signature,
    "base64url"
  );

  return (
    receivedSignature.length === expectedSignature.length &&
    timingSafeEqual(receivedSignature, expectedSignature)
  );
}