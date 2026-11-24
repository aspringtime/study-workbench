import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db, now, uid } from '../db'
import { AppError } from '../errors'

interface ExportBundle {
  version: 1
  exportedAt: string
  tasks: Record<string, unknown>[]
  focusSessions: Record<string, unknown>[]
  topics: Record<string, unknown>[]
  notes: Record<string, unknown>[]
  cards: Record<string, unknown>[]
  reviews: Record<string, unknown>[]
}

export const systemRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/export', async () => {
    const bundle: ExportBundle = {
      version: 1,
      exportedAt: now(),
      tasks: db.prepare('SELECT * FROM tasks').all() as Record<string, unknown>[],
      focusSessions: db.prepare('SELECT * FROM focus_sessions').all() as Record<string, unknown>[],
      topics: db.prepare('SELECT * FROM topics').all() as Record<string, unknown>[],
      notes: db.prepare('SELECT * FROM notes').all() as Record<string, unknown>[],
      cards: db.prepare('SELECT * FROM cards').all() as Record<string, unknown>[],
      reviews: db.prepare('SELECT * FROM reviews').all() as Record<string, unknown>[],
    }
    return bundle
  })

  app.post('/api/import', async (req) => {
    const body = z
      .object({
        confirm: z.literal(true),
        bundle: z.object({
          version: z.number(),
          tasks: z.array(z.record(z.any())).default([]),
          focusSessions: z.array(z.record(z.any())).default([]),
          topics: z.array(z.record(z.any())).default([]),
          notes: z.array(z.record(z.any())).default([]),
          cards: z.array(z.record(z.any())).default([]),
          reviews: z.array(z.record(z.any())).default([]),
        }),
      })
      .parse(req.body)

    const isEmpty =
      body.bundle.tasks.length === 0 &&
      body.bundle.focusSessions.length === 0 &&
      body.bundle.notes.length === 0 &&
      body.bundle.cards.length === 0
    if (isEmpty) throw new AppError(400, 'empty_bundle', '导入文件里没有数据')

    const b = body.bundle
    db.exec('BEGIN')
    try {
      db.exec('DELETE FROM reviews; DELETE FROM cards; DELETE FROM notes; DELETE FROM focus_sessions; DELETE FROM tasks;')

      const insTask = db.prepare(
        `INSERT INTO tasks (id, title, note, date, priority, done, created_at, done_at, estimate_pomodoros, spent_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      for (const t of b.tasks) {
        insTask.run(
          String(t.id ?? uid()),
          String(t.title ?? ''),
          String(t.note ?? ''),
          (t.date as string | null) ?? null,
          String(t.priority ?? 'normal'),
          t.done ? 1 : 0,
          String(t.created_at ?? now()),
          (t.done_at as string | null) ?? null,
          Number(t.estimate_pomodoros ?? 1),
          Number(t.spent_seconds ?? 0),
        )
      }

      const insSession = db.prepare(
        `INSERT INTO focus_sessions (id, task_id, date, started_at, ended_at, seconds, kind, label)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      for (const s of b.focusSessions) {
        insSession.run(
          String(s.id ?? uid()),
          (s.task_id as string | null) ?? null,
          String(s.date ?? ''),
          String(s.started_at ?? now()),
          String(s.ended_at ?? now()),
          Number(s.seconds ?? 0),
          String(s.kind ?? 'focus'),
          String(s.label ?? ''),
        )
      }

      const insTopic = db.prepare(
        `INSERT INTO topics (id, track, name, parent_id, status, sort, note, practice, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      for (const t of b.topics) {
        insTopic.run(
          String(t.id ?? uid()),
          String(t.track ?? '其他'),
          String(t.name ?? ''),
          (t.parent_id as string | null) ?? null,
          String(t.status ?? 'todo'),
          Number(t.sort ?? 0),
          String(t.note ?? ''),
          Number(t.practice ?? 0),
          String(t.updated_at ?? now()),
        )
      }

      const insNote = db.prepare(
        `INSERT INTO notes (id, title, kind, content, tags, topic_id, pinned, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      for (const n of b.notes) {
        insNote.run(
          String(n.id ?? uid()),
          String(n.title ?? ''),
          String(n.kind ?? 'template'),
          String(n.content ?? ''),
          typeof n.tags === 'string' ? n.tags : JSON.stringify(n.tags ?? []),
          (n.topic_id as string | null) ?? null,
          n.pinned ? 1 : 0,
          String(n.created_at ?? now()),
          String(n.updated_at ?? now()),
        )
      }

      const insCard = db.prepare(
        `INSERT INTO cards (id, deck, front, back, ease, interval_days, reps, lapses, due_date, created_at, last_reviewed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      for (const c of b.cards) {
        insCard.run(
          String(c.id ?? uid()),
          String(c.deck ?? '默认'),
          String(c.front ?? ''),
          String(c.back ?? ''),
          Number(c.ease ?? 2.5),
          Number(c.interval_days ?? 0),
          Number(c.reps ?? 0),
          Number(c.lapses ?? 0),
          String(c.due_date ?? now().slice(0, 10)),
          String(c.created_at ?? now()),
          (c.last_reviewed_at as string | null) ?? null,
        )
      }

      const insReview = db.prepare(
        `INSERT INTO reviews (id, card_id, rating, reviewed_at, date, prev_interval, next_interval)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      for (const r of b.reviews) {
        insReview.run(
          String(r.id ?? uid()),
          String(r.card_id ?? ''),
          String(r.rating ?? 'good'),
          String(r.reviewed_at ?? now()),
          String(r.date ?? ''),
          Number(r.prev_interval ?? 0),
          Number(r.next_interval ?? 0),
        )
      }
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }

    return {
      imported: {
        tasks: b.tasks.length,
        focusSessions: b.focusSessions.length,
        topics: b.topics.length,
        notes: b.notes.length,
        cards: b.cards.length,
        reviews: b.reviews.length,
      },
    }
  })
}
