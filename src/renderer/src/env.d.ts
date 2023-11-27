/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'gpt-tokenizer' {
  const encodeChat
  export { encodeChat }
}

type BigModelProvider = 'OpenAI' | 'Spark' | 'ERNIEBot'
type AssistantType = 'chat' | 'drawing'
type ChatMsgType = 'text' | 'img'
type ChatRole = 'user' | 'assistant' | 'system'

interface Assistant {
  id: string
  type: AssistantType
  name: string
  instruction: string
  provider: BigModelProvider
  model: string
  inputMaxTokens: number
  maxTokens: number
  contextSize: number
  imageSize: string
  createTime: number
  lastUpdateTime: number
  lastUseTime: number
  chatMessageList: ChatMessage[]
}

interface ChatMessage {
  id: string
  type: ChatMsgType
  role: ChatRole
  content: string
  createTime: number
}
