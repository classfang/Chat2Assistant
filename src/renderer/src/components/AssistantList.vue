<script setup lang="ts">
import { reactive, toRefs, ref } from 'vue'
import { useAssistantStore } from '@renderer/store/assistant'
import { Message } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
import { copyObj } from '@renderer/utils/object-util'

const assistantStore = useAssistantStore()
const { t } = useI18n()

const newFormRef = ref()

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
</script>

<template>
  <div class="assistant-list">
    <div class="assistant-new">
      <a-button type="text" @click="newModalVisible = true">
        <template #icon>
          <icon-plus style="color: var(--color-text-1)" />
        </template>
        <template #default>
          <span style="color: var(--color-text-1)">{{ $t('assistantList.new') }}</span>
        </template>
      </a-button>
    </div>
    <div class="assistant-list-container">
      <div v-for="a in assistantStore.assistantList" :key="a.createTime" class="assistant-item">
        {{ a.name }}
      </div>
    </div>
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
      <a-form ref="newFormRef" :model="newForm">
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
</template>

<style lang="less" scoped>
.assistant-list {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .assistant-new {
    flex-shrink: 0;
  }

  .assistant-list-container {
    flex-grow: 1;
    overflow-y: auto;
  }
}
</style>
