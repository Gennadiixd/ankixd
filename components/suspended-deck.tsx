"use client";

import Link from "next/link";
import { ArchiveRestore, Pause } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { unsuspendDeck } from "@/lib/actions";
import { cn } from "@/lib/utils";

export function SuspendedDeckActions({ deckId, count }: { deckId: number; count: number }) {
  if (count === 0) return null;

  const cellClass = cn(
    buttonVariants({ variant: "outline" }),
    "h-full min-h-16 w-full flex-col gap-1 whitespace-normal px-2 py-2 text-center leading-tight",
  );

  return (
    <section className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div>
        <h2 className="text-sm font-medium">Отложенные</h2>
        <p className="mt-1 text-sm text-muted-foreground">Сейчас {deferredLabel(count)}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
      <Link href={`/decks/${deckId}/review?suspended=1`} className={cellClass}>
        <Pause />
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
    </section>
  );
}

function deferredLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} отложенная`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} отложенные`;
  return `${count} отложенных`;
}
