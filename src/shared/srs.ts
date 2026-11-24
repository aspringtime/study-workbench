/** 简化的 SM-2 间隔重复算法（纯函数，便于测试） */

import { addDays } from './dates'

export type Rating = 'again' | 'hard' | 'good' | 'easy'

export interface SrsState {
  ease: number
  intervalDays: number
}

export interface SrsResult extends SrsState {
  /** 0 表示今天之内要再见一次 */
  dueInDays: number
}

const MIN_EASE = 1.3
const MAX_EASE = 3.0
const MAX_INTERVAL = 365

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function schedule(state: SrsState, rating: Rating): SrsResult {
  const ease = clamp(state.ease, MIN_EASE, MAX_EASE)
  const interval = Math.max(0, state.intervalDays)

  switch (rating) {
    case 'again':
      return { ease: clamp(ease - 0.2, MIN_EASE, MAX_EASE), intervalDays: 0, dueInDays: 0 }
    case 'hard': {
      const next = interval <= 0 ? 1 : Math.max(1, Math.round(interval * 1.2))
      return {
        ease: clamp(ease - 0.15, MIN_EASE, MAX_EASE),
        intervalDays: Math.min(next, MAX_INTERVAL),
        dueInDays: Math.min(next, MAX_INTERVAL),
      }
    }
    case 'good': {
      const next = interval <= 0 ? 1 : Math.round(interval * ease)
      return {
        ease,
        intervalDays: Math.min(next, MAX_INTERVAL),
        dueInDays: Math.min(next, MAX_INTERVAL),
      }
    }
    case 'easy': {
      const next = interval <= 0 ? 2 : Math.round(interval * ease * 1.3)
      return {
        ease: clamp(ease + 0.15, MIN_EASE, MAX_EASE),
        intervalDays: Math.min(next, MAX_INTERVAL),
        dueInDays: Math.min(next, MAX_INTERVAL),
      }
    }
  }
}

export function dueDateFor(today: string, dueInDays: number): string {
  return addDays(today, dueInDays)
}

/** 给新卡片用的初始状态：当天就要学一次 */
export function initialCardState(): SrsState & { dueInDays: number } {
  return { ease: 2.5, intervalDays: 0, dueInDays: 0 }
}
