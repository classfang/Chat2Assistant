export const downloadFile = (url: string, fileName: string) => {
  fetch(url)
    .then((response) => response.blob())
    .then((blob) => {
      const a = document.createElement('a')
      const url = window.URL.createObjectURL(blob)
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    })
    .catch((error) => {
      console.error('文件下载失败:', error)
    })
}
