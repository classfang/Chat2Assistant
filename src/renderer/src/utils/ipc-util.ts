export const openCacheDir = async () => {
  return await window.electron.ipcRenderer.invoke('openCacheDir')
}

export const setProxy = async (proxy: string) => {
  return await window.electron.ipcRenderer.invoke('setProxy', proxy)
}

export const getAppVersion = async () => {
  return await window.electron.ipcRenderer.invoke('getAppVersion')
}

export const saveFileByPath = async (imagePath: string, fileName: string) => {
  return await window.electron.ipcRenderer.invoke('saveFileByPath', imagePath, fileName)
}

export const saveFileByUrl = async (url: string, fileName: string) => {
  return await window.electron.ipcRenderer.invoke('saveFileByUrl', url, fileName)
}

export const readLocalImageBase64 = async (path: string) => {
  return await window.electron.ipcRenderer.invoke('readLocalImageBase64', path)
}

export const clipboardWriteText = async (text: string) => {
  return await window.electron.ipcRenderer.invoke('clipboardWriteText', text)
}

export const clearCacheFiles = async (images: string[]) => {
  return await window.electron.ipcRenderer.invoke('clearCacheFiles', images)
}

export const selectFileAndRead = async (filters: string[]) => {
  return await window.electron.ipcRenderer.invoke('selectFileAndRead', filters)
}

export const onMainWindowFocus = (action: () => void) => {
  window.electron.ipcRenderer.on('main-window-focus', () => {
    action()
  })
}
