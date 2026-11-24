import { startServer } from './app'

startServer().catch((err) => {
  console.error('启动失败：', err)
  process.exit(1)
})
