import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt:${N}:${R}:${P}:${salt.toString("base64")}:${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [algorithm, n, r, p, saltB64, hashB64] = stored.split(":");
  if (algorithm !== "scrypt" || n !== String(N) || r !== String(R) || p !== String(P)) return false;
  const salt = Buffer.from(saltB64 ?? "", "base64");
  const expected = Buffer.from(hashB64 ?? "", "base64");
  if (salt.length !== 16 || expected.length !== KEY_LENGTH) return false;
  const actual = scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
