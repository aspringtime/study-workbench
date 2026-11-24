import { db } from './db'
import { addDays, diffDays, todayStr } from '../shared/dates'
import { HEATMAP_WEIGHTS } from '../shared/constants'
import type { DayActivity, StatsSummary } from '../shared/types'

interface Row {
  [k: string]: unknown
}

/** 某天综合活跃度得分 */
export function scoreOf(focusSeconds: number, tasksDone: number, reviews: number): number {
  const raw =
    (focusSeconds / 3600) * 60 * HEATMAP_WEIGHTS.focusPerHour +
    tasksDone * HEATMAP_WEIGHTS.perTask +
    reviews * HEATMAP_WEIGHTS.perReview
  return Math.round(raw)
}

export function activityRange(from: string, to: string): DayActivity[] {
  const focusRows = db
    .prepare(
      `SELECT date, SUM(seconds) AS s FROM focus_sessions
       WHERE kind = 'focus' AND date BETWEEN ? AND ? GROUP BY date`,
    )
    .all(from, to) as Row[]
  const taskRows = db
    .prepare(
      `SELECT date, COUNT(*) AS n FROM tasks
       WHERE done = 1 AND date BETWEEN ? AND ? GROUP BY date`,
    )
    .all(from, to) as Row[]
  const reviewRows = db
    .prepare(`SELECT date, COUNT(*) AS n FROM reviews WHERE date BETWEEN ? AND ? GROUP BY date`)
    .all(from, to) as Row[]

  const map = new Map<string, DayActivity>()
  const push = (date: string): DayActivity => {
    let d = map.get(date)
    if (!d) {
      d = { date, focusSeconds: 0, tasksDone: 0, reviews: 0, score: 0 }
      map.set(date, d)
    }
    return d
  }

  for (const r of focusRows) push(String(r.date)).focusSeconds = Number(r.s ?? 0)
  for (const r of taskRows) push(String(r.date)).tasksDone = Number(r.n ?? 0)
  for (const r of reviewRows) push(String(r.date)).reviews = Number(r.n ?? 0)

  const out: DayActivity[] = []
  let cursor = from
  const total = diffDays(to, from)
  for (let i = 0; i <= total; i++) {
    const d = map.get(cursor) ?? { date: cursor, focusSeconds: 0, tasksDone: 0, reviews: 0, score: 0 }
    d.score = scoreOf(d.focusSeconds, d.tasksDone, d.reviews)
    out.push(d)
    cursor = addDays(cursor, 1)
  }
  return out
}

function activeDates(): Set<string> {
  const rows = db
    .prepare(
      `SELECT date FROM focus_sessions WHERE kind = 'focus'
       UNION SELECT date FROM reviews
       UNION SELECT date FROM tasks WHERE done = 1`,
    )
    .all() as Row[]
  return new Set(rows.map((r) => String(r.date)))
}

export function streaks(today: string): { current: number; best: number } {
  const dates = activeDates()
  if (dates.size === 0) return { current: 0, best: 0 }

  // 当前连续天数：今天没学就从昨天开始算（当天还没开始不算断）
  let current = 0
  let cursor = dates.has(today) ? today : addDays(today, -1)
  while (dates.has(cursor)) {
    current++
    cursor = addDays(cursor, -1)
  }

  // 历史最长
  const sorted = [...dates].sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const d of sorted) {
    if (prev && diffDays(d, prev) === 1) run++
    else run = 1
    prev = d
    if (run > best) best = run
  }

  return { current, best }
}

export function summary(today: string): StatsSummary {
  const weekStart = addDays(today, -6)

  const todayFocus = Number(
    (db
      .prepare(`SELECT COALESCE(SUM(seconds),0) AS s FROM focus_sessions WHERE kind='focus' AND date = ?`)
      .get(today) as Row).s ?? 0,
  )
  const todayPomodoros = Number(
    (db
      .prepare(
        `SELECT COUNT(*) AS n FROM focus_sessions WHERE kind='focus' AND date = ? AND seconds >= 600`,
      )
      .get(today) as Row).n ?? 0,
  )
  const todayTasksTotal = Number(
    (db.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE date = ?`).get(today) as Row).n ?? 0,
  )
  const todayTasksDone = Number(
    (db.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE date = ? AND done = 1`).get(today) as Row).n ?? 0,
  )
  const todayReviews = Number(
    (db.prepare(`SELECT COUNT(*) AS n FROM reviews WHERE date = ?`).get(today) as Row).n ?? 0,
  )

  const weekFocus = Number(
    (db
      .prepare(
        `SELECT COALESCE(SUM(seconds),0) AS s FROM focus_sessions
         WHERE kind='focus' AND date BETWEEN ? AND ?`,
      )
      .get(weekStart, today) as Row).s ?? 0,
  )
  const weekTasks = Number(
    (db
      .prepare(`SELECT COUNT(*) AS n FROM tasks WHERE done=1 AND date BETWEEN ? AND ?`)
      .get(weekStart, today) as Row).n ?? 0,
  )
  const weekReviews = Number(
    (db
      .prepare(`SELECT COUNT(*) AS n FROM reviews WHERE date BETWEEN ? AND ?`)
      .get(weekStart, today) as Row).n ?? 0,
  )

  const totalFocus = Number(
    (db.prepare(`SELECT COALESCE(SUM(seconds),0) AS s FROM focus_sessions WHERE kind='focus'`).get() as Row)
      .s ?? 0,
  )
  const totalTasks = Number(
    (db.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE done=1`).get() as Row).n ?? 0,
  )
  const totalReviews = Number((db.prepare(`SELECT COUNT(*) AS n FROM reviews`).get() as Row).n ?? 0)
  const activeDays = activeDates().size

  return {
    today: {
      date: today,
      focusSeconds: todayFocus,
      tasksDone: todayTasksDone,
      tasksTotal: todayTasksTotal,
      reviews: todayReviews,
      pomodoros: todayPomodoros,
    },
    week: { focusSeconds: weekFocus, tasksDone: weekTasks, reviews: weekReviews },
    total: {
      focusSeconds: totalFocus,
      tasksDone: totalTasks,
      reviews: totalReviews,
      activeDays,
    },
    streak: streaks(today),
  }
}

export function dueCardCount(today: string): number {
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM cards WHERE due_date <= ?`)
    .get(today) as Row
  return Number(row.n ?? 0)
}

export function totalCardCount(): number {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM cards`).get() as Row
  return Number(row.n ?? 0)
}

export { todayStr }
