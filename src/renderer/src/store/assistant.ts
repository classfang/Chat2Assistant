import { defineStore } from 'pinia'

export const useAssistantStore = defineStore({
  id: 'assistant',
  state: () => ({
    assistantList: [] as Assistant[],
    currentAssistantId: null as null | string
  }),
  getters: {
    getCurrentAssistant(): Assistant {
      return this.assistantList.find((a) => a.id === this.currentAssistantId) ?? ({} as Assistant)
    }
  },
  persist: true
})
