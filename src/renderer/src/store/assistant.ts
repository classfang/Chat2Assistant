import { defineStore } from 'pinia'

export const useAssistantStore = defineStore({
  id: 'assistant',
  state: () => ({
    assistantList: [] as Assistant[]
  }),
  persist: true
})
