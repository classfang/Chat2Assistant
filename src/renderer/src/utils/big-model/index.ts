import { chat2openai } from '@renderer/utils/big-model/openai-util'
import { chat2spark } from '@renderer/utils/big-model/spark-util'
import { chat2ernieBot } from '@renderer/utils/big-model/ernie-bot-util'
import { chat2tongyi } from '@renderer/utils/big-model/tongyi-util'

type ChatFunctionMap = {
  [provider in BigModelProvider]: (option: CommonChatOption) => Promise<any>
}

export interface CommonChatOption {
  appId?: string
  secretKey?: string
  apiKey?: string
  baseURL?: string
  type?: 'chat' | 'drawing'
  model: string
  instruction: string
  inputMaxTokens: number
  contextSize: number
  maxTokens?: number
  messages?: ChatMessage[]
  imagePrompt?: string
  imageSize?: string
  abortCtr?: AbortController
  checkSession?: () => boolean
  startAnswer?: (content: string) => void
  appendAnswer?: (content: string) => void
  imageGenerated?: (imageUrl: string) => void
  end?: (err?: any) => void
}

const chatFunctionMap: ChatFunctionMap = {
  OpenAI: chat2openai,
  Spark: chat2spark,
  ERNIEBot: chat2ernieBot,
  Tongyi: chat2tongyi
}

export const chat2bigModel = async (provider: keyof ChatFunctionMap, option: CommonChatOption) => {
  const chatFunction = chatFunctionMap[provider]
  if (chatFunction) {
    return chatFunction(option)
  } else {
    throw new Error(`Unsupported provider: ${provider}`)
  }
}
