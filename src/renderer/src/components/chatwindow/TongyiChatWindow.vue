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
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useAssistantStore } from '@renderer/store/assistant'
import { scrollToBottom } from '@renderer/utils/element-util'
import { clipboardWriteText } from '@renderer/utils/main-thread-util'
import { getTongyiChatUrl } from '@renderer/utils/big-model/tongyi-util'

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
    Message.error(e ? e + '' : t('chatWindow.tongyi'))
    systemStore.chatWindowLoading = false
    data.waitAnswer = false
  }
}

const useBigModel = async (sessionId: string) => {
  // 官方文档：https://help.aliyun.com/zh/dashscope/developer-reference/api-details?spm=a2c4g.11186623.0.0.168b7abeKDCDeP#25745d61fbx49
  // 检查大模型配置
  if (!settingStore.tongyi.apiKey) {
    Message.error(t('chatWindow.tongyiConfgMiss'))
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
  if (sessionId != data.sessionId) {
    return
  }

  fetchEventSource(getTongyiChatUrl(data.currentAssistant.model), {
    signal: abortCtr.signal,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settingStore.tongyi.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'
    },
    body: JSON.stringify({
      model: data.currentAssistant.model,
      input: {
        messages: getBigModelMessages()
      }
    }),
    onmessage: (e) => {
      if (sessionId != data.sessionId) {
        return
      }
      console.log('通义千问大模型回复：', e)
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
      if (data.currentAssistant.model === 'qwen-vl-plus') {
        data.currentAssistant.chatMessageList[
          data.currentAssistant.chatMessageList.length - 1
        ].content = JSON.parse(e.data).output?.choices[0]?.message?.content[0]?.text ?? ''
      } else {
        data.currentAssistant.chatMessageList[
          data.currentAssistant.chatMessageList.length - 1
        ].content = JSON.parse(e.data).output?.text ?? ''
      }

      scrollToBottom(chatMessageListRef.value)
    },
    onclose: () => {
      console.log('通义千问大模型关闭连接')
      // 关闭等待
      data.waitAnswer = false
      systemStore.chatWindowLoading = false
    },
    onerror: (err: any) => {
      console.log('通义千问大模型错误：', err)
      // 关闭等待
      data.waitAnswer = false
      systemStore.chatWindowLoading = false
      // 抛出异常防止重连
      if (err instanceof Error) {
        Message.error(err.message)
        throw err
      }
    }
  })
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
    getChatTokensLength(messages) > data.currentAssistant.inputMaxTokens
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
  // 第一条消息的 role 必须是 system 或者 user
  while (messages[0].role === 'assistant') {
    messages.shift()
  }

  // 处理
  if (data.currentAssistant.model === 'qwen-vl-plus') {
    return messages.map((msg) => {
      return { role: msg.role, content: [{ text: msg.content }] }
    })
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
@renderer/utils/big-model/tongyi-util
