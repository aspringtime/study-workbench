import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { POMODORO } from '@shared/constants'
import { formatClock, todayStr } from '@shared/dates'
import { api } from './api'
import { toast } from './ui'
import { refreshAll } from './hooks'

export type TimerMode = 'focus' | 'short' | 'long'

export interface TimerState {
  mode: TimerMode
  running: boolean
  /** 运行中：本段结束的时间戳 */
  endAt: number | null
  /** 剩余秒数（运行中由 tick 刷新） */
  left: number
  /** 本段总秒数 */
  total: number
  /** 已完成的番茄数 */
  round: number
  taskId: string | null
  taskTitle: string | null
}

export const MODE_SECONDS: Record<TimerMode, number> = {
  focus: POMODORO.focus * 60,
  short: POMODORO.shortBreak * 60,
  long: POMODORO.longBreak * 60,
}

export const MODE_LABEL: Record<TimerMode, string> = {
  focus: '专注',
  short: '短休息',
  long: '长休息',
}

interface TimerApi {
  state: TimerState
  start: () => void
  pause: () => void
  reset: () => void
  skip: () => void
  setMode: (mode: TimerMode) => void
  attachTask: (id: string | null, title: string | null) => void
  /** 测试或者手动补录时用：直接记一段专注 */
  logManual: (seconds: number) => Promise<void>
}

const STORAGE_KEY = 'wb-timer-v1'

function initial(): TimerState {
  return {
    mode: 'focus',
    running: false,
    endAt: null,
    left: MODE_SECONDS.focus,
    total: MODE_SECONDS.focus,
    round: 0,
    taskId: null,
    taskTitle: null,
  }
}

function load(): TimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initial()
    const s = JSON.parse(raw) as TimerState
    if (typeof s.total !== 'number' || !s.mode) return initial()
    if (s.running && s.endAt) {
      const left = Math.max(0, (s.endAt - Date.now()) / 1000)
      if (left <= 0.5) {
        // 关着页面的时候已经结束了，按休息处理
        return { ...s, running: false, endAt: null, left: s.total }
      }
      return { ...s, left }
    }
    return { ...s, running: false, endAt: null }
  } catch {
    return initial()
  }
}

/* ---------- 提示音 ---------- */

let audioCtx: AudioContext | null = null

function chime(times = 2) {
  try {
    audioCtx ??= new AudioContext()
    const ctx = audioCtx
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = i === 0 ? 880 : 660
      const start = ctx.currentTime + i * 0.22
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.55)
    }
  } catch {
    /* 静音环境里就算了 */
  }
}

function notify(title: string, body: string) {
  chime()
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(title, { body })
    } catch {
      /* ignore */
    }
  }
}

const TimerCtx = createContext<TimerApi | null>(null)

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState>(load)
  const stateRef = useRef(state)
  stateRef.current = state

  const persist = useCallback((s: TimerState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    } catch {
      /* ignore */
    }
  }, [])

  const update = useCallback(
    (patch: Partial<TimerState> | ((s: TimerState) => TimerState)) => {
      setState((prev) => {
        const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }
        persist(next)
        return next
      })
    },
    [persist],
  )

  const complete = useCallback(async () => {
    const s = stateRef.current
    const finished = s.mode
    if (finished === 'focus') {
      const endedAt = new Date()
      const startedAt = new Date(endedAt.getTime() - Math.round(s.total) * 1000)
      try {
        await api.focus.create({
          taskId: s.taskId,
          date: todayStr(),
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          seconds: Math.round(s.total),
          kind: 'focus',
          label: s.taskTitle ?? '',
        })
        void refreshAll()
      } catch {
        toast('这段专注没记上，检查一下服务')
      }
      const round = s.round + 1
      const nextMode: TimerMode = round % POMODORO.longBreakEvery === 0 ? 'long' : 'short'
      update({
        mode: nextMode,
        running: false,
        endAt: null,
        left: MODE_SECONDS[nextMode],
        total: MODE_SECONDS[nextMode],
        round,
      })
      notify('番茄完成 🍅', `第 ${round} 个，去休息一下`)
    } else {
      update({
        mode: 'focus',
        running: false,
        endAt: null,
        left: MODE_SECONDS.focus,
        total: MODE_SECONDS.focus,
      })
      notify('休息结束', '回来接着干活')
    }
  }, [update])

  useEffect(() => {
    const id = setInterval(() => {
      const s = stateRef.current
      if (!s.running || !s.endAt) return
      const left = (s.endAt - Date.now()) / 1000
      if (left <= 0) {
        void complete()
      } else {
        setState((prev) => (prev.running ? { ...prev, left } : prev))
      }
    }, 250)
    return () => clearInterval(id)
  }, [complete])

  useEffect(() => {
    if (state.running) {
      document.title = `${formatClock(state.left)} · ${MODE_LABEL[state.mode]} — 学习工作台`
    } else {
      document.title = '学习工作台'
    }
  }, [state.running, state.left, state.mode])

  const start = useCallback(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
    update((s) => {
      const left = s.left > 0.5 ? s.left : s.total
      return { ...s, running: true, endAt: Date.now() + left * 1000, left }
    })
  }, [update])

  const pause = useCallback(() => {
    update((s) => {
      const left = s.endAt ? Math.max(0, (s.endAt - Date.now()) / 1000) : s.left
      return { ...s, running: false, endAt: null, left }
    })
  }, [update])

  const reset = useCallback(() => {
    update((s) => ({
      ...s,
      running: false,
      endAt: null,
      left: MODE_SECONDS[s.mode],
      total: MODE_SECONDS[s.mode],
    }))
  }, [update])

  const skip = useCallback(() => {
    update((s) => {
      const nextMode: TimerMode = s.mode === 'focus' ? 'short' : 'focus'
      return {
        ...s,
        mode: nextMode,
        running: false,
        endAt: null,
        left: MODE_SECONDS[nextMode],
        total: MODE_SECONDS[nextMode],
      }
    })
  }, [update])

  const setMode = useCallback(
    (mode: TimerMode) => {
      update({
        mode,
        running: false,
        endAt: null,
        left: MODE_SECONDS[mode],
        total: MODE_SECONDS[mode],
      })
    },
    [update],
  )

  const attachTask = useCallback(
    (id: string | null, title: string | null) => {
      update({ taskId: id, taskTitle: title })
    },
    [update],
  )

  const logManual = useCallback(async (seconds: number) => {
    const s = stateRef.current
    const endedAt = new Date()
    await api.focus.create({
      taskId: s.taskId,
      date: todayStr(),
      startedAt: new Date(endedAt.getTime() - seconds * 1000).toISOString(),
      endedAt: endedAt.toISOString(),
      seconds,
      kind: 'focus',
      label: s.taskTitle ?? '补录',
    })
    void refreshAll()
  }, [])

  const api2 = useMemo<TimerApi>(
    () => ({ state, start, pause, reset, skip, setMode, attachTask, logManual }),
    [state, start, pause, reset, skip, setMode, attachTask, logManual],
  )

  return <TimerCtx.Provider value={api2}>{children}</TimerCtx.Provider>
}

export function useTimer(): TimerApi {
  const ctx = useContext(TimerCtx)
  if (!ctx) throw new Error('useTimer 必须在 TimerProvider 内使用')
  return ctx
}
