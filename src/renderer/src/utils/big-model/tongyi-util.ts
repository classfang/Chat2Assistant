export const getTongyiChatUrl = (model: string) => {
  switch (model) {
    case 'qwen-turbo':
    case 'qwen-plus':
    case 'qwen-max':
      return 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
      break
    case 'qwen-vl-plus':
      return 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
      break
    default:
      return ''
      break
  }
}
