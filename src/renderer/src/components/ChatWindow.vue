<script setup lang="ts">
import { useAssistantStore } from '@renderer/store/assistant'
import { useSystemStore } from '@renderer/store/system'
import { onMounted, reactive, ref, toRefs, watch } from 'vue'
import AssistantAvatar from '@renderer/components/AssistantAvatar.vue'
import { useI18n } from 'vue-i18n'
import { useSettingStore } from '@renderer/store/setting'
import { Message } from '@arco-design/web-vue'
import OpenAI from 'openai'
import { encodeChat } from 'gpt-tokenizer'
import { getSparkWsRequestParam, getSparkWsUrl } from '@renderer/utils/spark-util'

const systemStore = useSystemStore()
const assistantStore = useAssistantStore()
const settingStore = useSettingStore()
const { t } = useI18n()

const chatMessageListRef = ref()

const data = reactive({
  currentAssistant: undefined as undefined | Assistant,
  question: '',
  waitAnswer: false,
  sessionId: new Date().getTime()
})
const { currentAssistant, question, waitAnswer } = toRefs(data)

// 深度监听当前助手修改
watch(
  () => [assistantStore.currentAssistantId, assistantStore.assistantList],
  () => {
    getCurrentAssistant()
  },
  {
    deep: true
  }
)

const getCurrentAssistant = () => {
  if (assistantStore.currentAssistantId) {
    data.currentAssistant = assistantStore.assistantList.find(
      (a) => a.id === assistantStore.currentAssistantId
    )
  } else {
    data.currentAssistant = undefined
  }
  scrollToBottom()
}

const sendQuestion = async (event?: KeyboardEvent) => {
  // 加载中、内容为空、输入法回车，不发送消息
  if (
    systemStore.chatWindowLoading ||
    !data.question.trim() ||
    event?.isComposing ||
    !data.currentAssistant
  ) {
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

const useBigModel = async (sessionId: number) => {
  if (!data.currentAssistant) {
    return
  }
  // 大模型调用
  if (data.currentAssistant.provider === 'OpenAI') {
    // 检查配置
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
      id: new Date().getTime(),
      role: 'user',
      content: question,
      createTime: new Date().getTime()
    })
    scrollToBottom()

    // OpenAI对话
    const openai = new OpenAI({
      apiKey: settingStore.openAI.key,
      baseURL: settingStore.openAI.baseUrl,
      dangerouslyAllowBrowser: true
    })
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
      id: new Date().getTime(),
      role: 'assistant' as ChatRole,
      content: '',
      createTime: new Date().getTime()
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
    // 关闭等待
    systemStore.chatWindowLoading = false
  } else if (data.currentAssistant?.provider === 'Spark') {
    // 检查配置
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
      id: new Date().getTime(),
      role: 'user',
      content: question,
      createTime: new Date().getTime()
    })
    scrollToBottom()
  }

  // 星火大模型对话
  const sparkClient = new WebSocket(
    getSparkWsUrl(data.currentAssistant.model, settingStore.spark.secret, settingStore.spark.key)
  )
  sparkClient.onopen = () => {
    if (sessionId != data.sessionId || !data.currentAssistant) {
      return
    }
    console.log('星火服务器【已连接】')
    sparkClient.send(
      getSparkWsRequestParam(
        settingStore.spark.appId,
        data.currentAssistant.model,
        data.currentAssistant.chatMessageList
      )
    )
  }
  sparkClient.onmessage = (message) => {
    if (sessionId != data.sessionId || !data.currentAssistant) {
      return
    }
    console.log(`星火服务器【消息】: ${message.data}`)
    if (data.waitAnswer) {
      data.currentAssistant.chatMessageList.push({
        id: new Date().getTime(),
        role: 'assistant' as ChatRole,
        content: '',
        createTime: new Date().getTime()
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
  if (!data.currentAssistant) {
    return []
  }
  const messages = data.currentAssistant.chatMessageList
    .map((m) => {
      return {
        role: m.role,
        content: m.content
      }
    })
    .slice(-1 - data.currentAssistant.contextSize)
  messages.unshift({
    role: 'system',
    content: data.currentAssistant.instruction
  })
  // 估算Token，如果超出了上限制则移除上下文一条消息
  while (
    messages.length > 2 &&
    encodeChat(messages, data.currentAssistant.model).length > data.currentAssistant.inputMaxTokens
  ) {
    messages.shift()
    messages.shift()
    messages.unshift({
      role: 'system',
      content: data.currentAssistant.instruction
    })
  }
  return messages
}

const scrollToBottom = () => {
  setTimeout(() => {
    chatMessageListRef.value.scrollTop = chatMessageListRef.value.scrollHeight
  }, 0)
}

const stopAnswer = () => {
  data.sessionId = new Date().getTime()
  systemStore.chatWindowLoading = false
  data.waitAnswer = false
}

onMounted(() => {
  getCurrentAssistant()
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
          <div class="chat-message-content select-text">
            {{ msg.content }}
            <span
              v-if="
                index === currentAssistant.chatMessageList.length - 1 &&
                msg.role === 'assistant' &&
                systemStore.chatWindowLoading
              "
              class="chat-message-loading"
              >丨</span
            >
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
        white-space: pre-wrap;
        line-break: anywhere;
        background-color: var(--color-fill-1);
        padding: 10px;
        border-radius: var(--border-radius-small);
        min-height: 1rem;

        .chat-message-loading {
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
