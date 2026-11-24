/** 共享类型定义：前后端共用 */

export type Priority = 'low' | 'normal' | 'high'
export type TopicStatus = 'todo' | 'learning' | 'done'
export type NoteKind = 'template' | 'pitfall' | 'idea'
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy'
export type SessionKind = 'focus' | 'break'

export interface Task {
  id: string
  title: string
  note: string
  /** 本地日期 YYYY-MM-DD；null 表示收件箱里待安排 */
  date: string | null
  priority: Priority
  done: boolean
  createdAt: string
  doneAt: string | null
  estimatePomodoros: number
  spentSeconds: number
}

export interface FocusSession {
  id: string
  taskId: string | null
  /** 会话所属的本地日期 */
  date: string
  startedAt: string
  endedAt: string
  seconds: number
  kind: SessionKind
  label: string
}

export interface Topic {
  id: string
  track: string
  name: string
  parentId: string | null
  status: TopicStatus
  sort: number
  note: string
  /** 已练题数 */
  practice: number
  updatedAt: string
}

export interface Note {
  id: string
  title: string
  kind: NoteKind
  content: string
  tags: string[]
  topicId: string | null
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface Card {
  id: string
  deck: string
  front: string
  back: string
  ease: number
  intervalDays: number
  reps: number
  lapses: number
  dueDate: string
  createdAt: string
  lastReviewedAt: string | null
}

export interface Review {
  id: string
  cardId: string
  rating: ReviewRating
  reviewedAt: string
  date: string
  prevInterval: number
  nextInterval: number
}

export interface DayActivity {
  date: string
  /** 专注秒数 */
  focusSeconds: number
  /** 完成任务数 */
  tasksDone: number
  /** 复习次数 */
  reviews: number
  /** 综合活跃度（用于热力图着色，0 表示空白） */
  score: number
}

export interface StatsSummary {
  today: {
    date: string
    focusSeconds: number
    tasksDone: number
    tasksTotal: number
    reviews: number
    pomodoros: number
  }
  week: {
    focusSeconds: number
    tasksDone: number
    reviews: number
  }
  total: {
    focusSeconds: number
    tasksDone: number
    reviews: number
    activeDays: number
  }
  streak: {
    current: number
    best: number
  }
}

export interface TodayPayload {
  date: string
  tasks: Task[]
  sessions: FocusSession[]
  dueCards: number
  totalCards: number
  summary: StatsSummary
}

export interface ApiError {
  error: string
  message: string
}

/* ---------- 知识地图模板 ---------- */

export interface TemplateTrackInfo {
  name: string
  /** 模板里该方向有多少个知识点 */
  total: number
  /** 数据库里该方向已有多少个 */
  existing: number
  /** 具体条目，给前端做预览 */
  topics: string[]
}

export interface TemplateInfo {
  id: string
  name: string
  summary: string
  order: number
  /** 模板总条目数 */
  total: number
  /** 已存在于数据库的条目数 */
  existing: number
  tracks: TemplateTrackInfo[]
}
