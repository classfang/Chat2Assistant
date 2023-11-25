<script setup lang="ts">
import { useSettingStore } from '@renderer/store/setting'
import { onMounted, reactive, toRefs } from 'vue'
import { useSystemStore } from '@renderer/store/system'

const systemStore = useSystemStore()
const settingStore = useSettingStore()

const data = reactive({
  modalVisible: false,
  appVersion: '--'
})
const { modalVisible, appVersion } = toRefs(data)

const downloadVersionBtnClick = () => {
  window.open('https://github.com/classfang/Chat2Assistant/releases')
}

onMounted(() => {
  window.electron.ipcRenderer.invoke('getAppVersion').then((v) => {
    data.appVersion = `v${v}`
  })
})
</script>

<template>
  <div class="setting">
    <a-button class="setting-btn" @click="modalVisible = !systemStore.chatWindowLoading">
      <icon-settings />
    </a-button>

    <!-- 设置Modal -->
    <a-modal v-model:visible="modalVisible" :footer="false" title-align="start" width="80vw">
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
              <a-space direction="vertical" :size="10">
                <div>{{ $t('setting.app.local') }}</div>
                <a-select v-model="settingStore.app.locale" size="small">
                  <a-option value="zh">中文</a-option>
                  <a-option value="en">English</a-option>
                </a-select>
              </a-space>
              <a-space direction="vertical" :size="10">
                <div>{{ $t('setting.app.version') }}</div>
                <div>
                  <a-space :size="20">
                    <div>{{ $t('setting.app.currentVersion') }} {{ appVersion }}</div>
                    <a-button size="mini" @click="downloadVersionBtnClick()">{{
                      $t('setting.app.downloadVersion')
                    }}</a-button>
                  </a-space>
                </div>
              </a-space>
            </a-space>
          </a-tab-pane>
          <a-tab-pane key="2" :title="$t('setting.openAI.name')">
            <a-space direction="vertical" :size="20" fill>
              <a-space direction="vertical" :size="10" fill>
                <div>{{ $t('setting.openAI.baseUrl') }}</div>
                <a-input v-model="settingStore.openAI.baseUrl" size="small" />
              </a-space>
              <a-space direction="vertical" :size="10" fill>
                <div>{{ $t('setting.openAI.key') }}</div>
                <a-input-password v-model="settingStore.openAI.key" size="small" />
              </a-space>
            </a-space>
          </a-tab-pane>
          <a-tab-pane key="3" :title="$t('setting.spark.name')">
            <a-space direction="vertical" :size="20" fill>
              <a-space direction="vertical" :size="10" fill>
                <div>{{ $t('setting.spark.appId') }}</div>
                <a-input v-model="settingStore.spark.appId" size="small" />
              </a-space>
              <a-space direction="vertical" :size="10" fill>
                <div>{{ $t('setting.spark.secret') }}</div>
                <a-input-password v-model="settingStore.spark.secret" size="small" />
              </a-space>
              <a-space direction="vertical" :size="10" fill>
                <div>{{ $t('setting.spark.key') }}</div>
                <a-input-password v-model="settingStore.spark.key" size="small" />
              </a-space>
            </a-space>
          </a-tab-pane>
        </a-tabs>
      </div>
    </a-modal>
  </div>
</template>

<style lang="less" scoped>
.setting {
  .setting-btn {
    padding: 5px;
    height: 32px;
    width: 32px;
  }
}
</style>
