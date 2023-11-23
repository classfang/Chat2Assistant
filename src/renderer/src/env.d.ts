/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}

type BigModelProvider = 'OpenAI' | 'Spark'

interface Assistant {
  name: string
  instruction: string
  provider: BigModelProvider
  model: string
  createTime: number
  lastUpdateTime: number
  lastUseTime: number
}
