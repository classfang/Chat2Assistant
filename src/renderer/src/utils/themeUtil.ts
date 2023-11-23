export const startDarkThemeListener = () => {
  const darkThemeMq = window.matchMedia('(prefers-color-scheme: dark)')

  const handleColorSchemeChange = (e) => {
    if (e.matches) {
      document.body.setAttribute('arco-theme', 'dark')
    } else {
      document.body.removeAttribute('arco-theme')
    }
  }

  // 添加事件监听器
  darkThemeMq.addEventListener('change', handleColorSchemeChange)

  // 初始加载时执行一次以设置初始主题
  handleColorSchemeChange(darkThemeMq)
}

export const toggleTheme = () => {
  const arcoTheme = document.body.getAttribute('arco-theme')
  if (arcoTheme === 'dark') {
    document.body.removeAttribute('arco-theme')
  } else {
    document.body.setAttribute('arco-theme', 'dark')
  }
}
