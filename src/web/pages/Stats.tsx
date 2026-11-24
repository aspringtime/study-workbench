import { useState } from 'react'
import { formatDuration, humanDate, todayStr } from '@shared/dates'
import { TOPIC_TRACKS } from '@shared/constants'
import { api } from '../lib/api'
import { useActivity, useSummary, useTopics } from '../lib/hooks'
import { toast } from '../lib/ui'
import { Heatmap } from '../components/Heatmap'
import { IconFlame } from '../components/icons'

export default function Stats() {
  const { data: activity } = useActivity(371)
  const { data: summary } = useSummary()
  const { data: topics } = useTopics()
  const [exporting, setExporting] = useState(false)

  const last30 = (activity ?? []).slice(-30)
  const maxFocus = Math.max(1, ...last30.map((d) => d.focusSeconds))

  async function exportJson() {
    setExporting(true)
    try {
      const data = await api.exportAll()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `study-workbench-${todayStr()}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast('导出成功')
    } catch {
      toast('导出失败')
    } finally {
      setExporting(false)
    }
  }

  const trackStats = (() => {
    const map = new Map<string, { done: number; learning: number; total: number }>()
    for (const t of topics ?? []) {
      const e = map.get(t.track) ?? { done: 0, learning: 0, total: 0 }
      e.total++
      if (t.status === 'done') e.done++
      else if (t.status === 'learning') e.learning++
      map.set(t.track, e)
    }
    const order = [...(TOPIC_TRACKS as readonly string[]), ...[...map.keys()].filter((k) => !(TOPIC_TRACKS as readonly string[]).includes(k))]
    return order.filter((k) => map.has(k)).map((k) => ({ track: k, ...map.get(k)! }))
  })()

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">统计</h1>
          <div className="page-sub">看得见的积累，比感觉靠谱</div>
        </div>
        <button className="btn" onClick={() => void exportJson()} disabled={exporting}>
          {exporting ? '导出中…' : '导出全部数据'}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="stat-grid four" style={{ gap: 18 }}>
          <div className="stat-tile">
            <span className="stat-value">{formatDuration(summary?.total.focusSeconds ?? 0)}</span>
            <span className="stat-label">累计专注</span>
          </div>
          <div className="stat-tile">
            <span className="stat-value">{summary?.total.activeDays ?? 0}</span>
            <span className="stat-label">学习天数</span>
          </div>
          <div className="stat-tile">
            <span className="stat-value">
              {(summary?.streak.current ?? 0)}
              <span className="muted" style={{ fontSize: 13 }}>
                {' '}
                / {summary?.streak.best ?? 0}
              </span>
            </span>
            <span className="stat-label">当前连续 / 最长</span>
          </div>
          <div className="stat-tile">
            <span className="stat-value">{summary?.total.reviews ?? 0}</span>
            <span className="stat-label">累计复习次数</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">
          <span>学习热力图</span>
          <span className="row" style={{ gap: 4, fontSize: 11 }}>
            <IconFlame size={12} style={{ color: 'var(--warn)' }} />
            连续 {summary?.streak.current ?? 0} 天
          </span>
        </div>
        {activity ? <Heatmap data={activity} /> : <div className="empty">加载中…</div>}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">最近 30 天专注时长</div>
        {last30.length === 0 ? (
          <div className="empty">还没有数据</div>
        ) : (
          <>
            <div className="bars">
              {last30.map((d) => (
                <div className="bar-col" key={d.date} title={`${humanDate(d.date)} · ${formatDuration(d.focusSeconds)}`}>
                  <div
                    className={d.focusSeconds > 0 ? 'bar' : 'bar zero'}
                    style={{ height: `${Math.max(2, (d.focusSeconds / maxFocus) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
              <span className="tiny muted">{humanDate(last30[0].date)}</span>
              <span className="tiny muted">
                日均{' '}
                {formatDuration(last30.reduce((s, d) => s + d.focusSeconds, 0) / Math.max(1, last30.length))}
              </span>
              <span className="tiny muted">{humanDate(last30[last30.length - 1].date)}</span>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-title">知识地图完成度</div>
        {trackStats.length === 0 ? (
          <div className="empty">还没有知识点</div>
        ) : (
          <div className="col" style={{ gap: 14 }}>
            {trackStats.map((t) => {
              const p = (t.done + t.learning * 0.5) / t.total
              return (
                <div key={t.track}>
                  <div className="row" style={{ marginBottom: 6, fontSize: 12.5 }}>
                    <span className="dim">{t.track}</span>
                    <span className="spacer" />
                    <span className="muted mono tiny">
                      {t.done}/{t.total}
                    </span>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${p * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
