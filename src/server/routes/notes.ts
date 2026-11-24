import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db, now, rowToNote, uid } from '../db'
import { AppError } from '../errors'

const createSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(200),
  kind: z.enum(['template', 'pitfall', 'idea']).default('template'),
  content: z.string().max(200_000).default(''),
  tags: z.array(z.string().max(30)).max(20).default([]),
  topicId: z.string().nullable().optional(),
  pinned: z.boolean().optional(),
})

const updateSchema = createSchema.partial()

export const noteRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/notes', async (req) => {
    const { kind, q } = req.query as { kind?: string; q?: string }
    const where: string[] = []
    const params: string[] = []
    if (kind && kind !== 'all') {
      where.push('kind = ?')
      params.push(kind)
    }
    if (q) {
      where.push('(title LIKE ? OR content LIKE ?)')
      params.push(`%${q}%`, `%${q}%`)
    }
    const sql = `SELECT * FROM notes ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY pinned DESC, updated_at DESC LIMIT 500`
    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]
    return rows.map(rowToNote)
  })

  app.post('/api/notes', async (req, reply) => {
    const body = createSchema.parse(req.body)
    const id = uid()
    const ts = now()
    db.prepare(
      `INSERT INTO notes (id, title, kind, content, tags, topic_id, pinned, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      body.title,
      body.kind,
      body.content,
      JSON.stringify(body.tags),
      body.topicId ?? null,
      body.pinned ? 1 : 0,
      ts,
      ts,
    )
    const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as Record<string, unknown>
    reply.code(201)
    return rowToNote(row)
  })

  app.patch('/api/notes/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = updateSchema.parse(req.body)
    const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id)
    if (!existing) throw new AppError(404, 'not_found', '笔记不存在')

    const sets: string[] = []
    const params: (string | number | null)[] = []
    if (body.title !== undefined) {
      sets.push('title = ?')
      params.push(body.title)
    }
    if (body.kind !== undefined) {
      sets.push('kind = ?')
      params.push(body.kind)
    }
    if (body.content !== undefined) {
      sets.push('content = ?')
      params.push(body.content)
    }
    if (body.tags !== undefined) {
      sets.push('tags = ?')
      params.push(JSON.stringify(body.tags))
    }
    if (body.topicId !== undefined) {
      sets.push('topic_id = ?')
      params.push(body.topicId ?? null)
    }
    if (body.pinned !== undefined) {
      sets.push('pinned = ?')
      params.push(body.pinned ? 1 : 0)
    }
    sets.push('updated_at = ?')
    params.push(now())
    params.push(id)

    db.prepare(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`).run(...params)
    const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as Record<string, unknown>
    return rowToNote(row)
  })

  app.delete('/api/notes/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    db.prepare('DELETE FROM notes WHERE id = ?').run(id)
    reply.code(204)
    return null
  })
}
