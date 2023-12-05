<script setup lang="ts">
import { startDarkThemeListener, changeTheme } from '@renderer/utils/theme-util'
import UserAvatar from '@renderer/components/UserAvatar.vue'
import Setting from '@renderer/components/Setting.vue'
import AssistantList from '@renderer/components/AssistantList.vue'
import WebApp from '@renderer/components/WebApp.vue'
import CollectionSet from '@renderer/components/CollectionSet.vue'
import OpenAIChatWindow from '@renderer/components/chatwindow/OpenAIChatWindow.vue'
import SparkChatWindow from '@renderer/components/chatwindow/SparkChatWindow.vue'
import ErnieBotChatWindow from '@renderer/components/chatwindow/ErnieBotChatWindow.vue'
import TongyiChatWindow from '@renderer/components/chatwindow/TongyiChatWindow.vue'
import EmptyChatWindow from '@renderer/components/chatwindow/EmptyChatWindow.vue'
import { useSystemStore } from '@renderer/store/system'
import { useSettingStore } from '@renderer/store/setting'
import { useAssistantStore } from '@renderer/store/assistant'
import { onMounted, reactive, toRefs, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const systemStore = useSystemStore()
const settingStore = useSettingStore()
const assistantStore = useAssistantStore()
const { locale } = useI18n()

const data = reactive({
  currentPage: 'chat'
})
const { currentPage } = toRefs(data)

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

// 页面切换
const changePage = (page: string) => {
  if (systemStore.chatWindowLoading) {
    return
  }
  data.currentPage = page
}

onMounted(() => {
  // 更新主题
  updateTheme()
  // 设置语言
  locale.value = settingStore.app.locale
})
</script>

<template>
  <div class="app">
    <!-- 侧边栏 -->
    <div class="app-sidebar drag-area">
      <UserAvatar class="no-drag-area" :editable="true" :size="36" />
      <icon-message
        class="app-siderbar-item no-drag-area"
        :class="{ 'app-siderbar-item-active': currentPage === 'chat' }"
        @click="changePage('chat')"
      />
      <icon-common
        class="app-siderbar-item no-drag-area"
        :class="{ 'app-siderbar-item-active': currentPage === 'collect' }"
        @click="changePage('collect')"
      />
      <icon-public
        class="app-siderbar-item no-drag-area"
        :class="{ 'app-siderbar-item-active': currentPage === 'web-app' }"
        @click="changePage('web-app')"
      />
      <Setting style="margin-top: auto">
        <template #default>
          <icon-settings class="app-siderbar-item no-drag-area" />
        </template>
      </Setting>
    </div>

    <!-- 多页面 -->
    <div v-show="currentPage === 'chat'" class="app-body">
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
        <TongyiChatWindow
          v-else-if="assistantStore.getCurrentAssistant.provider === 'Tongyi'"
          :key="'Tongyi' + assistantStore.getCurrentAssistant.id"
          class="chat-window"
        />
        <EmptyChatWindow v-else />
      </div>
    </div>
    <div v-show="currentPage === 'collect'" class="app-body">
      <CollectionSet />
    </div>
    <div v-show="currentPage === 'web-app'" class="app-body">
      <WebApp />
    </div>

    <!-- 全局加载遮罩 -->
    <div v-if="systemStore.globalLoading" class="global-loading">
      <a-spin :size="26" />
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

  .app-sidebar {
    flex-shrink: 0;
    width: 65px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 25px;
    box-sizing: border-box;
    padding: 65px 0 15px 0;
    background-color: var(--color-fill-2);

    .app-siderbar-item {
      font-size: 30px;
      stroke-width: 2;
      color: var(--color-text-2);
    }

    .app-siderbar-item-active {
      stroke-width: 3;
      color: rgb(var(--primary-6));
    }
  }

  .app-body {
    flex-grow: 1;
    display: flex;
    overflow: hidden;
    .app-body-left {
      flex-shrink: 0;
      width: 250px;
      height: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--color-border-1);
      box-sizing: border-box;

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

  .global-loading {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.3);
  }
}
</style>
