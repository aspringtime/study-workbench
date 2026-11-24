import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db, now, uid } from '../db'
import { AppError } from '../errors'
import type { Resource } from '../../shared/types'

const createSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(120),
  url: z.string().trim().url('要填完整的 http(s) 链接').max(500),
  category: z.string().trim().max(30).default('综合'),
  note: z.string().max(300).optional(),
})

const updateSchema = createSchema.partial()

function rowToResource(r: Record<string, unknown>): Resource {
  return {
    id: String(r.id),
    title: String(r.title),
    url: String(r.url),
    category: String(r.category ?? '综合'),
    note: String(r.note ?? ''),
    sort: Number(r.sort ?? 0),
    createdAt: String(r.created_at),
  }
}

export const resourceRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/resources', async () => {
    const rows = db
      .prepare('SELECT * FROM resources ORDER BY category ASC, sort ASC, created_at ASC')
      .all() as Record<string, unknown>[]
    return rows.map(rowToResource)
  })

  app.post('/api/resources', async (req, reply) => {
    const body = createSchema.parse(req.body)
    const id = uid()
    const maxRow = db
      .prepare('SELECT COALESCE(MAX(sort), 0) AS m FROM resources WHERE category = ?')
      .get(body.category) as { m: number }
    db.prepare(
      `INSERT INTO resources (id, title, url, category, note, sort, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, body.title, body.url, body.category, body.note ?? '', Number(maxRow.m) + 1, now())
    const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(id) as Record<string, unknown>
    reply.code(201)
    return rowToResource(row)
  })

  app.patch('/api/resources/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = updateSchema.parse(req.body)
    const existing = db.prepare('SELECT * FROM resources WHERE id = ?').get(id)
    if (!existing) throw new AppError(404, 'not_found', '这条资料不存在')

    const sets: string[] = []
    const params: (string | number)[] = []
    if (body.title !== undefined) {
      sets.push('title = ?')
      params.push(body.title)
    }
    if (body.url !== undefined) {
      sets.push('url = ?')
      params.push(body.url)
    }
    if (body.category !== undefined) {
      sets.push('category = ?')
      params.push(body.category)
    }
    if (body.note !== undefined) {
      sets.push('note = ?')
      params.push(body.note)
    }
    if (sets.length > 0) {
      params.push(id)
      db.prepare(`UPDATE resources SET ${sets.join(', ')} WHERE id = ?`).run(...params)
    }
    const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(id) as Record<string, unknown>
    return rowToResource(row)
  })

  app.delete('/api/resources/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    db.prepare('DELETE FROM resources WHERE id = ?').run(id)
    reply.code(204)
    return null
  })
}
