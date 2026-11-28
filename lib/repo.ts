import type BetterSqlite3 from "better-sqlite3";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { cardPreview } from "@/lib/format";
import { forgetImages, imageIdsIn, sweepAbandonedImages } from "@/lib/images";
import { renderRichText } from "@/lib/html";
import { previewGrades, readyScheduler, reviveCard, scheduleCard, toStored } from "@/lib/scheduler";
import { parseTagList } from "@/lib/tags";
import type { FieldKind, FieldSide, SessionCard, ShownField } from "@/lib/types";
import { buildAlgoXml, parseAlgoXml } from "@/lib/xml";

type DeckRow = {
  id: number;
  folder_id: number | null;
  name: string;
};

type FieldRow = {
  id: number;
  deck_id: number;
  name: string;
  kind: FieldKind;
  side: FieldSide;
  position: number;
};

type CardRow = {
  id: number;
  deck_id: number;
  due_at: string;
  state: number;
  fsrs_json: string;
};

export type FolderItem = { id: number; name: string };

export type DeckSummary = {
  id: number;
  folderId: number | null;
  name: string;
  newCount: number;
  dueCount: number;
  suspendedCount: number;
  cardCount: number;
};

export type FieldItem = {
  id: number;
  name: string;
  kind: FieldKind;
  side: FieldSide;
};

export type TagItem = { name: string; cardCount: number };

export type CardSummary = {
  id: number;
  state: number;
  dueAt: string;
  suspended: boolean;
  preview: string;
  tags: string[];
};

const NAME_LIMIT = 200;

function cleanName(value: string, label: string) {
  const name = value.trim();
  if (!name) throw new AppError(`Введите название: ${label}`);
  if (name.length > NAME_LIMIT) throw new AppError("Название слишком длинное");
  return name;
}

async function findDeck(id: number) {
  const userId = await requireUserId();
  return (
    (getDb()
      .prepare(`SELECT id, folder_id, name FROM decks WHERE id = ? AND user_id = ?`)
      .get(id, userId) as DeckRow | undefined) ?? null
  );
}

async function requireDeck(id: number) {
  const deck = await findDeck(id);
  if (!deck) throw new AppError("Колода не найдена");
  return deck;
}

async function requireFolder(id: number) {
  const userId = await requireUserId();
  const folder = getDb()
    .prepare(`SELECT id, name FROM folders WHERE id = ? AND user_id = ?`)
    .get(id, userId) as FolderItem | undefined;
  if (!folder) throw new AppError("Папка не найдена");
  return folder;
}

async function assertFolder(folderId: number | null) {
  if (folderId != null) await requireFolder(folderId);
}

function listFieldRows(deckId: number) {
  return getDb()
    .prepare(`SELECT id, deck_id, name, kind, side, position FROM fields WHERE deck_id = ? ORDER BY position, id`)
    .all(deckId) as FieldRow[];
}

function toFieldItem(field: FieldRow): FieldItem {
  return { id: field.id, name: field.name, kind: field.kind, side: field.side };
}

export async function listHome() {
  const userId = await requireUserId();
  const now = new Date().toISOString();
  const folders = getDb()
    .prepare(`SELECT id, name FROM folders WHERE user_id = ? ORDER BY name COLLATE NOCASE`)
    .all(userId) as FolderItem[];
  const rows = getDb()
    .prepare(
      `SELECT d.id, d.folder_id AS folderId, d.name,
              COALESCE(SUM(CASE WHEN c.suspended = 0 AND c.state = 0 THEN 1 ELSE 0 END), 0) AS newCount,
              COALESCE(SUM(CASE WHEN c.suspended = 0 AND c.id IS NOT NULL AND c.state != 0 AND c.due_at <= ? THEN 1 ELSE 0 END), 0) AS dueCount,
              COALESCE(SUM(CASE WHEN c.suspended = 1 THEN 1 ELSE 0 END), 0) AS suspendedCount,
              COUNT(c.id) AS cardCount
       FROM decks d
       LEFT JOIN cards c ON c.deck_id = d.id
       WHERE d.user_id = ?
       GROUP BY d.id
       ORDER BY d.name COLLATE NOCASE`,
    )
    .all(now, userId) as DeckSummary[];
  return { folders, decks: rows };
}

