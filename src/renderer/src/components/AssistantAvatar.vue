<script setup lang="ts">
defineProps({
  provider: {
    type: String,
    default: ''
  },
  size: {
    type: Number,
    default: 30
  }
})
</script>

<template>
  <a-avatar v-if="provider === 'OpenAI'" shape="square" :size="size">
    <img alt="avatar" src="@renderer/assets/images/openai.png" />
  </a-avatar>
</template>

<style lang="less" scoped></style>
