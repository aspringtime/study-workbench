import type { Task } from '@shared/types'
import { formatDuration } from '@shared/dates'
import { cn } from '../lib/ui'
import { IconCheck, IconPlay, IconTrash } from './icons'

export function TaskRow({
  task,
  attached,
  onToggle,
  onAttach,
  onDelete,
}: {
  task: Task
  attached?: boolean
  onToggle: () => void
  onAttach?: () => void
  onDelete: () => void
}) {
  return (
    <div className={cn('task-row', task.done && 'done')}>
      <button
        className={cn('task-check', task.done && 'done')}
        onClick={onToggle}
        aria-label={task.done ? '标记未完成' : '标记完成'}
      >
        {task.done && <IconCheck size={11} />}
      </button>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          <span className={cn('priority-dot', `priority-${task.priority}`)} />
          {task.priority === 'high' ? '重要' : task.priority === 'low' ? '次要' : '常规'}
          {task.estimatePomodoros > 0 && <span>· 预估 {task.estimatePomodoros} 个番茄</span>}
          {task.spentSeconds > 0 && <span>· 已专注 {formatDuration(task.spentSeconds)}</span>}
          {attached && <span style={{ color: 'var(--accent)' }}>· 正在计时</span>}
        </div>
      </div>

      <div className="task-actions">
        {onAttach && !task.done && (
          <button className="btn ghost sm" onClick={onAttach} title="绑定到番茄钟">
            <IconPlay size={11} />
          </button>
        )}
        <button className="btn ghost sm" onClick={onDelete} title="删除">
          <IconTrash size={13} />
        </button>
      </div>
    </div>
  )
}
