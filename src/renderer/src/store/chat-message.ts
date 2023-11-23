import { defineStore } from 'pinia'

export const useChatMessageStore = defineStore({
  id: 'chat-message',
  state: () => ({
    chatMessageMap: new Map<number, ChatMessage[]>()
  }),
  persist: true
})
