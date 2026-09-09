import { timingSafeEqual } from "node:crypto";
import type { PublicOperator } from "@/lib/auth/types";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function getTeamUsername(): string {
  return process.env.AUTH_USERNAME?.trim() || "";
}

export function getTeamPassword(): string {
  return process.env.AUTH_PASSWORD?.trim() || "";
}

export function isSharedLoginConfigured(): boolean {
  return Boolean(getTeamUsername() && getTeamPassword());
}

export function getTeamOperator(): PublicOperator | null {
  const username = getTeamUsername();
  if (!username) return null;
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
  if (!expectedUser || !expectedPass || !givenUser || !password) return null;
  const userOk = safeEqual(givenUser, expectedUser);
  const passOk = safeEqual(password, expectedPass);
  if (!userOk || !passOk) return null;
  return getTeamOperator();
}
