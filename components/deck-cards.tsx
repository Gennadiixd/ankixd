"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { ConfirmForm } from "@/components/confirm-form";
import { buttonVariants } from "@/components/ui/button";
import { deleteCard } from "@/lib/actions";
import { formatInterval } from "@/lib/format";
import { cn } from "@/lib/utils";

type CardRow = {
  id: number;
  state: number;
  dueAt: string;
  preview: string;
  tags: string[];
};

export function DeckCards({ deckId, cards }: { deckId: number; cards: CardRow[] }) {
  if (cards.length === 0) return <p className="text-sm text-muted-foreground">В колоде пока нет карточек</p>;

  return (
    <>
      {cards.map((card) => (
        <div
          key={card.id}
          className="flex items-start justify-between gap-3 border-b py-3 [content-visibility:auto] [contain-intrinsic-size:auto_4.5rem]"
        >
          <div className="min-w-0">
            <Link href={`/decks/${deckId}/cards/${card.id}`} prefetch={false} className="font-medium">
              {card.preview}
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">
              {cardStatus(card)}
              {card.tags.length > 0 ? ` · ${card.tags.join(" · ")}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <Link
              href={`/decks/${deckId}/cards/${card.id}`}
              prefetch={false}
              aria-label="Редактировать"
              title="Редактировать"
              className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
            >
              <Pencil />
            </Link>
            <ConfirmForm
              action={deleteCard}
              hidden={{ deckId: String(deckId), cardId: String(card.id) }}
              label="Удалить"
              message="Удалить карточку?"
            />
          </div>
        </div>
      ))}
    </>
  );
}

function cardStatus(card: CardRow) {
  const now = new Date();
  if (card.state === 0) return "новая";
  if (card.dueAt <= now.toISOString()) return "к повторению";
  return `через ${formatInterval(now, card.dueAt)}`;
}
