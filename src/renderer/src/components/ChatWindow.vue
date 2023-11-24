<script setup lang="ts">
import { useAssistantStore } from '@renderer/store/assistant'
import { useChatMessageStore } from '@renderer/store/chat-message'
import { onMounted, reactive, toRefs, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const assistantStore = useAssistantStore()
const chatMessageStore = useChatMessageStore()
const { t } = useI18n()

const data = reactive({
  chatMessageList: [] as ChatMessage[]
})
const { chatMessageList } = toRefs(data)

watch(
  () => assistantStore.currentAssistant,
  () => {
    fetchChatMessageList()
  }
)

const fetchChatMessageList = () => {
  if (assistantStore.currentAssistant) {
    data.chatMessageList =
      chatMessageStore.chatMessageMap.get(assistantStore.currentAssistant.id) ?? []
  } else {
    data.chatMessageList = []
  }
}

onMounted(() => {
  fetchChatMessageList()
})
</script>

<template>
  <div class="chat-window">
    <template v-if="assistantStore.currentAssistant">
      <div class="chat-window-header">
        <div class="assistant-name">{{ assistantStore.currentAssistant?.name }}</div>
        <div class="assistant-desc">
          <a-space :size="10">
            <a-tag>{{ assistantStore.currentAssistant?.provider }}</a-tag>
            <a-tag>{{ assistantStore.currentAssistant?.model }}</a-tag>
          </a-space>
        </div>
      </div>
      <div class="chat-message-list"></div>
      <div class="chat-input">
        <a-textarea
          class="chat-input-textarea"
          :placeholder="$t('chatWindow.chatInputPlaceholder')"
          :auto-size="{
            minRows: 4,
            maxRows: 4
          }"
        />
      </div>
    </template>
    <div v-else class="chat-window-empty">
      <a-empty>
        <template #image>
          <icon-message />
        </template>
        {{ $t('common.slogan') }}
      </a-empty>
    </div>
  </div>
</template>

<style lang="less" scoped>
.chat-window {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .chat-window-header {
    flex-shrink: 0;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .assistant-name {
      font-size: 16px;
      font-weight: 500;
    }
  }

  .chat-message-list {
    flex-grow: 1;
  }

  .chat-input {
    flex-shrink: 0;

    .chat-input-textarea {
      border: none;
      background-color: var(--color-fill-2);
    }
  }

  .chat-window-empty {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
