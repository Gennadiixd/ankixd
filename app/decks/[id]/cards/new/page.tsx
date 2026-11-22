import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import Loading from "@/app/loading";
import { CardForm } from "@/components/card-form";
import { FormError, PageHeader, Shell } from "@/components/shell";
import { getNewCardPage } from "@/lib/repo";

export default function NewCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <NewCardBody params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function NewCardBody({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const { id: rawId } = await params;
  const { error } = await searchParams;
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();
  const page = await getNewCardPage(id);
  if (!page) notFound();

  return (
    <Shell>
      <PageHeader title="Новая карточка" hint={page.deck.name} />
      <FormError message={error} />
      <CardForm deckId={page.deck.id} fields={page.fields} />
    </Shell>
  );
}
