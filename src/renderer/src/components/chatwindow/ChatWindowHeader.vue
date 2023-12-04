<script setup lang="ts">
defineProps({
  currentAssistant: {
    type: Object as () => { name: string; provider: BigModelProvider; model: string },
    default: () => {}
  }
})
</script>

<template>
  <div class="chat-window-header drag-area">
    <div class="assistant-name">{{ currentAssistant.name }}</div>
    <div class="assistant-desc">
      <a-space :size="10">
        <a-tag>{{ $t(`bigModelProvider.${currentAssistant.provider}`) }}</a-tag>
        <a-tag>{{ currentAssistant.model }}</a-tag>
      </a-space>
    </div>
  </div>
</template>

<style lang="less" scoped>
.chat-window-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border-1);
  box-sizing: border-box;
  padding: 15px;

  .assistant-name {
    font-size: 16px;
    font-weight: 500;
  }
}
</style>
