import { defineStore } from 'pinia'

export const useSettingStore = defineStore({
  id: 'setting',
  state: () => ({
    app: {
      // 主题模式：0自动 1明亮 2黑暗
      themeModel: 0,
      locale: 'en',
      proxy: ''
    },
    openAI: {
      baseUrl: 'https://api.openai.com/v1',
      key: ''
    },
    spark: {
      appId: '',
      secret: '',
      key: ''
    },
    ernieBot: {
      apiKey: '',
      secretKey: ''
    }
  }),
  persist: true
})
