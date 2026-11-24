import { useMemo } from 'react'
import type { DayActivity } from '@shared/types'
import { addDays, diffDays, formatDuration, humanDate, weekdayMon } from '@shared/dates'

const LEVELS = [0, 15, 41, 81] // 0 / 1-15 / 16-40 / 41-80 / 81+

function levelOf(score: number): 0 | 1 | 2 | 3 | 4 {
  if (score <= 0) return 0
  if (score < LEVELS[1]) return 1
  if (score < LEVELS[2]) return 2
  if (score < LEVELS[3]) return 3
  return 4
}

export function Heatmap({ data }: { data: DayActivity[] }) {
  const { columns, monthLabels } = useMemo(() => {
    if (data.length === 0) return { columns: [] as DayActivity[][], monthLabels: [] as string[] }

    const map = new Map(data.map((d) => [d.date, d]))
    const first = data[0].date
    const last = data[data.length - 1].date
    // 补到周一开头
    let start = first
    const offset = weekdayMon(first)
    if (offset > 0) start = addDays(first, -offset)

    const totalDays = diffDays(last, start) + 1
    const weeks = Math.ceil(totalDays / 7)
    const cols: DayActivity[][] = []
    for (let w = 0; w < weeks; w++) {
      const col: DayActivity[] = []
      for (let d = 0; d < 7; d++) {
        const date = addDays(start, w * 7 + d)
        col.push(map.get(date) ?? { date, focusSeconds: 0, tasksDone: 0, reviews: 0, score: 0 })
      }
      cols.push(col)
    }

    const labels: string[] = []
    let prevMonth = -1
    for (const col of cols) {
      const m = Number(col[0].date.slice(5, 7))
      if (m !== prevMonth) {
        labels.push(`${m}月`)
        prevMonth = m
      } else {
        labels.push('')
      }
    }

    return { columns: cols, monthLabels: labels }
  }, [data])

  if (columns.length === 0) return <div className="empty">还没有数据</div>

  const total = data.reduce((s, d) => s + d.focusSeconds, 0)
  const active = data.filter((d) => d.score > 0).length

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <span className="tiny muted">
          过去 {data.length} 天 · 学习 {active} 天 · 专注 {formatDuration(total)}
        </span>
      </div>

      <div className="heatmap-wrap">
        <div className="heat-months" style={{ paddingLeft: 0 }}>
          {monthLabels.map((m, i) => (
            <span key={i} style={{ width: 11, flex: '0 0 11px', whiteSpace: 'nowrap' }}>
              {m}
            </span>
          ))}
        </div>
        <div className="heatmap">
          {columns.map((col, i) => (
            <div className="heat-col" key={i}>
              {col.map((d) => {
                const lv = levelOf(d.score)
                const title =
                  `${humanDate(d.date)} · 专注 ${formatDuration(d.focusSeconds)}` +
                  ` · 任务 ${d.tasksDone}` +
                  ` · 复习 ${d.reviews}`
                return <div className="heat-cell" key={d.date} data-l={lv} title={title} />
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="heat-legend">
        <span>少</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className="heat-cell" data-l={l} style={{ width: 11, height: 11 }} />
        ))}
        <span>多</span>
      </div>
    </div>
  )
}
