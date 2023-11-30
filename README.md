<h1 align="center">Chat2Assistant</h1>
<h4 align="center">
An assistant-centered ChatGPT electron client with a minimalist interface will support more models in the future✨
</h4>

<h4 align="center">

[中文简介](README-zh.md) | [English README](README.md)

</h4>

![demo](/demo/demo.png)

> now supported：OpenAI, iFLYTEK Spark, ERNIE Bot

## Use application

### Download the application package in release

### The App under macOS indicates that it is damaged and cannot open the solution

Open the terminal, enter the following command, and execute:

`sudo xattr -d com.apple.quarantine /Applications/xxxx.app`

Note: Replace /Applications/xxxx.app with your App path.

## Project Setup

### Install

```bash
$ yarn
```

### Development

```bash
$ yarn dev
```

### Build

```bash
# For windows
$ yarn build:win

# For macOS
$ yarn build:mac

# For Linux
$ yarn build:linux
```
