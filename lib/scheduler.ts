import { DefaultScheduler, Rating } from "ts-fsrs";
import { formatInterval } from "@/lib/format";

export type StoredCard = {
  stability: number;
  stabilityFast: number;
  difficulty: number;
  state: number;
  scheduleStatus: string;
  dueAt: string;
  lastReviewAt: string | null;
  cardId: string;
  reps: number;
  lapses: number;
  scheduledDays: number;
  learningStep: number;
};

type LiveCard = Omit<StoredCard, "dueAt" | "lastReviewAt"> & {
  dueAt: Date;
  lastReviewAt: Date | null;
};

const schedulerPromise = DefaultScheduler({
  version: "FSRS-7",
  desiredRetention: 0.9,
  enableFuzz: false,
  enableShortTerm: true,
});

export function readyScheduler() {
  return schedulerPromise;
}

export async function createNewCard(now: Date) {
  const fsrs = await readyScheduler();
  return toStored(fsrs.newCard({ now }) as LiveCard);
}

export function reviveCard(json: string): LiveCard {
  const card = JSON.parse(json) as StoredCard;
  return {
    ...card,
    dueAt: new Date(card.dueAt),
    lastReviewAt: card.lastReviewAt ? new Date(card.lastReviewAt) : null,
  };
}

export function toStored(card: {
  dueAt: Date | string;
  lastReviewAt?: Date | string | null;
  state: number;
  [key: string]: unknown;
}): StoredCard {
  const stored = {
    ...card,
    dueAt: new Date(card.dueAt).toISOString(),
    lastReviewAt: card.lastReviewAt ? new Date(card.lastReviewAt).toISOString() : null,
  };
  return JSON.parse(JSON.stringify(stored)) as StoredCard;
}

export async function scheduleCard(card: LiveCard, rating: 1 | 3, now: Date) {
  const fsrs = await readyScheduler();
  const grade = rating === 1 ? Rating.Again : Rating.Good;
  const result = fsrs.review({
    card: card as never,
    grade,
    now,
  });
  return toStored(result.card as LiveCard);
}

export async function previewGrades(card: LiveCard, now: Date) {
  const fsrs = await readyScheduler();
  let again = now;
  let good = now;
  for (const item of fsrs.preview({ card: card as never, now })) {
    const due = new Date((item.card as LiveCard).dueAt);
    if (item.grade === Rating.Again) again = due;
    if (item.grade === Rating.Good) good = due;
  }
  return {
    again: formatInterval(now, again),
    good: formatInterval(now, good),
  };
}
