const SMALL_ENOUGH = 400 * 1024;
const TARGET_BYTES = 450 * 1024;
const MAX_SEND_BYTES = 900 * 1024;

export async function compressImageFile(file: File) {
  if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
    throw new Error("SVG не поддерживается");
  }
  if (file.size > 25 * 1024 * 1024) throw new Error("Фото больше 25 МБ");
  if (file.size <= SMALL_ENOUGH && /^image\/(jpeg|png|webp|gif)$/.test(file.type)) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (file.size <= MAX_SEND_BYTES) return file;
    throw new Error("Не удалось сжать фото. Выберите JPEG или PNG поменьше.");
  }

  try {
    const attempts = [
      { edge: 1600, quality: 0.82 },
      { edge: 1280, quality: 0.7 },
      { edge: 960, quality: 0.6 },
    ];
    let last: Blob | null = null;
    for (const attempt of attempts) {
      last = await drawBitmap(bitmap, attempt.edge, attempt.quality);
      if (last.size <= TARGET_BYTES) return last;
    }
    if (last && last.size <= MAX_SEND_BYTES) return last;
    throw new Error("Не удалось сжать фото");
  } finally {
    bitmap.close();
  }
}

function drawBitmap(bitmap: ImageBitmap, edge: number, quality: number) {
  const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Не удалось сжать фото");
  context.drawImage(bitmap, 0, 0, width, height);
  return blobFrom(canvas, "image/webp", quality).catch(() => blobFrom(canvas, "image/jpeg", quality));
}

function blobFrom(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Не удалось сжать фото"))), type, quality);
  });
}
