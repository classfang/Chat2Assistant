import CryptoJS from 'crypto-js'
import { CommonChatOption } from '.'

export const getSparkHostUrl = (model: string) => {
  return `wss://spark-api.xf-yun.com/${model}/chat`
}

export const getSparkWsUrl = (model: string, apiSecret: string, apiKey: string) => {
  const url = new URL(getSparkHostUrl(model))
  const host = url.host
  const path = url.pathname
  const date = (new Date() as any).toGMTString()
  const algorithm = 'hmac-sha256'
  const headers = 'host date request-line'
  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`
  const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, apiSecret)
  const signature = CryptoJS.enc.Base64.stringify(signatureSha)
  const authorizationOrigin = `api_key="${apiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`
  const authorization = btoa(authorizationOrigin)
  return `${url.toString()}?authorization=${authorization}&date=${date}&host=${host}`
}

export const getSparkWsRequestParam = (
  appId: string,
  model: string,
  messageList: BaseMessage[]
) => {
  return JSON.stringify({
    header: {
      app_id: appId,
      uid: '123456'
    },
    parameter: {
      chat: {
        domain: `generalv${model.substring(1, 2)}`,
        temperature: 0.5,
        max_tokens: 4096
      }
    },
    payload: {
      message: {
        text: messageList
      }
    }
  })
}

export const chat2spark = async (option: CommonChatOption) => {
  const {
    appId,
    apiKey,
    secretKey,
    model,
    messages,
    checkSession,
    startAnswer,
    appendAnswer,
    end
  } = option

  if (!appId || !apiKey || !secretKey || !messages) {
    console.log('chat2spark params miss')
    return
  }

  let waitAnswer = true

  const sparkClient = new WebSocket(getSparkWsUrl(model, secretKey, apiKey))
  sparkClient.onopen = () => {
    if (checkSession && !checkSession()) {
      return
    }
    console.log('星火服务器【已连接】')
    sparkClient.send(getSparkWsRequestParam(appId, model, messages))
  }
  sparkClient.onmessage = (message) => {
    if (checkSession && !checkSession()) {
      return
    }
    console.log(`星火服务器【消息】: ${message.data}`)
    if (waitAnswer) {
      waitAnswer = false
      if (startAnswer) {
        startAnswer('')
      }
    }
    if (appendAnswer) {
      appendAnswer(JSON.parse(message.data.toString())?.payload?.choices?.text[0]?.content ?? '')
    }
  }
  sparkClient.onclose = () => {
    if (checkSession && !checkSession()) {
      return
    }
    console.log('星火服务器【连接已关闭】')
    if (end) {
      end()
    }
  }
  sparkClient.onerror = (e) => {
    if (checkSession && !checkSession()) {
      return
    }
    console.log('星火服务器【连接错误】', e)
    if (end) {
      end()
    }
  }
}
