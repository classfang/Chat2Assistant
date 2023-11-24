import { defineStore } from 'pinia'

export const useSystemStore = defineStore({
  id: 'system',
  state: () => ({
    chatWindowLoading: false
  }),
  persist: true
})
