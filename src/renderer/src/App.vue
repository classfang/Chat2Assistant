<script setup lang="ts">
import { startDarkThemeListener, changeTheme } from '@renderer/utils/theme-util'
import AssistantList from '@renderer/components/AssistantList.vue'
import OpenAIChatWindow from '@renderer/components/chatwindow/OpenAIChatWindow.vue'
import SparkChatWindow from '@renderer/components/chatwindow/SparkChatWindow.vue'
import ErnieBotChatWindow from '@renderer/components/chatwindow/ErnieBotChatWindow.vue'
import EmptyChatWindow from '@renderer/components/chatwindow/EmptyChatWindow.vue'
import { useSettingStore } from '@renderer/store/setting'
import { useAssistantStore } from '@renderer/store/assistant'
import { onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const settingStore = useSettingStore()
const assistantStore = useAssistantStore()
const { locale } = useI18n()

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

onMounted(() => {
  // 更新主题
  updateTheme()
  // 设置语言
  locale.value = settingStore.app.locale
})
</script>

<template>
  <div class="app">
    <div class="app-body-left">
      <AssistantList class="assistant-list" />
    </div>
    <div class="app-body-right">
      <OpenAIChatWindow
        v-if="assistantStore.getCurrentAssistant.provider === 'OpenAI'"
        :key="'OpenAI' + assistantStore.getCurrentAssistant.id"
        class="chat-window"
      />
      <SparkChatWindow
        v-else-if="assistantStore.getCurrentAssistant.provider === 'Spark'"
        :key="'Spark' + assistantStore.getCurrentAssistant.id"
        class="chat-window"
      />
      <ErnieBotChatWindow
        v-else-if="assistantStore.getCurrentAssistant.provider === 'ERNIEBot'"
        :key="'ERNIEBot' + assistantStore.getCurrentAssistant.id"
        class="chat-window"
      />
      <EmptyChatWindow v-else />
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
