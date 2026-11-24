import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const outfile = join(here, 'build', 'server.cjs')

mkdirSync(dirname(outfile), { recursive: true })

const result = await build({
  entryPoints: [join(here, '..', 'src', 'server', 'app.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  outfile,
  minify: true,
  sourcemap: false,
  logLevel: 'info',
  // pino-pretty 只在开发模式的 logger transport 里按字符串加载，桌面版不走这条路
  external: ['pino-pretty'],
  banner: { js: '// study-workbench desktop server bundle' },
})

if (result.errors.length) {
  process.exit(1)
}
console.log(`bundled -> ${outfile}`)
