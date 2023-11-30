import { app, shell, BrowserWindow, ipcMain, clipboard } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { appConfig, mainWindowConfig } from './config'
import Store from 'electron-store'

// 临时缓存目录
const tempPath = join(app.getPath('userData'), 'temp')
const creatTempPath = () => {
  // 创建保存目录
  try {
    fs.mkdirSync(tempPath)
  } catch (e: any) {
    if (e.code != 'EEXIST') {
      console.log('创建目录失败：', e)
    }
  }
}

// 主窗口
let mainWindow

function createWindow(): void {
  // 创建主窗口
  mainWindow = new BrowserWindow({
    width: mainWindowConfig.minWidth,
    height: mainWindowConfig.minHeight,
    minWidth: mainWindowConfig.minWidth,
    minHeight: mainWindowConfig.minHeight,
    show: false,
    autoHideMenuBar: true,
    // mac下不显示标题栏
    titleBarStyle: 'hiddenInset',
    // mac下红绿灯位置
    trafficLightPosition: {
      x: 5,
      y: 5
    },
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // 允许渲染进程通信（window.electron）
      sandbox: false,
      // 允许跨域请求、file协议加载本地文件等
      webSecurity: false,
      // 启动webview
      webviewTag: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 监听窗口获得焦点的事件
  mainWindow.on('focus', () => {
    mainWindow.webContents.send('main-window-focus')
  })

  // 监听窗口失去焦点的事件
  mainWindow.on('blur', () => {
    mainWindow.webContents.send('main-window-blur')
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId(appConfig.appUserModelId)

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  creatTempPath()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

// 存储相关
const store = new Store()
ipcMain.handle('getStoreValue', (_event, key) => {
  return store.get(key)
})
ipcMain.on('getStoreValueSync', (event, key) => {
  event.returnValue = store.get(key)
})
ipcMain.handle('setStoreValue', (_event, key, value) => {
  store.set(key, value)
})
ipcMain.handle('deleteStoreValue', (_event, key) => {
  store.delete(key)
})

// 获取版本信息
ipcMain.handle('getAppVersion', () => {
  return app.getVersion()
})

// 保存网络文件
ipcMain.handle('saveFileByUrl', async (_event, url: string, fileName: string) => {
  creatTempPath()
  // 请求文件
  const fetchResp = await fetch(url)
  const blob = await fetchResp.blob()

  // 将blob写入文件
  const filePath = join(tempPath, fileName)
  const fileStream = fs.createWriteStream(filePath)
  const buffer = Buffer.from(await blob.arrayBuffer())
  fileStream.write(buffer)
  fileStream.end()

  return filePath
})

// 保存本地文件
ipcMain.handle('saveFileByPath', async (_event, path: string, fileName: string) => {
  creatTempPath()
  const filePath = join(tempPath, fileName)
  fs.copyFileSync(path, filePath)

  return filePath
})

// 打开缓存目录
ipcMain.handle('openCacheDir', () => {
  shell.openPath(tempPath)
})

// 读取本地图片为base64字符串
ipcMain.handle('readLocalImageBase64', (_event, path: string) => {
  // 读取图片文件
  const data = fs.readFileSync(path)
  // 将图片数据转换为Base64
  const base64Data = Buffer.from(data).toString('base64')
  return base64Data
})

// 设置代理地址
ipcMain.handle('setProxy', (_event, proxyUrl: string) => {
  mainWindow?.webContents.session.setProxy({ proxyRules: proxyUrl })
})

// 复制文本到剪贴板
ipcMain.handle('clipboardWriteText', (_event, text: string) => {
  clipboard.writeText(text)
})

// 清理缓存
ipcMain.handle('clearCache', (_event, images: string[]) => {
  if (images.length === 0) {
    return
  }
  const files: string[] = fs.readdirSync(tempPath)
  if (!files || files.length === 0) {
    return
  }
  files.forEach((file) => {
    const filePath = join(tempPath, file)
    if (!images.includes(filePath)) {
      fs.unlinkSync(filePath)
    }
  })
})
