import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDuration, humanDate, todayStr, weekdayName } from '@shared/dates'
import { api } from '../lib/api'
import { useToday } from '../lib/hooks'
import { useTimer } from '../lib/timer'
import { toast } from '../lib/ui'
import { TimerCard } from '../components/TimerCard'
import { WordCard } from '../components/WordCard'
import { TaskRow } from '../components/TaskRow'
import { IconFlame, IconLayers, IconPlus } from '../components/icons'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return '这个点还醒着，明天会难受的'
  if (h < 9) return '早上好，先把最难的那件干掉'
  if (h < 12) return '上午还剩一段完整的时间'
  if (h < 14) return '吃完歇一下，别硬撑'
  if (h < 18) return '下午容易散，定个番茄收住'
  if (h < 23) return '晚上这段最安静，适合啃硬骨头'
  return '夜深了，学完早点睡'
}

export default function Today() {
  const { data, mutate, isLoading } = useToday()
  const { state, attachTask } = useTimer()
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const today = todayStr()
  const tasks = data?.tasks ?? []
  const doneCount = tasks.filter((t) => t.done).length
  const openTasks = tasks.filter((t) => !t.done)
  const s = data?.summary

  async function addTask() {
    const title = draft.trim()
    if (!title || busy) return
    setBusy(true)
    try {
      await api.tasks.create({ title, date: today })
      setDraft('')
      void mutate()
    } catch (e) {
      toast(e instanceof Error ? e.message : '添加失败')
    } finally {
      setBusy(false)
    }
  }

  async function toggle(id: string, done: boolean) {
    try {
      await api.tasks.update(id, { done: !done })
      void mutate()
    } catch {
      toast('更新失败')
    }
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`删掉「${title}」？`)) return
    try {
      await api.tasks.remove(id)
      if (state.taskId === id) attachTask(null, null)
      void mutate()
    } catch {
      toast('删除失败')
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">
            {humanDate(today)} <span className="muted" style={{ fontWeight: 400, fontSize: 17 }}>{weekdayName(today)}</span>
          </h1>
          <div className="page-sub">{greeting()}</div>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <span className="pill">
            <IconFlame size={12} style={{ color: 'var(--warn)' }} />
            连续 {s?.streak.current ?? 0} 天
          </span>
          <span className="pill">
            <span className="dot" style={{ background: 'var(--accent)' }} />
            今日专注 {formatDuration(s?.today.focusSeconds ?? 0)}
          </span>
        </div>
      </div>

      <div className="today-grid">
        <div className="col" style={{ gap: 16 }}>
          <TimerCard />

          <div className="card flush">
            <div className="card-head">
              <span className="card-title" style={{ margin: 0 }}>
                今日任务
              </span>
              <span className="tiny muted mono">
                {doneCount}/{tasks.length}
              </span>
            </div>

            <div className="quick-add">
              <input
                className="input"
                placeholder="加一件今天要做的事，回车确认"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void addTask()
                }}
                disabled={busy}
              />
              <button className="btn primary" onClick={() => void addTask()} disabled={!draft.trim() || busy}>
                <IconPlus size={14} />
                添加
              </button>
            </div>

            {isLoading ? (
              <div className="empty">加载中…</div>
            ) : tasks.length === 0 ? (
              <div className="empty">
                <span className="empty-emoji">🌤</span>
                今天还没安排事情。先写一件最小的，开了头就不难
              </div>
            ) : (
              <div className="task-list">
                {[...openTasks, ...tasks.filter((t) => t.done)].map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    attached={state.taskId === t.id}
                    onToggle={() => void toggle(t.id, t.done)}
                    onAttach={() => {
                      attachTask(t.id, t.title)
                      toast(`番茄钟已绑定：${t.title}`)
                    }}
                    onDelete={() => void remove(t.id, t.title)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col" style={{ gap: 16 }}>
          <WordCard />

          <div className="card review-cta">
            <div className="row" style={{ marginBottom: 10 }}>
              <IconLayers size={17} style={{ color: 'var(--accent-2)' }} />
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>间隔重复</span>
            </div>
            <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
              <span className="stat-value" style={{ fontSize: 30 }}>
                {data?.dueCards ?? 0}
              </span>
              <span className="muted tiny">张卡片到期</span>
            </div>
            <div className="tiny muted" style={{ marginTop: 4 }}>
              卡片库共 {data?.totalCards ?? 0} 张 · 今天已复习 {s?.today.reviews ?? 0} 次
            </div>
            <Link to="/review" className="btn primary" style={{ marginTop: 14, width: '100%' }}>
              {(data?.dueCards ?? 0) > 0 ? '开始复习' : '去卡片库'}
            </Link>
          </div>

          <div className="card">
            <div className="card-title">今日数字</div>
            <div className="stat-grid">
              <div className="stat-tile">
                <span className="stat-value">{(s?.today.pomodoros ?? 0)}</span>
                <span className="stat-label">完成的番茄</span>
              </div>
              <div className="stat-tile">
                <span className="stat-value">{formatDuration(s?.today.focusSeconds ?? 0)}</span>
                <span className="stat-label">专注时长</span>
              </div>
              <div className="stat-tile">
                <span className="stat-value">
                  {doneCount}
                  <span className="muted" style={{ fontSize: 13 }}>
                    /{tasks.length}
                  </span>
                </span>
                <span className="stat-label">任务完成</span>
              </div>
              <div className="stat-tile">
                <span className="stat-value">{s?.today.reviews ?? 0}</span>
                <span className="stat-label">复习次数</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">今日时间线</div>
            {(data?.sessions.length ?? 0) === 0 ? (
              <div className="tiny muted">还没有记录。开一个番茄就会出现在这里</div>
            ) : (
              <div className="col" style={{ gap: 9 }}>
                {data!.sessions
                  .filter((x) => x.kind === 'focus')
                  .map((x) => {
                    const t = new Date(x.startedAt)
                    const hh = String(t.getHours()).padStart(2, '0')
                    const mm = String(t.getMinutes()).padStart(2, '0')
                    return (
                      <div key={x.id} className="row" style={{ gap: 10, fontSize: 12.5 }}>
                        <span className="mono muted" style={{ width: 42 }}>
                          {hh}:{mm}
                        </span>
                        <span className="dot" style={{ background: 'var(--accent)' }} />
                        <span className="dim" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {x.label || '专心一会儿'}
                        </span>
                        <span className="mono muted">{formatDuration(x.seconds)}</span>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
