import { timingSafeEqual } from "node:crypto";
import type { PublicOperator } from "@/lib/auth/types";

export const DEFAULT_TEAM_USERNAME = "abn";
export const DEFAULT_TEAM_PASSWORD = "ABN-Operations-29";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function getTeamUsername(): string {
  return (process.env.AUTH_USERNAME?.trim() || DEFAULT_TEAM_USERNAME).toLowerCase();
}

export function getTeamPassword(): string {
  return process.env.AUTH_PASSWORD?.trim() || DEFAULT_TEAM_PASSWORD;
}

export function getTeamOperator(): PublicOperator {
  const username = getTeamUsername();
  return {
    id: `shared:${username}`,
    name: "ABN team",
    email: username,
    role: "Administrator",
  };
}

export function authenticateSharedLogin(
  username: string,
  password: string
): PublicOperator | null {
  const expectedUser = getTeamUsername();
  const expectedPass = getTeamPassword();
  const givenUser = username.trim().toLowerCase();
  if (!givenUser || !password) return null;
  const userOk = safeEqual(givenUser, expectedUser);
  const passOk = safeEqual(password, expectedPass);
  if (!userOk || !passOk) return null;
  return getTeamOperator();
}
