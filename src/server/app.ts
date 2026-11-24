import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { ZodError } from 'zod'
import { PROJECT_ROOT, seedTopicsIfEmpty } from './db'
import { AppError } from './errors'
import { taskRoutes } from './routes/tasks'
import { focusRoutes } from './routes/focus'
import { topicRoutes } from './routes/topics'
import { noteRoutes } from './routes/notes'
import { cardRoutes } from './routes/cards'
import { statsRoutes } from './routes/stats'
import { systemRoutes } from './routes/system'

export interface StartServerOptions {
  port?: number
  host?: string
  /** 前端构建产物目录，默认 <项目根>/dist/web */
  webDist?: string
  /** 传 false 关掉请求日志，桌面端用 */
  logger?: boolean
  /** 打到哪个端口、静态文件从哪来，打印出来用 */
  quiet?: boolean
}

export interface RunningServer {
  app: FastifyInstance
  port: number
  host: string
  webDist: string
}

export async function startServer(opts: StartServerOptions = {}): Promise<RunningServer> {
  const port = opts.port ?? Number(process.env.PORT ?? 8787)
  const host = opts.host ?? process.env.HOST ?? '127.0.0.1'
  const webDist = opts.webDist ?? process.env.WEB_DIST ?? join(PROJECT_ROOT, 'dist/web')

  const loggerOption =
    opts.logger === false
      ? false
      : {
          level: process.env.LOG_LEVEL ?? 'info',
          transport:
            process.env.NODE_ENV === 'production'
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
                },
        }

  const app = Fastify({ logger: loggerOption })

  await app.register(cors, { origin: true })

  app.get('/api/health', async () => ({
    ok: true,
    time: new Date().toISOString(),
    // 排查线上问题用：容器里认的时区，以及这次部署的 commit
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? process.env.GIT_COMMIT?.slice(0, 7) ?? null,
  }))

  await app.register(taskRoutes)
  await app.register(focusRoutes)
  await app.register(topicRoutes)
  await app.register(noteRoutes)
  await app.register(cardRoutes)
  await app.register(statsRoutes)
  await app.register(systemRoutes)

  const hasBuild = existsSync(join(webDist, 'index.html'))

  if (hasBuild) {
    await app.register(fastifyStatic, { root: webDist, prefix: '/' })
  }

  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url?.startsWith('/api')) {
      reply.code(404).send({ error: 'not_found', message: '接口不存在' })
      return
    }
    if (hasBuild) {
      reply.sendFile('index.html')
      return
    }
    reply
      .code(503)
      .type('text/html')
      .send(
        '<h1>前端还没构建</h1><p>先跑 <code>pnpm build</code>，或者开发模式用 <code>pnpm dev</code> 访问 Vite 的地址。</p>',
      )
  })

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      reply.code(400).send({
        error: 'validation_error',
        message: err.issues[0]?.message ?? '参数不合法',
        issues: err.issues,
      })
      return
    }
    if (err instanceof AppError) {
      reply.code(err.statusCode).send({ error: err.code, message: err.message })
      return
    }
    const e = err as { statusCode?: number; message?: string }
    if (e.statusCode === 400) {
      reply.code(400).send({ error: 'bad_request', message: e.message ?? '请求不合法' })
      return
    }
    req.log.error(err)
    reply.code(500).send({ error: 'internal_error', message: '服务器出错了' })
  })

  seedTopicsIfEmpty()

  await app.listen({ port, host })

  if (!opts.quiet && loggerOption !== false) {
    app.log.info(`学习工作台已启动 → http://${host}:${port}`)
    if (!hasBuild) {
      app.log.info(`前端还没构建：先跑 pnpm build，静态文件会从 ${webDist} 提供`)
    }
  }

  return { app, port, host, webDist }
}
