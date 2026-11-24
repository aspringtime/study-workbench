/** 知识地图里 track 的显示顺序；不在这里的按出现顺序排在后面 */
export const TOPIC_TRACKS = [
  '编程语言',
  '数据结构',
  '算法分析',
  '图论',
  '动态规划',
  '算法技巧',
  '听力',
  '阅读',
  '写作',
  '翻译',
  '词汇',
] as const

/** 番茄钟默认配置（分钟） */
export const POMODORO = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakEvery: 4,
} as const

/** 热力图着色的权重：专注秒数 / 完成任务 / 复习次数 */
export const HEATMAP_WEIGHTS = {
  focusPerHour: 1,
  perTask: 15,
  perReview: 1.5,
} as const
