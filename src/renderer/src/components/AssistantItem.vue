<script setup lang="ts">
import { Message, Modal } from '@arco-design/web-vue'
import { copyObj } from '@renderer/utils/object-util'
import { reactive, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import AssistantAvatar from '@renderer/components/AssistantAvatar.vue'
import { useSystemStore } from '@renderer/store/system'
import { nowTimestamp } from '@renderer/utils/date-util'

const systemStore = useSystemStore()

const { t } = useI18n()

const props = defineProps({
  assistant: {
    type: Object as () => Assistant,
    default: () => {}
  },
  isActive: {
    type: Boolean,
    default: false
  }
})

const data = reactive({
  editModalVisible: false,
  editForm: {} as Assistant
})
const { editModalVisible, editForm } = toRefs(data)

const emits = defineEmits(['update', 'clear', 'delete'])

const edit = () => {
  if (systemStore.chatWindowLoading) {
    return
  }
  data.editForm = copyObj(props.assistant)
  data.editModalVisible = true
}

const handleEditModalBeforeOk = async () => {
  await new Promise<void>((resolve, reject) => {
    if (!data.editForm.name) {
      Message.error(`${t('assistantList.name')} ${t('common.required')}`)
      reject()
    }
    data.editForm.lastUpdateTime = nowTimestamp()
    emits('update', data.editForm)

    resolve()
  })
  return true
}

const clearConfirm = () => {
  if (systemStore.chatWindowLoading) {
    return
  }
  Modal.confirm({
    title: t('common.clearConfirm'),
    content: t('common.clearConfirmContent'),
    okText: t('common.ok'),
    cancelText: t('common.cancel'),
    onOk: () => {
      emits('clear')
    }
  })
}

const deleteConfirm = () => {
  if (systemStore.chatWindowLoading) {
    return
  }
  Modal.confirm({
    title: t('common.deleteConfirm'),
    content: t('common.deleteConfirmContent'),
    okText: t('common.ok'),
    cancelText: t('common.cancel'),
    onOk: () => {
      emits('delete')
    }
  })
}
</script>

<template>
  <div class="assistant-item" :class="{ 'assistant-item-active': isActive }">
    <AssistantAvatar :provider="assistant.provider" class="assistant-item-avatar" />
    <div class="assistant-item-name">{{ assistant.name }}</div>
    <a-popover v-if="isActive" position="br" trigger="click" :content-style="{ padding: '5px' }">
      <icon-more style="font-size: 15px; font-weight: 500; flex-shrink: 0" />
      <template #content>
        <a-space direction="vertical" fill>
          <a-button
            type="text"
            style="width: 100%; color: var(--color-text-1)"
            size="small"
            @click="edit"
            >{{ $t('common.edit') }}</a-button
          >
          <a-button
            type="text"
            style="width: 100%"
            status="danger"
            size="small"
            @click="clearConfirm"
            >{{ $t('common.clear') }}</a-button
          >
          <a-button
            type="text"
            style="width: 100%"
            status="danger"
            size="small"
            @click="deleteConfirm"
            >{{ $t('common.delete') }}</a-button
          >
        </a-space>
      </template>
    </a-popover>

    <!-- 新增助手Modal -->
    <a-modal
      v-model:visible="editModalVisible"
      :ok-text="$t('common.ok')"
      :cancel-text="$t('common.cancel')"
      unmount-on-close
      title-align="start"
      width="80vw"
      :on-before-ok="handleEditModalBeforeOk"
    >
      <template #title> {{ $t('assistantList.new') }} </template>
      <div style="height: 60vh; overflow-y: auto">
        <a-form :model="editForm" layout="vertical">
          <a-form-item field="name" :label="$t('assistantList.name')">
            <a-input
              v-model="editForm.name"
              :placeholder="$t('common.pleaseEnter') + ' ' + $t('assistantList.name')"
              :max-length="20"
            />
          </a-form-item>
          <!-- 对话助手参数 -->
          <template v-if="assistant.type === 'chat'">
            <a-form-item field="instruction" :label="$t('assistantList.instruction')">
              <a-textarea
                v-model="editForm.instruction"
                :placeholder="$t('common.pleaseEnter') + ' ' + $t('assistantList.instruction')"
                allow-clear
              />
            </a-form-item>
            <a-form-item field="provider" :label="$t('assistantList.provider')">
              <a-select v-model="editForm.provider">
                <a-option value="OpenAI" @click="() => (editForm.model = 'gpt-3.5-turbo')">{{
                  $t('bigModelProvider.openAI')
                }}</a-option>
                <a-option value="Spark" @click="() => (editForm.model = 'v3.1')">{{
                  $t('bigModelProvider.spark')
                }}</a-option>
                <a-option value="ERNIEBot" @click="() => (editForm.model = 'ERNIE-Bot-turbo')">{{
                  $t('bigModelProvider.ernieBot')
                }}</a-option>
              </a-select>
            </a-form-item>
            <a-form-item field="model" :label="$t('assistantList.model')">
              <a-select v-if="editForm.provider === 'OpenAI'" v-model="editForm.model">
                <a-option value="gpt-4-vision-preview">gpt-4-vision-preview</a-option>
                <a-option value="gpt-4-1106-preview">gpt-4-1106-preview</a-option>
                <a-option value="gpt-4">gpt-4</a-option>
                <a-option value="gpt-4-32k">gpt-4-32k</a-option>
                <a-option value="gpt-3.5-turbo">gpt-3.5-turbo</a-option>
                <a-option value="gpt-3.5-turbo-16k">gpt-3.5-turbo-16k</a-option>
              </a-select>
              <a-select v-else-if="editForm.provider === 'Spark'" v-model="editForm.model">
                <a-option value="v1.1">spark-v1.5</a-option>
                <a-option value="v2.1">spark-v2.0</a-option>
                <a-option value="v3.1">spark-v3.0</a-option>
              </a-select>
              <a-select v-else-if="editForm.provider === 'ERNIEBot'" v-model="editForm.model">
                <a-option value="ERNIE-Bot 4.0">ERNIE-Bot 4.0</a-option>
                <a-option value="ERNIE-Bot-8K">ERNIE-Bot-8K</a-option>
                <a-option value="ERNIE-Bot">ERNIE-Bot</a-option>
                <a-option value="ERNIE-Bot-turbo">ERNIE-Bot-turbo</a-option>
              </a-select>
            </a-form-item>
            <a-form-item field="maxTokens" :label="$t('assistantList.maxTokens')">
              <a-input-number
                v-model="editForm.maxTokens"
                :placeholder="$t('common.pleaseEnter') + ' ' + $t('assistantList.maxTokens')"
                :min="1"
              />
            </a-form-item>
            <a-form-item field="inputMaxTokens" :label="$t('assistantList.inputMaxTokens')">
              <a-input-number
                v-model="editForm.inputMaxTokens"
                :placeholder="$t('common.pleaseEnter') + ' ' + $t('assistantList.inputMaxTokens')"
                :min="1"
              />
            </a-form-item>
            <a-form-item field="contextSize" :label="$t('assistantList.contextSize')">
              <a-input-number
                v-model="editForm.contextSize"
                :placeholder="$t('common.pleaseEnter') + ' ' + $t('assistantList.contextSize')"
                :min="0"
              />
            </a-form-item>
          </template>
          <!-- 绘画助手参数 -->
          <template v-if="assistant.type === 'drawing'">
            <!-- 提供商 -->
            <a-form-item field="provider" :label="$t('assistantList.provider')">
              <a-select v-model="editForm.provider">
                <a-option value="OpenAI">{{ $t('bigModelProvider.openAI') }}</a-option>
              </a-select>
            </a-form-item>
            <!-- 模型 -->
            <a-form-item field="model" :label="$t('assistantList.model')">
              <a-select v-if="editForm.provider === 'OpenAI'" v-model="editForm.model">
                <a-option value="dall-e-2" @click="() => (editForm.imageSize = '1024x1024')"
                  >dall-e-2</a-option
                >
                <a-option value="dall-e-3" @click="() => (editForm.imageSize = '1024x1024')"
                  >dall-e-3</a-option
                >
              </a-select>
            </a-form-item>
            <!-- 图片大小 -->
            <a-form-item field="model" :label="$t('assistantList.imageSize')">
              <a-select v-if="editForm.provider === 'OpenAI'" v-model="editForm.imageSize">
                <a-option v-if="editForm.model === 'dall-e-2'" value="256x256">256x256</a-option>
                <a-option v-if="editForm.model === 'dall-e-2'" value="512x512">512x512</a-option>
                <a-option value="1024x1024">1024x1024</a-option>
                <a-option v-if="editForm.model === 'dall-e-3'" value="1792x1024"
                  >1792x1024</a-option
                >
                <a-option v-if="editForm.model === 'dall-e-3'" value="1024x1792"
                  >1024x1792</a-option
                >
              </a-select>
            </a-form-item>
          </template>
        </a-form>
      </div>
    </a-modal>
  </div>
</template>

<style lang="less" scoped>
.assistant-item {
  width: 100%;
  box-sizing: border-box;
  padding: 15px;
  background-color: var(--color-fill-1);
  border-radius: var(--border-radius-small);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 15px;

  &:hover {
    background-color: var(--color-fill-2);
  }

  .assistant-item-avatar {
    flex-shrink: 0;
  }

  .assistant-item-name {
    flex-grow: 1;
    font-size: 15px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.assistant-item-active {
  background-color: var(--color-fill-3) !important;
}
</style>
