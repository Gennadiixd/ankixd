"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import * as repo from "@/lib/repo";

function fail(path: string, error: unknown): never {
  if (error instanceof AppError) {
    const joiner = path.includes("?") ? "&" : "?";
    redirect(`${path}${joiner}error=${encodeURIComponent(error.message)}`);
  }
  throw error;
}

function requiredId(formData: FormData, name: string) {
  const id = Number(formData.get(name));
  if (!Number.isInteger(id) || id <= 0) throw new AppError("Некорректный идентификатор");
  return id;
}

function folderIdFrom(formData: FormData) {
  const raw = String(formData.get("folderId") ?? "");
  if (!raw) return null;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new AppError("Некорректная папка");
  return id;
}

function fieldValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("field:") && typeof value === "string") {
      values[key.slice("field:".length)] = value;
    }
  }
  return values;
}

function refreshDeck(deckId: number) {
  revalidatePath("/");
  revalidatePath(`/decks/${deckId}`);
  revalidatePath(`/decks/${deckId}/review`);
}

export async function createFolder(formData: FormData) {
  try {
    await repo.createFolder(String(formData.get("name") ?? ""));
  } catch (error) {
    fail("/", error);
  }
  revalidatePath("/");
  redirect("/");
}

export async function renameFolder(formData: FormData) {
  const id = Number(formData.get("id"));
  try {
    await repo.renameFolder(id, String(formData.get("name") ?? ""));
  } catch (error) {
    fail("/", error);
  }
  revalidatePath("/");
  redirect("/");
}

export async function deleteFolder(formData: FormData) {
  try {
    await repo.deleteFolder(requiredId(formData, "id"));
  } catch (error) {
    fail("/", error);
  }
  revalidatePath("/");
  redirect("/");
}

export async function createDeck(formData: FormData) {
  let deckId = 0;
  try {
    deckId = await repo.createDeck(String(formData.get("name") ?? ""), folderIdFrom(formData));
  } catch (error) {
    fail("/", error);
  }
  revalidatePath("/");
  redirect(`/decks/${deckId}`);
}

function deckReturnPath(formData: FormData, deckId: number) {
  const value = String(formData.get("returnTo") ?? "");
  if (value === "/" || value === `/decks/${deckId}`) return value;
  return `/decks/${deckId}`;
}

export async function updateDeck(formData: FormData) {
  const deckId = requiredId(formData, "deckId");
  try {
    await repo.updateDeck(deckId, String(formData.get("name") ?? ""), folderIdFrom(formData));
  } catch (error) {
    fail(`/decks/${deckId}`, error);
  }
  refreshDeck(deckId);
  redirect(`/decks/${deckId}`);
}

export async function renameDeck(formData: FormData) {
  const deckId = requiredId(formData, "deckId");
  const back = deckReturnPath(formData, deckId);
  try {
    await repo.renameDeck(deckId, String(formData.get("name") ?? ""));
  } catch (error) {
    fail(back, error);
  }
  refreshDeck(deckId);
  redirect(back);
}

export async function moveDeck(formData: FormData) {
  const deckId = requiredId(formData, "deckId");
  const back = deckReturnPath(formData, deckId);
  try {
    await repo.moveDeck(deckId, folderIdFrom(formData));
  } catch (error) {
    fail(back, error);
  }
  refreshDeck(deckId);
  redirect(back);
}

export async function deleteDeck(formData: FormData) {
  const deckId = requiredId(formData, "deckId");
  try {
    await repo.deleteDeck(deckId);
  } catch (error) {
    fail(`/decks/${deckId}`, error);
  }
  revalidatePath("/");
  redirect("/");
}

export async function addField(formData: FormData) {
  const deckId = requiredId(formData, "deckId");
  try {
    await repo.addField(deckId, String(formData.get("name") ?? ""), String(formData.get("kind") ?? ""), String(formData.get("side") ?? ""));
  } catch (error) {
    fail(`/decks/${deckId}`, error);
  }
  refreshDeck(deckId);
  redirect(`/decks/${deckId}`);
}

export async function updateField(formData: FormData) {
  const deckId = requiredId(formData, "deckId");
  try {
    await repo.updateField(requiredId(formData, "fieldId"), String(formData.get("name") ?? ""), String(formData.get("kind") ?? ""), String(formData.get("side") ?? ""));
  } catch (error) {
    fail(`/decks/${deckId}`, error);
  }
  refreshDeck(deckId);
  redirect(`/decks/${deckId}`);
}

export async function deleteField(formData: FormData) {
  const deckId = requiredId(formData, "deckId");
  try {
    await repo.deleteField(requiredId(formData, "fieldId"));
  } catch (error) {
    fail(`/decks/${deckId}`, error);
  }
  refreshDeck(deckId);
  redirect(`/decks/${deckId}`);
}

export async function createCard(formData: FormData) {
  const deckId = requiredId(formData, "deckId");
  try {
    await repo.createCard(deckId, fieldValues(formData), String(formData.get("tags") ?? ""));
  } catch (error) {
    fail(`/decks/${deckId}/cards/new`, error);
  }
  refreshDeck(deckId);
  redirect(`/decks/${deckId}`);
}

export async function updateCard(formData: FormData) {
  const deckId = requiredId(formData, "deckId");
  const cardId = requiredId(formData, "cardId");
  try {
    await repo.updateCard(cardId, fieldValues(formData), String(formData.get("tags") ?? ""));
  } catch (error) {
    fail(`/decks/${deckId}/cards/${cardId}`, error);
  }
  refreshDeck(deckId);
  redirect(`/decks/${deckId}`);
}

export async function deleteCard(formData: FormData) {
  const deckId = requiredId(formData, "deckId");
  try {
    await repo.deleteCard(requiredId(formData, "cardId"));
  } catch (error) {
    fail(`/decks/${deckId}`, error);
  }
  refreshDeck(deckId);
  redirect(`/decks/${deckId}`);
}

export async function importDeck(formData: FormData) {
  let deckId = 0;
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new AppError("Выберите XML-файл");
    if (file.size > 5_000_000) throw new AppError("Файл больше 5 МБ");
    deckId = await repo.importAlgoXml(await file.text(), folderIdFrom(formData));
  } catch (error) {
    fail("/import", error);
  }
  revalidatePath("/");
  redirect(`/decks/${deckId}`);
}

export async function suspendCard(cardId: number) {
  const deckId = await repo.setCardSuspended(cardId, true);
  refreshDeck(deckId);
}

export async function unsuspendCard(cardId: number) {
  const deckId = await repo.setCardSuspended(cardId, false);
  refreshDeck(deckId);
}

export async function suspendCardForm(formData: FormData) {
  const deckId = requiredId(formData, "deckId");
  try {
    await repo.setCardSuspended(requiredId(formData, "cardId"), formData.get("suspended") !== "0");
  } catch (error) {
    fail(`/decks/${deckId}`, error);
  }
  refreshDeck(deckId);
  redirect(`/decks/${deckId}`);
}

export async function unsuspendDeck(formData: FormData) {
  const deckId = requiredId(formData, "deckId");
  try {
    await repo.unsuspendDeck(deckId);
  } catch (error) {
    fail(`/decks/${deckId}`, error);
  }
  refreshDeck(deckId);
  redirect(`/decks/${deckId}`);
}

export async function gradePreview(cardId: number) {
  return await repo.gradePreview(cardId);
}

export async function reviewCard(cardId: number, rating: 1 | 3) {
  return await repo.reviewCard(cardId, rating);
}

export async function undoReview(logId: number) {
  return await repo.undoReview(logId);
}
