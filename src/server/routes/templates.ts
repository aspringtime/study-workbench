import type { FastifyPluginAsync } from 'fastify'
import { db, now, uid } from '../db'
import { AppError } from '../errors'
import { TEMPLATES, findTemplate } from '../../shared/templates'

interface Row {
  track: string
  n: number
}

/** 现有知识点按 track 分组计数，用来判断模板导入了多少 */
function existingCounts(): Map<string, number> {
  const rows = db.prepare('SELECT track, COUNT(*) AS n FROM topics GROUP BY track').all() as unknown as Row[]
  return new Map(rows.map((r) => [String(r.track), Number(r.n)]))
}

export const templateRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/templates', async () => {
    const counts = existingCounts()
    return TEMPLATES.map((t) => {
      const tracks = t.tracks.map((tr) => ({
        name: tr.name,
        total: tr.topics.length,
        existing: counts.get(tr.name) ?? 0,
        topics: tr.topics,
      }))
      return {
        id: t.id,
        name: t.name,
        summary: t.summary,
        order: t.order,
        total: t.tracks.reduce((s, tr) => s + tr.topics.length, 0),
        existing: tracks.reduce((s, tr) => s + Math.min(tr.existing, tr.total), 0),
        tracks,
      }
    })
  })

  app.post('/api/templates/:id/import', async (req) => {
    const { id } = req.params as { id: string }
    const tpl = findTemplate(id)
    if (!tpl) throw new AppError(404, 'not_found', '模板不存在')

    const insert = db.prepare(
      `INSERT INTO topics (id, track, name, parent_id, status, sort, note, practice, updated_at)
       VALUES (?, ?, ?, NULL, 'todo', ?, '', 0, ?)`,
    )
    const exists = db.prepare('SELECT 1 AS ok FROM topics WHERE track = ? AND name = ?')
    const maxSort = db.prepare('SELECT COALESCE(MAX(sort), 0) AS m FROM topics WHERE track = ?')

    let added = 0
    let skipped = 0
    const ts = now()

    db.exec('BEGIN')
    try {
      for (const tr of tpl.tracks) {
        let sort = Number((maxSort.get(tr.name) as { m: number }).m)
        for (const name of tr.topics) {
          if (exists.get(tr.name, name)) {
            skipped++
            continue
          }
          sort += 1
          insert.run(uid(), tr.name, name, sort, ts)
          added++
        }
      }
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }

    return { added, skipped, template: tpl.name }
  })
}
