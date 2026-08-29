import { timingSafeEqual } from "node:crypto";
import type { PublicOperator } from "@/lib/auth/types";

export const DEFAULT_TEAM_USERNAME = "ABN2026";
export const DEFAULT_TEAM_PASSWORD = "BeckRowABN!";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function getTeamUsername(): string {
  return process.env.AUTH_USERNAME?.trim() || DEFAULT_TEAM_USERNAME;
}

export function getTeamPassword(): string {
  return process.env.AUTH_PASSWORD?.trim() || DEFAULT_TEAM_PASSWORD;
}

export function getTeamOperator(): PublicOperator {
  const username = getTeamUsername();
  return {
    id: `shared:${username.toLowerCase()}`,
    name: "ABN team",
    email: username,
    role: "Administrator",
  };
}

export function authenticateSharedLogin(
  username: string,
  password: string
): PublicOperator | null {
  const expectedUser = getTeamUsername().toLowerCase();
  const expectedPass = getTeamPassword();
  const givenUser = username.trim().toLowerCase();
  if (!givenUser || !password) return null;
  const userOk = safeEqual(givenUser, expectedUser);
  const passOk = safeEqual(password, expectedPass);
  if (!userOk || !passOk) return null;
  return getTeamOperator();
}
