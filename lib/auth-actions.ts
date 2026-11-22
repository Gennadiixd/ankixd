"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIp, loginBlocked, recordLoginFailure, recordRegistration, registerBlocked } from "@/lib/abuse";
import { createSession, deleteSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { getDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

const LOGIN_NAME = /^[\p{L}\p{N}_.-]{3,32}$/u;
const failures = new Map<string, { count: number; resetAt: number }>();
const dummyHash = hashPassword("not-a-real-password");

export async function login(formData: FormData) {
  const ip = await clientIp();
  const banned = loginBlocked(ip);
  if (banned) redirect(withError("/login", banned));

  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const key = name.toLocaleLowerCase("ru");
  if (tooMany(key)) {
    redirect(withError("/login", rejectLogin(ip)));
  }

  const user = getDb()
    .prepare(`SELECT id, password_hash FROM users WHERE name = ? COLLATE NOCASE`)
    .get(name) as { id: number; password_hash: string | null } | undefined;
  const matches = verifyPassword(password, user?.password_hash || dummyHash);
  if (!user?.password_hash || !matches) {
    markFailure(key);
    redirect(withError("/login", rejectLogin(ip)));
  }
  failures.delete(key);
  await startSession(user.id);
  redirect("/");
}

export async function register(formData: FormData) {
  const ip = await clientIp();
  const banned = registerBlocked(ip);
  if (banned) redirect(withError("/register", banned));

  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const again = String(formData.get("again") ?? "");
  if (!LOGIN_NAME.test(name)) {
    redirect(withError("/register", "Логин: 3–32 символа, буквы, цифры, точка, _ или -"));
  }
  if (password.length < 4 || password.length > 200) {
    redirect(withError("/register", "Пароль должен быть от 4 до 200 символов"));
  }
  if (password !== again) redirect(withError("/register", "Пароли не совпадают"));

  const passwordHash = hashPassword(password);
  let userId = 0;
  try {
    const result = getDb()
      .prepare(`INSERT INTO users (name, password_hash) VALUES (?, ?)`)
      .run(name, passwordHash);
    userId = Number(result.lastInsertRowid);
  } catch (error) {
    if (isUnique(error)) redirect(withError("/register", "Такой логин уже занят"));
    throw error;
  }
  recordRegistration(ip);
  await startSession(userId);
  redirect("/");
}

export async function logout() {
  const jar = await cookies();
  deleteSession(jar.get(SESSION_COOKIE)?.value ?? "");
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

async function startSession(userId: number) {
  const token = createSession(userId);
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions(secure));
}

function rejectLogin(ip: string) {
  recordLoginFailure(ip);
  return loginBlocked(ip) ?? "Неверный логин или пароль";
}

function withError(path: string, message: string) {
  return `${path}?error=${encodeURIComponent(message)}`;
}

function tooMany(key: string) {
  const entry = failures.get(key);
  return Boolean(entry && entry.resetAt > Date.now() && entry.count >= 8);
}

function markFailure(key: string) {
  const now = Date.now();
  const entry = failures.get(key);
  if (!entry || entry.resetAt <= now) {
    failures.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return;
  }
  entry.count += 1;
}

function isUnique(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "SQLITE_CONSTRAINT_UNIQUE";
}
