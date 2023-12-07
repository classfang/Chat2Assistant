import { fetchEventSource } from '@microsoft/fetch-event-source'

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

export const chat2tongyi = async (option: {
  apiKey: string
  model: string
  abortCtr: AbortController
  messages: BaseMessage[] | { role: ChatRole; content: { text: string }[] }[]
  checkSession?: () => boolean
  startAnswer?: (content: string) => void
  appendAnswer?: (content: string) => void
  end?: (err?: any) => void
}) => {
  const { apiKey, model, abortCtr, messages, checkSession, startAnswer, appendAnswer, end } = option

  let waitAnswer = true

  fetchEventSource(getTongyiChatUrl(model), {
    signal: abortCtr.signal,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'
    },
    body: JSON.stringify({
      model,
      input: {
        messages
      }
    }),
    onmessage: (e) => {
      if (checkSession && !checkSession()) {
        return
      }
      console.log('通义千问大模型回复：', e)
      if (waitAnswer) {
        waitAnswer = false
        if (startAnswer) {
          startAnswer('')
        }
      }
      if (appendAnswer) {
        let content = ''
        if (model === 'qwen-vl-plus') {
          content = JSON.parse(e.data).output?.choices[0]?.message?.content[0]?.text ?? ''
        } else {
          content = JSON.parse(e.data).output?.text ?? ''
        }
        appendAnswer(content)
      }
    },
    onclose: () => {
      console.log('通义千问大模型关闭连接')
      if (end) {
        end()
      }
    },
    onerror: (err: any) => {
      console.log('通义千问大模型错误：', err)
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
