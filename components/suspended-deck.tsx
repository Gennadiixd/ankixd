"use client";

import Link from "next/link";
import { ArchiveRestore, Play } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { unsuspendDeck } from "@/lib/actions";
import { cn } from "@/lib/utils";

export function SuspendedDeckActions({ deckId }: { deckId: number }) {
  const cellClass = cn(
    buttonVariants({ variant: "outline" }),
    "h-full min-h-16 w-full flex-col gap-1 whitespace-normal px-2 py-2 text-center leading-tight",
  );

  return (
    <div className="grid grid-cols-2 gap-2">
      <Link href={`/decks/${deckId}/review?suspended=1`} className={cellClass}>
        <Play />
        Повторять отложенные
      </Link>
      <Dialog>
        <DialogTrigger className={cellClass}>
          <ArchiveRestore />
          Вернуть отложенные в колоду
        </DialogTrigger>
        <DialogContent>
          <DialogTitle className="flex items-center gap-2">
            <ArchiveRestore className="size-4" aria-hidden />
            Вернуть в колоду
          </DialogTitle>
          <DialogDescription>
            Отложенные карточки снова попадут в обычную очередь по своему сроку. Прогресс не сбрасывается.
          </DialogDescription>
          <form action={unsuspendDeck} className="mt-4 flex justify-end gap-2">
            <input type="hidden" name="deckId" value={deckId} />
            <DialogClose className={cn(buttonVariants({ variant: "outline" }), "h-10")}>Отмена</DialogClose>
            <Button type="submit" className="h-10">
              Вернуть
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DeckListSummary({ total, suspended }: { total: number; suspended: number }) {
  return (
    <div>
      <h2 className="text-sm font-medium text-muted-foreground">Карточки</h2>
      <p className="mt-1 text-sm">
        в колоде {total}/
        {suspended > 0 ? (
          <button
            type="button"
            className="cursor-pointer underline"
            onClick={() => document.getElementById("otlozhennye")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            отложенных {suspended}
          </button>
        ) : (
          <span>отложенных {suspended}</span>
        )}
      </p>
    </div>
  );
}
