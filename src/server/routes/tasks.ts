import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db, now, rowToTask, uid } from '../db'
import { AppError } from '../errors'

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD')

const createSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(200),
  note: z.string().max(5000).optional(),
  date: dateStr.nullable().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  estimatePomodoros: z.number().int().min(0).max(24).optional(),
})

const updateSchema = createSchema.partial().extend({ done: z.boolean().optional() })

export const taskRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/tasks', async (req) => {
    const { date, q } = req.query as { date?: string; q?: string }
    const where: string[] = []
    const params: (string | number | null)[] = []

    if (date && date !== 'all') {
      if (date === 'inbox') {
        where.push('date IS NULL')
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        where.push('date = ?')
        params.push(date)
      }
    }
    if (q) {
      where.push('(title LIKE ? OR note LIKE ?)')
      params.push(`%${q}%`, `%${q}%`)
    }

    const sql = `SELECT * FROM tasks ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY done ASC,
        CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
        created_at ASC
      LIMIT 500`
    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]
    return rows.map(rowToTask)
  })

  app.post('/api/tasks', async (req, reply) => {
    const body = createSchema.parse(req.body)
    const id = uid()
    db.prepare(
      `INSERT INTO tasks (id, title, note, date, priority, done, created_at, done_at, estimate_pomodoros, spent_seconds)
       VALUES (?, ?, ?, ?, ?, 0, ?, NULL, ?, 0)`,
    ).run(
      id,
      body.title,
      body.note ?? '',
      body.date ?? null,
      body.priority ?? 'normal',
      now(),
      body.estimatePomodoros ?? 1,
    )
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown>
    reply.code(201)
    return rowToTask(row)
  })

  app.patch('/api/tasks/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = updateSchema.parse(req.body)
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
    if (!existing) throw new AppError(404, 'not_found', '任务不存在')

    const sets: string[] = []
    const params: (string | number | null)[] = []

    if (body.title !== undefined) {
      sets.push('title = ?')
      params.push(body.title)
    }
    if (body.note !== undefined) {
      sets.push('note = ?')
      params.push(body.note)
    }
    if (body.date !== undefined) {
      sets.push('date = ?')
      params.push(body.date)
    }
    if (body.priority !== undefined) {
      sets.push('priority = ?')
      params.push(body.priority)
    }
    if (body.estimatePomodoros !== undefined) {
      sets.push('estimate_pomodoros = ?')
      params.push(body.estimatePomodoros)
    }
    if (body.done !== undefined) {
      sets.push('done = ?', 'done_at = ?')
      params.push(body.done ? 1 : 0, body.done ? now() : null)
    }
    if (sets.length === 0) {
      const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown>
      return rowToTask(row)
    }

    params.push(id)
    db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...params)
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown>
    return rowToTask(row)
  })

  app.delete('/api/tasks/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
    db.prepare('UPDATE focus_sessions SET task_id = NULL WHERE task_id = ?').run(id)
    reply.code(204)
    return null
  })

  /** 把没完成的任务顺延到某天（每日收尾用） */
  app.post('/api/tasks/rollover', async (req) => {
    const { from, to } = req.body as { from: string; to: string }
    const f = dateStr.parse(from)
    const t = dateStr.parse(to)
    const res = db
      .prepare('UPDATE tasks SET date = ? WHERE date = ? AND done = 0')
      .run(t, f)
    return { moved: Number(res.changes ?? 0) }
  })
}
