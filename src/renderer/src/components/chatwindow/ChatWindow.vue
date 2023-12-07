<script setup lang="ts">
import { useSystemStore } from '@renderer/store/system'
import { onMounted, reactive, ref, toRefs } from 'vue'
import UserAvatar from '@renderer/components/UserAvatar.vue'
import AssistantAvatar from '@renderer/components/AssistantAvatar.vue'
import MultipleChoiceConsole from '@renderer/components/chatwindow/MultipleChoiceConsole.vue'
import ChatWindowHeader from '@renderer/components/chatwindow/ChatWindowHeader.vue'
import { useI18n } from 'vue-i18n'
import { useSettingStore } from '@renderer/store/setting'
import { FileItem, Message, RequestOption } from '@arco-design/web-vue'
import { getContentTokensLength } from '@renderer/utils/gpt-tokenizer-util'
import { downloadFile } from '@renderer/utils/download-util'
import { nowTimestamp } from '@renderer/utils/date-util'
import { randomUUID } from '@renderer/utils/id-util'
import { renderMarkdown } from '@renderer/utils/markdown-util'
import { useAssistantStore } from '@renderer/store/assistant'
import { clipboardWriteText } from '@renderer/utils/main-thread-util'
import { scrollToBottom } from '@renderer/utils/element-util'
import { saveFileByPath } from '@renderer/utils/main-thread-util'
import { CommonChatOption, chat2bigModel } from '@renderer/utils/big-model'

const systemStore = useSystemStore()
const settingStore = useSettingStore()
const assistantStore = useAssistantStore()
const { t } = useI18n()

const chatMessageListRef = ref()

const abortCtr = new AbortController()

const data = reactive({
  sessionId: randomUUID(),
  currentAssistant: assistantStore.getCurrentAssistant,
  question: '',
  selectImageList: [] as FileItem[],
  waitAnswer: false,
  multipleChoiceFlag: false,
  multipleChoiceList: [] as string[]
})
const {
  currentAssistant,
  question,
  selectImageList,
  waitAnswer,
  multipleChoiceFlag,
  multipleChoiceList
} = toRefs(data)

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
    Message.error(e ? e + '' : t(`chatWindow.error.${data.currentAssistant.provider}`))
    systemStore.chatWindowLoading = false
    data.waitAnswer = false
  }
}

