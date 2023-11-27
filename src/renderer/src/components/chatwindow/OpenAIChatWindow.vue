<script setup lang="ts">
import { useSystemStore } from '@renderer/store/system'
import { onMounted, reactive, ref, toRefs } from 'vue'
import AssistantAvatar from '@renderer/components/AssistantAvatar.vue'
import { useI18n } from 'vue-i18n'
import { useSettingStore } from '@renderer/store/setting'
import { Message } from '@arco-design/web-vue'
import OpenAI from 'openai'
import { encodeChat } from 'gpt-tokenizer'
import { downloadFile } from '@renderer/utils/download-util'
import { nowTimestamp } from '@renderer/utils/date-util'
import { randomUUID } from '@renderer/utils/id-util'
import { renderMarkdown } from '@renderer/utils/markdown-util'
import { useAssistantStore } from '@renderer/store/assistant'

const systemStore = useSystemStore()
const settingStore = useSettingStore()
const assistantStore = useAssistantStore()
const { t } = useI18n()

const chatMessageListRef = ref()

const data = reactive({
  currentAssistant: assistantStore.getCurrentAssistant,
  question: '',
  waitAnswer: false,
  sessionId: randomUUID()
})
const { currentAssistant, question, waitAnswer } = toRefs(data)

const sendQuestion = async (event?: KeyboardEvent) => {
  // 加载中、内容为空、输入法回车，不发送消息
  if (systemStore.chatWindowLoading || !data.question.trim() || event?.isComposing) {
    return
  }

  // 大模型调用
  try {
    await useBigModel(data.sessionId)
  } catch (e) {
    console.log('big model error: ', e)
    Message.error(e ? e + '' : t('chatWindow.openAIError'))
    systemStore.chatWindowLoading = false
    data.waitAnswer = false
  }
}

const useBigModel = async (sessionId: string) => {
  // 检查大模型配置
  if (!settingStore.openAI.baseUrl || !settingStore.openAI.key) {
    Message.error(t('chatWindow.openAIConfgMiss'))
    return
  }

  // 处理并清空问题输入
  const question = data.question.trim()
  data.question = ''

  // 开启等待
  systemStore.chatWindowLoading = true
  data.waitAnswer = true

  data.currentAssistant.chatMessageList.push({
    id: randomUUID(),
    type: 'text',
    role: 'user',
    content: question,
    createTime: nowTimestamp()
  })
  scrollToBottom()

  // 大模型调用
  const openai = new OpenAI({
    apiKey: settingStore.openAI.key,
    baseURL: settingStore.openAI.baseUrl,
    dangerouslyAllowBrowser: true
  })
  if (data.currentAssistant.type === 'chat') {
    // OpenAI对话
    const stream = await openai.chat.completions.create({
      messages: getBigModelMessages(),
      model: data.currentAssistant.model,
      stream: true,
      max_tokens: data.currentAssistant.maxTokens
    })
    if (sessionId != data.sessionId) {
      return
    }
    data.currentAssistant.chatMessageList.push({
      id: randomUUID(),
      type: 'text',
      role: 'assistant' as ChatRole,
      content: '',
      createTime: nowTimestamp()
    })
    scrollToBottom()
    data.waitAnswer = false
    for await (const chunk of stream) {
      if (sessionId != data.sessionId) {
        return
      }
      console.log(`OpenAi【消息】: ${JSON.stringify(chunk.choices[0])}`)
      data.currentAssistant.chatMessageList[
        data.currentAssistant.chatMessageList.length - 1
      ].content += chunk.choices[0].delta.content ?? ''
      scrollToBottom()
    }
  } else if (data.currentAssistant.type === 'drawing') {
    const imagesResponse = await openai.images.generate({
      prompt: question,
      model: data.currentAssistant.model,
      size: data.currentAssistant.imageSize as
        | '256x256'
        | '512x512'
        | '1024x1024'
        | '1792x1024'
        | '1024x1792'
        | null,
      response_format: 'url'
    })
    if (sessionId != data.sessionId) {
      return
    }
    console.log(`OpenAi【消息】: ${JSON.stringify(imagesResponse)}`)
    let imageUrl = imagesResponse.data[0].url ?? ''
    if (imageUrl) {
      imageUrl = await window.electron.ipcRenderer.invoke(
        'saveFileByUrl',
        imagesResponse.data[0].url,
        `${randomUUID()}.png`
      )
    }
    data.currentAssistant.chatMessageList.push({
      id: randomUUID(),
      type: 'img',
      role: 'assistant' as ChatRole,
      content: `file://${imageUrl}`,
      createTime: nowTimestamp()
    })
    scrollToBottom()
    data.waitAnswer = false
  }

  // 关闭等待
  systemStore.chatWindowLoading = false
}

