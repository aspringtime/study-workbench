/**
 * 生成四六级完整词库，并按 COCA 词频划分高频 / 中频 / 低频。
 *
 * 用法：
 *   node scripts/build-words.mjs <四级.txt> <六级.txt> <COCA_20000.txt>
 *
 * 产出：src/shared/words/words.json
 *   每条 [单词, 释义, 级别, 频档]
 *   级别：CET4 / CET6 / CET4/6
 *   频档：0 = 高频（COCA 前 2000），1 = 中频（2000-5000），2 = 低频或不收录
 *
 * 数据来源：
 *   词表 https://github.com/KyleBing/english-vocabulary （BSD 3-Clause）
 *   词频 https://github.com/mahavivo/english-wordlists 的 COCA_20000（按行序即排名）
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'src', 'shared', 'words')
mkdirSync(outDir, { recursive: true })

const [, , cet4Path, cet6Path, cocaPath] = process.argv
if (!cet4Path || !cet6Path || !cocaPath) {
  console.error('用法: node scripts/build-words.mjs <四级.txt> <六级.txt> <COCA_20000.txt>')
  process.exit(1)
}

function parseWordList(file) {
  const map = new Map()
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const tab = line.indexOf('\t')
    if (tab < 0) continue
    const word = line.slice(0, tab).trim()
    const meaning = line.slice(tab + 1).trim()
    if (!word || !meaning) continue
    const key = word.toLowerCase()
    if (!map.has(key)) map.set(key, { word, meaning })
  }
  return map
}

function parseCoca(file) {
  const rank = new Map()
  let n = 0
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const w = raw.trim().toLowerCase()
    if (!w) continue
    n += 1
    if (!rank.has(w)) rank.set(w, n)
  }
  return rank
}

const cet4 = parseWordList(cet4Path)
const cet6 = parseWordList(cet6Path)
const coca = parseCoca(cocaPath)

const merged = new Map()
for (const [k, v] of cet4) merged.set(k, { ...v, levels: new Set(['CET4']) })
for (const [k, v] of cet6) {
  const hit = merged.get(k)
  if (hit) hit.levels.add('CET6')
  else merged.set(k, { ...v, levels: new Set(['CET6']) })
}

const freqOf = (rank) => {
  if (!rank) return 2
  if (rank <= 2000) return 0
  if (rank <= 5000) return 1
  return 2
}

const rows = []
for (const [k, v] of merged) {
  const rank = coca.get(k) ?? 0
  const level = v.levels.size === 2 ? 'CET4/6' : [...v.levels][0]
  rows.push([v.word, v.meaning, level, freqOf(rank)])
}

// 高频在前，同档按字母序
rows.sort((a, b) => {
  if (a[3] !== b[3]) return a[3] - b[3]
  return a[0].localeCompare(b[0])
})

const target = join(outDir, 'words.json')
writeFileSync(target, JSON.stringify(rows), 'utf8')

const stat = { total: rows.length, high: 0, mid: 0, low: 0, cet4Only: 0, cet6Only: 0, both: 0 }
for (const row of rows) {
  if (row[3] === 0) stat.high += 1
  else if (row[3] === 1) stat.mid += 1
  else stat.low += 1
  if (row[2] === 'CET4') stat.cet4Only += 1
  else if (row[2] === 'CET6') stat.cet6Only += 1
  else stat.both += 1
}

console.log('写入', target)
console.log(JSON.stringify(stat, null, 2))
