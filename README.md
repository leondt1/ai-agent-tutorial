# 前端工程师的 AI Agent 实战指南：TypeScript 版

面向前端工程师的 AI Agent 原理与实战教程。

这套教程用 TypeScript 从零拆解一个 Agent 的核心能力：Agent Loop、Tool Calling、ReAct、Plan-and-Execute、Context Engineering、RAG、MCP、Skill，以及最终的完整 Agent 组装。

如果你是第一次阅读，建议先从教程里的 [开始之前：如何使用这套教程](./content/tutorials/p0-00-introduction.md) 开始。

## 适合谁

- 熟悉基础 TypeScript，希望理解 AI Agent 如何工作的前端工程师
- 用过 LLM API，但还没有系统写过 Agent 的开发者
- 想看清 Agent 框架背后循环、工具调用、上下文和状态流转的人

## 项目结构

```txt
content/tutorials/  教程正文
examples/           每章对应的 TypeScript 示例
docs/               教程设计文档
src/                教程网站源码
```

文档和代码是对应关系。阅读某一章时，建议同时打开对应的 `examples/` 示例文件。

## 本地运行

安装依赖：

```bash
pnpm install
```

启动教程网站：

```bash
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看教程网站。

## 运行示例

运行不依赖真实模型的最小 Agent Loop：

```bash
pnpm example examples/02-minimal-loop/index.ts
```

运行带模型调用的示例前，需要在项目根目录准备 `.env.local`：

```bash
OPENAI_API_KEY=你的 API Key
OPENAI_MODEL=你要使用的模型名称
OPENAI_BASE_URL=你的兼容服务地址
```

然后运行示例：

```bash
pnpm example examples/03-tool-calling/part1-minimal-tool.ts "帮我看看 README 里有没有安装步骤"
```

## 常用命令

```bash
pnpm dev                 # 启动教程网站
pnpm build               # 构建静态站点
pnpm lint                # 运行代码检查
pnpm example <file.ts>   # 运行某个示例
pnpm example:typecheck   # 检查 examples/ 下的 TypeScript 示例
```

## 参与贡献

欢迎提交 issue 和 pull request。

提交前建议至少运行：

```bash
pnpm lint
```

如果改了示例代码，也请运行对应示例，并确保文档里的路径、命令和代码保持一致。
