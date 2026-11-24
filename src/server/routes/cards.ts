import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db, now, rowToCard, uid } from '../db'
import { AppError } from '../errors'
import { schedule } from '../../shared/srs'
import { addDays, todayStr } from '../../shared/dates'

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const createSchema = z.object({
  front: z.string().trim().min(1, '正面不能为空').max(2000),
  back: z.string().trim().min(1, '背面不能为空').max(8000),
  deck: z.string().trim().max(40).default('默认'),
  dueDate: dateStr.optional(),
})

const updateSchema = createSchema.partial()

export const cardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/cards', async (req) => {
    const { due, date, deck } = req.query as { due?: string; date?: string; deck?: string }
    const today = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayStr()
    const where: string[] = []
    const params: string[] = []
    if (due === '1') {
      where.push('due_date <= ?')
      params.push(today)
    }
    if (deck) {
      where.push('deck = ?')
      params.push(deck)
    }
    const sql = `SELECT * FROM cards ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY due_date ASC, created_at ASC LIMIT 300`
    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]
    return rows.map(rowToCard)
  })

  app.post('/api/cards', async (req, reply) => {
    const body = createSchema.parse(req.body)
    const id = uid()
    const today = todayStr()
    db.prepare(
      `INSERT INTO cards (id, deck, front, back, ease, interval_days, reps, lapses, due_date, created_at, last_reviewed_at)
       VALUES (?, ?, ?, ?, 2.5, 0, 0, 0, ?, ?, NULL)`,
    ).run(id, body.deck, body.front, body.back, body.dueDate ?? today, now())
    const row = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Record<string, unknown>
    reply.code(201)
    return rowToCard(row)
  })

  app.patch('/api/cards/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = updateSchema.parse(req.body)
    const existing = db.prepare('SELECT * FROM cards WHERE id = ?').get(id)
    if (!existing) throw new AppError(404, 'not_found', '卡片不存在')

    const sets: string[] = []
    const params: (string | number | null)[] = []
    if (body.front !== undefined) {
      sets.push('front = ?')
      params.push(body.front)
    }
    if (body.back !== undefined) {
      sets.push('back = ?')
      params.push(body.back)
    }
    if (body.deck !== undefined) {
      sets.push('deck = ?')
      params.push(body.deck)
    }
    if (body.dueDate !== undefined) {
      sets.push('due_date = ?')
      params.push(body.dueDate)
    }
    if (sets.length > 0) {
      params.push(id)
      db.prepare(`UPDATE cards SET ${sets.join(', ')} WHERE id = ?`).run(...params)
    }
    const row = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Record<string, unknown>
    return rowToCard(row)
  })

  app.delete('/api/cards/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    db.prepare('DELETE FROM reviews WHERE card_id = ?').run(id)
    db.prepare('DELETE FROM cards WHERE id = ?').run(id)
    reply.code(204)
    return null
  })

  app.post('/api/cards/:id/review', async (req) => {
    const { id } = req.params as { id: string }
    const body = z
      .object({ rating: z.enum(['again', 'hard', 'good', 'easy']), date: dateStr.optional() })
      .parse(req.body)

    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined
    if (!card) throw new AppError(404, 'not_found', '卡片不存在')

    const today = body.date ?? todayStr()
    const prevInterval = Number(card.interval_days ?? 0)
    const next = schedule({ ease: Number(card.ease), intervalDays: prevInterval }, body.rating)
    const dueDate = addDays(today, next.dueInDays)
    const reviewedAt = now()

    db.exec('BEGIN')
    try {
      db.prepare(
        `UPDATE cards SET ease = ?, interval_days = ?, reps = reps + 1,
          lapses = lapses + ?, due_date = ?, last_reviewed_at = ?
         WHERE id = ?`,
      ).run(next.ease, next.intervalDays, body.rating === 'again' ? 1 : 0, dueDate, reviewedAt, id)
      db.prepare(
        `INSERT INTO reviews (id, card_id, rating, reviewed_at, date, prev_interval, next_interval)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(uid(), id, body.rating, reviewedAt, today, prevInterval, next.dueInDays)
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }

    const row = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Record<string, unknown>
    return { card: rowToCard(row), dueInDays: next.dueInDays }
  })
}
