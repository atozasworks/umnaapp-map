/**
 * UMNAAPP Electron main process (ADDITIVE — desktop shell only).
 *
 * Loads the SAME `dist/` React build offline via file://. No web behavior is
 * affected. Provides: single-instance lock, system tray (minimize to tray),
 * file access over IPC, and optional auto-update (safe no-op if unconfigured).
 */
const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, shell, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = !app.isPackaged
let mainWindow = null
let tray = null
let isQuitting = false

// ---- Single-instance lock ---------------------------------------------------
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
    }
  })
}

function resolveIndexHtml() {
  // Packaged: dist is bundled next to the app resources. Dev: ../dist.
  const candidates = [
    path.join(__dirname, '..', 'dist', 'index.html'),
    path.join(process.resourcesPath || '', 'dist', 'index.html'),
  ]
  return candidates.find((p) => fs.existsSync(p)) || candidates[0]
}

function resolveTrayIcon() {
  const candidates = [
    path.join(__dirname, '..', 'dist', 'pwa-192x192.png'),
    path.join(__dirname, '..', 'public', 'pwa-192x192.png'),
    path.join(__dirname, '..', 'dist', 'favicon.png'),
  ]
  const file = candidates.find((p) => fs.existsSync(p))
  return file ? nativeImage.createFromPath(file) : nativeImage.createEmpty()
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0b1220',
    show: false,
    title: 'UMNAAPP',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // The shell loads ONLY trusted local bundled content (file://), but must
      // call the cross-origin backend API/sockets. The backend CORS allowlist
      // does not (and need not) include the file:// origin, so we disable the
      // renderer's CORS enforcement here. This requires NO backend changes and
      // is the standard approach for a desktop wrapper around a web app.
      webSecurity: false,
    },
  })

  if (process.env.UMNA_DESKTOP_DIAG) {
    const ses = mainWindow.webContents.session
    ses.webRequest.onErrorOccurred((d) => {
      if (!/devtools|chrome-extension/.test(d.url)) console.error(`[net-fail] ${d.error} ${d.url}`)
    })
    ses.webRequest.onCompleted((d) => {
      if (d.statusCode >= 400) console.error(`[net-${d.statusCode}] ${d.url}`)
    })
  }

  const devUrl = process.env.UMNA_DESKTOP_DEV_URL
  if (isDev && devUrl) {
    mainWindow.loadURL(devUrl)
  } else {
    mainWindow.loadFile(resolveIndexHtml())
  }

  mainWindow.once('ready-to-show', () => mainWindow.show())

  // Diagnostics: surface load failures / renderer crashes to stdout.
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error(`[electron] did-fail-load ${code} ${desc} ${url}`)
  })
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[electron] render-process-gone', details)
  })
  mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    // Only surface warnings/errors to avoid noise.
    if (level >= 2) console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`)
  })
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[electron] did-finish-load OK')
    if (process.env.UMNA_DESKTOP_DIAG) {
      mainWindow.webContents
        .executeJavaScript(
          "(function(){var oe=console.error;var n=0;console.error=function(){try{if(n<6){n++;var s=Array.prototype.map.call(arguments,function(x){return x&&x.stack?x.stack:(typeof x==='object'?JSON.stringify(x):String(x))}).join(' || ');console.warn('CE>> '+s);}}catch(_){}return oe.apply(console,arguments)};window.addEventListener('unhandledrejection',function(e){console.warn('REJECT>> '+((e.reason&&(e.reason.stack||e.reason.message))||e.reason||''))});})();"
        )
        .catch(() => {})
    }
  })

  // External links open in the user's real browser, not inside the shell.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  // Minimize to tray instead of quitting on window close.
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createTray() {
  try {
    tray = new Tray(resolveTrayIcon())
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Open UMNAAPP', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus() } } },
      { type: 'separator' },
      { label: 'Quit', click: () => { isQuitting = true; app.quit() } },
    ])
    tray.setToolTip('UMNAAPP')
    tray.setContextMenu(contextMenu)
    tray.on('click', () => {
      if (!mainWindow) return
      if (mainWindow.isVisible()) mainWindow.hide()
      else { mainWindow.show(); mainWindow.focus() }
    })
  } catch (err) {
    console.warn('[electron] tray unavailable:', err?.message || err)
  }
}

// ---- Optional auto-update (safe no-op if not configured) --------------------
function initAutoUpdate() {
  try {
    const { autoUpdater } = require('electron-updater')
    autoUpdater.autoDownload = true
    autoUpdater.on('error', (err) => console.warn('[updater]', err?.message || err))
    autoUpdater.on('update-downloaded', () => {
      if (!mainWindow) return
      dialog
        .showMessageBox(mainWindow, {
          type: 'info',
          buttons: ['Restart now', 'Later'],
          defaultId: 0,
          message: 'A new version of UMNAAPP is ready.',
          detail: 'Restart to apply the update.',
        })
        .then(({ response }) => {
          if (response === 0) { isQuitting = true; autoUpdater.quitAndInstall() }
        })
    })
    // No-op unless a publish/update feed is configured in electron-builder.
    autoUpdater.checkForUpdatesAndNotify().catch(() => {})
  } catch {
    /* electron-updater not installed / not configured — ignore */
  }
}

// ---- IPC: file access -------------------------------------------------------
ipcMain.handle('umna:openFile', async (_e, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    ...(options || {}),
  })
  if (result.canceled || !result.filePaths.length) return null
  const filePath = result.filePaths[0]
  const content = await fs.promises.readFile(filePath, 'utf8').catch(() => null)
  return { path: filePath, content }
})

ipcMain.handle('umna:saveFile', async (_e, { defaultPath, content } = {}) => {
  const result = await dialog.showSaveDialog(mainWindow, { defaultPath })
  if (result.canceled || !result.filePath) return null
  await fs.promises.writeFile(result.filePath, content ?? '', 'utf8')
  return { path: result.filePath }
})

ipcMain.handle('umna:readFile', async (_e, filePath) => {
  if (!filePath) return null
  return fs.promises.readFile(filePath, 'utf8').catch(() => null)
})

// ---- App lifecycle ----------------------------------------------------------
if (gotLock) {
  app.whenReady().then(() => {
    createWindow()
    createTray()
    initAutoUpdate()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
      else if (mainWindow) mainWindow.show()
    })
  })

  app.on('before-quit', () => { isQuitting = true })

  // Keep running in the tray when all windows are closed (except macOS norm).
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      // Intentionally do not quit — app lives in the tray until explicitly quit.
    }
  })
}