const useBigModel = async (sessionId: string) => {
  // 检查大模型配置
  let configErrorFalg = false
  switch (data.currentAssistant.provider) {
    case 'OpenAI':
      if (!settingStore.openAI.baseUrl || !settingStore.openAI.key) {
        configErrorFalg = true
      }
      break
    case 'Spark':
      if (!settingStore.spark.appId || !settingStore.spark.secret || !settingStore.spark.key) {
        configErrorFalg = true
      }
      break
    case 'ERNIEBot':
      if (!settingStore.ernieBot.apiKey || !settingStore.ernieBot.secretKey) {
        configErrorFalg = true
      }
      break
    case 'Tongyi':
      if (!settingStore.tongyi.apiKey) {
        configErrorFalg = true
      }
      break
  }
  if (configErrorFalg) {
    Message.error(t(`chatWindow.configMiss.${data.currentAssistant.provider}`))
    return
  }

  // 开启等待
  systemStore.chatWindowLoading = true
  data.waitAnswer = true

  // 处理并清空问题输入
  const question = data.question.trim()
  data.question = ''

  // 处理并清空图片数据
  let questionImage = ''
  if (data.selectImageList[0]) {
    const imagePath = data.selectImageList[0].file?.path
    if (data.currentAssistant.model === 'gpt-4-vision-preview' && imagePath) {
      questionImage = await saveFileByPath(
        imagePath,
        `${randomUUID()}${imagePath.substring(imagePath.lastIndexOf('.'))}`
      )
    }
    data.selectImageList = []
  }

  data.currentAssistant.chatMessageList.push({
    id: randomUUID(),
    type: 'text',
    role: 'user',
    content: question,
    image: questionImage,
    createTime: nowTimestamp()
  })

  scrollToBottom(chatMessageListRef.value)

  // 大模型调用
  const chat2bigModelOption: CommonChatOption = {
    model: data.currentAssistant.model,
    instruction: data.currentAssistant.instruction,
    inputMaxTokens: data.currentAssistant.inputMaxTokens,
    contextSize: data.currentAssistant.contextSize,
    messages: data.currentAssistant.chatMessageList,
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
    end: () => {
      // 关闭等待
      systemStore.chatWindowLoading = false
    }
  }
  let otherOption = {}
  switch (data.currentAssistant.provider) {
    case 'OpenAI':
      otherOption = {
        apiKey: settingStore.openAI.key,
        baseURL: settingStore.openAI.baseUrl,
        type: data.currentAssistant.type,
        maxTokens: data.currentAssistant.maxTokens,
        imagePrompt: question,
        imageSize: data.currentAssistant.imageSize,
        appendAnswer: (content) => {
          data.currentAssistant.chatMessageList[
            data.currentAssistant.chatMessageList.length - 1
          ].content += content
          scrollToBottom(chatMessageListRef.value)
        },
        imageGenerated: (imageUrl) => {
          data.currentAssistant.chatMessageList.push({
            id: randomUUID(),
            type: 'img',
            role: 'assistant' as ChatRole,
            content: '',
            image: imageUrl,
            createTime: nowTimestamp()
          })
          scrollToBottom(chatMessageListRef.value)
          data.waitAnswer = false
        }
      }
      break
    case 'Spark':
      otherOption = {
        appId: settingStore.spark.appId,
        secretKey: settingStore.spark.secret,
        apiKey: settingStore.spark.key,
        appendAnswer: (content) => {
          data.currentAssistant.chatMessageList[
            data.currentAssistant.chatMessageList.length - 1
          ].content += content
          scrollToBottom(chatMessageListRef.value)
        }
      }
      break
    case 'ERNIEBot':
      otherOption = {
        apiKey: settingStore.ernieBot.apiKey,
        secretKey: settingStore.ernieBot.secretKey,
        abortCtr: abortCtr,
        appendAnswer: (content) => {
          data.currentAssistant.chatMessageList[
            data.currentAssistant.chatMessageList.length - 1
          ].content += content
          scrollToBottom(chatMessageListRef.value)
        }
      }
      break
    case 'Tongyi':
      otherOption = {
        apiKey: settingStore.tongyi.apiKey,
        abortCtr,
        appendAnswer: (content) => {
          data.currentAssistant.chatMessageList[
            data.currentAssistant.chatMessageList.length - 1
          ].content = content
          scrollToBottom(chatMessageListRef.value)
        }
      }
      break
  }
  chat2bigModel(data.currentAssistant.provider, {
    ...chat2bigModelOption,
    ...otherOption
  })
}

const stopAnswer = () => {
  data.sessionId = randomUUID()
  systemStore.chatWindowLoading = false
  data.waitAnswer = false
  abortCtr.abort()
}

const selectImageRequest = (option: RequestOption) => {
  const { fileItem, onSuccess } = option
  data.selectImageList = [fileItem]
  onSuccess()

  return {
    abort: () => {}
  }
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
            class="chat-message-checkbox"
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
            <a-image
              v-if="msg.image"
              class="chat-message-img"
              width="300"
              height="300"
              :src="`file://${msg.image}`"
              show-loader
              fit="cover"
            >
              <template #preview-actions>
                <a-image-preview-action
                  name="下载"
                  @click="downloadFile(`file://${msg.image}`, `img-${msg.id}.png`)"
                  ><icon-download
                /></a-image-preview-action>
              </template>
            </a-image>
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
        <div
          v-if="currentAssistant.model === 'gpt-4-vision-preview'"
          class="chat-input-select-image"
        >
          <a-upload
            :file-list="selectImageList"
            :limit="1"
            :custom-request="selectImageRequest"
            accept="image/*"
          >
            <template #upload-button>
              <a-button size="small">{{ $t('chatWindow.selectImage') }}</a-button>
            </template>
          </a-upload>
        </div>
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
