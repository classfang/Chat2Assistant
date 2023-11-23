<script setup lang="ts">
import { reactive, toRefs } from 'vue'
import { useAssistantStore } from '@renderer/store/assistant'
import { Message } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
import { copyObj } from '@renderer/utils/object-util'
import AssistantItem from '@renderer/components/AssistantItem.vue'
import Setting from '@renderer/components/Setting.vue'

const assistantStore = useAssistantStore()
const { t } = useI18n()

const data = reactive({
  newModalVisible: false,
  newForm: {
    name: '',
    instruction: '',
    provider: 'OpenAI',
    model: 'gpt-3.5-turbo'
  }
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
        lastUseTime: new Date().getTime()
      })
    )
    refreshAssistantListSort()

    resolve()
  })
  return true
}

const handleNewModalClose = () => {
  data.newForm = {
    name: '',
    instruction: '',
    provider: 'OpenAI',
    model: ''
  }
}

const assistantItemActive = (assistant: Assistant) => {
  assistantStore.currentAssistant = assistant
}

const assistantItemUpdate = (newAssistant: Assistant) => {
  const index = assistantStore.assistantList.findIndex((a) => a.id === newAssistant.id)
  console.log(newAssistant)
  if (index < 0) {
    return
  }
  assistantStore.assistantList[index] = newAssistant
  assistantStore.currentAssistant = assistantStore.assistantList[index]
  refreshAssistantListSort()
}

const assistantItemDelete = (id: number) => {
  assistantStore.assistantList = assistantStore.assistantList.filter((a) => a.id != id)
  assistantStore.currentAssistant = null
}
</script>

<template>
  <div class="assistant-list">
    <div class="assistant-header">
      <a-button class="assistant-new-btn" type="primary" @click="newModalVisible = true">
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
        :is-active="assistantStore.currentAssistant?.id === a.id"
        class="assistant-item"
        @click="assistantItemActive(a)"
        @delete="assistantItemDelete(a.id)"
        @update="assistantItemUpdate"
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
        <a-form :model="newForm">
          <a-form-item field="name" :label="$t('assistantList.name')">
            <a-input
              v-model="newForm.name"
              :placeholder="$t('common.pleaseEnter') + ' ' + $t('assistantList.name')"
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
        </a-form>
      </div>
    </a-modal>
  </div>
</template>

<style lang="less" scoped>
.assistant-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow: hidden;
  box-sizing: border-box;
  padding-bottom: 10px;

  .assistant-header {
    flex-shrink: 0;
    box-sizing: border-box;
    padding: 10px 10px 0 10px;
    display: flex;
    gap: 5px;
    align-items: center;
    opacity: 0.8;

    .assistant-new-btn {
      flex-grow: 1;
      padding: 5px;
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
    padding: 0 10px;
  }
}
</style>
