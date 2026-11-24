import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { toast } from '../lib/ui'
import { IconPlus, IconRotate } from './icons'

type Level = 'cet4' | 'cet6'

interface WordEntry {
  word: string
  meaning: string
  level: string
}

export function WordCard() {
  const [level, setLevel] = useState<Level>('cet4')
  const [entry, setEntry] = useState<WordEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const current = useRef<string | undefined>(undefined)

  const load = useCallback(
    async (lv: Level, exclude?: string) => {
      setLoading(true)
      try {
        const next = await api.words.random(lv, exclude)
        current.current = next.word
        setEntry(next)
      } catch {
        toast('词库没加载出来')
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    setEntry(null)
    void load(level)
  }, [level, load])

  async function addToCards() {
    if (!entry) return
    try {
      await api.cards.create({
        front: entry.word,
        back: entry.meaning,
        deck: entry.level,
      })
      toast(`「${entry.word}」已加进复习`)
    } catch {
      toast('添加失败')
    }
  }

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 12 }}>
        <span>今日单词</span>
        <div className="row" style={{ gap: 3 }}>
          {(
            [
              ['cet4', '四级'],
              ['cet6', '六级'],
            ] as [Level, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              className="btn sm"
              onClick={() => setLevel(k)}
              style={
                level === k
                  ? { background: 'var(--accent-dim)', borderColor: 'transparent', color: 'var(--accent)' }
                  : { background: 'transparent', borderColor: 'transparent', color: 'var(--muted)' }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ minHeight: 96 }}>
        <div
          style={{
            fontSize: 25,
            fontWeight: 650,
            letterSpacing: '-0.01em',
            lineHeight: 1.25,
            wordBreak: 'break-word',
            opacity: loading ? 0.4 : 1,
            transition: 'opacity .15s',
          }}
        >
          {entry?.word ?? '…'}
        </div>
        <div className="tiny muted mono" style={{ marginTop: 2 }}>
          {entry?.level ?? ''}
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 13.5,
            lineHeight: 1.7,
            color: 'var(--text-dim)',
            opacity: loading ? 0.4 : 1,
          }}
        >
          {entry?.meaning ?? ''}
        </div>
      </div>

      <div className="row" style={{ marginTop: 14, gap: 8 }}>
        <button
          className="btn sm"
          onClick={() => void load(level, current.current)}
          disabled={loading}
        >
          <IconRotate size={13} /> 换一个
        </button>
        <button className="btn ghost sm" onClick={() => void addToCards()} disabled={!entry}>
          <IconPlus size={13} /> 加进复习
        </button>
      </div>
    </div>
  )
}
