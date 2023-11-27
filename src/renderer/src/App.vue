<script setup lang="ts">
import { startDarkThemeListener, changeTheme } from '@renderer/utils/theme-util'
import AssistantList from '@renderer/components/AssistantList.vue'
import OpenAIChatWindow from '@renderer/components/chatwindow/OpenAIChatWindow.vue'
import SparkChatWindow from '@renderer/components/chatwindow/SparkChatWindow.vue'
import ErnieBotChatWindow from '@renderer/components/chatwindow/ErnieBotChatWindow.vue'
import { useSettingStore } from '@renderer/store/setting'
import { useAssistantStore } from '@renderer/store/assistant'
import { onMounted, reactive, toRefs, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const settingStore = useSettingStore()
const assistantStore = useAssistantStore()
const { locale } = useI18n()

const data = reactive({
  currentAssistant: undefined as undefined | Assistant
})
const { currentAssistant } = toRefs(data)

// 主题设置监听
let stopDarkThemeListener
watch(
  () => settingStore.app.themeModel,
  () => {
    updateTheme()
  }
)
const updateTheme = () => {
  if (stopDarkThemeListener) {
    stopDarkThemeListener()
  }
  if (settingStore.app.themeModel === 0) {
    stopDarkThemeListener = startDarkThemeListener()
  } else {
    changeTheme(settingStore.app.themeModel === 2)
  }
}

// 语言设置监听
watch(
  () => settingStore.app.locale,
  (lang) => {
    locale.value = lang
  }
)

// 深度监听当前助手修改
watch(
  () => [assistantStore.currentAssistantId, assistantStore.assistantList],
  () => {
    getCurrentAssistant()
  },
  {
    deep: true
  }
)

const getCurrentAssistant = () => {
  if (assistantStore.currentAssistantId) {
    data.currentAssistant = assistantStore.assistantList.find(
      (a) => a.id === assistantStore.currentAssistantId
    )
  } else {
    data.currentAssistant = undefined
  }
}

onMounted(() => {
  // 更新主题
  updateTheme()
  // 设置语言
  locale.value = settingStore.app.locale
  // 获取当前助手
  getCurrentAssistant()
})
</script>

<template>
  <div class="app">
    <div class="app-body-left">
      <AssistantList class="assistant-list" />
    </div>
    <div class="app-body-right">
      <OpenAIChatWindow
        v-if="currentAssistant?.provider === 'OpenAI'"
        :current-assistant="currentAssistant"
        class="chat-window"
      />
      <SparkChatWindow
        v-else-if="currentAssistant?.provider === 'Spark'"
        :current-assistant="currentAssistant"
        class="chat-window"
      />
      <ErnieBotChatWindow
        v-else-if="currentAssistant?.provider === 'ERNIEBot'"
        :current-assistant="currentAssistant"
        class="chat-window"
      />
    </div>
  </div>
</template>

<style lang="less">
@import './assets/css/styles.less';
.app {
  width: 100vw;
  height: 100vh;
  display: flex;
  background-color: var(--color-bg-1);
  color: var(--color-text-1);

  .app-body-left {
    flex-shrink: 0;
    width: 250px;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--color-border-1);

    .assistant-list {
      flex-grow: 1;
    }
  }

  .app-body-right {
    flex-grow: 1;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .chat-window {
      flex-grow: 1;
    }
  }
}
</style>
