/**
 * 往库里补一批演示用的专注记录（不动任务、笔记、卡片、知识点）。
 *
 * 用途：把统计页和热力图填满，看着像用过一段时间。
 * 真实使用时不建议跑这个，会把统计掺假。
 *
 * 用法：node scripts/seed-sessions.mjs
 */
import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const db = new DatabaseSync(join(here, '..', 'data', 'workbench.db'))

const pad = (n) => String(n).padStart(2, '0')
const toDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const insert = db.prepare(
  `INSERT INTO focus_sessions (id, task_id, date, started_at, ended_at, seconds, kind, label)
   VALUES (?, NULL, ?, ?, ?, ?, 'focus', ?)`,
)

let seed = 20261125
const rnd = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648
  return seed / 2147483648
}

const labels = ['Dijkstra 模板', '最短路刷题', '四级听力精听', '错题整理', '看视频', '补昨天的进度']
const today = new Date()
let added = 0

for (let d = 26; d >= 1; d--) {
  const day = new Date(today)
  day.setDate(day.getDate() - d)
  if (rnd() < 0.18) continue
  const count = d > 14 ? Math.floor(rnd() * 2) : 1 + Math.floor(rnd() * 3)
  for (let i = 0; i < count; i++) {
    const start = new Date(day)
    start.setHours(15 + Math.floor(rnd() * 6), Math.floor(rnd() * 50), 0, 0)
    const end = new Date(start.getTime() + 25 * 60_000)
    insert.run(
      randomUUID(),
      toDate(day),
      start.toISOString(),
      end.toISOString(),
      25 * 60,
      labels[Math.floor(rnd() * labels.length)],
    )
    added++
  }
}

for (const [h, m, label] of [
  [9, 10, 'Dijkstra 模板'],
  [10, 30, '四级听力精听'],
]) {
  const start = new Date(today)
  start.setHours(h, m, 0, 0)
  const end = new Date(start.getTime() + 25 * 60_000)
  insert.run(randomUUID(), toDate(today), start.toISOString(), end.toISOString(), 25 * 60, label)
  added++
}

console.log(`补了 ${added} 条专注记录`)
