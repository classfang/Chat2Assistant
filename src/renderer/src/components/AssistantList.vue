<script setup lang="ts">
import { onMounted, reactive, ref, toRefs } from 'vue'
import { useAssistantStore } from '@renderer/store/assistant'
import { Message } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
import { copyFields, copyObj } from '@renderer/utils/object-util'
import AssistantItem from '@renderer/components/AssistantItem.vue'
import Setting from '@renderer/components/Setting.vue'
import { useSystemStore } from '@renderer/store/system'
import { nowTimestamp } from '@renderer/utils/date-util'
import { randomUUID } from '@renderer/utils/id-util'
import Sortable from 'sortablejs'

const systemStore = useSystemStore()
const assistantStore = useAssistantStore()
const { t } = useI18n()

const assistantListRef = ref()

const newFormDefault = {
  name: '',
  type: 'chat',
  instruction: '',
  provider: 'OpenAI',
  model: '',
  maxTokens: 1024,
  inputMaxTokens: 1024,
  contextSize: 1,
  imageSize: '1024x1024'
}

const data = reactive({
  newModalVisible: false,
  newForm: copyObj(newFormDefault)
})
const { newModalVisible, newForm } = toRefs(data)

const handleNewModalBeforeOk = async () => {
  await new Promise<void>((resolve, reject) => {
    if (!data.newForm.name) {
      Message.error(`${t('assistantList.name')} ${t('common.required')}`)
      reject()
    }
    assistantStore.assistantList.unshift(
      copyObj({
        ...data.newForm,
        id: randomUUID(),
        createTime: nowTimestamp(),
        lastUpdateTime: nowTimestamp(),
        chatMessageList: []
      })
    )
    resolve()
  })
  return true
}

const clearNewModal = () => {
  data.newForm = copyObj(newFormDefault)
}

const newFormTypeChange = () => {
  data.newForm.provider = 'OpenAI'
  data.newForm.model = ''
}

const assistantItemActive = (assistant: Assistant) => {
  if (systemStore.chatWindowLoading) {
    return
  }
  assistantStore.currentAssistantId = assistant.id
}

const assistantItemUpdate = (newAssistant: Assistant) => {
  const index = assistantStore.assistantList.findIndex((a) => a.id === newAssistant.id)
  if (index < 0) {
    return
  }
  copyFields(newAssistant, assistantStore.assistantList[index])
}

const assistantItemDelete = (id: string) => {
  assistantStore.assistantList = assistantStore.assistantList.filter((a) => a.id != id)
  assistantStore.currentAssistantId = null
}

onMounted(() => {
  new Sortable(assistantListRef.value, {
    animation: 150,
    onEnd: (event) => {
      const { oldIndex, newIndex } = event
      const movedItem = assistantStore.assistantList.splice(oldIndex, 1)[0]
      assistantStore.assistantList.splice(newIndex, 0, movedItem)
    }
  })
})
</script>

