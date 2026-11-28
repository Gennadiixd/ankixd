import Link from "next/link";
import { Folder } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import Loading from "@/app/loading";
import { ReviewSession } from "@/components/review-session";
import { PageHeader, Shell } from "@/components/shell";
import { buttonVariants } from "@/components/ui/button";
import { getFolderReviewSession } from "@/lib/repo";
import { cn } from "@/lib/utils";

export default function FolderReviewPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Loading />}>
      <FolderReviewBody params={params} />
    </Suspense>
  );
}

async function FolderReviewBody({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();
  const session = await getFolderReviewSession(id);
  if (!session) notFound();

  if (session.cards.length === 0) {
    return (
      <Shell>
        <PageHeader title={session.folder.name} icon={<Folder className="size-6" aria-hidden />} />
        <p>Сейчас нечего повторять.</p>
        <Link href="/" className={cn(buttonVariants(), "h-10")}>
          К списку
        </Link>
      </Shell>
    );
  }

  return (
    <ReviewSession
      deckId={id}
      deckName={session.folder.name}
      initialCards={session.cards}
      titleHref="/"
      doneHref="/"
      doneLabel="К списку"
    />
  );
}
