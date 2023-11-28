<template>
  <div class="web-app-window">
    <webview
      ref="webviewRef"
      class="webview"
      :src="currentUrl"
      :allowpopups="allowpopups"
      @did-start-loading="webviewStartLoad"
      @did-stop-loading="webviewEndLoad"
    ></webview>
    <div v-if="isWebviewLoading" class="webview-loading">
      <a-spin dot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, toRefs } from 'vue'

const webviewRef = ref()

const props = defineProps({
  url: {
    type: String,
    default: () => ''
  },
  allowpopups: {
    type: Boolean,
    default: () => false
  }
})

const data = reactive({
  currentUrl: props.url,
  isWebviewLoading: false
})
const { currentUrl, isWebviewLoading } = toRefs(data)

// webview加载完开始
const webviewStartLoad = (): void => {
  data.isWebviewLoading = true
}

// webview加载完毕
const webviewEndLoad = (): void => {
  data.isWebviewLoading = false
}
</script>
<style scoped lang="less">
.web-app-window {
  height: 100%;
  width: 100%;
  .webview {
    height: 100%;
    background-color: var(--color-bg-1);
    position: relative;
  }

  .webview-loading {
    height: 100%;
    width: 100%;
    position: absolute;
    top: 40px;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
