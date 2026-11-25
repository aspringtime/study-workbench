import type { FastifyPluginAsync } from 'fastify'
import words from '../../shared/words/words.json'

/** [单词, 释义, 级别, 频档]；频档 0 高频 / 1 中频 / 2 低频 */
type Row = [string, string, string, number]

const ALL = words as unknown as Row[]
const FREQ_LABEL = ['高频', '中频', '低频']

/**
 * 定种子洗牌。同一个 seed 每次结果都一样，
 * 这样「乱序」翻页时不会重复也不会漏。
 */
function seededShuffle<T>(input: T[], seed: number): T[] {
  const out = input.slice()
  let s = (seed || 1) >>> 0
  const rnd = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

export const wordRoutes: FastifyPluginAsync = async (app) => {
  /** 词库浏览：分页 + 级别 / 频档筛选 + 关键词搜索 + 乱序 */
  app.get('/api/words', async (req) => {
    const {
      q = '',
      level = 'all',
      freq = 'all',
      page = '1',
      size = '60',
      order = 'default',
      seed = '1',
    } = req.query as Record<string, string>
    const pageNum = Math.max(1, Number(page) || 1)
    const pageSize = Math.min(300, Math.max(10, Number(size) || 60))

    let pool = ALL
    if (level === 'cet4') pool = pool.filter((r) => r[2].includes('CET4'))
    else if (level === 'cet6') pool = pool.filter((r) => r[2].includes('CET6'))

    if (freq !== 'all') {
      const want = freq === 'high' ? 0 : freq === 'mid' ? 1 : 2
      pool = pool.filter((r) => r[3] === want)
    }

    const keyword = q.trim()
    if (keyword) {
      const lower = keyword.toLowerCase()
      pool = pool.filter((r) => r[0].toLowerCase().includes(lower) || r[1].includes(keyword))
    }

    if (order === 'random') {
      pool = seededShuffle(pool, Number(seed) || 1)
    }

    const total = pool.length
    const start = (pageNum - 1) * pageSize
    const items = pool.slice(start, start + pageSize).map((r) => ({
      word: r[0],
      meaning: r[1],
      level: r[2],
      freq: r[3],
      freqLabel: FREQ_LABEL[r[3]] ?? '',
    }))

    return { total, page: pageNum, size: pageSize, items }
  })

  app.get('/api/words/random', async (req) => {
    const { level = 'all', freq = 'all', exclude } = req.query as Record<string, string>

    const pool = ALL.filter((r) => {
      if (freq === 'high' && r[3] !== 0) return false
      if (freq === 'mid' && r[3] !== 1) return false
      if (freq === 'low' && r[3] !== 2) return false
      if (level === 'cet4') return r[2].includes('CET4')
      if (level === 'cet6') return r[2].includes('CET6')
      return true
    })

    if (pool.length === 0) {
      return { word: '—', meaning: '这个筛选下没有词了', level: '', freq: 2, freqLabel: '' }
    }

    let entry = pool[Math.floor(Math.random() * pool.length)]
    // 尽量不连着出同一个
    if (exclude) {
      for (let i = 0; i < 8 && entry[0] === exclude; i++) {
        entry = pool[Math.floor(Math.random() * pool.length)]
      }
    }

    return {
      word: entry[0],
      meaning: entry[1],
      level: entry[2],
      freq: entry[3],
      freqLabel: FREQ_LABEL[entry[3]] ?? '',
    }
  })

  app.get('/api/words/stats', async () => {
    let cet4 = 0
    let cet6 = 0
    let both = 0
    const byFreq = [0, 0, 0]
    for (const r of ALL) {
      byFreq[r[3]] = (byFreq[r[3]] ?? 0) + 1
      if (r[2] === 'CET4/6') both += 1
      else if (r[2] === 'CET4') cet4 += 1
      else cet6 += 1
    }
    return { total: ALL.length, cet4, cet6, both, byFreq }
  })
}
