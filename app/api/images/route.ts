import { connection } from "next/server";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { storeImage } from "@/lib/images";

export async function POST(request: Request) {
  await connection();
  const userId = await requireUserId();
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не выбран" }, { status: 400 });
  }
  try {
    const url = await storeImage(userId, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof AppError ? error.message : "Не удалось прочитать изображение";
    if (!(error instanceof AppError)) console.error(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
