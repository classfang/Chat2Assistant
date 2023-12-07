<script setup lang="ts">
import { useSystemStore } from '@renderer/store/system'
import { onMounted, reactive, ref, toRefs } from 'vue'
import UserAvatar from '@renderer/components/UserAvatar.vue'
import AssistantAvatar from '@renderer/components/AssistantAvatar.vue'
import MultipleChoiceConsole from '@renderer/components/chatwindow/MultipleChoiceConsole.vue'
import ChatWindowHeader from '@renderer/components/chatwindow/ChatWindowHeader.vue'
import { useI18n } from 'vue-i18n'
import { useSettingStore } from '@renderer/store/setting'
import { Message } from '@arco-design/web-vue'
import { getChatTokensLength, getContentTokensLength } from '@renderer/utils/gpt-tokenizer-util'
import { nowTimestamp } from '@renderer/utils/date-util'
import { randomUUID } from '@renderer/utils/id-util'
import { renderMarkdown } from '@renderer/utils/markdown-util'
import { useAssistantStore } from '@renderer/store/assistant'
import { scrollToBottom } from '@renderer/utils/element-util'
import { clipboardWriteText } from '@renderer/utils/main-thread-util'
import { chat2ernieBot } from '@renderer/utils/big-model/ernie-bot-util'

const systemStore = useSystemStore()
const settingStore = useSettingStore()
const assistantStore = useAssistantStore()
const { t } = useI18n()
const abortCtr = new AbortController()

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

  // 检查输入 Token 数
  if (getContentTokensLength(data.question.trim()) > data.currentAssistant.inputMaxTokens) {
    Message.error(t('chatWindow.inputTokensLimit'))
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
  // 官方文档：https://cloud.baidu.com/doc/WENXINWORKSHOP/s/6lp69is2a
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
  scrollToBottom(chatMessageListRef.value)

  // 大模型调用
  // 文心一言模型对话
  chat2ernieBot({
    apiKey: settingStore.ernieBot.apiKey,
    secretKey: settingStore.ernieBot.secretKey,
    model: data.currentAssistant.model,
    abortCtr,
    messages: getBigModelMessages(),
    checkSession: () => sessionId === data.sessionId,
    startAnswer: (content) => {
      data.currentAssistant.chatMessageList.push({
        id: randomUUID(),
        type: 'text',
        role: 'assistant' as ChatRole,
        content,
        createTime: nowTimestamp()
      })
      scrollToBottom(chatMessageListRef.value)
      data.waitAnswer = false
    },
    appendAnswer: (content) => {
      data.currentAssistant.chatMessageList[
        data.currentAssistant.chatMessageList.length - 1
      ].content += content
      scrollToBottom(chatMessageListRef.value)
    },
    end: (err) => {
      // 关闭等待
      data.waitAnswer = false
      systemStore.chatWindowLoading = false
      if (err instanceof Error) {
        Message.error(err.message)
      }
    }
  })
}

// 将历史消息处理为大模型需要的结构
const getBigModelMessages = () => {
  // 是否存在指令
  const hasInstruction = data.currentAssistant.instruction.trim() != ''
  // 将消息历史处理为user和assistant轮流对话
  let messages: BaseMessage[] = []
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
  messages = messages.slice(-1 - data.currentAssistant.contextSize)
  // 必须user开头user结尾
  if (messages[0].role === 'assistant') {
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
    getChatTokensLength(messages) > data.currentAssistant.inputMaxTokens
  ) {
    messages.shift()
  }
  return messages
}

const stopAnswer = () => {
  data.sessionId = randomUUID()
  systemStore.chatWindowLoading = false
  data.waitAnswer = false
  abortCtr.abort()
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
    <ChatWindowHeader :current-assistant="currentAssistant" />
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
      </div>
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
</template>

<style lang="less" scoped>
@import '../../assets/css/chat-window.less';
</style>
@renderer/utils/big-model/ernie-bot-util
