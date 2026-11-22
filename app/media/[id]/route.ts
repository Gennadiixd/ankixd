import { connection } from "next/server";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { readStoredImage } from "@/lib/images";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await connection();
  const userId = await requireUserId();
  const { id } = await context.params;
  const bytes = readStoredImage(id, userId);
  if (!bytes) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
