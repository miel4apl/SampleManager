const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('sampleManagerDesktop', {
  getFolder: () => ipcRenderer.invoke('library:get-folder'),
  getServerInfo: () => ipcRenderer.invoke('library:server-info'),
  chooseFolder: () => ipcRenderer.invoke('library:choose-folder'),
  scanFolder: () => ipcRenderer.invoke('library:scan'),
  publishIndex: (entries) => ipcRenderer.invoke('library:publish-index', entries),
  readAudio: async (filePath) => {
    const buffer = await ipcRenderer.invoke('library:read-audio', filePath);
    return buffer;
  }
});
