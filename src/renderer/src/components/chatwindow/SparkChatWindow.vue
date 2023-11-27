<script setup lang="ts">
import { useSystemStore } from '@renderer/store/system'
import { onMounted, reactive, ref, toRefs } from 'vue'
import AssistantAvatar from '@renderer/components/AssistantAvatar.vue'
import { useI18n } from 'vue-i18n'
import { useSettingStore } from '@renderer/store/setting'
import { Message } from '@arco-design/web-vue'
import { encodeChat } from 'gpt-tokenizer'
import { getSparkWsRequestParam, getSparkWsUrl } from '@renderer/utils/spark-util'
import { downloadFile } from '@renderer/utils/download-util'
import { nowTimestamp } from '@renderer/utils/date-util'
import { randomUUID } from '@renderer/utils/id-util'
import { renderMarkdown } from '@renderer/utils/markdown-util'

const systemStore = useSystemStore()
const settingStore = useSettingStore()
const { t } = useI18n()

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
    Message.error(e ? e + '' : t('chatWindow.sparkError'))
    systemStore.chatWindowLoading = false
    data.waitAnswer = false
  }
}

const useBigModel = async (sessionId: string) => {
  // 官方文档：https://www.xfyun.cn/doc/spark/Web.html#_1-%E6%8E%A5%E5%8F%A3%E8%AF%B4%E6%98%8E
  // 检查大模型配置
  if (!settingStore.spark.appId || !settingStore.spark.secret || !settingStore.spark.key) {
    Message.error(t('chatWindow.sparkConfgMiss'))
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
  // 星火大模型对话
  const sparkClient = new WebSocket(
    getSparkWsUrl(data.currentAssistant.model, settingStore.spark.secret, settingStore.spark.key)
  )
  sparkClient.onopen = () => {
    if (sessionId != data.sessionId) {
      return
    }
    console.log('星火服务器【已连接】')
    sparkClient.send(
      getSparkWsRequestParam(
        settingStore.spark.appId,
        data.currentAssistant.model,
        getBigModelMessages()
      )
    )
  }
  sparkClient.onmessage = (message) => {
    if (sessionId != data.sessionId) {
      return
    }
    console.log(`星火服务器【消息】: ${message.data}`)
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
    ].content += JSON.parse(message.data.toString())?.payload?.choices?.text[0]?.content ?? ''
    scrollToBottom()
  }
  sparkClient.onclose = () => {
    if (sessionId != data.sessionId) {
      return
    }
    console.log('星火服务器【连接已关闭】')
    // 关闭等待
    data.waitAnswer = false
    systemStore.chatWindowLoading = false
  }
  sparkClient.onerror = (e) => {
    if (sessionId != data.sessionId) {
      return
    }
    console.log('星火服务器【连接错误】', e)
    // 关闭等待
    data.waitAnswer = false
    systemStore.chatWindowLoading = false
  }
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
