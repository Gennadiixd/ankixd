import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

let database: Database.Database | null = null;

export function getDb() {
  if (database) return database;
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "ankixd.sqlite"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  database = db;
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS decks (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fields (
      id INTEGER PRIMARY KEY,
      deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('text', 'rich-text')),
      side TEXT NOT NULL CHECK (side IN ('front', 'back', 'both')),
      position INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY,
      deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      due_at TEXT NOT NULL,
      state INTEGER NOT NULL,
      fsrs_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS card_values (
      card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      field_id INTEGER NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
      value TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (card_id, field_id)
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY,
      deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      UNIQUE (deck_id, name)
    );

    CREATE TABLE IF NOT EXISTS card_tags (
      card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (card_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS review_logs (
      id INTEGER PRIMARY KEY,
      card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL,
      reviewed_at TEXT NOT NULL,
      before_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cards_deck_due ON cards (deck_id, due_at);
    CREATE INDEX IF NOT EXISTS idx_decks_folder ON decks (folder_id);

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_events (
      id INTEGER PRIMARY KEY,
      ip TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('login_fail', 'register')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ip_bans (
      ip TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('login', 'register')),
      until_at TEXT NOT NULL,
      PRIMARY KEY (ip, kind)
    );

    CREATE INDEX IF NOT EXISTS idx_auth_events_lookup ON auth_events (ip, kind, created_at);
  `);
  const columns = new Set(
    (db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[]).map((column) => column.name),
  );
  if (!columns.has("password_hash")) db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT`);
  const cardColumns = new Set(
    (db.prepare(`PRAGMA table_info(cards)`).all() as { name: string }[]).map((column) => column.name),
  );
  if (!cardColumns.has("suspended")) db.exec(`ALTER TABLE cards ADD COLUMN suspended INTEGER NOT NULL DEFAULT 0`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name ON users(name COLLATE NOCASE)`);
}
