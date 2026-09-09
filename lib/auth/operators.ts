import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  PEOPLE_COOKIE,
  sessionCookieOptions,
  signPayload,
  unsignPayload,
} from "@/lib/auth/session";
import type {
  ListedOperator,
  OperatorRole,
  OperatorSource,
  PublicOperator,
} from "@/lib/auth/types";
import { isOperatorRole } from "@/lib/auth/types";
import { OPERATOR } from "@/lib/seed-data";

type StoredOperator = {
  id: string;
  name: string;
  email: string;
  role: OperatorRole;
  passwordHash: string;
  source: OperatorSource;
  createdAt: string | null;
};

type FileShape = {
  operators: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    passwordHash: string;
    createdAt?: string;
  }>;
};

type EnvPlainOperator = {
  name: string;
  email: string;
  role: string;
  password: string;
};

const FILE_PATH = path.join(process.cwd(), "data", "operators.json");

let envCache: { key: string; operators: StoredOperator[] } | null = null;

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}

function isUnwritableDiskError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException).code;
  if (
    code === "EROFS" ||
    code === "EACCES" ||
    code === "EPERM" ||
    code === "ENOENT"
  ) {
    return true;
  }
  // Serverless hosts can fail mkdir/write with unexpected codes.
  return isVercelRuntime();
}

const DISK_LOGIN_UNAVAILABLE = {
  error:
    "This host cannot save logins to disk. Add people with AUTH_OPERATORS or AUTH_SEED_PASSWORD in the environment.",
  status: 503,
} as const;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function publicOf(operator: StoredOperator): PublicOperator {
  return {
    id: operator.id,
    name: operator.name,
    email: operator.email,
    role: operator.role,
  };
}

function listedOf(operator: StoredOperator): ListedOperator {
  return {
    ...publicOf(operator),
    source: operator.source,
    createdAt: operator.createdAt,
  };
}

function envKey(): string {
  return [
    process.env.AUTH_SEED_NAME ?? "",
    process.env.AUTH_SEED_EMAIL ?? "",
    process.env.AUTH_SEED_ROLE ?? "",
    process.env.AUTH_SEED_PASSWORD ?? "",
    process.env.AUTH_OPERATORS ?? "",
  ].join("\0");
}

function unwrapEnvJson(raw: string): string {
  let value = raw.trim();
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

function parseEnvOperatorsJson(): EnvPlainOperator[] {
  const raw = unwrapEnvJson(process.env.AUTH_OPERATORS ?? "");
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed : [parsed];
  return list.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`AUTH_OPERATORS[${index}] is not an object.`);
    }
    const row = item as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const email = typeof row.email === "string" ? normalizeEmail(row.email) : "";
    const role = typeof row.role === "string" ? row.role.trim() : "Operator";
    const password = typeof row.password === "string" ? row.password : "";
    if (!name || !email || !password) {
      throw new Error(
        `AUTH_OPERATORS[${index}] needs name, email, and password.`
      );
    }
    return { name, email, role, password };
  });
}

function seedFromEnv(): EnvPlainOperator | null {
  const password = process.env.AUTH_SEED_PASSWORD?.trim() ?? "";
  if (!password) return null;
  const name = process.env.AUTH_SEED_NAME?.trim() || OPERATOR.name;
  const email = normalizeEmail(
    process.env.AUTH_SEED_EMAIL?.trim() || OPERATOR.email
  );
  const role = process.env.AUTH_SEED_ROLE?.trim() || OPERATOR.role;
  return { name, email, role, password };
}

export function suggestedLoginEmail(): string {
  return normalizeEmail(
    process.env.AUTH_SEED_EMAIL?.trim() ||
      process.env.YAHOO_EMAIL?.trim() ||
      OPERATOR.email
  );
}

async function hashEnvList(rows: EnvPlainOperator[]): Promise<StoredOperator[]> {
  const out: StoredOperator[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const email = normalizeEmail(row.email);
    if (seen.has(email)) continue;
    seen.add(email);
    const role: OperatorRole = isOperatorRole(row.role)
      ? row.role
      : "Operator";
    out.push({
      id: `env:${email}`,
      name: row.name.trim(),
      email,
      role,
      passwordHash: await hashPassword(row.password),
      source: "env",
      createdAt: null,
    });
  }
  return out;
}

