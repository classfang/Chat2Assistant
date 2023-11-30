<script setup lang="ts">
import { useSystemStore } from '@renderer/store/system'
import { onMounted, reactive, ref, toRefs } from 'vue'
import UserAvatar from '@renderer/components/UserAvatar.vue'
import AssistantAvatar from '@renderer/components/AssistantAvatar.vue'
import MultipleChoiceConsole from '@renderer/components/chatwindow/MultipleChoiceConsole.vue'
import { useI18n } from 'vue-i18n'
import { useSettingStore } from '@renderer/store/setting'
import { FileItem, Message, RequestOption } from '@arco-design/web-vue'
import OpenAI from 'openai'
import { encodeChat } from 'gpt-tokenizer'
import { downloadFile } from '@renderer/utils/download-util'
import { nowTimestamp } from '@renderer/utils/date-util'
import { randomUUID } from '@renderer/utils/id-util'
import { renderMarkdown } from '@renderer/utils/markdown-util'
import { useAssistantStore } from '@renderer/store/assistant'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { clipboardWriteText } from '@renderer/utils/main-thread-util'
import { scrollToBottom } from '@renderer/utils/element-util'
import {
  readLocalImageBase64,
  saveFileByPath,
  saveFileByUrl
} from '@renderer/utils/main-thread-util'

const systemStore = useSystemStore()
const settingStore = useSettingStore()
const assistantStore = useAssistantStore()
const { t } = useI18n()

const chatMessageListRef = ref()

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
  const openai = new OpenAI({
    apiKey: settingStore.openAI.key,
    baseURL: settingStore.openAI.baseUrl,
    dangerouslyAllowBrowser: true
  })
  if (data.currentAssistant.type === 'chat') {
    // OpenAI对话
    const stream = await openai.chat.completions.create({
      messages: (await getBigModelMessages()) as Array<ChatCompletionMessageParam>,
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
    scrollToBottom(chatMessageListRef.value)
    data.waitAnswer = false
    for await (const chunk of stream) {
      if (sessionId != data.sessionId) {
        return
      }
      console.log(`OpenAi【消息】: ${JSON.stringify(chunk.choices[0])}`)
      data.currentAssistant.chatMessageList[
        data.currentAssistant.chatMessageList.length - 1
      ].content += chunk.choices[0].delta.content ?? ''
      scrollToBottom(chatMessageListRef.value)
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
      imageUrl = await saveFileByUrl(imageUrl, `${randomUUID()}.png`)
    }
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

  // 关闭等待
  systemStore.chatWindowLoading = false
}

// 将历史消息处理为大模型需要的结构
const getBigModelMessages = async () => {
  // 是否是图片问题
  const lastChatMessage =
    data.currentAssistant.chatMessageList[data.currentAssistant.chatMessageList.length - 1]
  if (lastChatMessage.image) {
    const imageBase64Data = await readLocalImageBase64(lastChatMessage.image)
    return [
      {
        role: 'user',
        content: [
          { type: 'text', text: lastChatMessage.content },
          {
            type: 'image_url',
            image_url: `data:image/jpg;base64,${imageBase64Data}`
          }
        ]
      }
    ]
  }

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

const stopAnswer = () => {
  data.sessionId = randomUUID()
  systemStore.chatWindowLoading = false
  data.waitAnswer = false
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
            <a-image
              v-if="msg.image"
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
