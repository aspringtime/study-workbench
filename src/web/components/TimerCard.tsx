import { formatClock } from '@shared/dates'
import { MODE_LABEL, useTimer, type TimerMode } from '../lib/timer'
import { cn } from '../lib/ui'
import { IconPause, IconPlay, IconRotate, IconSkip } from './icons'

const MODES: TimerMode[] = ['focus', 'short', 'long']

export function TimerCard() {
  const { state, start, pause, reset, skip, setMode, attachTask } = useTimer()
  const R = 56
  const C = 2 * Math.PI * R
  const ratio = state.total > 0 ? Math.min(1, Math.max(0, state.left / state.total)) : 0
  const isBreak = state.mode !== 'focus'

  return (
    <div className="card timer-card">
      <div className={cn('timer-ring', isBreak && 'break')}>
        <svg width="132" height="132" viewBox="0 0 132 132">
          <circle cx="66" cy="66" r={R} className="ring-bg" strokeWidth="7" fill="none" />
          <circle
            cx="66"
            cy="66"
            r={R}
            className="ring-fg"
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - ratio)}
          />
        </svg>
        <div className="timer-center">
          <div className="timer-time">{formatClock(state.left)}</div>
          <div className="timer-mode">{MODE_LABEL[state.mode]}</div>
        </div>
      </div>

      <div className="timer-body">
        <div className="row" style={{ gap: 6, marginBottom: 12 }}>
          {MODES.map((m) => (
            <button
              key={m}
              className="btn sm"
              onClick={() => setMode(m)}
              style={
                state.mode === m
                  ? { background: 'var(--accent-dim)', borderColor: 'transparent', color: 'var(--accent)' }
                  : { background: 'transparent', borderColor: 'transparent', color: 'var(--muted)' }
              }
            >
              {MODE_LABEL[m]}
            </button>
          ))}
          <span className="spacer" />
          <span className="tiny muted mono">第 {state.round + (state.mode === 'focus' ? 1 : 0)} 个</span>
        </div>

        {state.taskTitle ? (
          <div className="row" style={{ gap: 8 }}>
            <div className="task-link" title={state.taskTitle}>
              <span className="dot" style={{ background: 'var(--accent)' }} />
              {state.taskTitle}
            </div>
            <button className="btn ghost sm" onClick={() => attachTask(null, null)}>
              解除
            </button>
          </div>
        ) : (
          <div className="tiny muted">没绑任务，在下面的任务列表里点 ▶ 绑定</div>
        )}

        <div className="timer-actions">
          {state.running ? (
            <button className="btn primary" onClick={pause}>
              <IconPause size={13} /> 暂停
            </button>
          ) : (
            <button className="btn primary" onClick={start}>
              <IconPlay size={13} /> 开始专注
            </button>
          )}
          <button className="btn" onClick={reset} title="重置本段">
            <IconRotate size={14} /> 重置
          </button>
          <button className="btn ghost" onClick={skip} title="跳过分段">
            <IconSkip size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
