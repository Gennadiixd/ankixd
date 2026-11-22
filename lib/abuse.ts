import { headers } from "next/headers";
import { getDb } from "@/lib/db";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const LOGIN_FAILS = 30;
const REGISTRATIONS = 10;

export const LOGIN_BAN_MESSAGE = "С этого адреса слишком много неудачных входов. Попробуйте через сутки.";
export const REGISTER_BAN_MESSAGE = "С этого адреса слишком много регистраций. Попробуйте через сутки.";

export async function clientIp() {
  const headerList = await headers();
  const real = headerList.get("x-real-ip");
  if (real) return normalizeIp(real);
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return normalizeIp(forwarded.split(",")[0] ?? "");
  return "unknown";
}

export function loginBlocked(ip: string, now = new Date()) {
  return blocked(ip, "login", LOGIN_BAN_MESSAGE, now);
}

export function registerBlocked(ip: string, now = new Date()) {
  return blocked(ip, "register", REGISTER_BAN_MESSAGE, now);
}

export function recordLoginFailure(ip: string, now = new Date()) {
  record(ip, "login_fail", "login", LOGIN_FAILS, now);
}

export function recordRegistration(ip: string, now = new Date()) {
  record(ip, "register", "register", REGISTRATIONS, now);
}

function blocked(ip: string, kind: "login" | "register", message: string, now: Date) {
  prune(now);
  const row = getDb()
    .prepare(`SELECT until_at FROM ip_bans WHERE ip = ? AND kind = ?`)
    .get(ip, kind) as { until_at: string } | undefined;
  if (!row || row.until_at <= now.toISOString()) return null;
  return message;
}

function record(ip: string, eventKind: "login_fail" | "register", banKind: "login" | "register", limit: number, now: Date) {
  prune(now);
  const db = getDb();
  db.prepare(`INSERT INTO auth_events (ip, kind, created_at) VALUES (?, ?, ?)`).run(ip, eventKind, now.toISOString());
  const since = new Date(now.getTime() - HOUR_MS).toISOString();
  const count = db
    .prepare(`SELECT COUNT(*) AS n FROM auth_events WHERE ip = ? AND kind = ? AND created_at >= ?`)
    .get(ip, eventKind, since) as { n: number };
  if (count.n < limit) return;
  const until = new Date(now.getTime() + DAY_MS).toISOString();
  db.prepare(
    `INSERT INTO ip_bans (ip, kind, until_at) VALUES (?, ?, ?)
     ON CONFLICT (ip, kind) DO UPDATE SET until_at = excluded.until_at`,
  ).run(ip, banKind, until);
}

function prune(now: Date) {
  const db = getDb();
  db.prepare(`DELETE FROM auth_events WHERE created_at < ?`).run(new Date(now.getTime() - HOUR_MS).toISOString());
  db.prepare(`DELETE FROM ip_bans WHERE until_at <= ?`).run(now.toISOString());
}

function normalizeIp(value: string) {
  const ip = value.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!ip || ip.length > 64 || !/^[0-9a-f:.]+$/.test(ip)) return "unknown";
  return ip;
}
