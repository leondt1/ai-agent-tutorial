# 02 - Minimal Loop

本目录对应教程第 02 章《从零写一个最小 Agent Loop》。

这里放的是和正文保持一致的可运行代码，而不是占位说明。目标很直接：

1. 读取当前消息历史
2. 让模型决定下一步
3. 执行工具
4. 把工具结果回填到状态
5. 继续决策直到结束

## 目录结构

```txt
examples/02-minimal-loop
├─ package.json
├─ tsconfig.json
├─ README.md
└─ src
   ├─ call-model.ts
   ├─ index.ts
   ├─ run-agent.ts
   ├─ types.ts
   └─ tools
      └─ search-docs.ts
```

## 运行方式

在仓库根目录运行默认问题：

```bash
pnpm example:02
```

传入你自己的问题：

```bash
pnpm --filter @tutorial-examples/02-minimal-loop start -- 先查文档，再告诉我启动命令
```

如果只想做类型检查：

```bash
pnpm example:02:typecheck
```

## 文件职责

- `src/types.ts`
  定义 `Message`、`ToolCall`、`ToolResult`、`ModelDecision`、`AgentState`。

- `src/call-model.ts`
  暂时把模型当成一个返回 `ModelDecision` 的函数。这里用的是 mock 版本，重点是演示 Loop 如何工作。

- `src/tools/search-docs.ts`
  提供唯一工具 `searchDocs`，用内存里的文档片段模拟最小搜索能力。

- `src/run-agent.ts`
  实现最小 `while` 循环，负责调用模型、执行工具、回填工具结果，并控制最大轮次。

- `src/index.ts`
  作为入口，接收问题并打印每一步日志和最终回答。

## 这份示例验证什么

- 用户输入进入 `messages`
- 模型返回 `tool` 或 `final`
- 如果是 `tool`，执行工具并生成 `tool message`
- `tool message` 被写回 `messages`
- 下一轮模型基于更新后的 `messages` 继续判断
- 达到 `final` 或 `maxSteps` 后结束
