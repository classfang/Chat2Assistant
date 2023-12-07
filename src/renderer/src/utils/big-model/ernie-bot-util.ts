export const getErnieBotChatUrl = (model: string) => {
  switch (model) {
    case 'ERNIE-Bot 4.0':
      return 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro'
      break
    case 'ERNIE-Bot-8K':
      return 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/ernie_bot_8k'
      break
    case 'ERNIE-Bot':
      return 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions'
      break
    case 'ERNIE-Bot-turbo':
      return 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/eb-instant'
      break
    default:
      return ''
      break
  }
}
