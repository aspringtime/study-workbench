import { useMemo, useState } from 'react'
import useSWR from 'swr'
import type { Resource } from '@shared/types'
import { api } from '../lib/api'
import { toast } from '../lib/ui'
import { Modal } from '../components/Modal'
import { IconExternal, IconPlus, IconTrash } from '../components/icons'

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export default function Resources() {
  const { data: items, mutate, isLoading } = useSWR('resources', () => api.resources.list())
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Resource | null>(null)
  const [form, setForm] = useState({ title: '', url: '', category: '算法', note: '' })

  const groups = useMemo(() => {
    const map = new Map<string, Resource[]>()
    for (const r of items ?? []) {
      const arr = map.get(r.category) ?? []
      arr.push(r)
      map.set(r.category, arr)
    }
    return [...map.entries()]
  }, [items])

  function openAdd() {
    setEditing(null)
    setForm({ title: '', url: '', category: '算法', note: '' })
    setOpen(true)
  }

  function openEdit(r: Resource) {
    setEditing(r)
    setForm({ title: r.title, url: r.url, category: r.category, note: r.note })
    setOpen(true)
  }

  async function save() {
    const title = form.title.trim()
    const url = form.url.trim()
    if (!title || !url) return
    try {
      if (editing) {
        await api.resources.update(editing.id, { ...form, title, url })
      } else {
        await api.resources.create({ ...form, title, url })
      }
      setOpen(false)
      setEditing(null)
      await mutate()
      toast('已保存')
    } catch (e) {
      toast(e instanceof Error ? e.message : '保存失败')
    }
  }

  async function remove(r: Resource) {
    if (!window.confirm(`删掉「${r.title}」？`)) return
    try {
      await api.resources.remove(r.id)
      await mutate()
    } catch {
      toast('删除失败')
    }
  }

  const total = items?.length ?? 0

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">资料</h1>
          <div className="page-sub">常用讲义和文档，点一下直接打开 · 共 {total} 条</div>
        </div>
        <button className="btn primary" onClick={openAdd}>
          <IconPlus size={14} /> 添加
        </button>
      </div>

      {isLoading && !items ? (
        <div className="card empty">加载中…</div>
      ) : groups.length === 0 ? (
        <div className="card empty">
          <span className="empty-emoji">📚</span>
          还没有资料，点右上角加一条
        </div>
      ) : (
        groups.map(([category, list]) => (
          <div className="card flush" key={category} style={{ marginBottom: 16 }}>
            <div className="card-head">
              <span className="card-title" style={{ margin: 0 }}>
                {category}
              </span>
              <span className="tiny muted mono">{list.length}</span>
            </div>
            {list.map((r) => (
              <a
                key={r.id}
                className="resource-row"
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="resource-title">
                    {r.title}
                    <IconExternal size={11} style={{ opacity: 0.45, marginLeft: 6 }} />
                  </div>
                  <div className="task-meta">
                    <span className="mono">{host(r.url)}</span>
                    {r.note && <span>· {r.note}</span>}
                  </div>
                </div>
                <div className="task-actions">
                  <button
                    className="btn ghost sm"
                    title="编辑"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      openEdit(r)
                    }}
                  >
                    改
                  </button>
                  <button
                    className="btn ghost sm"
                    title="删除"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      void remove(r)
                    }}
                  >
                    <IconTrash size={13} />
                  </button>
                </div>
              </a>
            ))}
          </div>
        ))
      )}

      <Modal
        open={open}
        title={editing ? '编辑资料' : '添加资料'}
        onClose={() => setOpen(false)}
        actions={
          <>
            <button className="btn" onClick={() => setOpen(false)}>
              取消
            </button>
            <button className="btn primary" onClick={() => void save()} disabled={!form.title.trim() || !form.url.trim()}>
              保存
            </button>
          </>
        }
      >
        <div className="field">
          <label className="field-label">标题</label>
          <input
            className="input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Hello 算法"
            autoFocus
          />
        </div>
        <div className="field">
          <label className="field-label">链接</label>
          <input
            className="input"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://www.hello-algo.com/"
          />
        </div>
        <div className="field">
          <label className="field-label">分类</label>
          <input
            className="input"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="算法 / 编程语言 / 英语 …"
            list="resource-categories"
          />
          <datalist id="resource-categories">
            {[...new Set(groups.map(([c]) => c))].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="field">
          <label className="field-label">备注（可选）</label>
          <input
            className="input"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="图文并茂，带动画演示"
          />
        </div>
      </Modal>
    </>
  )
}
