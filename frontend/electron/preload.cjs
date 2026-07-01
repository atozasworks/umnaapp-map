/**
 * Electron preload — exposes a minimal, namespaced bridge to the renderer.
 * The presence of `window.umnaDesktop.isElectron` is what platform/runtime.js
 * uses to detect the desktop shell. Web/PWA never sees this object.
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('umnaDesktop', {
  isElectron: true,
  platform: process.platform,
  // File access over IPC (main process owns the filesystem).
  openFile: (options) => ipcRenderer.invoke('umna:openFile', options),
  saveFile: (payload) => ipcRenderer.invoke('umna:saveFile', payload),
  readFile: (filePath) => ipcRenderer.invoke('umna:readFile', filePath),
})
