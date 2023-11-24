<script setup lang="ts">
import { useSettingStore } from '@renderer/store/setting'
import { reactive, toRefs } from 'vue'
import { useSystemStore } from '@renderer/store/system'

const systemStore = useSystemStore()
const settingStore = useSettingStore()

const data = reactive({
  modalVisible: false
})
const { modalVisible } = toRefs(data)
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
