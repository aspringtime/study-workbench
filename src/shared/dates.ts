/** 前后端共用的日期工具，全部基于本地时区的 YYYY-MM-DD 字符串 */

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayStr(): string {
  return toDateStr(new Date())
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

export function diffDays(a: string, b: string): number {
  const ms = parseDate(a).getTime() - parseDate(b).getTime()
  return Math.round(ms / 86_400_000)
}

/** 周一 = 0 ... 周日 = 6 */
export function weekdayMon(s: string): number {
  return (parseDate(s).getDay() + 6) % 7
}

export function isWeekend(s: string): boolean {
  return weekdayMon(s) >= 5
}

export function humanDate(s: string): string {
  const d = parseDate(s)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function weekdayName(s: string): string {
  return ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][weekdayMon(s)]
}

export function monthMatrix(year: number, month: number): string[][] {
  // 返回按周分组的日期字符串，覆盖整月（前后补空）
  const first = new Date(year, month - 1, 1)
  const startOffset = (first.getDay() + 6) % 7
  const start = new Date(year, month - 1, 1 - startOffset)
  const weeks: string[][] = []
  for (let w = 0; w < 6; w++) {
    const row: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + w * 7 + i)
      row.push(toDateStr(d))
    }
    weeks.push(row)
  }
  return weeks
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}秒`
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h === 0) return `${m}分钟`
  return m === 0 ? `${h}小时` : `${h}小时${m}分`
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const m = Math.floor(s / 60)
  return `${pad(m)}:${pad(s % 60)}`
}
