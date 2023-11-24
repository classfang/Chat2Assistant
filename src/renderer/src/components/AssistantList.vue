<script setup lang="ts">
import { reactive, toRefs } from 'vue'
import { useAssistantStore } from '@renderer/store/assistant'
import { Message } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
import { copyObj } from '@renderer/utils/object-util'
import AssistantItem from '@renderer/components/AssistantItem.vue'
import Setting from '@renderer/components/Setting.vue'
import { useSystemStore } from '@renderer/store/system'

const systemStore = useSystemStore()
const assistantStore = useAssistantStore()
const { t } = useI18n()

const newFormDefault = {
  name: '',
  instruction: '',
  provider: 'OpenAI',
  model: 'gpt-3.5-turbo',
  maxTokens: 1024,
  inputMaxTokens: 1024,
  contextSize: 1
}

const data = reactive({
  newModalVisible: false,
  newForm: copyObj(newFormDefault)
})
const { newModalVisible, newForm } = toRefs(data)

const refreshAssistantListSort = () => {
  assistantStore.assistantList.sort(
    (a1, a2) =>
      Math.max(a2.createTime, a2.lastUpdateTime, a2.lastUseTime) -
      Math.max(a1.createTime, a1.lastUpdateTime, a1.lastUseTime)
  )
}

const handleNewModalBeforeOk = async () => {
  await new Promise<void>((resolve, reject) => {
    if (!data.newForm.name) {
      Message.error(`${t('assistantList.name')} ${t('common.required')}`)
      reject()
    }
    assistantStore.assistantList.push(
      copyObj({
        ...data.newForm,
        id: new Date().getTime(),
        createTime: new Date().getTime(),
        lastUpdateTime: new Date().getTime(),
        lastUseTime: new Date().getTime(),
        chatMessageList: []
      })
    )
    refreshAssistantListSort()

    resolve()
  })
  return true
}

const handleNewModalClose = () => {
  data.newForm = copyObj(newFormDefault)
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
  assistantStore.assistantList[index] = newAssistant
  refreshAssistantListSort()
}

const assistantItemDelete = (id: number) => {
  assistantStore.assistantList = assistantStore.assistantList.filter((a) => a.id != id)
  assistantStore.currentAssistantId = null
}
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
    <div class="assistant-list-container">
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
      title-align="start"
      width="80vw"
      :on-before-ok="handleNewModalBeforeOk"
      @close="handleNewModalClose"
    >
      <template #title> {{ $t('assistantList.new') }} </template>
      <div style="height: 60vh; overflow-y: auto">
        <a-form :model="newForm" layout="vertical">
          <a-form-item field="name" :label="$t('assistantList.name')">
            <a-input
              v-model="newForm.name"
              :placeholder="$t('common.pleaseEnter') + ' ' + $t('assistantList.name')"
              :max-length="20"
            />
          </a-form-item>
          <a-form-item field="instruction" :label="$t('assistantList.instruction')">
            <a-textarea
              v-model="newForm.instruction"
              :placeholder="$t('common.pleaseEnter') + ' ' + $t('assistantList.instruction')"
              allow-clear
            />
          </a-form-item>
          <a-form-item field="provider" :label="$t('assistantList.provider')">
            <a-select v-model="newForm.provider">
              <a-option value="OpenAI">{{ $t('bigModelProvider.openAI') }}</a-option>
            </a-select>
          </a-form-item>
          <a-form-item field="model" :label="$t('assistantList.model')">
            <a-select v-model="newForm.model">
              <a-option value="gpt-4-vision-preview">gpt-4-vision-preview</a-option>
              <a-option value="gpt-4-1106-preview">gpt-4-1106-preview</a-option>
              <a-option value="gpt-4">gpt-4</a-option>
              <a-option value="gpt-4-32k">gpt-4-32k</a-option>
              <a-option value="gpt-3.5-turbo">gpt-3.5-turbo</a-option>
              <a-option value="gpt-3.5-turbo-16k">gpt-3.5-turbo-16k</a-option>
            </a-select>
          </a-form-item>
          <a-form-item field="maxTokens" :label="$t('assistantList.maxTokens')">
            <a-input-number
              v-model="newForm.maxTokens"
              :placeholder="$t('common.pleaseEnter') + ' ' + $t('assistantList.maxTokens')"
              :min="1"
            />
          </a-form-item>
          <a-form-item field="inputMaxTokens" :label="$t('assistantList.inputMaxTokens')">
            <a-input-number
              v-model="newForm.inputMaxTokens"
              :placeholder="$t('common.pleaseEnter') + ' ' + $t('assistantList.inputMaxTokens')"
              :min="1"
            />
          </a-form-item>
          <a-form-item field="contextSize" :label="$t('assistantList.contextSize')">
            <a-input-number
              v-model="newForm.contextSize"
              :placeholder="$t('common.pleaseEnter') + ' ' + $t('assistantList.contextSize')"
              :min="0"
            />
          </a-form-item>
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
