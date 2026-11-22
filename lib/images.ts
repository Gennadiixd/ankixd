import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";

export const IMAGE_ID = /^[a-f0-9]{32}$/;

const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 500 * 1024;
const MAX_PIXELS = 60_000_000;
const ABANDONED_AFTER_MS = 24 * 60 * 60 * 1000;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif", "heif", "avif", "tiff"]);

function imagesDir() {
  return path.join(process.cwd(), "data", "images");
}

function imageFile(id: string) {
  if (!IMAGE_ID.test(id)) throw new AppError("Некорректное фото");
  return path.join(imagesDir(), `${id}.webp`);
}

export function imageIdsIn(values: Iterable<string>) {
  const ids = new Set<string>();
  for (const value of values) {
    for (const match of value.matchAll(/\/media\/([a-f0-9]{32})/g)) ids.add(match[1]);
  }
  return ids;
}

export function readStoredImage(id: string, userId: number) {
  if (!IMAGE_ID.test(id)) return null;
  const row = getDb().prepare(`SELECT id FROM images WHERE id = ? AND user_id = ?`).get(id, userId);
  if (!row) return null;
  const file = imageFile(id);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file);
}

export async function storeImage(userId: number, input: Buffer) {
  if (input.length === 0) throw new AppError("Файл пустой");
  if (input.length > MAX_INPUT_BYTES) throw new AppError("Фото больше 15 МБ");

  let format: string | undefined;
  try {
    const meta = await sharp(input, { limitInputPixels: MAX_PIXELS, animated: false, pages: 1 }).metadata();
    format = meta.format;
  } catch {
    throw new AppError("Не удалось прочитать изображение");
  }
  if (!format || !ALLOWED_FORMATS.has(format)) throw new AppError("Нужен файл JPEG, PNG или WebP");

  const attempts = [
    { edge: 1600, quality: 80 },
    { edge: 1280, quality: 65 },
    { edge: 960, quality: 55 },
  ];
  let output: Buffer | null = null;
  for (const attempt of attempts) {
    try {
      output = await sharp(input, { limitInputPixels: MAX_PIXELS, animated: false, pages: 1 })
        .rotate()
        .resize({ width: attempt.edge, height: attempt.edge, fit: "inside", withoutEnlargement: true })
        .webp({ quality: attempt.quality })
        .toBuffer();
    } catch {
      throw new AppError("Не удалось прочитать изображение");
    }
    if (output.length <= MAX_OUTPUT_BYTES) break;
  }
  if (!output || output.length > MAX_OUTPUT_BYTES) throw new AppError("После сжатия фото всё ещё слишком большое");

  const id = crypto.randomBytes(16).toString("hex");
  fs.mkdirSync(imagesDir(), { recursive: true });
  fs.writeFileSync(imageFile(id), output);
  getDb()
    .prepare(`INSERT INTO images (id, user_id, created_at) VALUES (?, ?, ?)`)
    .run(id, userId, new Date().toISOString());
  return `/media/${id}`;
}

function imageStillUsed(id: string) {
  const row = getDb()
    .prepare(`SELECT 1 AS ok FROM card_values WHERE value LIKE ? LIMIT 1`)
    .get(`%/media/${id}%`) as { ok: number } | undefined;
  return Boolean(row);
}

export function forgetImages(ids: Iterable<string>) {
  for (const id of ids) {
    if (!IMAGE_ID.test(id) || imageStillUsed(id)) continue;
    fs.rmSync(imageFile(id), { force: true });
    getDb().prepare(`DELETE FROM images WHERE id = ?`).run(id);
  }
}

export function sweepAbandonedImages() {
  const dir = imagesDir();
  if (!fs.existsSync(dir)) return;
  const referenced = imageIdsIn(
    (getDb().prepare(`SELECT value FROM card_values WHERE value LIKE '%/media/%'`).all() as { value: string }[]).map(
      (row) => row.value,
    ),
  );
  const cutoff = Date.now() - ABANDONED_AFTER_MS;
  for (const name of fs.readdirSync(dir)) {
    const id = name.endsWith(".webp") ? name.slice(0, -5) : "";
    if (!IMAGE_ID.test(id) || referenced.has(id)) continue;
    const file = path.join(dir, name);
    if (fs.statSync(file).mtimeMs > cutoff) continue;
    fs.rmSync(file, { force: true });
    getDb().prepare(`DELETE FROM images WHERE id = ?`).run(id);
  }
}
