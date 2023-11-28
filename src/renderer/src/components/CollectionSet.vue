<script setup lang="ts">
import { useCollectionSetStore } from '@renderer/store/collection-set'
import { computed, reactive, toRefs } from 'vue'
import { formatDateTime } from '@renderer/utils/date-util'

const collectionSetStore = useCollectionSetStore()

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
          <div class="collection-content">{{ c.chatMessageList[0].content }}</div>
          <div class="collection-time">{{ formatDateTime(new Date(c.createTime)) }}</div>
        </div>
      </div>
    </div>
    <div class="collection-set-right"></div>
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

        .collection-content {
          width: 100%;
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

        .collection-time {
          flex-shrink: 0;
          font-size: 13px;
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
  }
}
</style>
