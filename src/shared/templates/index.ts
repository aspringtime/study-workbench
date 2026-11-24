import csFoundation from './cs-foundation.json'
import csAlgorithms from './cs-algorithms.json'
import englishCet from './english-cet.json'

export interface TemplateTrack {
  name: string
  topics: string[]
}

export interface TopicTemplate {
  id: string
  name: string
  summary: string
  /** 列表里的排序，小的在前 */
  order: number
  tracks: TemplateTrack[]
}

/**
 * 知识地图模板库。
 * 加一个学科：往这个目录放一份 JSON，然后在下面 import 进来加进数组，
 * 代码逻辑一行都不用改。
 */
export const TEMPLATES: TopicTemplate[] = (
  [
    csFoundation as unknown as TopicTemplate,
    csAlgorithms as unknown as TopicTemplate,
    englishCet as unknown as TopicTemplate,
  ].filter((t) => t && t.id && t.tracks)
).sort((a, b) => (a.order ?? 100) - (b.order ?? 100))

export function findTemplate(id: string): TopicTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id)
}

/** 全新数据库第一次启动时默认铺的这一套 */
export const DEFAULT_TEMPLATE_ID = 'cs-algorithms'
