import MarkdownIt from 'markdown-it'
import MarkdownItHighlight from 'markdown-it-highlightjs'
import 'highlight.js/scss/github-dark.scss'

const markdown = new MarkdownIt().use(MarkdownItHighlight)

export const renderMarkdown = (content: string, isLoading: boolean) => {
  let htmlCode = markdown.render(content)
  // 加载中，显示闪烁光标
  if (isLoading) {
    // 找到所有闭合标签
    const matches = htmlCode.match(/<\/[^>]+>/g)
    if (matches) {
      // 获取最后一个闭合标签
      let lastCloseTag = matches[matches.length - 1]
      // TODO 代码块需要跳过pre标签，将光标插入到pre里面的code标签中
      if (['</pre>', '</ol>', '</ul>'].includes(lastCloseTag)) {
        lastCloseTag = matches[matches.length - 2]
      }
      // 获取最后一个闭合标签的索引
      const lastCloseTagIndex = htmlCode.lastIndexOf(lastCloseTag)
      // 插入光标元素
      htmlCode =
        htmlCode.substring(0, lastCloseTagIndex) +
        `<span class="chat-message-loading">丨</span>` +
        htmlCode.substring(lastCloseTagIndex)
    }
  }
  return htmlCode
}
