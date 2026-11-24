import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db, rowToSession, uid } from '../db'
import { AppError } from '../errors'

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const createSchema = z.object({
  taskId: z.string().nullable().optional(),
  date: dateStr,
  startedAt: z.string(),
  endedAt: z.string(),
  seconds: z.number().int().min(0).max(6 * 3600),
  kind: z.enum(['focus', 'break']).default('focus'),
  label: z.string().max(200).optional(),
})

export const focusRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/focus', async (req) => {
    const { date } = req.query as { date?: string }
    if (!date) {
      const rows = db
        .prepare('SELECT * FROM focus_sessions ORDER BY started_at DESC LIMIT 50')
        .all() as Record<string, unknown>[]
      return rows.map(rowToSession)
    }
    const rows = db
      .prepare('SELECT * FROM focus_sessions WHERE date = ? ORDER BY started_at ASC')
      .all(date) as Record<string, unknown>[]
    return rows.map(rowToSession)
  })

  app.post('/api/focus', async (req, reply) => {
    const body = createSchema.parse(req.body)
    const id = uid()
    db.exec('BEGIN')
    try {
      db.prepare(
        `INSERT INTO focus_sessions (id, task_id, date, started_at, ended_at, seconds, kind, label)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        body.taskId ?? null,
        body.date,
        body.startedAt,
        body.endedAt,
        body.seconds,
        body.kind,
        body.label ?? '',
      )
      if (body.taskId) {
        db.prepare('UPDATE tasks SET spent_seconds = spent_seconds + ? WHERE id = ?').run(
          body.seconds,
          body.taskId,
        )
      }
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
    const row = db.prepare('SELECT * FROM focus_sessions WHERE id = ?').get(id) as Record<
      string,
      unknown
    >
    reply.code(201)
    return rowToSession(row)
  })

  app.delete('/api/focus/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const row = db.prepare('SELECT * FROM focus_sessions WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined
    if (!row) throw new AppError(404, 'not_found', '记录不存在')
    if (row.task_id) {
      db.prepare('UPDATE tasks SET spent_seconds = MAX(0, spent_seconds - ?) WHERE id = ?').run(
        Number(row.seconds),
        String(row.task_id),
      )
    }
    db.prepare('DELETE FROM focus_sessions WHERE id = ?').run(id)
    reply.code(204)
    return null
  })
}
