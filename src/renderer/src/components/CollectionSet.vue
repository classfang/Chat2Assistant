<script setup lang="ts">
import { useCollectionSetStore } from '@renderer/store/collection-set'
import { computed, reactive, toRefs } from 'vue'
import { formatDateTime } from '@renderer/utils/date-util'
import { Modal } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
import AssistantAvatar from '@renderer/components/AssistantAvatar.vue'
import UserAvatar from '@renderer/components/UserAvatar.vue'
import { downloadFile } from '@renderer/utils/download-util'
import { renderMarkdown } from '@renderer/utils/markdown-util'
import { nowTimestamp } from '@renderer/utils/date-util'
import { exportTextFile } from '@renderer/utils/download-util'

const collectionSetStore = useCollectionSetStore()
const { t } = useI18n()

const data = reactive({
  keyword: '',
  currentCollectionId: ''
})
const { keyword, currentCollectionId } = toRefs(data)

const collectionListFilter = computed(() => {
  return collectionSetStore.chatMessageSetList.filter(
    (set) => set.chatMessageList.findIndex((msg) => msg.content.includes(data.keyword)) >= 0
  )
})

const currentCollection = computed(() => {
  return collectionSetStore.chatMessageSetList.find((c) => c.id === data.currentCollectionId)
})

const deleteConfirm = (id: string) => {
  Modal.confirm({
    title: t('common.deleteConfirm'),
    content: t('common.deleteConfirmContent'),
    okText: t('common.ok'),
    cancelText: t('common.cancel'),
    onOk: () => {
      const index = collectionSetStore.chatMessageSetList.findIndex((c) => c.id === id)
      if (index >= 0) {
        collectionSetStore.chatMessageSetList.splice(index, 1)
      }
    }
  })
}

const exportChatMessageList = (id: string) => {
  const collectionSet = collectionSetStore.chatMessageSetList.find((c) => c.id === id)
  if (!collectionSet) {
    return
  }
  const content = collectionSet.chatMessageList.map((r) => r.role + ': \n' + r.content).join('\n\n')
  exportTextFile(`records-${nowTimestamp()}.md`, content)
}
</script>

