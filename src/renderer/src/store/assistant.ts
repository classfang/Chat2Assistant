import { defineStore } from 'pinia'

export const useAssistantStore = defineStore({
  id: 'assistant',
  state: () => ({
    assistantList: [] as Assistant[],
    currentAssistantId: null as null | number
  }),
  persist: true
})
