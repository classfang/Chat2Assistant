import { fetchEventSource } from '@microsoft/fetch-event-source'
import { CommonChatOption } from '.'

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

export const chat2ernieBot = async (option: CommonChatOption) => {
  const {
    apiKey,
    secretKey,
    model,
    abortCtr,
    messages,
    checkSession,
    startAnswer,
    appendAnswer,
    end
  } = option

  if (!apiKey || !secretKey || !messages) {
    console.log('chat2ernieBot params miss')
    return
  }

  let waitAnswer = true

  const tokenResp = await fetch(
    `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`
  )
  const tokenRespJson = await tokenResp.json()
  const accessToken = tokenRespJson.access_token

  if (checkSession && !checkSession()) {
    return
  }

  fetchEventSource(`${getErnieBotChatUrl(model)}?access_token=${accessToken}`, {
    signal: abortCtr?.signal,
    method: 'POST',
    body: JSON.stringify({
      messages,
      stream: true
    }),
    onmessage: (e) => {
      if (checkSession && !checkSession()) {
        return
      }
      console.log('文心一言大模型回复：', e)
      if (waitAnswer) {
        waitAnswer = false
        if (startAnswer) {
          startAnswer('')
        }
      }
      if (appendAnswer) {
        appendAnswer(JSON.parse(e.data).result ?? '')
      }
    },
    onclose: () => {
      console.log('文心一言大模型关闭连接')
      if (end) {
        end()
      }
    },
    onerror: (err: any) => {
      console.log('文心一言大模型错误：', err)
      if (end) {
        end(err)
      }
      // 抛出异常防止重连
      if (err instanceof Error) {
        throw err
      }
    }
  })
}
