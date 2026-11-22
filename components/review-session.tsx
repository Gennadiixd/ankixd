"use client";

import Link from "next/link";
import { Layers } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FieldView } from "@/components/field-view";
import { Button } from "@/components/ui/button";
import { gradePreview, reviewCard, undoReview } from "@/lib/actions";
import { formatInterval } from "@/lib/format";
import type { GradePreview, SessionCard } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SHORT_WAIT_MS = 15 * 60 * 1000;

export function ReviewSession({
  deckId,
  deckName,
  tagLabel,
  initialCards,
}: {
  deckId: number;
  deckName: string;
  tagLabel?: string;
  initialCards: SessionCard[];
}) {
  const [queue, setQueue] = useState(initialCards);
  const [deferred, setDeferred] = useState<{ dueAt: number; card: SessionCard }[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [preview, setPreview] = useState<GradePreview | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ logId: number; card: SessionCard } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const saving = useRef(new Set<number>());

  const current = queue[0];
  const remaining = queue.length + deferred.length;

  useEffect(() => {
    if (deferred.length === 0) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [deferred.length]);

  useEffect(() => {
    const ready = deferred.filter((item) => item.dueAt <= now);
    if (ready.length === 0) return;
    setDeferred((items) => items.filter((item) => item.dueAt > now));
    setQueue((items) => {
      const ids = new Set(items.map((card) => card.id));
      return [...items, ...ready.map((item) => item.card).filter((card) => !ids.has(card.id))];
    });
  }, [deferred, now]);

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    setPreview(null);
    gradePreview(current.id).then(
      (value) => {
        if (!cancelled) setPreview(value);
      },
      () => {
        if (!cancelled) setPreview(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [current]);

  const grade = useCallback(async (rating: 1 | 3) => {
    if (!current || saving.current.has(current.id)) return;
    const card = current;
    saving.current.add(card.id);
    setError(null);
    setRevealed(false);
    setQueue((items) => items.filter((item) => item.id !== card.id));
    try {
      const result = await reviewCard(card.id, rating);
      setUndo({ logId: result.logId, card });
      const dueAt = result.dueAt;
      const dueSoon = dueAt <= Date.now() + 1000;
      const returnThisSession = dueAt <= Date.now() + SHORT_WAIT_MS;
      if (dueSoon) {
        setQueue((items) => (items.some((item) => item.id === card.id) ? items : [...items, card]));
      } else if (returnThisSession) {
        setDeferred((items) =>
          items.some((item) => item.card.id === card.id) ? items : [...items, { dueAt, card }],
        );
      }
    } catch (caught) {
      setQueue((items) => [card, ...items.filter((item) => item.id !== card.id)]);
      setDeferred((items) => items.filter((item) => item.card.id !== card.id));
      setError(caught instanceof Error ? caught.message : "Не удалось сохранить ответ");
    } finally {
      saving.current.delete(card.id);
    }
  }, [current]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (!revealed && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        setRevealed(true);
        return;
      }
      if (!revealed) return;
      if (event.key === "1") void grade(1);
      if (event.key === "2") void grade(3);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [grade, revealed]);

  async function undoLast() {
    if (!undo || pending) return;
    setPending(true);
    setError(null);
    try {
      await undoReview(undo.logId);
      const card = undo.card;
      setQueue((items) => [card, ...items.filter((item) => item.id !== card.id)]);
      setDeferred((items) => items.filter((item) => item.card.id !== card.id));
      setUndo(null);
      setRevealed(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось отменить ответ");
    } finally {
      setPending(false);
    }
  }

  const nearest = deferred.reduce((min, item) => Math.min(min, item.dueAt), Number.POSITIVE_INFINITY);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-col gap-5 px-4 py-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/decks/${deckId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Layers className="size-4 shrink-0" aria-hidden />
            {deckName}
          </Link>
          <p className="mt-1 text-sm">
            {current ? `Осталось ${remaining}` : "Сессия"}
            {tagLabel ? ` · ${tagLabel}` : ""}
          </p>
        </div>
        {current ? (
          <Link href={`/decks/${deckId}`} className={cn(buttonVariants({ variant: "outline" }), "h-9 shrink-0")}>
            Закончить
          </Link>
        ) : null}
      </header>

      {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

      {current ? (
        <div className="flex flex-1 flex-col gap-5">
          <div className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            {current.front.length > 0 ? (
              current.front.map((field) => <FieldView key={field.name} field={field} />)
            ) : (
              <p className="text-muted-foreground">На лице карточки пусто</p>
            )}
            {current.tags.length > 0 ? (
              <p className="text-xs text-muted-foreground">{current.tags.join(" · ")}</p>
            ) : null}
            {revealed ? (
              <div className="flex flex-col gap-4 border-t pt-4">
                {current.back.length > 0 ? (
                  current.back.map((field) => <FieldView key={field.name} field={field} />)
                ) : (
                  <p className="text-muted-foreground">На обороте пусто</p>
                )}
              </div>
            ) : null}
          </div>

          {revealed ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="destructive"
                className="h-16 flex-col gap-0"
                onClick={() => void grade(1)}
              >
                <span>Не вспомнил</span>
                <span className="text-xs opacity-80">{preview?.again ?? "…"}</span>
              </Button>
              <Button type="button" className="h-16 flex-col gap-0" onClick={() => void grade(3)}>
                <span>Вспомнил</span>
                <span className="text-xs opacity-80">{preview?.good ?? "…"}</span>
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" className="h-12" onClick={() => setRevealed(true)}>
              Показать ответ
            </Button>
          )}
          {undo ? (
            <button type="button" className="text-sm text-muted-foreground underline" onClick={() => void undoLast()}>
              Отменить последний ответ
            </button>
          ) : null}
          <p className="text-xs text-muted-foreground">Пробел показывает ответ. Затем 1 — не вспомнил, 2 — вспомнил.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-base">На сейчас всё.</p>
          {Number.isFinite(nearest) ? (
            <p className="text-sm text-muted-foreground">
              {nearest - now <= SHORT_WAIT_MS
                ? `Следующая карточка из этой сессии через ${formatInterval(new Date(now), nearest)}. Она откроется сама.`
                : `Ближайшая отложенная карточка через ${formatInterval(new Date(now), nearest)}. Её срок виден в колоде.`}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">В этой очереди карточек больше нет.</p>
          )}
          <Link href={`/decks/${deckId}`} className={cn(buttonVariants(), "h-10")}>
            К колоде
          </Link>
        </div>
      )}
    </div>
  );
}