<template>
  <div class="collection-set">
    <div class="collection-set-left">
      <div class="collection-set-list-search">
        <a-input-search
          v-model="keyword"
          :placeholder="$t('collectionSet.search')"
          class="search-input"
        />
      </div>
      <div class="collection-set-list">
        <div
          v-for="c in collectionListFilter"
          :key="c.id"
          class="collection"
          :class="{ 'collection-active': c.id === currentCollectionId }"
          @click="currentCollectionId = c.id"
        >
          <div class="collection-body">
            <AssistantAvatar :provider="c.provider" class="collection-avatar" />
            <div class="collection-content">{{ c.chatMessageList[0].content }}</div>
          </div>
          <div class="collection-footer">
            <div class="collection-time">{{ formatDateTime(new Date(c.createTime)) }}</div>
            <a-popover
              position="br"
              trigger="click"
              :content-style="{ padding: '5px' }"
              @click.stop
            >
              <icon-more style="font-size: 15px; font-weight: 500; flex-shrink: 0" />
              <template #content>
                <a-space direction="vertical" fill>
                  <a-button
                    type="text"
                    style="width: 100%"
                    status="danger"
                    size="small"
                    @click="deleteConfirm(c.id)"
                    >{{ $t('common.delete') }}</a-button
                  >
                  <a-button
                    type="text"
                    style="width: 100%"
                    status="danger"
                    size="small"
                    @click="exportChatMessageList(c.id)"
                    >{{ $t('common.export') }}</a-button
                  >
                </a-space>
              </template>
            </a-popover>
          </div>
        </div>
      </div>
    </div>
    <div class="collection-set-right">
      <template v-if="currentCollection">
        <div class="collection-window-header">
          <div class="assistant-name">{{ currentCollection.name }}</div>
          <div class="assistant-desc">
            <a-space :size="10">
              <a-tag>{{ currentCollection.provider }}</a-tag>
              <a-tag>{{ currentCollection.model }}</a-tag>
            </a-space>
          </div>
        </div>
        <div class="chat-message-list">
          <div v-for="msg in currentCollection.chatMessageList" :key="msg.id" class="chat-message">
            <div class="chat-message-avatar">
              <UserAvatar v-if="msg.role === 'user'" :size="30" />
              <AssistantAvatar
                v-else-if="msg.role === 'assistant'"
                :provider="currentCollection?.provider"
                :size="30"
              />
            </div>
            <template v-if="msg.type === 'text'">
              <div v-if="msg.role === 'user'" class="chat-message-content select-text">
                <div>{{ msg.content }}</div>
                <a-image
                  v-if="msg.image"
                  width="300"
                  height="300"
                  :src="`file://${msg.image}`"
                  show-loader
                  fit="cover"
                >
                  <template #preview-actions>
                    <a-image-preview-action
                      name="下载"
                      @click="downloadFile(`file://${msg.image}`, `img-${msg.id}.png`)"
                      ><icon-download
                    /></a-image-preview-action>
                  </template>
                </a-image>
              </div>
              <div
                v-else-if="msg.role === 'assistant'"
                class="chat-message-content select-text"
                v-html="renderMarkdown(msg.content, false)"
              ></div>
            </template>
            <div v-else-if="msg.type === 'img'" class="chat-message-img">
              <a-image width="300" height="300" :src="msg.content" show-loader fit="cover">
                <template #preview-actions>
                  <a-image-preview-action
                    name="下载"
                    @click="downloadFile(msg.content, `img-${msg.id}.png`)"
                    ><icon-download
                  /></a-image-preview-action>
                </template>
              </a-image>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="collection-window-empty">
        <a-empty>
          <template #image>
            <icon-common />
          </template>
          {{ $t('collectionSet.empty') }}
        </a-empty>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.collection-set {
  width: 100%;
  flex-grow: 1;
  display: flex;
  overflow: hidden;
  .collection-set-left {
    flex-shrink: 0;
    width: 250px;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 15px;
    border-right: 1px solid var(--color-border-1);
    box-sizing: border-box;
    padding: 15px 0;

    .collection-set-list-search {
      box-sizing: border-box;
      padding: 0 15px;

      .search-input {
        border: none;
        background-color: var(--color-fill-2);
      }
    }

    .collection-set-list {
      flex-grow: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;

      .collection {
        margin: 0 15px;
        box-sizing: border-box;
        padding: 15px;
        background-color: var(--color-fill-1);
        border-radius: var(--border-radius-small);
        display: flex;
        flex-direction: column;
        gap: 15px;

        &:hover {
          background-color: var(--color-fill-2);
        }

        .collection-body {
          flex-grow: 1;
          display: flex;
          gap: 10px;
          .collection-avatar {
            flex-shrink: 0;
          }

          .collection-content {
            flex-grow: 1;
            line-height: 1.3rem;
            overflow: hidden;
            display: -webkit-box;
            text-overflow: ellipsis;
            word-break: break-all;
            line-break: anywhere;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
          }
        }

        .collection-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          .collection-time {
            flex-shrink: 0;
            font-size: 13px;
          }
        }
      }

      .collection-active {
        background-color: var(--color-fill-3) !important;
      }
    }
  }

  .collection-set-right {
    flex-grow: 1;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .collection-window-header {
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

    .chat-message-list {
      flex-grow: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
      box-sizing: border-box;
      padding: 15px;

      .chat-message {
        display: flex;
        align-items: flex-start;
        gap: 15px;

        .chat-message-content {
          line-break: anywhere;
          background-color: var(--color-fill-1);
          padding: 10px;
          border-radius: var(--border-radius-small);
          min-height: 1rem;
          line-height: 1.3rem;
          display: flex;
          flex-direction: column;
          gap: 5px;

          :deep(p) {
            margin-block: 0;
            margin: 0;
          }
        }

        .chat-message-img {
          background-color: var(--color-fill-1);
          padding: 10px;
          border-radius: var(--border-radius-small);
        }
      }
    }

    .collection-window-empty {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}
</style>