<template>
  <div class="assistant-list">
    <div class="assistant-header">
      <a-button class="assistant-new-btn" @click="newModalVisible = true">
        <template #icon>
          <icon-plus />
        </template>
        <template #default>
          <span>{{ $t('assistantList.new') }}</span>
        </template>
      </a-button>
      <Setting class="setting-btn" />
    </div>
    <div ref="assistantListRef" class="assistant-list-container">
      <AssistantItem
        v-for="a in assistantStore.assistantList"
        :key="a.id"
        :assistant="a"
        :is-active="assistantStore.currentAssistantId === a.id"
        class="assistant-item"
        @click="assistantItemActive(a)"
        @delete="assistantItemDelete(a.id)"
        @update="assistantItemUpdate"
        @clear="a.chatMessageList = []"
      />
    </div>

    <!-- 新增助手Modal -->
    <a-modal
      v-model:visible="newModalVisible"
      :ok-text="$t('common.ok')"
      :cancel-text="$t('common.cancel')"
      unmount-on-close
      title-align="start"
      width="80vw"
      :on-before-ok="handleNewModalBeforeOk"
      @close="clearNewModal"
    >
      <template #title> {{ $t('assistantList.new') }} </template>
      <div style="height: 60vh; overflow-y: auto">
        <a-form :model="newForm" layout="vertical">
          <!-- 助手类型选择器 -->
          <a-form-item field="type" :label="$t('assistantList.type')">
            <a-radio-group v-model="newForm.type" @change="newFormTypeChange()">
              <a-radio value="chat">{{ $t('assistantList.chat') }}</a-radio>
              <a-radio value="drawing">{{ $t('assistantList.drawing') }}</a-radio>
            </a-radio-group>
          </a-form-item>
          <!-- 助手名称 -->
          <a-form-item field="name" :label="$t('assistantList.name')">
            <a-input
              v-model="newForm.name"
              :placeholder="$t('common.pleaseEnter') + ' ' + $t('assistantList.name')"
              :max-length="20"
            />
          </a-form-item>
          <!-- 对话助手参数 -->
          <template v-if="newForm.type === 'chat'">
            <!-- 指令 -->
            <a-form-item field="instruction" :label="$t('assistantList.instruction')">
              <a-textarea
                v-model="newForm.instruction"
                :placeholder="$t('common.pleaseEnter') + ' ' + $t('assistantList.instruction')"
                allow-clear
              />
            </a-form-item>
            <!-- 提供商 -->
            <a-form-item field="provider" :label="$t('assistantList.provider')">
              <a-select v-model="newForm.provider">
                <a-option value="OpenAI" @click="() => (newForm.model = 'gpt-3.5-turbo')">{{
                  $t('bigModelProvider.openAI')
                }}</a-option>
                <a-option value="Spark" @click="() => (newForm.model = 'v3.1')">{{
                  $t('bigModelProvider.spark')
                }}</a-option>
                <a-option value="ERNIEBot" @click="() => (newForm.model = 'ERNIE-Bot-turbo')">{{
                  $t('bigModelProvider.ernieBot')
                }}</a-option>
              </a-select>
            </a-form-item>
            <!-- 模型 -->
            <a-form-item field="model" :label="$t('assistantList.model')">
              <a-select v-if="newForm.provider === 'OpenAI'" v-model="newForm.model">
                <a-option value="gpt-4-vision-preview">gpt-4-vision-preview</a-option>
                <a-option value="gpt-4-1106-preview">gpt-4-1106-preview</a-option>
                <a-option value="gpt-4">gpt-4</a-option>
                <a-option value="gpt-4-32k">gpt-4-32k</a-option>
                <a-option value="gpt-3.5-turbo">gpt-3.5-turbo</a-option>
                <a-option value="gpt-3.5-turbo-16k">gpt-3.5-turbo-16k</a-option>
              </a-select>
              <a-select v-else-if="newForm.provider === 'Spark'" v-model="newForm.model">
                <a-option value="v1.1">spark-v1.5</a-option>
                <a-option value="v2.1">spark-v2.0</a-option>
                <a-option value="v3.1">spark-v3.0</a-option>
              </a-select>
              <a-select v-else-if="newForm.provider === 'ERNIEBot'" v-model="newForm.model">
                <a-option value="ERNIE-Bot 4.0">ERNIE-Bot 4.0</a-option>
                <a-option value="ERNIE-Bot-8K">ERNIE-Bot-8K</a-option>
                <a-option value="ERNIE-Bot">ERNIE-Bot</a-option>
                <a-option value="ERNIE-Bot-turbo">ERNIE-Bot-turbo</a-option>
              </a-select>
            </a-form-item>
            <!-- 生成token限制 -->
            <a-form-item field="maxTokens" :label="$t('assistantList.maxTokens')">
              <a-input-number
                v-model="newForm.maxTokens"
                :placeholder="$t('common.pleaseEnter') + ' ' + $t('assistantList.maxTokens')"
                :min="1"
              />
            </a-form-item>
            <!-- 输入token限制 -->
            <a-form-item field="inputMaxTokens" :label="$t('assistantList.inputMaxTokens')">
              <a-input-number
                v-model="newForm.inputMaxTokens"
                :placeholder="$t('common.pleaseEnter') + ' ' + $t('assistantList.inputMaxTokens')"
                :min="1"
              />
            </a-form-item>
            <!-- 上下文条数 -->
            <a-form-item field="contextSize" :label="$t('assistantList.contextSize')">
              <a-input-number
                v-model="newForm.contextSize"
                :placeholder="$t('common.pleaseEnter') + ' ' + $t('assistantList.contextSize')"
                :min="0"
              />
            </a-form-item>
          </template>
          <!-- 绘画助手参数 -->
          <template v-if="newForm.type === 'drawing'">
            <!-- 提供商 -->
            <a-form-item field="provider" :label="$t('assistantList.provider')">
              <a-select v-model="newForm.provider">
                <a-option value="OpenAI">{{ $t('bigModelProvider.openAI') }}</a-option>
              </a-select>
            </a-form-item>
            <!-- 模型 -->
            <a-form-item field="model" :label="$t('assistantList.model')">
              <a-select v-if="newForm.provider === 'OpenAI'" v-model="newForm.model">
                <a-option value="dall-e-2" @click="() => (newForm.imageSize = '1024x1024')"
                  >dall-e-2</a-option
                >
                <a-option value="dall-e-3" @click="() => (newForm.imageSize = '1024x1024')"
                  >dall-e-3</a-option
                >
              </a-select>
            </a-form-item>
            <!-- 图片大小 -->
            <a-form-item field="model" :label="$t('assistantList.imageSize')">
              <a-select v-if="newForm.provider === 'OpenAI'" v-model="newForm.imageSize">
                <a-option v-if="newForm.model === 'dall-e-2'" value="256x256">256x256</a-option>
                <a-option v-if="newForm.model === 'dall-e-2'" value="512x512">512x512</a-option>
                <a-option value="1024x1024">1024x1024</a-option>
                <a-option v-if="newForm.model === 'dall-e-3'" value="1792x1024">1792x1024</a-option>
                <a-option v-if="newForm.model === 'dall-e-3'" value="1024x1792">1024x1792</a-option>
              </a-select>
            </a-form-item>
          </template>
        </a-form>
      </div>
    </a-modal>
  </div>
</template>

<style lang="less" scoped>
.assistant-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  overflow: hidden;
  box-sizing: border-box;
  padding-bottom: 10px;

  .assistant-header {
    flex-shrink: 0;
    box-sizing: border-box;
    padding: 15px 15px 0 15px;
    display: flex;
    gap: 5px;
    align-items: center;

    .assistant-new-btn {
      flex-grow: 1;
      padding: 10px;
    }

    .setting-btn {
      flex-shrink: 0;
    }
  }

  .assistant-list-container {
    flex-grow: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-sizing: border-box;
    padding: 0 15px;
  }
}
</style>
