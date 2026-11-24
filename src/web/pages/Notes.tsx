import { useEffect, useMemo, useRef, useState } from 'react'
import type { Note, NoteKind } from '@shared/types'
import { api } from '../lib/api'
import { useNotes } from '../lib/hooks'
import { cn, toast, useDebounced } from '../lib/ui'
import { Markdown } from '../components/Markdown'
import { IconPlus, IconSearch, IconTrash } from '../components/icons'

const KINDS: { key: string; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'template', label: '模板' },
  { key: 'pitfall', label: '踩坑' },
  { key: 'idea', label: '想法' },
]

const KIND_LABEL: Record<NoteKind, string> = {
  template: '模板',
  pitfall: '踩坑',
  idea: '想法',
}

interface Draft {
  title: string
  content: string
  kind: NoteKind
  tags: string
}

export default function Notes() {
  const [kind, setKind] = useState('all')
  const [q, setQ] = useState('')
  const search = useDebounced(q, 300)
  const { data: notes, mutate, isLoading } = useNotes(kind, search)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<number | null>(null)
  const draftRef = useRef<Draft | null>(null)
  draftRef.current = draft

  const selected = useMemo(
    () => notes?.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  )

  useEffect(() => {
    if (notes && notes.length > 0 && !notes.some((n) => n.id === selectedId)) {
      setSelectedId(notes[0].id)
    }
    if (notes && notes.length === 0) setSelectedId(null)
  }, [notes, selectedId])

  useEffect(() => {
    if (!selected) {
      setDraft(null)
      return
    }
    setDraft({
      title: selected.title,
      content: selected.content,
      kind: selected.kind,
      tags: selected.tags.join(', '),
    })
    // 只在切换笔记时重置草稿
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id])

  // 自动保存
  useEffect(() => {
    if (!draft || !selected) return
    const tags = draft.tags
      .split(/[,，\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const dirty =
      draft.title !== selected.title ||
      draft.content !== selected.content ||
      draft.kind !== selected.kind ||
      tags.join('\u0001') !== selected.tags.join('\u0001')
    if (!dirty) return

    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      void (async () => {
        if (!draftRef.current) return
        setSaving(true)
        try {
          await api.notes.update(selected.id, {
            title: draftRef.current.title.trim() || '未命名笔记',
            content: draftRef.current.content,
            kind: draftRef.current.kind,
            tags,
          })
          await mutate()
        } catch {
          toast('保存失败')
        } finally {
          setSaving(false)
        }
      })()
    }, 700)

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  async function createNote() {
    try {
      const n = await api.notes.create({
        title: '未命名笔记',
        kind: 'template',
        content: '',
      })
      await mutate()
      setSelectedId(n.id)
      setPreview(false)
      toast('新建笔记')
    } catch {
      toast('新建失败')
    }
  }

  async function removeNote() {
    if (!selected) return
    if (!window.confirm(`删掉「${selected.title}」？`)) return
    try {
      await api.notes.remove(selected.id)
      setSelectedId(null)
      await mutate()
      toast('已删除')
    } catch {
      toast('删除失败')
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">笔记</h1>
          <div className="page-sub">
            模板、踩过的坑、想到的东西，都扔进来 · 共 {notes?.length ?? 0} 篇
          </div>
        </div>
        <button className="btn primary" onClick={() => void createNote()}>
          <IconPlus size={14} /> 新建
        </button>
      </div>

      <div className="notes-layout">
        <div className="card flush">
          <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
            <div style={{ position: 'relative', marginBottom: 10 }}>
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
                style={{ paddingLeft: 31 }}
                placeholder="搜标题或正文"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
              {KINDS.map((k) => (
                <button
                  key={k.key}
                  className={cn('btn sm', kind === k.key ? 'primary' : 'ghost')}
                  onClick={() => setKind(k.key)}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          <div className="note-list">
            {isLoading && !notes ? (
              <div className="empty">加载中…</div>
            ) : (notes?.length ?? 0) === 0 ? (
              <div className="empty">
                <span className="empty-emoji">📝</span>
                没有笔记，先建一篇
              </div>
            ) : (
              notes!.map((n: Note) => (
                <div
                  key={n.id}
                  className={cn('note-item', n.id === selectedId && 'active')}
                  onClick={() => setSelectedId(n.id)}
                >
                  <div className="note-item-title">
                    {n.pinned ? '📌 ' : ''}
                    {n.title}
                  </div>
                  <div className="note-item-meta">
                    <span className="pill" style={{ padding: '0 6px', fontSize: 10 }}>
                      {KIND_LABEL[n.kind]}
                    </span>
                    <span>{n.updatedAt.slice(0, 10)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card note-editor">
          {!selected || !draft ? (
            <div className="empty" style={{ margin: 'auto' }}>
              <span className="empty-emoji">🖋</span>
              左边选一篇，或者新建
            </div>
          ) : (
            <>
              <div className="note-toolbar">
                <input
                  className="input"
                  style={{ flex: 1, fontWeight: 600, fontSize: 15, border: 'none', background: 'transparent', paddingLeft: 0 }}
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="标题"
                />
                <select
                  className="input"
                  style={{ width: 92 }}
                  value={draft.kind}
                  onChange={(e) => setDraft({ ...draft, kind: e.target.value as NoteKind })}
                >
                  <option value="template">模板</option>
                  <option value="pitfall">踩坑</option>
                  <option value="idea">想法</option>
                </select>
                <button className={cn('btn sm', preview ? 'primary' : '')} onClick={() => setPreview((p) => !p)}>
                  {preview ? '编辑' : '预览'}
                </button>
                <button className="btn ghost sm" onClick={() => void removeNote()} title="删除这篇">
                  <IconTrash size={13} />
                </button>
              </div>

              <div className="row" style={{ gap: 8, marginBottom: 10 }}>
                <input
                  className="input"
                  style={{ fontSize: 12 }}
                  placeholder="标签，用逗号隔开"
                  value={draft.tags}
                  onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                />
                <span className="tiny muted mono" style={{ whiteSpace: 'nowrap', minWidth: 46, textAlign: 'right' }}>
                  {saving ? '保存中' : '已保存'}
                </span>
              </div>

              {preview ? (
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <Markdown>{draft.content || '（空）'}</Markdown>
                </div>
              ) : (
                <textarea
                  className="input"
                  style={{ flex: 1, minHeight: 0, fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1.7 }}
                  value={draft.content}
                  onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                  placeholder={'支持 Markdown。\n\n## 模板\n```cpp\n// 写点东西\n```'}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