async function envOperators(): Promise<StoredOperator[]> {
  const key = envKey();
  if (envCache && envCache.key === key) return envCache.operators;
  const rows: EnvPlainOperator[] = [];
  try {
    rows.push(...parseEnvOperatorsJson());
  } catch {
    // Invalid AUTH_OPERATORS should not block Yahoo/seed logins.
  }
  const seed = seedFromEnv();
  if (seed && !rows.some((row) => normalizeEmail(row.email) === seed.email)) {
    rows.unshift(seed);
  }
  const operators = await hashEnvList(rows);
  envCache = { key, operators };
  return operators;
}

async function readFileOperators(): Promise<StoredOperator[]> {
  let raw: string;
  try {
    raw = await readFile(FILE_PATH, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw error;
  }
  let parsed: FileShape;
  try {
    parsed = JSON.parse(raw) as FileShape;
  } catch {
    throw new Error("Local operator file is not valid JSON.");
  }
  if (!Array.isArray(parsed.operators)) return [];
  const operators: StoredOperator[] = [];
  for (const row of parsed.operators) {
    if (!row?.id || !row.email || !row.passwordHash || !row.name) continue;
    if (!isOperatorRole(row.role)) continue;
    operators.push({
      id: row.id,
      name: row.name,
      email: normalizeEmail(row.email),
      role: row.role,
      passwordHash: row.passwordHash,
      source: "file",
      createdAt: row.createdAt ?? null,
    });
  }
  return operators;
}

async function writeFileOperators(operators: StoredOperator[]): Promise<void> {
  if (isVercelRuntime()) {
    const error = new Error(
      "Cannot write operator file on Vercel."
    ) as NodeJS.ErrnoException;
    error.code = "EROFS";
    throw error;
  }
  await mkdir(path.dirname(FILE_PATH), { recursive: true });
  const payload: FileShape = {
    operators: operators.map((operator) => ({
      id: operator.id,
      name: operator.name,
      email: operator.email,
      role: operator.role,
      passwordHash: operator.passwordHash,
      createdAt: operator.createdAt ?? undefined,
    })),
  };
  await writeFile(FILE_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function parseStoredList(raw: string): StoredOperator[] {
  let parsed: FileShape;
  try {
    parsed = JSON.parse(raw) as FileShape;
  } catch {
    return [];
  }
  if (!Array.isArray(parsed.operators)) return [];
  const operators: StoredOperator[] = [];
  for (const row of parsed.operators) {
    if (!row?.id || !row.email || !row.passwordHash || !row.name) continue;
    if (!isOperatorRole(row.role)) continue;
    operators.push({
      id: row.id,
      name: row.name,
      email: normalizeEmail(row.email),
      role: row.role,
      passwordHash: row.passwordHash,
      source: "file",
      createdAt: row.createdAt ?? null,
    });
  }
  return operators;
}

async function readCookieOperators(): Promise<StoredOperator[]> {
  try {
    const store = await cookies();
    const raw = unsignPayload(store.get(PEOPLE_COOKIE)?.value);
    if (!raw) return [];
    return parseStoredList(raw);
  } catch {
    return [];
  }
}

async function writeCookieOperators(operators: StoredOperator[]): Promise<void> {
  const store = await cookies();
  const payload: FileShape = {
    operators: operators.map((operator) => ({
      id: operator.id,
      name: operator.name,
      email: operator.email,
      role: operator.role,
      passwordHash: operator.passwordHash,
      createdAt: operator.createdAt ?? undefined,
    })),
  };
  store.set(PEOPLE_COOKIE, signPayload(JSON.stringify(payload)), {
    ...sessionCookieOptions(),
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function listStoredOperators(): Promise<StoredOperator[]> {
  const env = await envOperators();
  const file = await readFileOperators();
  const cookie = await readCookieOperators();
  const emails = new Set(env.map((operator) => operator.email));
  const extra = [...file, ...cookie].filter((operator) => {
    if (emails.has(operator.email)) return false;
    emails.add(operator.email);
    return true;
  });
  return [...env, ...extra];
}

export async function countOperators(): Promise<number> {
  return (await listStoredOperators()).length;
}

export async function listPublicOperators(): Promise<ListedOperator[]> {
  const operators = await listStoredOperators();
  return operators
    .map(listedOf)
    .sort((a, b) => {
      if (a.role !== b.role) {
        return a.role === "Administrator" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
}

export async function authenticateOperator(
  email: string,
  password: string
): Promise<PublicOperator | null> {
  const needle = normalizeEmail(email);
  const operators = await listStoredOperators();
  const match = operators.find((operator) => operator.email === needle);
  if (!match) {
    await hashPassword(password);
    return null;
  }
  const ok = await verifyPassword(password, match.passwordHash);
  return ok ? publicOf(match) : null;
}

export async function getOperatorById(
  id: string
): Promise<StoredOperator | null> {
  const operators = await listStoredOperators();
  return operators.find((operator) => operator.id === id) ?? null;
}

export async function createFileOperator(input: {
  name: string;
  email: string;
  role: OperatorRole;
  password: string;
}): Promise<{ operator: ListedOperator } | { error: string; status: number }> {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  if (!name) return { error: "Add a name.", status: 400 };
  if (name.length > 80) return { error: "That name is too long.", status: 400 };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Add a valid email address.", status: 400 };
  }
  if (input.password.length < 12) {
    return { error: "Use a password of at least 12 characters.", status: 400 };
  }
  const existing = await listStoredOperators();
  if (existing.some((operator) => operator.email === email)) {
    return { error: "That email already has a login.", status: 409 };
  }
  const record: StoredOperator = {
    id: `op_${randomBytes(8).toString("hex")}`,
    name,
    email,
    role: input.role,
    passwordHash: await hashPassword(input.password),
    source: "file",
    createdAt: new Date().toISOString(),
  };
  if (isVercelRuntime()) {
    return {
      error: DISK_LOGIN_UNAVAILABLE.error,
      status: DISK_LOGIN_UNAVAILABLE.status,
    };
  }
  const fileOperators = await readFileOperators();
  try {
    await writeFileOperators([...fileOperators, record]);
  } catch (error) {
    if (isUnwritableDiskError(error)) {
      return {
        error: DISK_LOGIN_UNAVAILABLE.error,
        status: DISK_LOGIN_UNAVAILABLE.status,
      };
    }
    throw error;
  }
  return { operator: listedOf(record) };
}

export async function createFirstAdministrator(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ operator: PublicOperator } | { error: string; status: number }> {
  if ((await countOperators()) > 0) {
    return {
      error: "An administrator already exists. Sign in instead.",
      status: 409,
    };
  }
  const created = await createFileOperator({
    name: input.name,
    email: input.email,
    role: "Administrator",
    password: input.password,
  });
  if ("operator" in created) {
    return { operator: created.operator };
  }
  if (created.status !== 503) {
    return created;
  }

  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const record: StoredOperator = {
    id: `op_${randomBytes(8).toString("hex")}`,
    name,
    email,
    role: "Administrator",
    passwordHash: await hashPassword(input.password),
    source: "file",
    createdAt: new Date().toISOString(),
  };
  try {
    const existing = await readCookieOperators();
    await writeCookieOperators([...existing, record]);
  } catch {
    return {
      error:
        "Could not save the first admin on this host. Set AUTH_SEED_EMAIL and AUTH_SEED_PASSWORD in Vercel, then redeploy.",
      status: 503,
    };
  }
  return { operator: publicOf(record) };
}

export async function deleteFileOperator(
  id: string,
  actorId: string
): Promise<{ error: string; status: number } | { ok: true }> {
  if (id === actorId) {
    return { error: "You cannot remove your own login.", status: 400 };
  }
  const all = await listStoredOperators();
  const target = all.find((operator) => operator.id === id);
  if (!target) return { error: "That login is not on file.", status: 404 };
  if (target.source !== "file") {
    return {
      error:
        "That login is set in the environment. Remove it from AUTH_SEED_PASSWORD or AUTH_OPERATORS.",
      status: 400,
    };
  }
  if (target.role === "Administrator") {
    const admins = all.filter((operator) => operator.role === "Administrator");
    if (admins.length <= 1) {
      return { error: "Keep at least one administrator.", status: 400 };
    }
  }
  if (isVercelRuntime()) {
    return {
      error: "This host cannot change saved logins on disk.",
      status: 503,
    };
  }
  const remaining = (await readFileOperators()).filter(
    (operator) => operator.id !== id
  );
  try {
    await writeFileOperators(remaining);
  } catch (error) {
    if (isUnwritableDiskError(error)) {
      return {
        error: "This host cannot change saved logins on disk.",
        status: 503,
      };
    }
    throw error;
  }
  return { ok: true };
}
