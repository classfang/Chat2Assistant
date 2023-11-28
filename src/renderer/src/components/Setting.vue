<script setup lang="ts">
import { useSettingStore } from '@renderer/store/setting'
import { onMounted, reactive, toRefs } from 'vue'
import { useSystemStore } from '@renderer/store/system'
import { openInBrowser } from '@renderer/utils/window-util'
import { openCacheDir, setProxy, getAppVersion } from '@renderer/utils/main-thread-util'

const systemStore = useSystemStore()
const settingStore = useSettingStore()

const data = reactive({
  modalVisible: false,
  appVersion: '--'
})
const { modalVisible, appVersion } = toRefs(data)

onMounted(() => {
  getAppVersion().then((v) => {
    data.appVersion = `v${v}`
  })
  setProxy(settingStore.app.proxy)
})
</script>

<template>
  <div class="setting">
    <div @click="modalVisible = !systemStore.chatWindowLoading">
      <slot name="default"></slot>
    </div>

    <!-- 设置Modal -->
    <a-modal
      v-model:visible="modalVisible"
      :footer="false"
      unmount-on-close
      title-align="start"
      width="80vw"
    >
      <template #title> {{ $t('setting.name') }} </template>
      <div style="height: 60vh; overflow-y: auto">
        <a-tabs position="left">
          <a-tab-pane key="1" :title="$t('setting.app.name')">
            <a-space direction="vertical" :size="20" fill>
              <a-space direction="vertical" :size="10">
                <div>{{ $t('setting.app.theme.name') }}</div>
                <a-radio-group v-model="settingStore.app.themeModel" type="button" size="small">
                  <a-radio :value="0">{{ $t('setting.app.theme.system') }}</a-radio>
                  <a-radio :value="1">{{ $t('setting.app.theme.light') }}</a-radio>
                  <a-radio :value="2">{{ $t('setting.app.theme.dark') }}</a-radio>
                </a-radio-group>
              </a-space>
              <a-space direction="vertical" :size="10" fill>
                <div>{{ $t('setting.app.local') }}</div>
                <a-select v-model="settingStore.app.locale" size="small">
                  <a-option value="zh">中文</a-option>
                  <a-option value="en">English</a-option>
                </a-select>
              </a-space>
              <a-space direction="vertical" :size="10" fill>
                <div>{{ $t('setting.app.proxy') }}</div>
                <a-input
                  v-model="settingStore.app.proxy"
                  size="small"
                  :placeholder="$t('common.pleaseEnter') + ' ' + $t('setting.app.proxy')"
                  @change="setProxy(settingStore.app.proxy)"
                />
              </a-space>
              <a-space direction="vertical" :size="10">
                <div>{{ $t('setting.app.cache') }}</div>
                <a-button size="mini" @click="openCacheDir()">{{
                  $t('setting.app.cachePath')
                }}</a-button>
              </a-space>
              <a-space direction="vertical" :size="10">
                <div>{{ $t('setting.app.version') }}</div>
                <div>
                  <a-space :size="20">
                    <div>{{ $t('setting.app.currentVersion') }} {{ appVersion }}</div>
                    <a-button
                      size="mini"
                      @click="openInBrowser('https://github.com/classfang/Chat2Assistant/releases')"
                      >{{ $t('setting.app.downloadVersion') }}</a-button
                    >
                  </a-space>
                </div>
              </a-space>
            </a-space>
          </a-tab-pane>
          <a-tab-pane key="2" :title="$t('setting.openAI.name')">
            <a-space direction="vertical" :size="20" fill>
              <a-space direction="vertical" :size="10" fill>
                <div>{{ $t('setting.officialWebsite') }}</div>
                <a-link @click="openInBrowser('https://openai.com')">https://openai.com</a-link>
              </a-space>
              <a-space direction="vertical" :size="10" fill>
                <div>{{ $t('setting.openAI.baseUrl') }}</div>
                <a-input
                  v-model="settingStore.openAI.baseUrl"
                  size="small"
                  :placeholder="$t('common.pleaseEnter') + ' ' + $t('setting.openAI.baseUrl')"
                />
              </a-space>
              <a-space direction="vertical" :size="10" fill>
                <div>{{ $t('setting.openAI.key') }}</div>
                <a-input-password
                  v-model="settingStore.openAI.key"
                  size="small"
                  :placeholder="$t('common.pleaseEnter') + ' ' + $t('setting.openAI.key')"
                />
              </a-space>
            </a-space>
          </a-tab-pane>
          <a-tab-pane key="3" :title="$t('setting.spark.name')">
            <a-space direction="vertical" :size="20" fill>
              <a-space direction="vertical" :size="10" fill>
                <div>{{ $t('setting.officialWebsite') }}</div>
                <a-link @click="openInBrowser('https://xinghuo.xfyun.cn')"
                  >https://xinghuo.xfyun.cn</a-link
                >
              </a-space>
              <a-space direction="vertical" :size="10" fill>
                <div>{{ $t('setting.spark.appId') }}</div>
                <a-input
                  v-model="settingStore.spark.appId"
                  size="small"
                  :placeholder="$t('common.pleaseEnter') + ' ' + $t('setting.spark.appId')"
                />
              </a-space>
              <a-space direction="vertical" :size="10" fill>
                <div>{{ $t('setting.spark.secret') }}</div>
                <a-input-password
                  v-model="settingStore.spark.secret"
                  size="small"
                  :placeholder="$t('common.pleaseEnter') + ' ' + $t('setting.spark.secret')"
                />
              </a-space>
              <a-space direction="vertical" :size="10" fill>
                <div>{{ $t('setting.spark.key') }}</div>
                <a-input-password
                  v-model="settingStore.spark.key"
                  size="small"
                  :placeholder="$t('common.pleaseEnter') + ' ' + $t('setting.spark.key')"
                />
              </a-space>
            </a-space>
          </a-tab-pane>
          <a-tab-pane key="4" :title="$t('setting.ernieBot.name')">
            <a-space direction="vertical" :size="20" fill>
              <a-space direction="vertical" :size="10" fill>
                <div>{{ $t('setting.officialWebsite') }}</div>
                <a-link @click="openInBrowser('https://yiyan.baidu.com')"
                  >https://yiyan.baidu.com</a-link
                >
              </a-space>
              <a-space direction="vertical" :size="10" fill>
                <div>{{ $t('setting.ernieBot.apiKey') }}</div>
                <a-input
                  v-model="settingStore.ernieBot.apiKey"
                  size="small"
                  :placeholder="$t('common.pleaseEnter') + ' ' + $t('setting.ernieBot.apiKey')"
                />
              </a-space>
              <a-space direction="vertical" :size="10" fill>
                <div>{{ $t('setting.ernieBot.secretKey') }}</div>
                <a-input-password
                  v-model="settingStore.ernieBot.secretKey"
                  size="small"
                  :placeholder="$t('common.pleaseEnter') + ' ' + $t('setting.ernieBot.secretKey')"
                />
              </a-space>
            </a-space>
          </a-tab-pane>
        </a-tabs>
      </div>
    </a-modal>
  </div>
</template>

<style lang="less" scoped></style>
