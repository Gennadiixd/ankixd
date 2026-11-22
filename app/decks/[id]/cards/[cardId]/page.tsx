import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import Loading from "@/app/loading";
import { CardForm } from "@/components/card-form";
import { FormError, PageHeader, Shell } from "@/components/shell";
import { getCardEditor } from "@/lib/repo";

export default function EditCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; cardId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <EditCardBody params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditCardBody({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; cardId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const { cardId: rawCardId } = await params;
  const { error } = await searchParams;
  const cardId = Number(rawCardId);
  if (!Number.isInteger(cardId)) notFound();
  const page = await getCardEditor(cardId);
  if (!page) notFound();

  return (
    <Shell>
      <PageHeader title="Карточка" hint={page.deck.name} />
      <FormError message={error} />
      <CardForm
        deckId={page.deck.id}
        cardId={page.cardId}
        fields={page.fields}
        values={page.values}
        tags={page.tags}
      />
    </Shell>
  );
}