// 将历史消息处理为大模型需要的结构
const getBigModelMessages = () => {
  // 是否存在指令
  const hasInstruction = data.currentAssistant.instruction.trim() != ''

  const messages = data.currentAssistant.chatMessageList
    .map((m) => {
      return {
        role: m.role,
        content: m.content
      }
    })
    .slice(-1 - data.currentAssistant.contextSize)

  // 增加指令
  if (hasInstruction) {
    messages.unshift({
      role: 'system',
      content: data.currentAssistant.instruction
    })
  }
  // 使用'gpt-4-0314'模型估算Token，如果超出了上限制则移除上下文一条消息
  while (
    messages.length > (hasInstruction ? 2 : 1) &&
    encodeChat(messages, 'gpt-4-0314').length > data.currentAssistant.inputMaxTokens
  ) {
    messages.shift()
    if (hasInstruction) {
      messages.shift()
      messages.unshift({
        role: 'system',
        content: data.currentAssistant.instruction
      })
    }
  }
  return messages
}

const scrollToBottom = () => {
  setTimeout(() => {
    chatMessageListRef.value.scrollTop = chatMessageListRef.value.scrollHeight
  }, 0)
}

const stopAnswer = () => {
  data.sessionId = randomUUID()
  systemStore.chatWindowLoading = false
  data.waitAnswer = false
}

onMounted(() => {
  scrollToBottom()
})
</script>

<template>
  <div class="chat-window">
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
      <div
        v-for="(msg, index) in currentAssistant.chatMessageList"
        :key="msg.id"
        class="chat-message"
      >
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
        <template v-if="msg.type === 'text'">
          <div v-if="msg.role === 'user'" class="chat-message-content select-text">
            {{ msg.content }}
          </div>
          <div
            v-else-if="msg.role === 'assistant'"
            class="chat-message-content select-text"
            v-html="
              renderMarkdown(
                msg.content,
                index === currentAssistant.chatMessageList.length - 1 &&
                  systemStore.chatWindowLoading
              )
            "
          ></div>
        </template>
        <div v-else-if="msg.type === 'img'" class="chat-message-img">
          <a-image width="300" height="300" :src="msg.content" show-loader fit="cover">
            <template #preview-actions>
              <a-image-preview-action
                name="下载"
                @click="downloadFile(msg.content, `img-${msg.id}.png`)"
                ><icon-download
              /></a-image-preview-action>
            </template>
          </a-image>
        </div>
      </div>
      <div v-if="waitAnswer" class="chat-message">
        <div class="chat-message-avatar">
          <AssistantAvatar :provider="currentAssistant.provider" :size="30" />
        </div>
        <div class="chat-message-content">
          <a-spin :size="15" />
        </div>
      </div>
    </div>
    <div class="chat-input">
      <a-textarea
        v-model="question"
        class="chat-input-textarea"
        :placeholder="$t('chatWindow.chatInputPlaceholder')"
        :auto-size="{
          minRows: 4,
          maxRows: 4
        }"
        allow-clear
        @keydown.enter.prevent="sendQuestion"
      />
      <div class="chat-input-bottom">
        <a-button v-if="!systemStore.chatWindowLoading" size="small" @click="sendQuestion()">
          <a-space :size="5">
            <icon-send :size="15" />
            <span>{{ $t('chatWindow.send') }}</span>
          </a-space>
        </a-button>
        <a-button v-if="systemStore.chatWindowLoading" size="small" @click="stopAnswer()">
          <a-space :size="5">
            <icon-record-stop :size="15" />
            <span>{{ $t('chatWindow.stop') }}</span>
          </a-space>
        </a-button>
      </div>
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

      .chat-message-content {
        line-break: anywhere;
        background-color: var(--color-fill-1);
        padding: 10px;
        border-radius: var(--border-radius-small);
        min-height: 1rem;
        line-height: 1.3rem;

        :deep(p) {
          margin-block: 0;
          margin: 0;
        }

        :deep(.chat-message-loading) {
          font-weight: 500;
          color: rgb(var(--primary-6));
          animation: alternate-hide-show 900ms ease-in-out infinite;
        }

        @keyframes alternate-hide-show {
          0%,
          50%,
          100% {
            opacity: 1;
          }
          60%,
          90% {
            opacity: 0;
          }
        }
      }

      .chat-message-img {
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

    .chat-input-bottom {
      box-sizing: border-box;
      padding: 5px 15px 15px 15px;
      display: flex;
      justify-content: flex-end;
    }
  }
}
</style>
