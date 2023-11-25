import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { appConfig, mainWindowConfig } from './config'
import Store from 'electron-store'

// 临时缓存目录
const tempPath = join(app.getPath('userData'), 'temp')

function createWindow(): void {
  // 创建主窗口
  const mainWindow = new BrowserWindow({
    width: mainWindowConfig.minWidth,
    height: mainWindowConfig.minHeight,
    minWidth: mainWindowConfig.minWidth,
    minHeight: mainWindowConfig.minHeight,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false // 允许跨域
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
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
  // 创建保存目录
  try {
    fs.mkdirSync(tempPath)
  } catch (e) {
    console.log('创建目录失败：', e)
  }

  // 请求文件
  const fetchResp = await fetch(url)
  const blob = await fetchResp.blob()

  // 将blob写入文件
  const filePath = join(tempPath, fileName)

  const fileStream = fs.createWriteStream(filePath)
  const buffer = Buffer.from(await blob.arrayBuffer())

  // 将buffer写入文件流
  fileStream.write(buffer)
  fileStream.end()

  return filePath
})

// 打开缓存目录
ipcMain.handle('openCacheDir', () => {
  shell.openPath(tempPath)
})
