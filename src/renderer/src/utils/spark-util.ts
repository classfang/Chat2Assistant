import * as CryptoJS from 'crypto-js'

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
  messageList: ChatMessage[]
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
