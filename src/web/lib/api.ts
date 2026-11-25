import type {
  Card,
  DayActivity,
  FocusSession,
  Note,
  ReviewRating,
  Resource,
  StatsSummary,
  Task,
  TemplateInfo,
  TodayPayload,
  Topic,
  WordPage,
} from '@shared/types'
import { todayStr } from '@shared/dates'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  })
  if (res.status === 204) return undefined as T
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    const msg = (data as { message?: string })?.message ?? `请求失败（${res.status}）`
    throw new ApiError(msg, res.status, (data as { error?: string })?.error)
  }
  return data as T
}

const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export const api = {
  today(date = todayStr()) {
    return request<TodayPayload>(`/api/today${qs({ date })}`)
  },

  tasks: {
    list(params: { date?: string; q?: string } = {}) {
      return request<Task[]>(`/api/tasks${qs(params)}`)
    },
    create(body: {
      title: string
      note?: string
      date?: string | null
      priority?: Task['priority']
      estimatePomodoros?: number
    }) {
      return request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(body) })
    },
    update(id: string, body: Partial<Omit<Task, 'id' | 'createdAt'>>) {
      return request<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
    },
    remove(id: string) {
      return request<void>(`/api/tasks/${id}`, { method: 'DELETE' })
    },
    rollover(from: string, to: string) {
      return request<{ moved: number }>('/api/tasks/rollover', {
        method: 'POST',
        body: JSON.stringify({ from, to }),
      })
    },
  },

  focus: {
    list(date?: string) {
      return request<FocusSession[]>(`/api/focus${qs({ date })}`)
    },
    create(body: {
      taskId?: string | null
      date: string
      startedAt: string
      endedAt: string
      seconds: number
      kind: 'focus' | 'break'
      label?: string
    }) {
      return request<FocusSession>('/api/focus', { method: 'POST', body: JSON.stringify(body) })
    },
  },

  topics: {
    list() {
      return request<Topic[]>('/api/topics')
    },
    create(body: { track: string; name: string }) {
      return request<Topic>('/api/topics', { method: 'POST', body: JSON.stringify(body) })
    },
    update(id: string, body: { status?: Topic['status']; note?: string; practice?: number; name?: string }) {
      return request<Topic>(`/api/topics/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
    },
    remove(id: string) {
      return request<void>(`/api/topics/${id}`, { method: 'DELETE' })
    },
  },

  notes: {
    list(params: { kind?: string; q?: string } = {}) {
      return request<Note[]>(`/api/notes${qs(params)}`)
    },
    create(body: {
      title: string
      kind?: Note['kind']
      content?: string
      tags?: string[]
      topicId?: string | null
      pinned?: boolean
    }) {
      return request<Note>('/api/notes', { method: 'POST', body: JSON.stringify(body) })
    },
    update(id: string, body: Partial<Omit<Note, 'id' | 'createdAt'>>) {
      return request<Note>(`/api/notes/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
    },
    remove(id: string) {
      return request<void>(`/api/notes/${id}`, { method: 'DELETE' })
    },
  },

  cards: {
    list(params: { due?: string; date?: string; deck?: string } = {}) {
      return request<Card[]>(`/api/cards${qs(params)}`)
    },
    create(body: { front: string; back: string; deck?: string; dueDate?: string }) {
      return request<Card>('/api/cards', { method: 'POST', body: JSON.stringify(body) })
    },
    update(id: string, body: Partial<Pick<Card, 'front' | 'back' | 'deck' | 'dueDate'>>) {
      return request<Card>(`/api/cards/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
    },
    remove(id: string) {
      return request<void>(`/api/cards/${id}`, { method: 'DELETE' })
    },
    review(id: string, rating: ReviewRating, date = todayStr()) {
      return request<{ card: Card; dueInDays: number }>(`/api/cards/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ rating, date }),
      })
    },
  },

  stats: {
    summary(date = todayStr()) {
      return request<StatsSummary>(`/api/stats/summary${qs({ date })}`)
    },
    activity(from: string, to: string) {
      return request<DayActivity[]>(`/api/stats/activity${qs({ from, to })}`)
    },
  },

  templates: {
    list() {
      return request<TemplateInfo[]>('/api/templates')
    },
    import(id: string) {
      return request<{ added: number; skipped: number; template: string }>(`/api/templates/${id}/import`, {
        method: 'POST',
        body: '{}',
      })
    },
  },

  words: {
    random(level: 'all' | 'cet4' | 'cet6', freq: 'all' | 'high' | 'mid' | 'low', exclude?: string) {
      return request<{
        word: string
        meaning: string
        level: string
        freq: number
        freqLabel: string
      }>(`/api/words/random${qs({ level, freq, exclude })}`)
    },
    list(
      params: {
        q?: string
        level?: string
        freq?: string
        page?: number
        size?: number
        order?: string
        seed?: number
      } = {},
    ) {
      return request<WordPage>(`/api/words${qs(params)}`)
    },
    stats() {
      return request<{ total: number; cet4: number; cet6: number; both: number; byFreq: number[] }>(
        '/api/words/stats',
      )
    },
  },

  resources: {
    list() {
      return request<Resource[]>('/api/resources')
    },
    create(body: { title: string; url: string; category?: string; note?: string }) {
      return request<Resource>('/api/resources', { method: 'POST', body: JSON.stringify(body) })
    },
    update(id: string, body: Partial<Pick<Resource, 'title' | 'url' | 'category' | 'note'>>) {
      return request<Resource>(`/api/resources/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
    },
    remove(id: string) {
      return request<void>(`/api/resources/${id}`, { method: 'DELETE' })
    },
  },

  exportAll() {
    return request<unknown>('/api/export')
  },
  importAll(bundle: unknown) {
    return request<{ imported: Record<string, number> }>('/api/import', {
      method: 'POST',
      body: JSON.stringify({ confirm: true, bundle }),
    })
  },
}