export async function listUserFields() {
  const userId = await requireUserId();
  return getDb()
    .prepare(
      `SELECT f.id, f.deck_id AS deckId, f.name, f.kind, f.side
       FROM fields f
       JOIN decks d ON d.id = f.deck_id
       WHERE d.user_id = ?
       ORDER BY f.position, f.id`,
    )
    .all(userId) as (FieldItem & { deckId: number })[];
}

export async function listFolders() {
  const userId = await requireUserId();
  return getDb()
    .prepare(`SELECT id, name FROM folders WHERE user_id = ? ORDER BY name COLLATE NOCASE`)
    .all(userId) as FolderItem[];
}

export async function createFolder(name: string) {
  const userId = await requireUserId();
  const clean = cleanName(name, "папка");
  getDb()
    .prepare(`INSERT INTO folders (user_id, name, created_at) VALUES (?, ?, ?)`)
    .run(userId, clean, new Date().toISOString());
}

export async function renameFolder(id: number, name: string) {
  const userId = await requireUserId();
  await requireFolder(id);
  getDb().prepare(`UPDATE folders SET name = ? WHERE id = ? AND user_id = ?`).run(cleanName(name, "папка"), id, userId);
}

export async function deleteFolder(id: number) {
  const userId = await requireUserId();
  await requireFolder(id);
  const db = getDb();
  db.transaction(() => {
    db.prepare(`UPDATE decks SET folder_id = NULL WHERE folder_id = ? AND user_id = ?`).run(id, userId);
    db.prepare(`DELETE FROM folders WHERE id = ? AND user_id = ?`).run(id, userId);
  })();
}

export async function createDeck(name: string, folderId: number | null) {
  const userId = await requireUserId();
  const clean = cleanName(name, "колода");
  await assertFolder(folderId);
  const db = getDb();
  return db.transaction(() => {
    const result = db
      .prepare(`INSERT INTO decks (user_id, folder_id, name, created_at) VALUES (?, ?, ?, ?)`)
      .run(userId, folderId, clean, new Date().toISOString());
    const deckId = Number(result.lastInsertRowid);
    db.prepare(`INSERT INTO fields (deck_id, name, kind, side, position) VALUES (?, 'Вопрос', 'text', 'front', 0)`).run(deckId);
    db.prepare(`INSERT INTO fields (deck_id, name, kind, side, position) VALUES (?, 'Ответ', 'text', 'back', 1)`).run(deckId);
    return deckId;
  })();
}

export async function updateDeck(id: number, name: string, folderId: number | null) {
  const userId = await requireUserId();
  await requireDeck(id);
  await assertFolder(folderId);
  getDb()
    .prepare(`UPDATE decks SET name = ?, folder_id = ? WHERE id = ? AND user_id = ?`)
    .run(cleanName(name, "колода"), folderId, id, userId);
}

export async function renameDeck(id: number, name: string) {
  const userId = await requireUserId();
  await requireDeck(id);
  getDb()
    .prepare(`UPDATE decks SET name = ? WHERE id = ? AND user_id = ?`)
    .run(cleanName(name, "колода"), id, userId);
}

export async function moveDeck(id: number, folderId: number | null) {
  const userId = await requireUserId();
  await requireDeck(id);
  await assertFolder(folderId);
  getDb().prepare(`UPDATE decks SET folder_id = ? WHERE id = ? AND user_id = ?`).run(folderId, id, userId);
}

export async function deleteDeck(id: number) {
  const userId = await requireUserId();
  await requireDeck(id);
  const values = valueTexts(
    `SELECT cv.value AS value FROM card_values cv JOIN cards c ON c.id = cv.card_id WHERE c.deck_id = ?`,
    id,
  );
  getDb().prepare(`DELETE FROM decks WHERE id = ? AND user_id = ?`).run(id, userId);
  releaseImages(values);
}

function parseKind(value: string): FieldKind {
  if (value === "text" || value === "rich-text") return value;
  throw new AppError("Неизвестный тип поля");
}

function parseSide(value: string): FieldSide {
  if (value === "front" || value === "back" || value === "both") return value;
  throw new AppError("Неизвестная сторона поля");
}

