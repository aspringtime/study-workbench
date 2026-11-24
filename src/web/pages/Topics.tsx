import { useMemo, useState } from 'react'
import type { Topic, TopicStatus } from '@shared/types'
import { TOPIC_TRACKS } from '@shared/constants'
import { api } from '../lib/api'
import { useTemplates, useTopics } from '../lib/hooks'
import { toast } from '../lib/ui'
import { Modal } from '../components/Modal'
import { IconCheck, IconLayers, IconPlus } from '../components/icons'

const NEXT_STATUS: Record<TopicStatus, TopicStatus> = {
  todo: 'learning',
  learning: 'done',
  done: 'todo',
}

const STATUS_LABEL: Record<TopicStatus, string> = {
  todo: '未开始',
  learning: '在学',
  done: '已掌握',
}

function weight(s: TopicStatus): number {
  return s === 'done' ? 1 : s === 'learning' ? 0.5 : 0
}

export default function Topics() {
  const { data: topics, mutate, isLoading } = useTopics()
  const { data: templates, mutate: mutateTemplates } = useTemplates()
  const [editing, setEditing] = useState<Topic | null>(null)
  const [creatingTrack, setCreatingTrack] = useState<string | null>(null)
  const [tplOpen, setTplOpen] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', practice: 0, note: '' })

  async function importTemplate(id: string) {
    setImporting(id)
    try {
      const r = await api.templates.import(id)
      await Promise.all([mutate(), mutateTemplates()])
      toast(
        r.added > 0
          ? `导入了 ${r.added} 个知识点${r.skipped ? `，跳过 ${r.skipped} 个已存在的` : ''}`
          : '这些知识点已经全在了',
      )
    } catch (e) {
      toast(e instanceof Error ? e.message : '导入失败')
    } finally {
      setImporting(null)
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Topic[]>()
    for (const t of topics ?? []) {
      const arr = map.get(t.track) ?? []
      arr.push(t)
      map.set(t.track, arr)
    }
    const order = [...TOPIC_TRACKS as readonly string[], ...[...map.keys()].filter((k) => !(TOPIC_TRACKS as readonly string[]).includes(k))]
    return order
      .filter((k) => map.has(k))
      .map((k) => ({
        track: k,
        items: (map.get(k) ?? []).sort((a, b) => a.sort - b.sort),
      }))
  }, [topics])

  const all = topics ?? []
  const overall = all.length ? all.reduce((s, t) => s + weight(t.status), 0) / all.length : 0
  const mastered = all.filter((t) => t.status === 'done').length
  const learning = all.filter((t) => t.status === 'learning').length

  async function cycle(t: Topic) {
    try {
      await api.topics.update(t.id, { status: NEXT_STATUS[t.status] })
      await mutate()
    } catch {
      toast('更新失败')
    }
  }

  function openEdit(t: Topic) {
    setEditing(t)
    setForm({ name: t.name, practice: t.practice, note: t.note })
  }

  async function saveEdit() {
    if (!editing) return
    try {
      await api.topics.update(editing.id, {
        name: form.name.trim() || editing.name,
        practice: Number.isFinite(form.practice) ? Math.max(0, Math.floor(form.practice)) : editing.practice,
        note: form.note,
      })
      setEditing(null)
      await mutate()
      toast('已保存')
    } catch (e) {
      toast(e instanceof Error ? e.message : '保存失败')
    }
  }

  async function removeTopic() {
    if (!editing) return
    if (!window.confirm(`删掉「${editing.name}」？`)) return
    try {
      await api.topics.remove(editing.id)
      setEditing(null)
      await mutate()
    } catch {
      toast('删除失败')
    }
  }

  async function createTopic() {
    if (!creatingTrack) return
    const name = form.name.trim()
    if (!name) return
    try {
      await api.topics.create({ track: creatingTrack, name })
      setCreatingTrack(null)
      await mutate()
      toast('已添加')
    } catch (e) {
      toast(e instanceof Error ? e.message : '添加失败')
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">知识地图</h1>
          <div className="page-sub">
            共 {all.length} 个知识点 · 已掌握 {mastered} · 在学 {learning}
          </div>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <div className="row" style={{ gap: 8 }}>
            <div style={{ width: 110 }}>
              <div className="progress">
                <span style={{ width: `${overall * 100}%` }} />
              </div>
            </div>
            <span className="tiny muted mono">{Math.round(overall * 100)}%</span>
          </div>
          <button className="btn sm" onClick={() => setTplOpen(true)}>
            <IconLayers size={13} /> 模板库
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="card empty">加载中…</div>
      ) : (
        grouped.map(({ track, items }) => {
          const p = items.length ? items.reduce((s, t) => s + weight(t.status), 0) / items.length : 0
          return (
            <div className="card track-card" key={track}>
              <div className="track-head">
                <span className="track-name">{track}</span>
                <div className="track-progress">
                  <span>
                    {items.filter((t) => t.status === 'done').length}/{items.length}
                  </span>
                  <div style={{ width: 80 }}>
                    <div className="progress">
                      <span style={{ width: `${p * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="topic-grid">
                {items.map((t) => (
                  <div
                    key={t.id}
                    className="topic-row"
                    data-status={t.status}
                    onClick={() => openEdit(t)}
                  >
                    <button
                      className={`topic-status ${t.status}`}
                      title={`${STATUS_LABEL[t.status]} · 点击切换`}
                      onClick={(e) => {
                        e.stopPropagation()
                        void cycle(t)
                      }}
                    >
                      {t.status === 'done' && <IconCheck size={9} />}
                    </button>
                    <span className="topic-name">{t.name}</span>
                    {t.practice > 0 && <span className="topic-practice">{t.practice} 题</span>}
                  </div>
                ))}
              </div>

              <button
                className="btn ghost sm"
                style={{ marginTop: 8 }}
                onClick={() => {
                  setCreatingTrack(track)
                  setForm({ name: '', practice: 0, note: '' })
                }}
              >
                <IconPlus size={13} /> 添加知识点
              </button>
            </div>
          )
        })
      )}

      <Modal
        open={editing !== null}
        title="编辑知识点"
        onClose={() => setEditing(null)}
        actions={
          <>
            <button className="btn danger" onClick={() => void removeTopic()}>
              删除
            </button>
            <span className="spacer" />
            <button className="btn" onClick={() => setEditing(null)}>
              取消
            </button>
            <button className="btn primary" onClick={() => void saveEdit()}>
              保存
            </button>
          </>
        }
      >
        <div className="field">
          <label className="field-label">名称</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label className="field-label">已练题数</label>
          <input
            className="input"
            type="number"
            min={0}
            value={form.practice}
            onChange={(e) => setForm({ ...form, practice: Number(e.target.value) })}
          />
        </div>
        <div className="field">
          <label className="field-label">备注（踩过的坑、模板要点）</label>
          <textarea
            className="input"
            rows={4}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="比如：Dijkstra 不能有负边，堆优化用 pair<int,int>"
          />
        </div>
      </Modal>

      <Modal
        open={creatingTrack !== null}
        title={`在「${creatingTrack ?? ''}」里加一个知识点`}
        onClose={() => setCreatingTrack(null)}
        actions={
          <>
            <button className="btn" onClick={() => setCreatingTrack(null)}>
              取消
            </button>
            <button className="btn primary" onClick={() => void createTopic()} disabled={!form.name.trim()}>
              添加
            </button>
          </>
        }
      >
        <div className="field">
          <label className="field-label">名称</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="比如：强连通分量 · Kosaraju"
            autoFocus
          />
        </div>
      </Modal>

      <Modal open={tplOpen} title="知识地图模板" onClose={() => setTplOpen(false)}>
        <div className="tiny muted" style={{ marginBottom: 14, lineHeight: 1.6 }}>
          导入一份大纲，知识点会按方向写进地图。已经存在的会自动跳过，不会重复。
        </div>
        <div className="col" style={{ gap: 10 }}>
          {(templates ?? []).map((t) => (
            <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: 11, padding: 14 }}>
              <div className="row" style={{ gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                  <div className="tiny muted">{t.summary}</div>
                </div>
                <span className="spacer" />
                <button
                  className="btn sm primary"
                  disabled={importing !== null}
                  onClick={() => void importTemplate(t.id)}
                >
                  {importing === t.id ? '导入中…' : t.existing > 0 ? '补全' : '导入'}
                </button>
              </div>
              <div className="tiny muted mono" style={{ marginTop: 9 }}>
                {t.tracks.map((tr) => `${tr.name} ${Math.min(tr.existing, tr.total)}/${tr.total}`).join('  ·  ')}
              </div>
            </div>
          ))}
          {!templates?.length && <div className="empty">还没有模板</div>}
        </div>
      </Modal>
    </>
  )
}
