<script setup lang="ts">
import { useAssistantStore } from '@renderer/store/assistant'
import { nextTick, onMounted, reactive, ref, toRefs, watch } from 'vue'
import AssistantAvatar from '@renderer/components/AssistantAvatar.vue'
import { useI18n } from 'vue-i18n'
import { useSettingStore } from '@renderer/store/setting'
import { Message } from '@arco-design/web-vue'

const assistantStore = useAssistantStore()
const settingStore = useSettingStore()
const { t } = useI18n()

const chatMessageListRef = ref()

const data = reactive({
  currentAssistant: undefined as undefined | Assistant,
  question: '',
  loading: false
})
const { currentAssistant, question } = toRefs(data)

watch(
  () => assistantStore.currentAssistantId,
  () => {
    fetchChatMessageList()
  }
)

const fetchChatMessageList = () => {
  if (assistantStore.currentAssistantId) {
    data.currentAssistant = assistantStore.assistantList.find(
      (a) => a.id === assistantStore.currentAssistantId
    )
    if (data.currentAssistant && !data.currentAssistant.chatMessageList) {
      data.currentAssistant.chatMessageList = []
    }
  } else {
    data.currentAssistant = undefined
  }
  scrollToBottom()
}

const sendQuestion = (event?: KeyboardEvent) => {
  // 加载中、内容为空、输入法回车，不发送消息
  if (data.loading || !data.question.trim() || event?.isComposing || !data.currentAssistant) {
    return
  }

  // 处理并清空问题输入
  const question = data.question.trim()
  data.question = ''

  // 开启等待
  data.loading = true

  data.currentAssistant?.chatMessageList?.push({
    id: new Date().getTime(),
    role: 'user',
    content: question,
    createTime: new Date().getTime()
  })
  scrollToBottom()

  // 大模型调用
  if (data.currentAssistant?.provider === 'OpenAI') {
    // 检查配置
    if (!settingStore.openAI.baseUrl || !settingStore.openAI.key) {
      Message.error(t('chatWindow.openAIConfgMiss'))
      return
    }
  }

  // 关闭等待
  data.loading = false
}

const scrollToBottom = () => {
  nextTick(() => {
    chatMessageListRef.value.scrollTop = chatMessageListRef.value.scrollHeight
  })
}

onMounted(() => {
  fetchChatMessageList()
})
</script>

<template>
  <div class="chat-window">
    <template v-if="currentAssistant">
      <div class="chat-window-header">
        <div class="assistant-name">{{ currentAssistant?.name }}</div>
        <div class="assistant-desc">
          <a-space :size="10">
            <a-tag>{{ currentAssistant?.provider }}</a-tag>
            <a-tag>{{ currentAssistant?.model }}</a-tag>
          </a-space>
        </div>
      </div>
      <div ref="chatMessageListRef" class="chat-message-list">
        <div v-for="msg in currentAssistant.chatMessageList" :key="msg.id" class="chat-message">
          <div class="chat-message-avatar">
            <a-avatar v-if="msg.role === 'user'" shape="square" :size="30">
              <icon-user />
            </a-avatar>
            <AssistantAvatar
              v-else-if="msg.role === 'assistant'"
              :provider="currentAssistant.provider"
              :size="30"
            />
          </div>
          <div class="chat-message-content">{{ msg.content }}</div>
        </div>
      </div>
      <div class="chat-input">
        <a-textarea
          v-model="question"
          class="chat-input-textarea"
          :placeholder="$t('chatWindow.chatInputPlaceholder')"
          :auto-size="{
            minRows: 5,
            maxRows: 5
          }"
          @keydown.enter.prevent="sendQuestion"
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--color-border-1);
    box-sizing: border-box;
    padding: 15px;

    .assistant-name {
      font-size: 16px;
      font-weight: 500;
    }
  }

  .chat-message-list {
    flex-grow: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-sizing: border-box;
    padding: 15px;

    .chat-message {
      display: flex;
      align-items: flex-start;
      gap: 15px;
      .chat-message-avatar {
      }

      .chat-message-content {
        white-space: pre-wrap;
        line-break: anywhere;
        background-color: var(--color-fill-1);
        padding: 10px;
        border-radius: var(--border-radius-small);
      }
    }
  }

  .chat-input {
    flex-shrink: 0;
    border-top: 1px solid var(--color-border-1);

    .chat-input-textarea {
      border: none;
      background-color: var(--color-bg-1);
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