export async function addField(deckId: number, name: string, kind: string, side: string) {
  await requireDeck(deckId);
  const clean = cleanName(name, "поле");
  const fields = listFieldRows(deckId);
  if (fields.some((field) => field.name === clean)) throw new AppError("Такое поле уже есть");
  const position = fields.reduce((max, field) => Math.max(max, field.position), -1) + 1;
  getDb()
    .prepare(`INSERT INTO fields (deck_id, name, kind, side, position) VALUES (?, ?, ?, ?, ?)`)
    .run(deckId, clean, parseKind(kind), parseSide(side), position);
}

export async function updateField(fieldId: number, name: string, kind: string, side: string) {
  const field = getDb().prepare(`SELECT * FROM fields WHERE id = ?`).get(fieldId) as FieldRow | undefined;
  if (!field || !(await findDeck(field.deck_id))) throw new AppError("Поле не найдено");
  const clean = cleanName(name, "поле");
  if (listFieldRows(field.deck_id).some((item) => item.name === clean && item.id !== fieldId)) {
    throw new AppError("Такое поле уже есть");
  }
  getDb()
    .prepare(`UPDATE fields SET name = ?, kind = ?, side = ? WHERE id = ?`)
    .run(clean, parseKind(kind), parseSide(side), fieldId);
  return field.deck_id;
}

export async function deleteField(fieldId: number) {
  const field = getDb().prepare(`SELECT * FROM fields WHERE id = ?`).get(fieldId) as FieldRow | undefined;
  if (!field || !(await findDeck(field.deck_id))) throw new AppError("Поле не найдено");
  if (listFieldRows(field.deck_id).length <= 1) {
    throw new AppError("В колоде должно остаться хотя бы одно поле");
  }
  const values = valueTexts(`SELECT value FROM card_values WHERE field_id = ?`, fieldId);
  getDb().prepare(`DELETE FROM fields WHERE id = ?`).run(fieldId);
  releaseImages(values);
  return field.deck_id;
}

function replaceTags(db: BetterSqlite3.Database, deckId: number, cardId: number, tags: string[]) {
  db.prepare(`DELETE FROM card_tags WHERE card_id = ?`).run(cardId);
  const findTag = db.prepare(`SELECT id FROM tags WHERE deck_id = ? AND name = ?`);
  const insertTag = db.prepare(`INSERT INTO tags (deck_id, name) VALUES (?, ?)`);
  const link = db.prepare(`INSERT OR IGNORE INTO card_tags (card_id, tag_id) VALUES (?, ?)`);
  for (const tag of tags) {
    let row = findTag.get(deckId, tag) as { id: number } | undefined;
    if (!row) {
      const created = insertTag.run(deckId, tag);
      row = { id: Number(created.lastInsertRowid) };
    }
    link.run(cardId, row.id);
  }
  db.prepare(
    `DELETE FROM tags WHERE deck_id = ? AND NOT EXISTS (SELECT 1 FROM card_tags WHERE tag_id = tags.id)`,
  ).run(deckId);
}

function saveValues(db: BetterSqlite3.Database, cardId: number, fields: FieldRow[], byFieldId: Record<string, string>) {
  const upsert = db.prepare(
    `INSERT INTO card_values (card_id, field_id, value) VALUES (?, ?, ?)
     ON CONFLICT (card_id, field_id) DO UPDATE SET value = excluded.value`,
  );
  let filled = false;
  for (const field of fields) {
    const raw = byFieldId[String(field.id)] ?? "";
    const value = field.kind === "rich-text" ? renderRichText(raw) : raw;
    if (value.trim()) filled = true;
    upsert.run(cardId, field.id, value);
  }
  if (!filled) throw new AppError("Заполните хотя бы одно поле");
}

async function requireCard(cardId: number) {
  const userId = await requireUserId();
  const card = getDb()
    .prepare(
      `SELECT c.id, c.deck_id, c.due_at, c.state, c.fsrs_json
       FROM cards c
       JOIN decks d ON d.id = c.deck_id
       WHERE c.id = ? AND d.user_id = ?`,
    )
    .get(cardId, userId) as CardRow | undefined;
  if (!card) throw new AppError("Карточка не найдена");
  return card;
}

