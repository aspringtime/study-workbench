import { useState } from 'react'
import useSWR from 'swr'
import { Link } from 'react-router-dom'
import { addDays, todayStr } from '@shared/dates'
import { api } from '../lib/api'
import { useTimer } from '../lib/timer'
import { toast } from '../lib/ui'
import { TaskRow } from '../components/TaskRow'
import { IconPlus } from '../components/icons'

type Filter = 'open' | 'all' | 'done'

export default function Tasks() {
  const { data: tasks, mutate, isLoading } = useSWR('tasks-all', () => api.tasks.list())
  const { state, attachTask } = useTimer()
  const [filter, setFilter] = useState<Filter>('open')
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const today = todayStr()
  const tomorrow = addDays(today, 1)

  async function add() {
    const title = draft.trim()
    if (!title || busy) return
    setBusy(true)
    try {
      await api.tasks.create({ title, date: today })
      setDraft('')
      await mutate()
    } catch (e) {
      toast(e instanceof Error ? e.message : '添加失败')
    } finally {
      setBusy(false)
    }
  }

  async function toggle(id: string, done: boolean) {
    try {
      await api.tasks.update(id, { done: !done })
      await mutate()
    } catch {
      toast('更新失败')
    }
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`删掉「${title}」？`)) return
    try {
      await api.tasks.remove(id)
      if (state.taskId === id) attachTask(null, null)
      await mutate()
    } catch {
      toast('删除失败')
    }
  }

  const all = tasks ?? []
  const visible = all.filter((t) => (filter === 'open' ? !t.done : filter === 'done' ? t.done : true))

  const groups: { label: string; items: typeof visible }[] = []
  const push = (label: string, items: typeof visible) => {
    if (items.length) groups.push({ label, items })
  }

  if (filter !== 'done') {
    push(
      '过期',
      visible.filter((t) => !t.done && t.date && t.date < today).sort((a, b) => (a.date! < b.date! ? -1 : 1)),
    )
    push('今天', visible.filter((t) => t.date === today && !t.done))
    push('明天', visible.filter((t) => t.date === tomorrow && !t.done))
    push(
      '以后',
      visible
        .filter((t) => t.date && t.date > tomorrow && !t.done)
        .sort((a, b) => (a.date! < b.date! ? -1 : 1)),
    )
    push('收件箱', visible.filter((t) => !t.date && !t.done))
  }
  push('已完成', visible.filter((t) => t.done))

  const openCount = all.filter((t) => !t.done).length

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">任务</h1>
          <div className="page-sub">还有 {openCount} 件没做完，全部 {all.length} 件</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {(
            [
              ['open', '未完成'],
              ['all', '全部'],
              ['done', '已完成'],
            ] as [Filter, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              className={filter === k ? 'btn sm primary' : 'btn sm ghost'}
              onClick={() => setFilter(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card flush">
        <div className="quick-add">
          <input
            className="input"
            placeholder="新任务，回车加到今天"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void add()
            }}
            disabled={busy}
          />
          <button className="btn primary" onClick={() => void add()} disabled={!draft.trim() || busy}>
            <IconPlus size={14} />
            添加
          </button>
        </div>

        {isLoading ? (
          <div className="empty">加载中…</div>
        ) : groups.length === 0 ? (
          <div className="empty">
            <span className="empty-emoji">🗂</span>
            {filter === 'done' ? '还没有完成的任务' : '没有待办，清爽'}
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.label}>
              <div className="group-head">
                <span>{g.label}</span>
                <span>{g.items.length}</span>
              </div>
              <div className="task-list">
                {g.items.map((t) => (
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
            </div>
          ))
        )}
      </div>

      <div className="tiny muted" style={{ marginTop: 14 }}>
        任务卡在收件箱里可以先不管，想到再安排到具体某天。
        <Link to="/topics" style={{ color: 'var(--accent)', marginLeft: 6 }}>
          去看知识地图 →
        </Link>
      </div>
    </>
  )
}
