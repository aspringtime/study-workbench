import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { TOPIC_SEED } from '../shared/constants'
import type { Card, FocusSession, Note, Task, Topic } from '../shared/types'

const here = dirname(fileURLToPath(import.meta.url))
export const PROJECT_ROOT = resolve(here, '../..')
export const DATA_DIR = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : join(PROJECT_ROOT, 'data')

mkdirSync(DATA_DIR, { recursive: true })

export const db = new DatabaseSync(join(DATA_DIR, 'workbench.db'))

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    date TEXT,
    priority TEXT NOT NULL DEFAULT 'normal',
    done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    done_at TEXT,
    estimate_pomodoros INTEGER NOT NULL DEFAULT 1,
    spent_seconds INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS focus_sessions (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    date TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT NOT NULL,
    seconds INTEGER NOT NULL,
    kind TEXT NOT NULL DEFAULT 'focus',
    label TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS idx_focus_date ON focus_sessions(date);

  CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    track TEXT NOT NULL,
    name TEXT NOT NULL,
    parent_id TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    sort INTEGER NOT NULL DEFAULT 0,
    note TEXT NOT NULL DEFAULT '',
    practice INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'template',
    content TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    topic_id TEXT,
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    deck TEXT NOT NULL DEFAULT '默认',
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    ease REAL NOT NULL DEFAULT 2.5,
    interval_days REAL NOT NULL DEFAULT 0,
    reps INTEGER NOT NULL DEFAULT 0,
    lapses INTEGER NOT NULL DEFAULT 0,
    due_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_reviewed_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(due_date);

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    rating TEXT NOT NULL,
    reviewed_at TEXT NOT NULL,
    date TEXT NOT NULL,
    prev_interval REAL NOT NULL,
    next_interval REAL NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_reviews_date ON reviews(date);
`)

export const now = () => new Date().toISOString()
export const uid = () => randomUUID()

/* ---------- 行映射 ---------- */

export function rowToTask(r: Record<string, unknown>): Task {
  return {
    id: String(r.id),
    title: String(r.title),
    note: (r.note as string) ?? '',
    date: (r.date as string | null) ?? null,
    priority: (r.priority as Task['priority']) ?? 'normal',
    done: Boolean(r.done),
    createdAt: String(r.created_at),
    doneAt: (r.done_at as string | null) ?? null,
    estimatePomodoros: Number(r.estimate_pomodoros ?? 1),
    spentSeconds: Number(r.spent_seconds ?? 0),
  }
}

export function rowToSession(r: Record<string, unknown>): FocusSession {
  return {
    id: String(r.id),
    taskId: (r.task_id as string | null) ?? null,
    date: String(r.date),
    startedAt: String(r.started_at),
    endedAt: String(r.ended_at),
    seconds: Number(r.seconds),
    kind: (r.kind as FocusSession['kind']) ?? 'focus',
    label: String(r.label ?? ''),
  }
}

export function rowToTopic(r: Record<string, unknown>): Topic {
  return {
    id: String(r.id),
    track: String(r.track),
    name: String(r.name),
    parentId: (r.parent_id as string | null) ?? null,
    status: (r.status as Topic['status']) ?? 'todo',
    sort: Number(r.sort ?? 0),
    note: String(r.note ?? ''),
    practice: Number(r.practice ?? 0),
    updatedAt: String(r.updated_at),
  }
}

export function rowToNote(r: Record<string, unknown>): Note {
  let tags: string[] = []
  try {
    const parsed = JSON.parse(String(r.tags ?? '[]'))
    if (Array.isArray(parsed)) tags = parsed.map(String)
  } catch {
    tags = []
  }
  return {
    id: String(r.id),
    title: String(r.title),
    kind: (r.kind as Note['kind']) ?? 'template',
    content: String(r.content ?? ''),
    tags,
    topicId: (r.topic_id as string | null) ?? null,
    pinned: Boolean(r.pinned),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  }
}

export function rowToCard(r: Record<string, unknown>): Card {
  return {
    id: String(r.id),
    deck: String(r.deck ?? '默认'),
    front: String(r.front),
    back: String(r.back),
    ease: Number(r.ease ?? 2.5),
    intervalDays: Number(r.interval_days ?? 0),
    reps: Number(r.reps ?? 0),
    lapses: Number(r.lapses ?? 0),
    dueDate: String(r.due_date),
    createdAt: String(r.created_at),
    lastReviewedAt: (r.last_reviewed_at as string | null) ?? null,
  }
}

/* ---------- 首次启动写入预置知识地图 ---------- */

export function seedTopicsIfEmpty() {
  const row = db.prepare('SELECT COUNT(*) AS n FROM topics').get() as { n: number }
  if (row.n > 0) return
  const insert = db.prepare(
    `INSERT INTO topics (id, track, name, parent_id, status, sort, note, practice, updated_at)
     VALUES (?, ?, ?, NULL, 'todo', ?, '', 0, ?)`,
  )
  const ts = now()
  db.exec('BEGIN')
  try {
    TOPIC_SEED.forEach((t, i) => {
      insert.run(uid(), t.track, t.name, i, ts)
    })
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}