export async function createCard(deckId: number, byFieldId: Record<string, string>, tagsInput: string) {
  const deck = await requireDeck(deckId);
  const fields = listFieldRows(deck.id);
  if (fields.length === 0) throw new AppError("Сначала добавьте поле");
  const now = new Date();
  const fsrs = await readyScheduler();
  const stored = toStored(fsrs.newCard({ now }) as Parameters<typeof toStored>[0]);
  const db = getDb();
  const cardId = db.transaction(() => {
    const result = db
      .prepare(`INSERT INTO cards (deck_id, due_at, state, fsrs_json, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run(deck.id, stored.dueAt, stored.state, JSON.stringify(stored), now.toISOString());
    const createdId = Number(result.lastInsertRowid);
    saveValues(db, createdId, fields, byFieldId);
    replaceTags(db, deck.id, createdId, parseTagList(tagsInput));
    return createdId;
  })();
  sweepAbandonedImages();
  return cardId;
}

function valueTexts(sql: string, id: number) {
  return (getDb().prepare(sql).all(id) as { value: string }[]).map((row) => row.value);
}

function releaseImages(values: string[]) {
  forgetImages(imageIdsIn(values));
  sweepAbandonedImages();
}

export async function updateCard(cardId: number, byFieldId: Record<string, string>, tagsInput: string) {
  const card = await requireCard(cardId);
  const fields = listFieldRows(card.deck_id);
  const previous = valueTexts(`SELECT value FROM card_values WHERE card_id = ?`, card.id);
  const db = getDb();
  db.transaction(() => {
    saveValues(db, card.id, fields, byFieldId);
    replaceTags(db, card.deck_id, card.id, parseTagList(tagsInput));
  })();
  releaseImages(previous);
  return card.deck_id;
}

export async function deleteCard(cardId: number) {
  const card = await requireCard(cardId);
  const previous = valueTexts(`SELECT value FROM card_values WHERE card_id = ?`, card.id);
  const db = getDb();
  db.transaction(() => {
    db.prepare(`DELETE FROM cards WHERE id = ?`).run(card.id);
    db.prepare(
      `DELETE FROM tags WHERE deck_id = ? AND NOT EXISTS (SELECT 1 FROM card_tags WHERE tag_id = tags.id)`,
    ).run(card.deck_id);
  })();
  releaseImages(previous);
  return card.deck_id;
}

export async function exportAlgoXml(deckId: number) {
  const deck = await findDeck(deckId);
  if (!deck) return null;
  const fields = listFieldRows(deckId);
  const cards = getDb()
    .prepare(`SELECT id FROM cards WHERE deck_id = ? ORDER BY id`)
    .all(deckId) as { id: number }[];
  const cardIds = cards.map((card) => card.id);
  const values = loadValues(cardIds);
  const tags = loadTags(cardIds);
  return {
    name: deck.name,
    xml: buildAlgoXml({
      name: deck.name,
      fields: fields.map((field) => ({ name: field.name, kind: field.kind, side: field.side })),
      cards: cards.map((card) => ({
        tags: tags.get(card.id) ?? [],
        values: Object.fromEntries(fields.map((field) => [field.name, values.get(card.id)?.get(field.id) ?? ""])),
      })),
    }),
  };
}

export async function importAlgoXml(xml: string, folderId: number | null) {
  const userId = await requireUserId();
  const parsed = parseAlgoXml(xml);
  await assertFolder(folderId);
  const now = new Date();
  const fsrs = await readyScheduler();
  const db = getDb();
  return db.transaction(() => {
    const deckResult = db
      .prepare(`INSERT INTO decks (user_id, folder_id, name, created_at) VALUES (?, ?, ?, ?)`)
      .run(userId, folderId, parsed.name, now.toISOString());
    const deckId = Number(deckResult.lastInsertRowid);
    const fieldIds = new Map<string, number>();
    parsed.fields.forEach((field, position) => {
      const result = db
        .prepare(`INSERT INTO fields (deck_id, name, kind, side, position) VALUES (?, ?, ?, ?, ?)`)
        .run(deckId, field.name, field.kind, field.side, position);
      fieldIds.set(field.name, Number(result.lastInsertRowid));
    });
    const insertCard = db.prepare(
      `INSERT INTO cards (deck_id, due_at, state, fsrs_json, created_at) VALUES (?, ?, ?, ?, ?)`,
    );
    const insertValue = db.prepare(`INSERT INTO card_values (card_id, field_id, value) VALUES (?, ?, ?)`);
    for (const card of parsed.cards) {
      const stored = toStored(fsrs.newCard({ now }) as Parameters<typeof toStored>[0]);
      const cardResult = insertCard.run(deckId, stored.dueAt, stored.state, JSON.stringify(stored), now.toISOString());
      const cardId = Number(cardResult.lastInsertRowid);
      for (const [name, fieldId] of fieldIds) {
        const raw = card.values[name] ?? "";
        const field = parsed.fields.find((item) => item.name === name);
        insertValue.run(cardId, fieldId, field?.kind === "rich-text" ? renderRichText(raw) : raw);
      }
      replaceTags(db, deckId, cardId, card.tags);
    }
    return deckId;
  })();
}

function loadTags(cardIds: number[]) {
  const grouped = new Map<number, string[]>();
  if (cardIds.length === 0) return grouped;
  const placeholders = cardIds.map(() => "?").join(",");
  const rows = getDb()
    .prepare(
      `SELECT ct.card_id AS cardId, t.name
       FROM card_tags ct
       JOIN tags t ON t.id = ct.tag_id
       WHERE ct.card_id IN (${placeholders})
       ORDER BY t.name COLLATE NOCASE`,
    )
    .all(...cardIds) as { cardId: number; name: string }[];
  for (const row of rows) {
    const list = grouped.get(row.cardId) ?? [];
    list.push(row.name);
    grouped.set(row.cardId, list);
  }
  return grouped;
}

function loadValues(cardIds: number[]) {
  const grouped = new Map<number, Map<number, string>>();
  if (cardIds.length === 0) return grouped;
  const placeholders = cardIds.map(() => "?").join(",");
  const rows = getDb()
    .prepare(`SELECT card_id AS cardId, field_id AS fieldId, value FROM card_values WHERE card_id IN (${placeholders})`)
    .all(...cardIds) as { cardId: number; fieldId: number; value: string }[];
  for (const row of rows) {
    const map = grouped.get(row.cardId) ?? new Map<number, string>();
    map.set(row.fieldId, row.value);
    grouped.set(row.cardId, map);
  }
  return grouped;
}

function projectFields(fields: FieldRow[], values: Map<number, string>, side: "front" | "back"): ShownField[] {
  return fields
    .filter((field) => (side === "front" ? field.side !== "back" : field.side === "back"))
    .map((field) => {
      const value = values.get(field.id) ?? "";
      return {
        name: field.name,
        kind: field.kind,
        value,
        safeHtml: field.kind === "rich-text" ? renderRichText(value) : null,
      };
    })
    .filter((field) => field.value.trim().length > 0);
}

export async function getDeckPage(deckId: number) {
  const deck = await findDeck(deckId);
  if (!deck) return null;
  const now = new Date().toISOString();
  const fields = listFieldRows(deckId).map(toFieldItem);
  const tags = getDb()
    .prepare(
      `SELECT t.name, COUNT(c.id) AS cardCount
       FROM tags t
       LEFT JOIN card_tags ct ON ct.tag_id = t.id
       LEFT JOIN cards c ON c.id = ct.card_id AND c.suspended = 0
       WHERE t.deck_id = ?
       GROUP BY t.id
       ORDER BY t.name COLLATE NOCASE`,
    )
    .all(deckId) as TagItem[];
  const rows = getDb()
    .prepare(
      `SELECT c.id, c.state, c.suspended, c.due_at AS dueAt,
              (SELECT cv.value
               FROM card_values cv
               JOIN fields f ON f.id = cv.field_id
               WHERE cv.card_id = c.id AND f.side IN ('front', 'both')
               ORDER BY f.position
               LIMIT 1) AS preview
       FROM cards c
       WHERE c.deck_id = ?
       ORDER BY c.suspended, c.id`,
    )
    .all(deckId) as { id: number; state: number; suspended: number; dueAt: string; preview: string | null }[];
  const tagMap = loadTags(rows.map((row) => row.id));
  const cards: CardSummary[] = rows.map((row) => ({
    id: row.id,
    state: row.state,
    dueAt: row.dueAt,
    suspended: row.suspended === 1,
    preview: cardPreview(row.preview ?? "") || "Пустая карточка",
    tags: tagMap.get(row.id) ?? [],
  }));
  return {
    deck: { id: deck.id, name: deck.name, folderId: deck.folder_id },
    fields,
    tags,
    cards,
    folders: await listFolders(),
    newCount: cards.filter((card) => !card.suspended && card.state === 0).length,
    dueCount: cards.filter((card) => !card.suspended && card.state !== 0 && card.dueAt <= now).length,
    suspendedCount: cards.filter((card) => card.suspended).length,
  };
}

export async function getCardEditor(cardId: number) {
  const userId = await requireUserId();
  const card = getDb()
    .prepare(
      `SELECT c.id, c.deck_id
       FROM cards c
       JOIN decks d ON d.id = c.deck_id
       WHERE c.id = ? AND d.user_id = ?`,
    )
    .get(cardId, userId) as { id: number; deck_id: number } | undefined;
  if (!card) return null;
  const deck = await requireDeck(card.deck_id);
  const fields = listFieldRows(deck.id);
  const values = loadValues([card.id]).get(card.id) ?? new Map<number, string>();
  return {
    deck: { id: deck.id, name: deck.name },
    cardId: card.id,
    fields: fields.map(toFieldItem),
    values: Object.fromEntries(fields.map((field) => [field.id, values.get(field.id) ?? ""])),
    tags: (loadTags([card.id]).get(card.id) ?? []).join(", "),
  };
}

export async function getNewCardPage(deckId: number) {
  const deck = await findDeck(deckId);
  if (!deck) return null;
  return {
    deck: { id: deck.id, name: deck.name },
    fields: listFieldRows(deckId).map(toFieldItem),
  };
}

export async function getReviewSession(deckId: number, tags: string[], suspended = false) {
  const deck = await findDeck(deckId);
  if (!deck) return null;
  const now = new Date().toISOString();
  const order = `ORDER BY CASE c.state WHEN 1 THEN 0 WHEN 3 THEN 0 WHEN 2 THEN 1 ELSE 2 END, c.due_at, c.id`;
  const rows = (
    suspended
      ? getDb()
          .prepare(`SELECT c.id FROM cards c WHERE c.deck_id = ? AND c.suspended = 1 ${order}`)
          .all(deckId)
      : tags.length === 0
        ? getDb()
            .prepare(`SELECT c.id FROM cards c WHERE c.deck_id = ? AND c.suspended = 0 AND c.due_at <= ? ${order}`)
            .all(deckId, now)
        : getDb()
            .prepare(
              `SELECT c.id FROM cards c
               WHERE c.deck_id = ? AND c.suspended = 0 AND c.due_at <= ?
               AND EXISTS (
                 SELECT 1 FROM card_tags ct
                 JOIN tags t ON t.id = ct.tag_id
                 WHERE ct.card_id = c.id AND t.name IN (${tags.map(() => "?").join(",")})
               )
               ${order}`,
            )
            .all(deckId, now, ...tags)
  ) as { id: number }[];
  const fields = listFieldRows(deckId);
  const values = loadValues(rows.map((row) => row.id));
  const tagMap = loadTags(rows.map((row) => row.id));
  const cards: SessionCard[] = rows.map((row) => ({
    id: row.id,
    front: projectFields(fields, values.get(row.id) ?? new Map(), "front"),
    back: projectFields(fields, values.get(row.id) ?? new Map(), "back"),
    tags: tagMap.get(row.id) ?? [],
  }));
  return {
    deck: { id: deck.id, name: deck.name },
    cards,
  };
}

export async function getFolderReviewSession(folderId: number) {
  const userId = await requireUserId();
  const folder = getDb()
    .prepare(`SELECT id, name FROM folders WHERE id = ? AND user_id = ?`)
    .get(folderId, userId) as FolderItem | undefined;
  if (!folder) return null;
  const now = new Date().toISOString();
  const order = `ORDER BY CASE c.state WHEN 1 THEN 0 WHEN 3 THEN 0 WHEN 2 THEN 1 ELSE 2 END, c.due_at, c.id`;
  const rows = getDb()
    .prepare(
      `SELECT c.id, c.deck_id AS deckId
       FROM cards c
       JOIN decks d ON d.id = c.deck_id
       WHERE d.folder_id = ? AND d.user_id = ? AND c.suspended = 0 AND c.due_at <= ?
       ${order}`,
    )
    .all(folder.id, userId, now) as { id: number; deckId: number }[];
  const deckIds = [...new Set(rows.map((row) => row.deckId))];
  const fieldsByDeck = new Map(deckIds.map((id) => [id, listFieldRows(id)]));
  const values = loadValues(rows.map((row) => row.id));
  const tagMap = loadTags(rows.map((row) => row.id));
  const cards: SessionCard[] = rows.map((row) => ({
    id: row.id,
    front: projectFields(fieldsByDeck.get(row.deckId) ?? [], values.get(row.id) ?? new Map(), "front"),
    back: projectFields(fieldsByDeck.get(row.deckId) ?? [], values.get(row.id) ?? new Map(), "back"),
    tags: tagMap.get(row.id) ?? [],
  }));
  return { folder, cards };
}

export async function setCardSuspended(cardId: number, suspended: boolean) {
  const card = await requireCard(cardId);
  getDb()
    .prepare(`UPDATE cards SET suspended = ? WHERE id = ?`)
    .run(suspended ? 1 : 0, card.id);
  return card.deck_id;
}

export async function unsuspendDeck(deckId: number) {
  await requireDeck(deckId);
  getDb().prepare(`UPDATE cards SET suspended = 0 WHERE deck_id = ? AND suspended = 1`).run(deckId);
}

export async function reviewCard(cardId: number, rating: 1 | 3) {
  if (rating !== 1 && rating !== 3) throw new AppError("Неизвестная оценка");
  const card = await requireCard(cardId);
  const now = new Date();
  const next = await scheduleCard(reviveCard(card.fsrs_json), rating, now);
  const db = getDb();
  const logId = db.transaction(() => {
    const log = db
      .prepare(`INSERT INTO review_logs (card_id, rating, reviewed_at, before_json) VALUES (?, ?, ?, ?)`)
      .run(card.id, rating, now.toISOString(), card.fsrs_json);
    db.prepare(`UPDATE cards SET due_at = ?, state = ?, fsrs_json = ? WHERE id = ?`).run(
      next.dueAt,
      next.state,
      JSON.stringify(next),
      card.id,
    );
    return Number(log.lastInsertRowid);
  })();
  return { logId, dueAt: new Date(next.dueAt).getTime(), deckId: card.deck_id };
}

export async function gradePreview(cardId: number) {
  const card = await requireCard(cardId);
  return previewGrades(reviveCard(card.fsrs_json), new Date());
}

export async function undoReview(logId: number) {
  const userId = await requireUserId();
  const db = getDb();
  const log = db
    .prepare(
      `SELECT l.id, l.card_id, l.before_json
       FROM review_logs l
       JOIN cards c ON c.id = l.card_id
       JOIN decks d ON d.id = c.deck_id
       WHERE l.id = ? AND d.user_id = ?`,
    )
    .get(logId, userId) as { id: number; card_id: number; before_json: string } | undefined;
  if (!log) throw new AppError("Нечего отменять");
  const latest = db.prepare(`SELECT MAX(id) AS id FROM review_logs WHERE card_id = ?`).get(log.card_id) as {
    id: number;
  };
  if (latest.id !== log.id) throw new AppError("Можно отменить только последний ответ по этой карточке");
  const stored = JSON.parse(log.before_json) as { dueAt: string; state: number };
  db.transaction(() => {
    db.prepare(`UPDATE cards SET due_at = ?, state = ?, fsrs_json = ? WHERE id = ?`).run(
      stored.dueAt,
      stored.state,
      log.before_json,
      log.card_id,
    );
    db.prepare(`DELETE FROM review_logs WHERE id = ?`).run(log.id);
  })();
  return log.card_id;
}
