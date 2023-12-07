import OpenAI from 'openai'
import { ChatCompletionMessageParam } from 'openai/resources/chat'
import { saveFileByUrl } from '@renderer/utils/main-thread-util'
import { randomUUID } from '@renderer/utils/id-util'

export interface Chat2OpenAIOption {
  apiKey: string
  baseURL: string
  type: 'chat' | 'drawing'
  model: string
  maxTokens: number
  messages?: ChatCompletionMessageParam[]
  imagePrompt?: string
  imageSize?: string
  checkSession?: () => boolean
  startAnswer?: (content: string) => void
  appendAnswer?: (content: string) => void
  imageGenerated?: (imageUrl: string) => void
  end?: () => void
}

export const chat2openai = async (option: Chat2OpenAIOption) => {
  const {
    apiKey,
    baseURL,
    type,
    model,
    maxTokens,
    messages,
    imagePrompt,
    imageSize,
    checkSession,
    startAnswer,
    appendAnswer,
    imageGenerated,
    end
  } = option

  const openai = new OpenAI({
    apiKey,
    baseURL,
    dangerouslyAllowBrowser: true
  })
  if (type === 'chat' && messages) {
    // OpenAI对话
    const stream = await openai.chat.completions.create({
      messages,
      model,
      stream: true,
      max_tokens: maxTokens
    })
    if (checkSession && !checkSession()) {
      return
    }
    if (startAnswer) {
      startAnswer('')
    }
    for await (const chunk of stream) {
      if (checkSession && !checkSession()) {
        return
      }
      console.log(`OpenAi【消息】: ${JSON.stringify(chunk.choices[0])}`)
      if (appendAnswer) {
        appendAnswer(chunk.choices[0].delta.content ?? '')
      }
    }
  } else if (type === 'drawing' && imagePrompt) {
    const imagesResponse = await openai.images.generate({
      prompt: imagePrompt,
      model,
      size: imageSize as '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792' | null,
      response_format: 'url'
    })
    if (checkSession && !checkSession()) {
      return
    }
    console.log(`OpenAi【消息】: ${JSON.stringify(imagesResponse)}`)
    let imageUrl = imagesResponse.data[0].url ?? ''
    if (imageUrl) {
      imageUrl = await saveFileByUrl(imageUrl, `${randomUUID()}.png`)
    }
    if (imageGenerated) {
      imageGenerated(imageUrl)
    }
  }
  if (end) {
    end()
  }
}
