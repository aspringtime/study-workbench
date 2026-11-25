import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { toast } from '../lib/ui'
import { IconCheck, IconPlus } from './icons'

type Level = 'all' | 'cet4' | 'cet6'
type Freq = 'all' | 'high' | 'mid' | 'low'

interface Entry {
  word: string
  meaning: string
  level: string
  freq: number
  freqLabel: string
}

/** 看中文写英文，答对自动进下一题，答错停住让你看答案 */
export function Dictation({ level, freq }: { level: Level; freq: Freq }) {
  const [entry, setEntry] = useState<Entry | null>(null)
  const [input, setInput] = useState('')
  const [result, setResult] = useState<'ok' | 'wrong' | null>(null)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ correct: 0, total: 0, streak: 0, best: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setInput('')
    setResult(null)
    try {
      const next = await api.words.random(level, freq)
      setEntry(next)
      window.setTimeout(() => inputRef.current?.focus(), 30)
    } catch {
      toast('出题失败')
    } finally {
      setLoading(false)
    }
  }, [level, freq])

  useEffect(() => {
    setStats({ correct: 0, total: 0, streak: 0, best: 0 })
    void load()
  }, [level, freq, load])

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  function check() {
    if (!entry || result) return
    const ok = input.trim().toLowerCase() === entry.word.toLowerCase()
    setResult(ok ? 'ok' : 'wrong')
    setStats((s) => {
      const streak = ok ? s.streak + 1 : 0
      return {
        correct: s.correct + (ok ? 1 : 0),
        total: s.total + 1,
        streak,
        best: Math.max(s.best, streak),
      }
    })
    if (ok) {
      timer.current = window.setTimeout(() => void load(), 550)
    } else {
      window.setTimeout(() => inputRef.current?.focus(), 30)
    }
  }

  async function addToCards() {
    if (!entry) return
    try {
      await api.cards.create({ front: entry.word, back: entry.meaning, deck: entry.level || 'CET' })
      toast(`「${entry.word}」已加进复习`)
    } catch {
      toast('添加失败')
    }
  }

  const rate = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0

  return (
    <div className="card" style={{ padding: '24px 26px', minHeight: 300 }}>
      <div className="row" style={{ marginBottom: 4 }}>
        <span className="tiny muted">看中文写英文 · 答对自动下一题</span>
        <span className="spacer" />
        <span className="tiny mono muted">
          正确 {stats.correct}/{stats.total}
          {stats.total > 0 ? `（${rate}%）` : ''} · 连对 {stats.streak}
          {stats.best > 0 ? ` · 最好 ${stats.best}` : ''}
        </span>
      </div>

      <div style={{ minHeight: 96, marginTop: 18 }}>
        <div style={{ fontSize: 21, lineHeight: 1.6, color: 'var(--text)' }}>
          {entry?.meaning ?? '…'}
        </div>
        <div className="tiny muted mono" style={{ marginTop: 6 }}>
          {entry ? `${entry.level} · ${entry.freqLabel}` : ''}
        </div>
      </div>

      <input
        ref={inputRef}
        className="input"
        style={{ marginTop: 10, fontSize: 16, letterSpacing: '0.02em' }}
        placeholder="写出英文单词，回车检查"
        value={input}
        disabled={loading || result === 'ok'}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (result === 'wrong') void load()
            else check()
          }
        }}
        spellCheck={false}
        autoComplete="off"
      />

      <div style={{ minHeight: 30, marginTop: 12 }}>
        {result === 'ok' && (
          <span style={{ color: 'var(--accent)', fontSize: 13.5 }}>
            <IconCheck size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} />
            {entry?.word}
          </span>
        )}
        {result === 'wrong' && (
          <span style={{ color: 'var(--danger)', fontSize: 13.5 }}>
            正确拼写是 <b className="mono">{entry?.word}</b>
          </span>
        )}
      </div>

      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        {result ? (
          <button className="btn primary" onClick={() => void load()}>
            下一个
          </button>
        ) : (
          <button className="btn primary" onClick={check} disabled={!input.trim() || loading}>
            检查
          </button>
        )}
        <button className="btn ghost" onClick={() => void load()}>
          跳过
        </button>
        {result === 'wrong' && (
          <button className="btn ghost" onClick={() => void addToCards()}>
            <IconPlus size={13} /> 加进复习
          </button>
        )}
      </div>
    </div>
  )
}
