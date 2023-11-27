<script setup lang="ts">
import { useSystemStore } from '@renderer/store/system'
import { onMounted, reactive, ref, toRefs } from 'vue'
import AssistantAvatar from '@renderer/components/AssistantAvatar.vue'
import { useI18n } from 'vue-i18n'
import { useSettingStore } from '@renderer/store/setting'
import { Message } from '@arco-design/web-vue'
import { encodeChat } from 'gpt-tokenizer'
import { downloadFile } from '@renderer/utils/download-util'
import { nowTimestamp } from '@renderer/utils/date-util'
import { randomUUID } from '@renderer/utils/id-util'
import { renderMarkdown } from '@renderer/utils/markdown-util'
import { getErnieBotChatUrl } from '@renderer/utils/ernie-bot-util'
import { fetchEventSource } from '@microsoft/fetch-event-source'

const systemStore = useSystemStore()
const settingStore = useSettingStore()
const { t } = useI18n()
const abortCtr = new AbortController()

const chatMessageListRef = ref()

const props = defineProps({
  currentAssistant: {
    type: Object as () => Assistant,
    default: () => {}
  }
})

const data = reactive({
  currentAssistant: props.currentAssistant,
  question: '',
  waitAnswer: false,
  sessionId: randomUUID()
})
const { question, waitAnswer } = toRefs(data)

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
    Message.error(e ? e + '' : t('chatWindow.ernieBot'))
    systemStore.chatWindowLoading = false
    data.waitAnswer = false
  }
}

const useBigModel = async (sessionId: string) => {
  // 检查大模型配置
  if (!settingStore.ernieBot.apiKey || !settingStore.ernieBot.secretKey) {
    Message.error(t('chatWindow.ernieBotConfgMiss'))
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
  // 文心一言模型对话
  const tokenResp = await fetch(
    `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${settingStore.ernieBot.apiKey}&client_secret=${settingStore.ernieBot.secretKey}`
  )
  const tokenRespJson = await tokenResp.json()
  const accessToken = tokenRespJson.access_token

  if (sessionId != data.sessionId) {
    return
  }

  fetchEventSource(
    `${getErnieBotChatUrl(data.currentAssistant.model)}?access_token=${accessToken}`,
    {
      signal: abortCtr.signal,
      method: 'POST',
      body: JSON.stringify({
        messages: getBigModelMessages(),
        stream: true
      }),
      onmessage: (e) => {
        if (sessionId != data.sessionId) {
          return
        }
        console.log('文心一言大模型回复：', e)
        if (data.waitAnswer) {
          data.currentAssistant.chatMessageList.push({
            id: randomUUID(),
            type: 'text',
            role: 'assistant' as ChatRole,
            content: '',
            createTime: nowTimestamp()
          })
          scrollToBottom()
          data.waitAnswer = false
        }
        data.currentAssistant.chatMessageList[
          data.currentAssistant.chatMessageList.length - 1
        ].content += JSON.parse(e.data).result ?? ''
        scrollToBottom()
      },
      onclose: () => {
        console.log('文心一言大模型关闭连接')
        // 关闭等待
        data.waitAnswer = false
        systemStore.chatWindowLoading = false
      },
      onerror: (err: any) => {
        console.log('文心一言大模型错误：', err)
        // 关闭等待
        data.waitAnswer = false
        systemStore.chatWindowLoading = false
        // 抛出异常防止重连
        if (err instanceof Error) {
          throw err
        }
      }
    }
  )
}

// 将历史消息处理为大模型需要的结构
const getBigModelMessages = () => {
  if (!data.currentAssistant) {
    return []
  }
  // 是否存在指令
  const hasInstruction = data.currentAssistant.instruction.trim() != ''
  // 将消息历史处理为user和assistant轮流对话
  const messages = [] as { role: string; content: string }[]
  let currentRole = 'user' as 'user' | 'assistant'
  for (let i = data.currentAssistant.chatMessageList.length - 1; i >= 0; i--) {
    const chatMessage = data.currentAssistant.chatMessageList[i]
    if (currentRole === chatMessage.role) {
      messages.unshift({
        role: chatMessage.role,
        content: chatMessage.content
      })
      currentRole = currentRole === 'user' ? 'assistant' : 'user'
    }
  }
  // 必须user开头user结尾
  if (data.currentAssistant.chatMessageList[0].role === 'assistant') {
    messages.shift()
  }
  // 增加指令
  if (hasInstruction) {
    data.currentAssistant.chatMessageList[
      data.currentAssistant.chatMessageList.length - 1
    ].content = `${data.currentAssistant.instruction}\n${
      data.currentAssistant.chatMessageList[data.currentAssistant.chatMessageList.length - 1]
        .content
    }`
  }
  // 使用'gpt-4-0314'模型估算Token，如果超出了上限制则移除上下文一条消息
  while (
    messages.length > 1 &&
    encodeChat(messages, 'gpt-4-0314').length > data.currentAssistant.inputMaxTokens
  ) {
    messages.shift()
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
  abortCtr.abort()
}

onMounted(() => {
  scrollToBottom()
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

  .chat-window-empty {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
