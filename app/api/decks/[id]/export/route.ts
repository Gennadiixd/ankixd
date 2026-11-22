import { connection } from "next/server";
import { exportAlgoXml } from "@/lib/repo";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id)) return new Response("Не найдено", { status: 404 });
  const deck = await exportAlgoXml(id);
  if (!deck) return new Response("Не найдено", { status: 404 });

  const filename = xmlFilename(deck.name);
  return new Response(deck.xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="deck.xml"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}

function xmlFilename(name: string) {
  const cleaned = name
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return `${cleaned || "deck"}.xml`;
}
