<script setup lang="ts">
import { startDarkThemeListener, changeTheme } from '@renderer/utils/theme-util'
import AssistantList from '@renderer/components/AssistantList.vue'
import ChatWindow from '@renderer/components/ChatWindow.vue'
import { useSettingStore } from '@renderer/store/setting'
import { onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const settingStore = useSettingStore()
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
      <ChatWindow class="chat-window" />
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
    box-sizing: border-box;
    padding: 10px;

    .chat-window {
      flex-grow: 1;
    }
  }
}
</style>
