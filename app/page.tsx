import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import Loading from "@/app/loading";
import { Layers, Play } from "lucide-react";
import { ConfirmForm } from "@/components/confirm-form";
import { DeckMenu } from "@/components/deck-menu";
import { FolderSection } from "@/components/folder-section";
import { CreateDeckDialog, CreateFolderDialog, RenameFolderDialog } from "@/components/home-actions";
import { FormError, SectionTitle, Shell } from "@/components/shell";
import { buttonVariants } from "@/components/ui/button";
import { deleteFolder } from "@/lib/actions";
import { listHome, listUserFields } from "@/lib/repo";
import { cn } from "@/lib/utils";

export default function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <HomeBody searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeBody({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const { error } = await searchParams;
  const { folders, decks } = await listHome();
  const fields = await listUserFields();
  const loose = decks.filter((deck) => deck.folderId == null);

  return (
    <Shell>
      <FormError message={error} />
      <div className="flex flex-wrap items-center gap-2">
        <CreateDeckDialog folders={folders} />
        <CreateFolderDialog />
        <Link href="/import" className={cn(buttonVariants({ variant: "outline" }), "h-10")}>
          Импорт XML
        </Link>
      </div>

      {decks.length === 0 && folders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Пока пусто. Создайте колоду или импортируйте XML.</p>
      ) : null}

      {loose.length > 0 ? (
        <section className="flex flex-col gap-2">
          <SectionTitle>Без папки</SectionTitle>
          {loose.map((deck) => (
            <DeckLink key={deck.id} deck={deck} folders={folders} fields={fields.filter((field) => field.deckId === deck.id)} />
          ))}
        </section>
      ) : null}

      {folders.map((folder) => {
        const nested = decks.filter((deck) => deck.folderId === folder.id);
        return (
          <FolderSection
            key={folder.id}
            id={folder.id}
            name={folder.name}
            actions={
              <>
                <Link
                  href={`/folders/${folder.id}/review`}
                  className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
                  aria-label="Повторять папку"
                  title="Повторять папку"
                >
                  <Play />
                </Link>
                <RenameFolderDialog id={folder.id} name={folder.name} />
                <ConfirmForm
                  action={deleteFolder}
                  hidden={{ id: String(folder.id) }}
                  label="Удалить"
                  message="Удалить папку? Колоды останутся в списке без папки."
                />
              </>
            }
          >
            {nested.length === 0 ? <p className="text-sm text-muted-foreground">В папке нет колод</p> : null}
            {nested.map((deck) => (
              <DeckLink key={deck.id} deck={deck} folders={folders} fields={fields.filter((field) => field.deckId === deck.id)} />
            ))}
          </FolderSection>
        );
      })}
    </Shell>
  );
}

function DeckLink({
  deck,
  folders,
  fields,
}: {
  deck: { id: number; name: string; folderId: number | null; dueCount: number; newCount: number; suspendedCount: number; cardCount: number };
  folders: { id: number; name: string }[];
  fields: { id: number; name: string; kind: "text" | "rich-text"; side: "front" | "back" | "both" }[];
}) {
  return (
    <div className="flex items-start rounded-xl bg-card ring-1 ring-foreground/10">
      <Link href={`/decks/${deck.id}`} className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3">
        <Layers className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <div className="font-medium">{deck.name}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {deck.dueCount > 0 ? <span className="font-medium text-foreground">{deck.dueCount} к повторению</span> : null}
            {deck.dueCount > 0 ? " · " : null}
            {deck.newCount} новых
            {deck.suspendedCount > 0 ? ` · отложено ${deck.suspendedCount}` : ""} · {deck.cardCount} всего
          </div>
        </div>
      </Link>
      <div className="flex items-center pt-1.5 pr-1.5">
        <Link
          href={`/decks/${deck.id}/review`}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          aria-label="Повторять"
          title="Повторять"
        >
          <Play />
        </Link>
        <DeckMenu deck={deck} folders={folders} fields={fields} returnTo="/" />
      </div>
    </div>
  );
}
