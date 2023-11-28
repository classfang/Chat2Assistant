import { defineStore } from 'pinia'

export const useCollectionSetStore = defineStore({
  id: 'collection-set',
  state: () => ({
    chatMessageSetList: [] as ChatMessageSet[]
  }),
  persist: true
})
