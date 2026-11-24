/**
 * 把 KyleBing/english-vocabulary 的四六级词表转成本项目用的 JSON。
 *
 * 用法：node scripts/build-words.mjs <cet4.txt> <cet6.txt>
 * 产出：src/shared/words/cet4.json / cet6.json
 *
 * 源数据：https://github.com/KyleBing/english-vocabulary （BSD 3-Clause）
 * 格式：每行 "word\t词性 + 中文释义"
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'src', 'shared', 'words')
mkdirSync(outDir, { recursive: true })

const [, , cet4Path, cet6Path] = process.argv
if (!cet4Path || !cet6Path) {
  console.error('用法: node scripts/build-words.mjs <cet4.txt> <cet6.txt>')
  process.exit(1)
}

function parse(file) {
  const seen = new Set()
  const out = []
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const tab = line.indexOf('\t')
    if (tab < 0) continue
    const word = line.slice(0, tab).trim()
    const meaning = line.slice(tab + 1).trim()
    if (!word || !meaning) continue
    const key = word.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push([word, meaning])
  }
  return out
}

for (const [name, file] of [
  ['cet4', cet4Path],
  ['cet6', cet6Path],
]) {
  const words = parse(file)
  const target = join(outDir, `${name}.json`)
  writeFileSync(target, JSON.stringify(words), 'utf8')
  console.log(`${name}: ${words.length} 词 -> ${target}`)
}
