import { createHmac, timingSafeEqual } from "node:crypto";
import type { SessionOperator } from "@/lib/auth/types";
import { isOperatorRole } from "@/lib/auth/types";

export const SESSION_COOKIE = "abn_ops_session";
export const PEOPLE_COOKIE = "abn_ops_people";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type TokenPayload = SessionOperator & { exp: number };

export function getAuthSecret(): string {
  const explicit = process.env.AUTH_SECRET?.trim();
  if (explicit) return explicit;
  const team = process.env.AUTH_PASSWORD?.trim();
  if (team) return `abn-team:${team}`;
  const seed = process.env.AUTH_SEED_PASSWORD?.trim();
  if (seed) return `abn-seed:${seed}`;
  const yahoo = process.env.YAHOO_APP_PASSWORD?.trim();
  if (yahoo) return `abn-yahoo:${yahoo}`;
  // Stay stable across deploys so a first-admin cookie still verifies.
  return "abn-ops-local-secret";
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function createSessionToken(operator: SessionOperator): string {
  const secret = getAuthSecret();
  const payload: TokenPayload = {
    ...operator,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(
  token: string | undefined | null
): SessionOperator | null {
  if (!token) return null;
  const secret = getAuthSecret();
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as TokenPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) {
      return null;
    }
    if (
      typeof payload.id !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      !isOperatorRole(payload.role)
    ) {
      return null;
    }
    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function signPayload(value: string): string {
  const secret = getAuthSecret();
  const body = Buffer.from(value, "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function unsignPayload(token: string | undefined | null): string | null {
  if (!token) return null;
  const secret = getAuthSecret();
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  try {
    return Buffer.from(body, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

