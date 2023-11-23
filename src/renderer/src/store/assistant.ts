import { defineStore } from 'pinia'

export const useAssistantStore = defineStore({
  id: 'assistant',
  state: () => ({
    assistantList: [] as Assistant[],
    currentAssistant: null as null | Assistant
  }),
  persist: true
})
