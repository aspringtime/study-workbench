import { useCallback, useEffect, useState } from 'react'

/* ---------------- toast ---------------- */

type Listener = (msg: string) => void
let listeners: Listener[] = []

export function toast(msg: string) {
  listeners.forEach((l) => l(msg))
}

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null)
  const [key, setKey] = useState(0)

  useEffect(() => {
    const fn: Listener = (m) => {
      setMsg(m)
      setKey((k) => k + 1)
    }
    listeners.push(fn)
    return () => {
      listeners = listeners.filter((l) => l !== fn)
    }
  }, [])

  useEffect(() => {
    if (!msg) return
    const id = setTimeout(() => setMsg(null), 2400)
    return () => clearTimeout(id)
  }, [msg, key])

  if (!msg) return null
  return (
    <div className="toast" role="status">
      {msg}
    </div>
  )
}

/* ---------------- 主题 ---------------- */

export type Theme = 'dark' | 'light'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
  )

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      if (next === 'light') document.documentElement.dataset.theme = 'light'
      else delete document.documentElement.dataset.theme
      localStorage.setItem('wb-theme', next)
      return next
    })
  }, [])

  return { theme, toggle }
}

/* ---------------- 小工具 ---------------- */

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

export function useDebounced<T>(value: T, delay = 260): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return v
}
