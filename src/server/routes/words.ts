import type { FastifyPluginAsync } from 'fastify'
import cet4 from '../../shared/words/cet4.json'
import cet6 from '../../shared/words/cet6.json'

type Entry = [string, string]

const POOLS: Record<string, Entry[]> = {
  cet4: cet4 as unknown as Entry[],
  cet6: cet6 as unknown as Entry[],
}

const LEVEL_LABEL: Record<string, string> = { cet4: 'CET-4', cet6: 'CET-6' }

export const wordRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/words/random', async (req) => {
    const { level = 'cet4', exclude } = req.query as { level?: string; exclude?: string }
    const key = level === 'cet6' ? 'cet6' : 'cet4'
    const pool = POOLS[key]

    let entry = pool[Math.floor(Math.random() * pool.length)]
    // 尽量不用同一个词
    if (exclude) {
      for (let i = 0; i < 8 && entry[0] === exclude; i++) {
        entry = pool[Math.floor(Math.random() * pool.length)]
      }
    }

    return {
      word: entry[0],
      meaning: entry[1],
      level: LEVEL_LABEL[key],
    }
  })

  app.get('/api/words/stats', async () => ({
    cet4: POOLS.cet4.length,
    cet6: POOLS.cet6.length,
  }))
}
