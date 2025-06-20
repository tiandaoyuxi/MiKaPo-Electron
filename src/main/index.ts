import { app, shell, BrowserWindow, ipcMain, dialog, screen } from 'electron'
import { basename, dirname, join } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { Ollama } from 'ollama'

// const ollama = new Ollama()
const ollama = new Ollama({host: '127.0.0.1:11343'})

function createWindow(): void {
  const display = screen.getPrimaryDisplay()
  // Create the browser window.
  const width = 360
  const height = 480

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: display.bounds.width - width,
    y: display.bounds.height - height - 20,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false,
      backgroundThrottling: false
    },
    frame: false,
    transparent: true,
    resizable: true,
    icon: icon
  })

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1)

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Opener-Policy': ['same-origin'],
        'Cross-Origin-Embedder-Policy': ['require-corp']
      }
    })
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  ipcMain.on('minimize', () => mainWindow.minimize())
  let isFullScreen = false
  ipcMain.on('fullscreen', () => {
    if (!isFullScreen) {
      mainWindow.setFullScreen(true)
      isFullScreen = true
    } else {
      mainWindow.setFullScreen(false)
      isFullScreen = false
    }
  })
  ipcMain.on('quit', () => app.quit())

  // Handle IPC messages from renderer
  ipcMain.handle('ollama-generate', async (_, modelName, prompt) => {
    try {
      const response = await ollama.generate({
        model: modelName,
        prompt: prompt
      })
      return response
    } catch (error) {
      console.error('Error in ollama-generate:', error)
      throw error
    }
  })

  ipcMain.on('dialog-char', (event) => {
    dialog
      .showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Char', extensions: ['pmx'] }]
      })
      .then((result) => {
        if (!result.canceled) {
          const filePath = result.filePaths[0]
          event.reply('selected-char', {
            dir: 'file://' + dirname(filePath) + '/',
            name: basename(filePath)
          })
        }
      })
      .catch((err) => {
        console.log(err)
      })
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
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

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
