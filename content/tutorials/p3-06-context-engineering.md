---
title: Context Engineering，决定 Agent 的上限
section: context
sectionTitle: 让 Agent 看见正确的信息
sectionColor: "#0f766e"
sectionOrder: 3
order: 1
code: 06
tag: Context
summary: 很多 Agent 的失败，不是因为模型不够强，而是因为上下文组织得不对。
toolCount: 3
---

## 本章定位

这是整套教程的中枢章节。前面已经让 Agent 学会运行、调用工具和规划，这一章要解释为什么这些能力最终仍然受制于上下文质量。

## 本章目标

- 讲清楚 Context Engineering 与 Prompt Engineering 的区别
- 帮读者理解信息选择、状态注入和压缩策略
- 搭建一个清晰的上下文构建器

## 建议内容结构

### 1. 为什么上下文不是越多越好

先从错误案例讲起，例如：

- 历史消息过多导致目标漂移
- 工具结果堆积导致模型抓不到重点

### 2. 上下文可以分成哪些层

建议拆成：

- 系统层
- 任务层
- 状态层
- 历史层
- 外部知识层

### 3. 什么应该进入上下文

重点讲“当前任务真正需要的信息”，而不是“所有可用信息”。

### 4. 历史裁剪与摘要压缩

建议介绍：

- 滑动窗口
- 结构化摘要
- 关键事实保留

### 5. 搭一个 `buildContext()`

让读者看到上下文是如何被工程化组装的。

## 建议代码产出

- `build-context.ts`
- `history-compressor.ts`
- `context-types.ts`

## 本章写作提醒

- 不要只谈提示词 wording
- 要把状态组织讲清楚
- 最好展示“错误上下文”和“优化后上下文”的真实差异

## 待补内容

- 一张上下文分层图
- 一个历史压缩前后对比示例
- 一套 `buildContext()` 代码骨架
