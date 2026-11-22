import Link from "next/link";
import { Layers } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import Loading from "@/app/loading";
import { ReviewSession } from "@/components/review-session";
import { PageHeader, Shell } from "@/components/shell";
import { buttonVariants } from "@/components/ui/button";
import { getReviewSession } from "@/lib/repo";
import { parseTagList } from "@/lib/tags";
import { cn } from "@/lib/utils";

export default function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tags?: string }>;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <ReviewBody params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ReviewBody({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tags?: string }>;
}) {
  await connection();
  const { id: rawId } = await params;
  const { tags: rawTags } = await searchParams;
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();
  const tags = parseTagList(rawTags ?? "");
  const session = await getReviewSession(id, tags);
  if (!session) notFound();
  const tagLabel = tags.length > 0 ? tags.join(", ") : undefined;

  if (session.cards.length === 0) {
    return (
      <Shell>
        <PageHeader
          title={session.deck.name}
          icon={<Layers className="size-6" aria-hidden />}
          hint={tagLabel}
        />
        <p>Сейчас нечего повторять.</p>
        <Link href={`/decks/${id}`} className={cn(buttonVariants(), "h-10")}>
          К колоде
        </Link>
      </Shell>
    );
  }

  return (
    <ReviewSession
      deckId={session.deck.id}
      deckName={session.deck.name}
      tagLabel={tagLabel}
      initialCards={session.cards}
    />
  );
}
