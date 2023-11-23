<script setup lang="ts">
import { onMounted } from 'vue'
import { startDarkThemeListener, toggleTheme } from '@renderer/utils/themeUtil'
import UserInfo from '@renderer/components/UserInfo.vue'
import AssistantList from '@renderer/components/AssistantList.vue'
import ChatWindow from '@renderer/components/ChatWindow.vue'

onMounted(() => {
  // 监听主题
  startDarkThemeListener()
})
</script>

<template>
  <div class="app">
    <div class="app-body-left">
      <AssistantList class="assistant-list" />
      <UserInfo class="user-info" />
    </div>
    <div class="app-body-right">
      <ChatWindow class="chat-window" @click="toggleTheme()" />
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
    box-sizing: border-box;
    padding: 15px;
    background-color: var(--color-fill-1);

    .assistant-list {
      flex-grow: 1;
    }

    .user-info {
      flex-shrink: 0;
      height: 50px;
    }
  }

  .app-body-right {
    flex-grow: 1;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding: 15px;

    .chat-window {
      flex-grow: 1;
    }
  }
}
</style>
