<script setup lang="ts">
import { useAssistantStore } from '@renderer/store/assistant'
import { useChatMessageStore } from '@renderer/store/chat-message'
import { onMounted, reactive, toRefs } from 'vue'

const assistantStore = useAssistantStore()
const chatMessageStore = useChatMessageStore()

const data = reactive({
  chatMessageList: [] as ChatMessage[]
})
const { chatMessageList } = toRefs(data)

const fetchChatMessageList = () => {
  if (assistantStore.currentAssistant) {
    data.chatMessageList =
      chatMessageStore.chatMessageMap.get(assistantStore.currentAssistant.id) ?? []
  }
}

onMounted(() => {
  fetchChatMessageList()
})
</script>

<template>
  <div class="chat-window">{{ assistantStore.currentAssistant?.name }}</div>
</template>

<style lang="less" scoped></style>
