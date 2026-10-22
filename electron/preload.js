const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  showNotification: (options) => ipcRenderer.invoke('show-notification', options)
});
