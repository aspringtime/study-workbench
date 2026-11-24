import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db, now, rowToTopic, uid } from '../db'
import { AppError } from '../errors'

const createSchema = z.object({
  track: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(80),
})

const updateSchema = z.object({
  status: z.enum(['todo', 'learning', 'done']).optional(),
  note: z.string().max(2000).optional(),
  practice: z.number().int().min(0).max(9999).optional(),
  name: z.string().trim().min(1).max(80).optional(),
})

export const topicRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/topics', async () => {
    const rows = db
      .prepare('SELECT * FROM topics ORDER BY sort ASC, name ASC')
      .all() as Record<string, unknown>[]
    return rows.map(rowToTopic)
  })

  app.post('/api/topics', async (req, reply) => {
    const body = createSchema.parse(req.body)
    const maxRow = db
      .prepare('SELECT COALESCE(MAX(sort), 0) AS m FROM topics WHERE track = ?')
      .get(body.track) as { m: number }
    const id = uid()
    db.prepare(
      `INSERT INTO topics (id, track, name, parent_id, status, sort, note, practice, updated_at)
       VALUES (?, ?, ?, NULL, 'todo', ?, '', 0, ?)`,
    ).run(id, body.track, body.name, Number(maxRow.m) + 1, now())
    const row = db.prepare('SELECT * FROM topics WHERE id = ?').get(id) as Record<string, unknown>
    reply.code(201)
    return rowToTopic(row)
  })

  app.patch('/api/topics/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = updateSchema.parse(req.body)
    const existing = db.prepare('SELECT * FROM topics WHERE id = ?').get(id)
    if (!existing) throw new AppError(404, 'not_found', '知识点不存在')

    const sets: string[] = []
    const params: (string | number)[] = []
    if (body.status !== undefined) {
      sets.push('status = ?')
      params.push(body.status)
    }
    if (body.note !== undefined) {
      sets.push('note = ?')
      params.push(body.note)
    }
    if (body.practice !== undefined) {
      sets.push('practice = ?')
      params.push(body.practice)
    }
    if (body.name !== undefined) {
      sets.push('name = ?')
      params.push(body.name)
    }
    sets.push('updated_at = ?')
    params.push(now())
    params.push(id)

    db.prepare(`UPDATE topics SET ${sets.join(', ')} WHERE id = ?`).run(...params)
    const row = db.prepare('SELECT * FROM topics WHERE id = ?').get(id) as Record<string, unknown>
    return rowToTopic(row)
  })

  app.delete('/api/topics/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    db.prepare('DELETE FROM topics WHERE id = ?').run(id)
    db.prepare('UPDATE notes SET topic_id = NULL WHERE topic_id = ?').run(id)
    reply.code(204)
    return null
  })
}
