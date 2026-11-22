import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";

export const SESSION_COOKIE = "ankixd_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 400;

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  getDb()
    .prepare(`INSERT INTO sessions (token_hash, user_id, created_at) VALUES (?, ?, ?)`)
    .run(tokenHash(token), userId, new Date().toISOString());
  return token;
}

export function deleteSession(token: string) {
  if (!token) return;
  getDb().prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(tokenHash(token));
}

export function findUserBySession(token: string) {
  if (!token || token.length > 128) return null;
  return (
    (getDb()
      .prepare(
        `SELECT u.id, u.name
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?`,
      )
      .get(tokenHash(token)) as { id: number; name: string } | undefined) ?? null
  );
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
