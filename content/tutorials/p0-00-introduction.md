---
title: 开始之前：如何使用这套教程
section: introduction
sectionTitle: 导读
sectionColor: "#52525b"
sectionOrder: 0
order: 1
code: 00
tag: Guide
summary: 先了解这套教程的目标、阅读方式、代码运行方法和开源参与方式。
toolCount: 0
---

欢迎来到《前端工程师的 AI Agent 实战指南：TypeScript 版》。

这不是一套从概念名词开始堆起来的教程，也不是某个 Agent 框架的 API 手册。它更像一次从前端工程师视角出发的拆解：我们会用 TypeScript 一步一步写出 Agent 的关键能力，让你知道一个 Agent 为什么需要循环、工具、观察、上下文、检索、协议和可复用能力。

读完这篇导读，你会知道：

- 这套教程想解决什么问题
- 为什么它选择这样的章节顺序
- 文档和代码如何一一对应
- 示例代码如何在本地运行
- 如果你想改进教程，应该怎样参与贡献

## 教程目标与设计理念

很多开发者第一次写 AI 应用时，会从 Chat API 开始：把问题发给模型，再把回复展示出来。但 Agent 要多做一步：它需要根据任务状态决定下一步，比如调用工具、读取结果、继续追问，最后整理答案。

这套教程的目标，就是用 TypeScript 把这个过程写清楚。我们会从最小的 Agent Loop 开始，逐章加入：

- Tool Calling：让 Agent 能调用外部能力
- ReAct：让 Agent 根据真实观察继续行动
- Plan-and-Execute：让长任务先计划再执行
- Context Engineering：让 Agent 看见正确的信息
- RAG：让 Agent 在需要时检索外部知识
- MCP：用标准协议接入工具与资源
- Skill：把重复任务沉淀成可复用能力
- 最终组装：把这些能力放进一个完整 TypeScript Agent

前面的章节不会直接使用 Agent 框架，而是手动写出关键功能。这样你可以看清模型返回了什么、工具调用怎样执行、观察结果如何写回上下文、循环什么时候继续或停止。理解这些之后，再使用 LangChain、Mastra、OpenAI Agents SDK 等框架时，也会更容易判断框架替你处理了什么，哪些地方还需要自己控制。

示例代码也会保留一些重复和硬编码。它们是有意的：每一章优先讲清当前能力，让读者打开一个文件就能从上到下看懂主流程，而不是在多个工具层、注册表和运行时封装之间来回跳转。

## 文档和代码的对应关系

教程文档和示例代码都在同一个 GitHub 仓库里：

[https://github.com/leondt1/AI-agent-tutorial](https://github.com/leondt1/AI-agent-tutorial)

文档主要放在：

```txt
content/tutorials/
```

示例代码主要放在：

```txt
examples/
```

两者是一一对应的关系。比如：

```txt
content/tutorials/p1-02-minimal-loop.md
examples/02-minimal-loop/index.ts
```

阅读章节时，建议同时打开对应示例。正文会解释这一章的关键概念，示例文件会展示这些概念如何落到 TypeScript 代码里。

这套教程最重要的阅读方式是：**不要只看最终答案，要看 Agent 每一步如何决定下一步。**

## 如何运行示例代码

先安装依赖：

```bash
pnpm install
```

启动教程网站：

```bash
pnpm dev
```

打开：

```txt
http://localhost:3000
```

如果你只想运行某个示例，可以使用仓库里的 `example` 脚本：

```bash
pnpm example examples/02-minimal-loop/index.ts
```

本教程使用 OpenAI 的接口规范进行模型调用。运行带模型调用的示例前，需要在项目根目录准备 `.env.local`：

```bash
OPENAI_API_KEY=你的 API Key
OPENAI_MODEL=你要使用的模型名称
OPENAI_BASE_URL=你的兼容服务地址
```

运行带模型调用的示例时，可以这样传入任务：

```bash
pnpm example examples/03-tool-calling/part1-minimal-tool.ts "帮我看看 README 里有没有安装步骤"
```

如果示例运行失败，优先检查三件事：

- 依赖是否已经安装
- `.env.local` 是否存在，并且变量名是否正确
- 当前章节示例是否需要真实模型 API

## 如何参与开源贡献

参与方式很简单：

1. 在 GitHub 上 fork 仓库
2. 基于你的修改创建一个分支
3. 修改文档或示例代码
4. 本地运行相关示例，并执行基础检查
5. 提交 Pull Request，说明你改了什么、为什么这样改

提交前建议至少运行：

```bash
pnpm lint
```

如果你改了示例代码，也请运行对应示例：

```bash
pnpm example examples/02-minimal-loop/index.ts
```

如果你调整了教程结构、章节顺序或示例路径，请同时更新相关文档和 README。这个仓库最重要的约定是：**文档说到哪里，代码就应该对应到哪里。**

## 接下来怎么读

从下一章开始，我们会先回答一个基础问题：

> 为什么需要 Agent，而不只是 Chat API？

这个问题看起来简单，但它决定了后面所有设计的边界。先把边界想清楚，再写代码，后面的 Agent Loop、Tool Calling、ReAct 和 RAG 才不会变成一堆互相堆叠的术语。
