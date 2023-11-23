import { defineStore } from 'pinia'

export const useSettingStore = defineStore({
  id: 'setting',
  state: () => ({
    app: {
      // 主题模式：0自动 1明亮 2黑暗
      themeModel: 0,
      // 语言
      locale: 'zh'
    },
    openAI: {
      baseUrl: 'https://api.openai.com/v1',
      key: ''
    }
  }),
  persist: true
})
