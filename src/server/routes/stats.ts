import type { FastifyPluginAsync } from 'fastify'
import { db, rowToSession, rowToTask } from '../db'
import { addDays, todayStr } from '../../shared/dates'
import type { TodayPayload } from '../../shared/types'
import { activityRange, dueCardCount, summary, totalCardCount } from '../stats'

const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

export const statsRoutes: FastifyPluginAsync = async (app) => {
  /** 今日聚合：一次请求把首屏要的东西拿全 */
  app.get('/api/today', async (req) => {
    const { date } = req.query as { date?: string }
    const today = isDate(date) ? date : todayStr()

    const tasks = (
      db.prepare('SELECT * FROM tasks WHERE date = ? ORDER BY done ASC, created_at ASC').all(today) as Record<
        string,
        unknown
      >[]
    ).map(rowToTask)
    const sessions = (
      db
        .prepare('SELECT * FROM focus_sessions WHERE date = ? ORDER BY started_at ASC')
        .all(today) as Record<string, unknown>[]
    ).map(rowToSession)

    const payload: TodayPayload = {
      date: today,
      tasks,
      sessions,
      dueCards: dueCardCount(today),
      totalCards: totalCardCount(),
      summary: summary(today),
    }
    return payload
  })

  app.get('/api/stats/summary', async (req) => {
    const { date } = req.query as { date?: string }
    return summary(isDate(date) ? date : todayStr())
  })

  /** 热力图用的逐日活跃度 */
  app.get('/api/stats/activity', async (req) => {
    const { from, to } = req.query as { from?: string; to?: string }
    const today = todayStr()
    const end = isDate(to) ? to : today
    const start = isDate(from) ? from : addDays(end, -370)
    return activityRange(start, end)
  })
}
