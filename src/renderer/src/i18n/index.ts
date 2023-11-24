import { createI18n } from 'vue-i18n'
import en from '@renderer/i18n/local/en.json'
import zh from '@renderer/i18n/local/zh.json'

const messages = {
  en: en,
  zh: zh
}

const i18n = createI18n({
  locale: 'en', // 设置当前语言类型
  legacy: false, // 如果要支持compositionAPI，此项必须设置为false;
  globalInjection: true, // 全局注册$t方法
  messages
})

export default i18n
