import Link from "next/link";
import { Layers } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import Loading from "@/app/loading";
import { DeckCards } from "@/components/deck-cards";
import { DeckMenu } from "@/components/deck-menu";
import { FormError, PageHeader, SectionTitle, Shell } from "@/components/shell";
import { SuspendedDeckActions } from "@/components/suspended-deck";
import { TagStudy } from "@/components/tag-study";
import { getDeckPage } from "@/lib/repo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DeckPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <DeckBody params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function DeckBody({
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
  const page = await getDeckPage(id);
  if (!page) notFound();
  const { deck, fields, tags, cards, folders, newCount, dueCount, suspendedCount } = page;

  return (
    <Shell>
      <PageHeader
        title={deck.name}
        icon={<Layers className="size-6" aria-hidden />}
        hint={`к сроку ${dueCount} · новых ${newCount} · всего ${cards.length}`}
        action={<DeckMenu deck={deck} folders={folders} fields={fields} returnTo={`/decks/${deck.id}`} />}
      />
      <FormError message={error} />

      <div className="flex flex-col gap-2">
        <Link href={`/decks/${deck.id}/review`} className={cn(buttonVariants(), "h-10")}>
          Повторять колоду
        </Link>
        {tags.length > 0 ? <TagStudy deckId={deck.id} tags={tags} /> : null}
      </div>
      <SuspendedDeckActions deckId={deck.id} count={suspendedCount} />

      <section className="flex flex-col gap-1">
        <div className="mb-1 flex items-center justify-between">
          <SectionTitle>Карточки</SectionTitle>
          <Link href={`/decks/${deck.id}/cards/new`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Новая
          </Link>
        </div>
        <DeckCards deckId={deck.id} cards={cards} />
      </section>

    </Shell>
  );
}

