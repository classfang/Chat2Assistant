import { defineStore } from 'pinia'

export const useUserStore = defineStore({
  id: 'user',
  state: () => ({
    avatar: '',
    nickname: 'Some one'
  }),
  persist: true
})
