const { app, BrowserWindow, shell, dialog, Menu } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const net = require('node:net')
const http = require('node:http')

/* 桌面版没控制台，出问题时靠这个文件看走到哪一步 */
const logFile = path.join(process.env.TEMP || process.cwd(), 'study-workbench-main.log')
function log(...args) {
  try {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${args.join(' ')}\n`)
  } catch {
    /* ignore */
  }
}

log('main.js loaded, packaged=' + app.isPackaged, 'electron=' + process.versions.electron, 'node=' + process.versions.node)

const isDev = !app.isPackaged
let mainWindow = null
let running = null

/* ---------------- 启动内嵌服务 ---------------- */

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.unref()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}

function pingHealth(port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: '127.0.0.1', port, path: '/api/health', timeout: timeoutMs },
      (res) => {
        res.resume()
        resolve(res.statusCode === 200)
      },
    )
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })
}

async function boot() {
  const userData = app.getPath('userData')
  const dataDir = path.join(userData, 'data')
  const webDist = isDev
    ? path.join(__dirname, '..', 'dist', 'web')
    : path.join(process.resourcesPath, 'web')
  const serverEntry = isDev
    ? path.join(__dirname, 'build', 'server.cjs')
    : path.join(process.resourcesPath, 'server', 'server.cjs')

  // db.ts 在 import 时就按 DATA_DIR 打开数据库，必须先生效
  process.env.DATA_DIR = dataDir
  process.env.NODE_ENV = 'production'

  const port = process.env.WB_PORT ? Number(process.env.WB_PORT) : await getFreePort()
  log('dataDir=' + dataDir, 'webDist=' + webDist, 'serverEntry=' + serverEntry, 'port=' + port)

  const { startServer } = require(serverEntry)
  log('server bundle required')
  running = await startServer({
    port,
    host: '127.0.0.1',
    webDist,
    logger: false,
    quiet: true,
  })
  log('server listening on ' + running.port)

  // 等接口真的能应答再开窗，避免白屏
  for (let i = 0; i < 80; i++) {
    if (await pingHealth(port)) break
    await new Promise((r) => setTimeout(r, 200))
  }

  createWindow(port)
  log('window created, url=http://127.0.0.1:' + port + '/')
}

/* ---------------- 窗口 ---------------- */

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 940,
    minHeight: 620,
    title: '学习工作台',
    backgroundColor: '#0a0c11',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.loadURL(`http://127.0.0.1:${port}/`)

  // 站内链接自己开，外链丢给系统浏览器
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`http://127.0.0.1:${port}`)) return { action: 'allow' }
    if (url.startsWith('http')) shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://127.0.0.1:${port}`)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/* ---------------- 生命周期 ---------------- */

log('requesting single instance lock')
if (!app.requestSingleInstanceLock()) {
  log('lock denied, quitting')
  app.quit()
} else {
  log('lock acquired')
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    log('app ready')
    Menu.setApplicationMenu(null)
    try {
      await boot()
      log('boot finished')
    } catch (err) {
      log('boot failed: ' + (err && err.stack ? err.stack : err))
      dialog.showErrorBox('学习工作台启动失败', String(err && err.stack ? err.stack : err))
      app.quit()
    }
  })

  app.on('window-all-closed', () => {
    app.quit()
  })

  app.on('before-quit', () => {
    if (running?.app) {
      try {
        running.app.server.close()
      } catch {
        /* 进程退出时 socket 会一起关掉 */
      }
    }
  })
}
