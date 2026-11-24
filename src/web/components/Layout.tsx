import { NavLink, Outlet } from 'react-router-dom'
import { useDueCards, useToday } from '../lib/hooks'
import { useTimer } from '../lib/timer'
import { cn, useTheme } from '../lib/ui'
import { formatClock } from '@shared/dates'
import {
  IconBook,
  IconChart,
  IconCheckSquare,
  IconFileText,
  IconLayers,
  IconMap,
  IconMoon,
  IconSun,
} from './icons'

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
  const due = dueCards?.length ?? 0
  const todayTodo = today?.tasks.filter((t) => !t.done).length ?? 0

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
    </div>
  )
}
