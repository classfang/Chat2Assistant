import { Chat2OpenAIOption, chat2openai } from '@renderer/utils/big-model/openai-util'
import { Chat2SparkOption, chat2spark } from '@renderer/utils/big-model/spark-util'
import { Chat2ERNIEBotOption, chat2ernieBot } from '@renderer/utils/big-model/ernie-bot-util'
import { Chat2TongyiOption, chat2tongyi } from '@renderer/utils/big-model/tongyi-util'

export const chat2bigModel = async (
  provider: BigModelProvider,
  option: Chat2OpenAIOption | Chat2SparkOption | Chat2ERNIEBotOption | Chat2TongyiOption
) => {
  switch (provider) {
    case 'OpenAI':
      chat2openai(option as Chat2OpenAIOption)
      break
    case 'Spark':
      chat2spark(option as Chat2SparkOption)
      break
    case 'ERNIEBot':
      chat2ernieBot(option as Chat2ERNIEBotOption)
      break
    case 'Tongyi':
      chat2tongyi(option as Chat2TongyiOption)
      break
  }
}
