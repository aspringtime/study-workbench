import useSWR, { mutate } from 'swr'
import { api } from './api'
import { addDays, todayStr } from '@shared/dates'

export const useToday = () =>
  useSWR(['today', todayStr()], () => api.today(todayStr()), {
    revalidateOnFocus: true,
    keepPreviousData: false,
  })

export const useTopics = () => useSWR('topics', () => api.topics.list())

export const useNotes = (kind: string, q: string) =>
  useSWR(['notes', kind, q], () => api.notes.list({ kind, q }), { keepPreviousData: true })

export const useDueCards = () => useSWR('cards-due', () => api.cards.list({ due: '1' }))

export const useAllCards = () => useSWR('cards-all', () => api.cards.list())

export const useActivity = (days = 371) =>
  useSWR(['activity', days], () => {
    const to = todayStr()
    return api.stats.activity(addDays(to, -(days - 1)), to)
  })

export const useSummary = () => useSWR(['summary', todayStr()], () => api.stats.summary(todayStr()))

/** 数据有变动后，把受影响的缓存刷一遍（key 可以是字符串或数组） */
export async function refresh(...keys: (string | unknown[])[]) {
  await Promise.all(keys.map((k) => mutate(k)))
}

/** 番茄钟结束这种"到处都要变"的场景，直接全量重新验证 */
export async function refreshAll() {
  await mutate(() => true)
}
