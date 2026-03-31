---
title: 从零写一个最小 Agent Loop
description: 用最小可运行实现建立 Agent 的核心骨架，让模型、工具和状态真正跑起来。
section: foundations
sectionTitle: 建立正确心智模型
sectionColor: "#2563eb"
sectionOrder: 1
order: 2
code: 02
tag: Agent Loop
quote: Agent 的第一性原理不是框架，而是一个可恢复、可观察的循环。
toolCount: 1
---

## 本章定位

这一章是整套教程的第一个工程落地点。目标不是把 Agent 做复杂，而是用最少的代码跑通完整闭环。

## 本章目标

- 让读者理解 Agent 为什么本质上是一个循环
- 跑通“模型请求工具 -> 执行工具 -> 回填结果 -> 继续推理”的完整流程
- 建立后续所有执行模式都会复用的基础结构

## 建议内容结构

### 1. 先写最小数据结构

建议先定义：

- `Message`
- `ToolCall`
- `ToolResult`
- `AgentState`

### 2. 实现最小 `runAgent()`

先用最小 while 循环跑通：

```ts
while (true) {
  const response = await callModel(messages);
  if (response.type === "final") return response;
  const result = await runTool(response.toolCall);
  messages.push(response.message, result);
}
```

### 3. 接一个最简单的工具

建议只接入一个工具，例如：

- `searchDocs`
- `getWeather`
- `readLocalNote`

### 4. 记录每一轮发生了什么

引导读者打印每轮输入、模型决策、工具参数和工具结果。

### 5. 讲清楚停止条件

说明为什么必须限制：

- 最大轮次
- 工具失败后的处理
- 最终回答的退出路径

## 建议代码产出

- `runAgent.ts`
- `types.ts`
- `tools/search-docs.ts`
- 一个最小的 CLI 入口

## 本章写作提醒

- 不要在这里提前引入 Planner、RAG、Memory 等更高层抽象
- 不要追求“通用框架感”，先把最小闭环讲透
- 要突出“状态回填”这件事为什么关键

## 示例任务建议

- “帮我查一下某篇文档里有没有安装步骤”
- “先调用工具查资料，再给我答案”

## 待补内容

- 一份完整最小示例代码
- 一张循环执行时序图
- 一段失败案例分析
