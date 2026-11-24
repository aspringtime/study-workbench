import { useCallback, useEffect, useRef, useState } from 'react'
import type { Card, ReviewRating } from '@shared/types'
import { schedule } from '@shared/srs'
import { humanDate, todayStr } from '@shared/dates'
import { api } from '../lib/api'
import { useAllCards, useDueCards } from '../lib/hooks'
import { cn, toast } from '../lib/ui'
import { Modal } from '../components/Modal'
import { IconPlus, IconTrash } from '../components/icons'

const RATINGS: { key: ReviewRating; label: string; hint: string }[] = [
  { key: 'again', label: '忘了', hint: '重来' },
  { key: 'hard', label: '勉强', hint: '有点卡' },
  { key: 'good', label: '记得', hint: '正常' },
  { key: 'easy', label: '太简单', hint: '秒了' },
]

function fmtInterval(days: number): string {
  if (days <= 0) return '今天再来'
  if (days === 1) return '1 天后'
  if (days < 30) return `${days} 天后`
  const m = Math.round(days / 30)
  return m < 12 ? `${m} 个月后` : `${(days / 365).toFixed(1)} 年后`
}

export default function Review() {
  const [tab, setTab] = useState<'review' | 'library'>('review')
  const { data: due, mutate: mutateDue } = useDueCards()
  const { data: allCards, mutate: mutateAll } = useAllCards()

  const [queue, setQueue] = useState<Card[]>([])
  const [flipped, setFlipped] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState({ again: 0, hard: 0, good: 0, easy: 0 })
  const initialized = useRef(false)

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ front: '', back: '', deck: '默认' })

  useEffect(() => {
    if (!due || initialized.current) return
    initialized.current = true
    setQueue(due)
  }, [due])

  const current = queue[0]
  const totalSession = done.again + done.hard + done.good + done.easy

  const rate = useCallback(
    async (rating: ReviewRating) => {
      if (!current || busy || !flipped) return
      setBusy(true)
      try {
        const res = await api.cards.review(current.id, rating)
        setDone((d) => ({ ...d, [rating]: d[rating] + 1 }))
        setFlipped(false)
        setQueue((q) => {
          const rest = q.slice(1)
          return rating === 'again' ? [...rest, res.card] : rest
        })
      } catch {
        toast('提交失败，检查一下服务')
      } finally {
        setBusy(false)
      }
    },
    [current, busy, flipped],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tab !== 'review' || addOpen) return
      const el = document.activeElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return

      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault()
        if (!flipped && current) setFlipped(true)
        return
      }
      if (flipped && current) {
        const map: Record<string, ReviewRating> = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' }
        const r = map[e.key]
        if (r) {
          e.preventDefault()
          void rate(r)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tab, addOpen, flipped, current, rate])

  async function createCard() {
    if (!form.front.trim() || !form.back.trim()) return
    try {
      await api.cards.create({ front: form.front.trim(), back: form.back.trim(), deck: form.deck.trim() || '默认' })
      setForm({ front: '', back: '', deck: form.deck })
      setAddOpen(false)
      await Promise.all([mutateDue(), mutateAll()])
      initialized.current = false
      toast('卡片已加入，今天就能复习')
    } catch (e) {
      toast(e instanceof Error ? e.message : '添加失败')
    }
  }

  async function deleteCard(c: Card) {
    if (!window.confirm('删掉这张卡片？')) return
    try {
      await api.cards.remove(c.id)
      await Promise.all([mutateDue(), mutateAll()])
      setQueue((q) => q.filter((x) => x.id !== c.id))
    } catch {
      toast('删除失败')
    }
  }

  function restart() {
    initialized.current = false
    setQueue([])
    setDone({ again: 0, hard: 0, good: 0, easy: 0 })
    void mutateDue()
  }

  const previews = current
    ? (['again', 'hard', 'good', 'easy'] as ReviewRating[]).map((r) => ({
        r,
        dueInDays: schedule({ ease: current.ease, intervalDays: current.intervalDays }, r).dueInDays,
      }))
    : []

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">复习</h1>
          <div className="page-sub">
            {queue.length > 0
              ? `还剩 ${queue.length} 张 · 今天已复习 ${totalSession} 次`
              : `今天没有到期卡片 · 卡片库共 ${allCards?.length ?? 0} 张`}
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className={cn('btn sm', tab === 'review' ? 'primary' : 'ghost')} onClick={() => setTab('review')}>
            开始复习
          </button>
          <button className={cn('btn sm', tab === 'library' ? 'primary' : 'ghost')} onClick={() => setTab('library')}>
            卡片库
          </button>
          <button className="btn sm" onClick={() => setAddOpen(true)}>
            <IconPlus size={13} /> 新卡片
          </button>
        </div>
      </div>

      {tab === 'review' ? (
        <div className="review-stage">
          {queue.length === 0 ? (
            <div className="card" style={{ width: '100%', textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ fontSize: 34, marginBottom: 10 }}>{totalSession > 0 ? '🎉' : '🗂'}</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                {totalSession > 0 ? '这一轮复习完了' : '今天没有到期卡片'}
              </div>
              <div className="tiny muted" style={{ marginBottom: 18 }}>
                {totalSession > 0
                  ? `共复习 ${totalSession} 次 · 忘了 ${done.again} · 勉强 ${done.hard} · 记得 ${done.good} · 太简单 ${done.easy}`
                  : '去卡片库加几张，或者去笔记里把模板做成卡片'}
              </div>
              <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
                <button className="btn primary" onClick={() => setAddOpen(true)}>
                  <IconPlus size={14} /> 加一张卡片
                </button>
                <button className="btn" onClick={restart}>
                  重新检查
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="review-progress">
                <div style={{ flex: 1 }}>
                  <div className="progress">
                    <span
                      style={{
                        width: `${Math.min(100, (totalSession / (totalSession + queue.length)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="mono tiny">还剩 {queue.length}</span>
              </div>

              <div className="flashcard" onClick={() => setFlipped((f) => !f)}>
                <span className="deck-tag">{current.deck}</span>
                <div className="front-text">{current.front}</div>
                {flipped && <div className="back-block">{current.back}</div>}
                <div className="hint">
                  {flipped ? '按 1-4 评分（空格翻回）' : '空格 / 点击 翻面'}
                </div>
              </div>

              <div className="rating-row">
                {RATINGS.map((r) => {
                  const pv = previews.find((p) => p.r === r.key)
                  return (
                    <button
                      key={r.key}
                      className="rating-btn"
                      data-r={r.key}
                      onClick={() => void rate(r.key)}
                      disabled={!flipped || busy}
                      style={{ opacity: flipped ? 1 : 0.55 }}
                    >
                      <span className="k">{r.label}</span>
                      <span className="iv">{pv ? fmtInterval(pv.dueInDays) : ''}</span>
                    </button>
                  )
                })}
              </div>

              <div className="tiny muted">
                卡片到期日 {humanDate(current.dueDate)} · 已复习 {current.reps} 次 · 难度系数 {current.ease.toFixed(2)}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="card flush">
          {!allCards || allCards.length === 0 ? (
            <div className="empty">
              <span className="empty-emoji">🗃</span>
              卡片库是空的
            </div>
          ) : (
            <div className="task-list">
              {allCards.map((c) => {
                const overdue = c.dueDate <= todayStr()
                return (
                  <div key={c.id} className="task-row">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="task-title">{c.front}</div>
                      <div className="task-meta">
                        <span className="pill" style={{ padding: '0 6px', fontSize: 10 }}>
                          {c.deck}
                        </span>
                        <span>复习 {c.reps} 次</span>
                        <span style={{ color: overdue ? 'var(--warn)' : undefined }}>
                          到期 {humanDate(c.dueDate)}
                        </span>
                      </div>
                    </div>
                    <div style={{ maxWidth: 320, color: 'var(--muted)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.back}
                    </div>
                    <button className="btn ghost sm" onClick={() => void deleteCard(c)} title="删除">
                      <IconTrash size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <Modal
        open={addOpen}
        title="新卡片"
        onClose={() => setAddOpen(false)}
        actions={
          <>
            <button className="btn" onClick={() => setAddOpen(false)}>
              取消
            </button>
            <button className="btn primary" onClick={() => void createCard()} disabled={!form.front.trim() || !form.back.trim()}>
              添加
            </button>
          </>
        }
      >
        <div className="field">
          <label className="field-label">正面（问题）</label>
          <textarea
            className="input"
            rows={2}
            value={form.front}
            onChange={(e) => setForm({ ...form, front: e.target.value })}
            placeholder="Dijkstra 为什么不能处理负权边？"
            autoFocus
          />
        </div>
        <div className="field">
          <label className="field-label">背面（答案）</label>
          <textarea
            className="input"
            rows={4}
            value={form.back}
            onChange={(e) => setForm({ ...form, back: e.target.value })}
            placeholder="贪心前提是边权非负…"
          />
        </div>
        <div className="field">
          <label className="field-label">牌组</label>
          <input
            className="input"
            value={form.deck}
            onChange={(e) => setForm({ ...form, deck: e.target.value })}
            placeholder="图论"
          />
        </div>
      </Modal>
    </>
  )
}
