import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useDueCards, useToday } from '../lib/hooks'
import { useTimer } from '../lib/timer'
import { cn, useTheme } from '../lib/ui'
import { formatClock } from '@shared/dates'
import { Modal } from './Modal'
import {
  IconBook,
  IconChart,
  IconCheckSquare,
  IconFileText,
  IconGlobe,
  IconLayers,
  IconMap,
  IconMoon,
  IconSun,
} from './icons'

const TIMEZONE_OPTIONS = [
  { id: 'auto', label: '跟随设备' },
  { id: 'Asia/Shanghai', label: '北京时间 UTC+8' },
  { id: 'Asia/Tokyo', label: '东京 UTC+9' },
  { id: 'Asia/Singapore', label: '新加坡 UTC+8' },
  { id: 'Europe/London', label: '伦敦 UTC+0' },
  { id: 'Europe/Berlin', label: '柏林 UTC+1' },
  { id: 'America/New_York', label: '纽约 UTC-5' },
  { id: 'America/Los_Angeles', label: '洛杉矶 UTC-8' },
  { id: 'UTC', label: 'UTC' },
]

function tzLabelOf(id: string): string {
  if (id === 'auto') return '跟随设备时区'
  const found = TIMEZONE_OPTIONS.find((o) => o.id === id)
  return found ? found.label : id
}

function MiniTimer() {
  const { state, pause, start } = useTimer()
  const active = state.running || state.left < state.total - 0.5
  if (!active) {
    return (
      <div className="mini-timer" style={{ opacity: 0.75 }}>
        <span className="dot" style={{ background: 'var(--muted)', boxShadow: 'none', animation: 'none' }} />
        <div style={{ minWidth: 0 }}>
          <div className="label">番茄钟待机</div>
          <div className="time" style={{ color: 'var(--muted)' }}>
            25:00
          </div>
        </div>
      </div>
    )
  }
  return (
    <button
      className="mini-timer"
      onClick={() => (state.running ? pause() : start())}
      title={state.running ? '暂停' : '继续'}
      style={{ textAlign: 'left', cursor: 'pointer' }}
    >
      <span className="dot" style={state.running ? undefined : { background: 'var(--warn)' }} />
      <div style={{ minWidth: 0 }}>
        <div className="label">{state.running ? '专注中' : '已暂停'}</div>
        <div className="time">{formatClock(state.left)}</div>
      </div>
    </button>
  )
}

export function Layout() {
  const { data: today } = useToday()
  const { data: dueCards } = useDueCards()
  const { theme, toggle } = useTheme()
  const [tzOpen, setTzOpen] = useState(false)
  const [tz, setTz] = useState(() => localStorage.getItem('wb-timezone') ?? 'auto')
  const due = dueCards?.length ?? 0
  const todayTodo = today?.tasks.filter((t) => !t.done).length ?? 0

  function applyTimeZone(id: string) {
    localStorage.setItem('wb-timezone', id)
    setTz(id)
    setTzOpen(false)
    // 「今天」变了，所有按日期拉的缓存都得重来
    window.location.reload()
  }

  const items = [
    { to: '/', label: '今日', icon: IconSun, badge: todayTodo || undefined },
    { to: '/tasks', label: '任务', icon: IconCheckSquare },
    { to: '/topics', label: '知识地图', icon: IconMap },
    { to: '/notes', label: '笔记', icon: IconFileText },
    { to: '/resources', label: '资料', icon: IconBook },
    { to: '/review', label: '复习', icon: IconLayers, badge: due || undefined, hot: due > 0 },
    { to: '/stats', label: '统计', icon: IconChart },
  ]

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">学</div>
          <div>
            <div className="brand-name">学习工作台</div>
            <div className="brand-sub">workbench</div>
          </div>
        </div>

        <nav className="nav">
          {items.map(({ to, label, icon: Icon, badge, hot }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => cn('nav-item', isActive && 'active')}
            >
              <Icon className="nav-icon" />
              <span className="nav-text">{label}</span>
              {badge ? <span className={cn('nav-badge', hot && 'hot')}>{badge}</span> : null}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <MiniTimer />
          <button className="theme-toggle" onClick={() => setTzOpen(true)} type="button">
            <IconGlobe size={15} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tzLabelOf(tz)}
            </span>
          </button>
          <button className="theme-toggle" onClick={toggle} type="button">
            {theme === 'dark' ? <IconSun size={15} /> : <IconMoon size={15} />}
            {theme === 'dark' ? '切换浅色' : '切换深色'}
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="main-inner">
          <Outlet />
        </div>
      </main>

      <Modal
        open={tzOpen}
        title="按哪个时区算「今天」"
        onClose={() => setTzOpen(false)}
      >
        <div className="tiny muted" style={{ marginBottom: 14, lineHeight: 1.6 }}>
          任务的日期、热力图、连续天数都跟着这个走。默认跟随设备，出国或者跨时区用时可以手动指定。
        </div>
        <div className="col" style={{ gap: 6 }}>
          {TIMEZONE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              className="btn"
              style={{
                justifyContent: 'space-between',
                background: tz === opt.id ? 'var(--accent-dim)' : 'transparent',
                borderColor: tz === opt.id ? 'transparent' : 'var(--border)',
                color: tz === opt.id ? 'var(--accent)' : 'var(--text-dim)',
              }}
              onClick={() => applyTimeZone(opt.id)}
            >
              <span>{opt.label}</span>
              {tz === opt.id && <span className="tiny">当前</span>}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
