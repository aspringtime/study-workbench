import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { api } from '../lib/api'
import { toast, useDebounced } from '../lib/ui'
import { IconPlus, IconSearch } from '../components/icons'

const LEVELS: [string, string][] = [
  ['all', '全部'],
  ['cet4', '四级'],
  ['cet6', '六级'],
]

const FREQS: [string, string][] = [
  ['all', '全部'],
  ['high', '高频'],
  ['mid', '中频'],
  ['low', '低频'],
]

const PAGE_SIZE = 60

export default function Words() {
  const [q, setQ] = useState('')
  const search = useDebounced(q, 320)
  const [level, setLevel] = useState('all')
  const [freq, setFreq] = useState('all')
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    setPage(1)
  }, [search, level, freq])

  const { data, isLoading } = useSWR(
    ['words', search, level, freq, page],
    () => api.words.list({ q: search, level, freq, page, size: PAGE_SIZE }),
    { keepPreviousData: true },
  )

  const { data: stats } = useSWR('words-stats', () => api.words.stats())

  const total = data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function addToCards(word: string, meaning: string, lv: string) {
    setBusy(word)
    try {
      await api.cards.create({ front: word, back: meaning, deck: lv || 'CET' })
      toast(`「${word}」已加进复习`)
    } catch {
      toast('添加失败')
    } finally {
      setBusy(null)
    }
  }

  const chip = (active: boolean) =>
    active
      ? { background: 'var(--accent-dim)', borderColor: 'transparent', color: 'var(--accent)' }
      : { background: 'transparent', borderColor: 'var(--border)', color: 'var(--text-dim)' }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">词汇</h1>
          <div className="page-sub">
            四六级词库 {stats?.total ?? 6661} 词 · 高频 {stats?.byFreq?.[0] ?? 0} · 中频{' '}
            {stats?.byFreq?.[1] ?? 0} · 低频 {stats?.byFreq?.[2] ?? 0}
          </div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <IconSearch
              size={14}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)',
              }}
            />
            <input
              className="input"
              style={{ paddingLeft: 31, width: 240 }}
              placeholder="搜单词或释义"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="row wrap" style={{ gap: 8, marginBottom: 16 }}>
        {LEVELS.map(([k, label]) => (
          <button key={k} className="btn sm" style={chip(level === k)} onClick={() => setLevel(k)}>
            {label}
          </button>
        ))}
        <span style={{ width: 14 }} />
        {FREQS.map(([k, label]) => (
          <button key={k} className="btn sm" style={chip(freq === k)} onClick={() => setFreq(k)}>
            {label}
          </button>
        ))}
        <span className="spacer" />
        <span className="tiny muted mono">
          {total} 词 · 第 {page} / {pages} 页
        </span>
      </div>

      <div className="card flush">
        {isLoading && !data ? (
          <div className="empty">加载中…</div>
        ) : (data?.items.length ?? 0) === 0 ? (
          <div className="empty">
            <span className="empty-emoji">🔍</span>
            没找到符合条件的词
          </div>
        ) : (
          <div className="word-list">
            {data!.items.map((w) => (
              <div className="word-row" key={w.word}>
                <div className="word-main">
                  <div className="word-en">{w.word}</div>
                  <div className="word-def">{w.meaning}</div>
                </div>
                <span className={`word-tag lv-${w.level === 'CET4/6' ? 'both' : w.level.toLowerCase()}`}>
                  {w.level}
                </span>
                <span className={`word-tag fq-${w.freq}`}>{w.freqLabel}</span>
                <button
                  className="btn ghost sm"
                  title="加进复习"
                  disabled={busy === w.word}
                  onClick={() => void addToCards(w.word, w.meaning, w.level)}
                >
                  <IconPlus size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="row" style={{ justifyContent: 'center', gap: 10, marginTop: 18 }}>
          <button className="btn sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            上一页
          </button>
          <span className="tiny muted mono">
            {page} / {pages}
          </span>
          <button
            className="btn sm"
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            下一页
          </button>
        </div>
      )}
    </>
  )
}
