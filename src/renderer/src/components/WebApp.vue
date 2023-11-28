<script setup lang="ts">
import MyWebView from '@renderer/components/MyWebView.vue'
</script>

<template>
  <div class="web-app">
    <a-tabs default-active-key="1">
      <a-tab-pane key="1" :title="$t('bigModelProvider.openAI')">
        <MyWebView url="https://chat.openai.com" :allowpopups="true" class="web-app-webview" />
      </a-tab-pane>
      <a-tab-pane key="2" :title="$t('bigModelProvider.spark')">
        <MyWebView
          url="https://xinghuo.xfyun.cn/desk"
          :allowpopups="true"
          class="web-app-webview"
        />
      </a-tab-pane>
      <a-tab-pane key="3" :title="$t('bigModelProvider.ernieBot')">
        <MyWebView url="https://yiyan.baidu.com" :allowpopups="true" class="web-app-webview" />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<style lang="less" scoped>
.web-app {
  width: 100%;

  .web-app-webview {
    width: 100%;
    height: calc(100vh - 40px - 5px);
    border: none;
  }

  :deep(.arco-tabs-content) {
    padding-top: 5px;
  }
}
</style>
