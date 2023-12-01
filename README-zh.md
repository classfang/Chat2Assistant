<h1 align="center">Chat2Assistant</h1>
<h4 align="center">
一款以助手为中心的 ChatGPT Electron客户端，具有极简的界面，将在未来支持更多模型✨✨
</h4>

<h4 align="center">

[中文简介](README-zh.md) | [English README](README.md)

</h4>

![demo](/demo/demo-zh.png)

> 现已支持：OpenAI，讯飞星火大模型，文心一言大模型

## 1. 使用应用

> 应用包未签名和公证，如遇无法正常安装，可克隆代码本地打包

### 1.1 在 release 中下载对于的应用包即可

### 1.2 App 在 macOS 下提示已损坏无法打开解决办法

打开终端，输入以下命令，并执行：

`sudo xattr -d com.apple.quarantine /Applications/xxxx.app`

注意：/Applications/xxxx.app 换成你的App路径。

## 2. 项目启动

### 2.1 安装

```bash
$ yarn
```

### 2.2 开发

```bash
$ yarn dev
```

### 2.3 构建

```bash
# For windows
$ yarn build:win

# For macOS
$ yarn build:mac

# For Linux
$ yarn build:linux
```
