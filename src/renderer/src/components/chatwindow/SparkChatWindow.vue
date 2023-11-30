<script setup lang="ts">
import { useSystemStore } from '@renderer/store/system'
import { onMounted, reactive, ref, toRefs } from 'vue'
import UserAvatar from '@renderer/components/UserAvatar.vue'
import AssistantAvatar from '@renderer/components/AssistantAvatar.vue'
import MultipleChoiceConsole from '@renderer/components/chatwindow/MultipleChoiceConsole.vue'
import { useI18n } from 'vue-i18n'
import { useSettingStore } from '@renderer/store/setting'
import { Message } from '@arco-design/web-vue'
import { encodeChat } from 'gpt-tokenizer'
import { getSparkWsRequestParam, getSparkWsUrl } from '@renderer/utils/spark-util'
import { nowTimestamp } from '@renderer/utils/date-util'
import { randomUUID } from '@renderer/utils/id-util'
import { renderMarkdown } from '@renderer/utils/markdown-util'
import { useAssistantStore } from '@renderer/store/assistant'
import { scrollToBottom } from '@renderer/utils/element-util'
import { clipboardWriteText } from '@renderer/utils/main-thread-util'

const systemStore = useSystemStore()
const settingStore = useSettingStore()
const assistantStore = useAssistantStore()
const { t } = useI18n()

const chatMessageListRef = ref()

const data = reactive({
  sessionId: randomUUID(),
  currentAssistant: assistantStore.getCurrentAssistant,
  question: '',
  waitAnswer: false,
  multipleChoiceFlag: false,
  multipleChoiceList: [] as string[]
})
const { currentAssistant, question, waitAnswer, multipleChoiceFlag, multipleChoiceList } =
  toRefs(data)

const sendQuestion = async (event?: KeyboardEvent) => {
  // 加载中、内容为空、输入法回车，不发送消息
  if (systemStore.chatWindowLoading || !data.question.trim() || event?.isComposing) {
    event?.preventDefault()
    return
  } else if (event?.shiftKey) {
    return
  } else {
    event?.preventDefault()
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
  scrollToBottom(chatMessageListRef.value)

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
      scrollToBottom(chatMessageListRef.value)
      data.waitAnswer = false
    }
    data.currentAssistant.chatMessageList[
      data.currentAssistant.chatMessageList.length - 1
    ].content += JSON.parse(message.data.toString())?.payload?.choices?.text[0]?.content ?? ''
    scrollToBottom(chatMessageListRef.value)
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

const stopAnswer = () => {
  data.sessionId = randomUUID()
  systemStore.chatWindowLoading = false
  data.waitAnswer = false
}

const multipleChoiceChange = (id: string) => {
  if (data.multipleChoiceList.includes(id)) {
    data.multipleChoiceList = data.multipleChoiceList.filter((i) => i != id)
  } else {
    data.multipleChoiceList.push(id)
  }
}

const multipleChoiceOpen = (id: string) => {
  if (systemStore.chatWindowLoading) {
    return
  }
  data.multipleChoiceFlag = true
  multipleChoiceChange(id)
}

const multipleChoiceClose = () => {
  data.multipleChoiceList = []
  data.multipleChoiceFlag = false
}

onMounted(() => {
  scrollToBottom(chatMessageListRef.value)
})
</script>

<template>
  <div class="chat-window">
    <div class="chat-window-header drag-area">
      <div class="assistant-name">{{ currentAssistant?.name }}</div>
      <div class="assistant-desc">
        <a-space :size="10">
          <a-tag>{{ currentAssistant?.provider }}</a-tag>
          <a-tag>{{ currentAssistant?.model }}</a-tag>
        </a-space>
      </div>
    </div>
    <div ref="chatMessageListRef" class="chat-message-list">
      <a-dropdown
        v-for="(msg, index) in currentAssistant.chatMessageList"
        :key="msg.id"
        :align-point="true"
        trigger="contextMenu"
      >
        <div class="chat-message">
          <a-checkbox
            v-if="multipleChoiceFlag"
            :default-checked="multipleChoiceList.includes(msg.id)"
            @change="multipleChoiceChange(msg.id)"
          />
          <div class="chat-message-avatar">
            <UserAvatar v-if="msg.role === 'user'" :size="30" />
            <AssistantAvatar
              v-else-if="msg.role === 'assistant'"
              :provider="currentAssistant.provider"
              :size="30"
            />
          </div>
          <div class="chat-message-content select-text">
            <div v-if="msg.role === 'user'">{{ msg.content }}</div>
            <div
              v-else-if="msg.role === 'assistant'"
              class="chat-message-md"
              v-html="
                renderMarkdown(
                  msg.content,
                  index === currentAssistant.chatMessageList.length - 1 &&
                    systemStore.chatWindowLoading
                )
              "
            ></div>
          </div>
        </div>
        <template #content>
          <a-doption @click="clipboardWriteText(msg.content)">{{
            $t('chatWindow.copy')
          }}</a-doption>
          <a-doption @click="multipleChoiceOpen(msg.id)">{{
            $t('chatWindow.multipleChoice')
          }}</a-doption>
        </template>
      </a-dropdown>
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
        @keydown.enter="sendQuestion"
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
        <transition name="slide2top">
          <MultipleChoiceConsole
            v-if="multipleChoiceFlag"
            :current-assistant="currentAssistant"
            :multiple-choice-list="multipleChoiceList"
            @close="multipleChoiceClose()"
          />
        </transition>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import '../../assets/css/chat-window.less';
</style>
