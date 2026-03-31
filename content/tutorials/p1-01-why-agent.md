---
title: 为什么需要 Agent，而不只是 Chat API
description: 建立整套教程的起点，先讲清楚 Agent、工作流和聊天机器人的边界。
section: foundations
sectionTitle: 建立正确心智模型
sectionColor: "#2563eb"
sectionOrder: 1
order: 1
code: 01
tag: 心智模型
quote: Agent 不是会聊天的模型，而是能在状态中持续决策和行动的系统。
toolCount: 0
---

## 本章定位

这一章负责建立整套教程的边界感。读者在这里不需要先写很多代码，而是要先理解一个更根本的问题：为什么有些任务用 Chat API 就够了，而有些任务必须设计成 Agent。

## 读者将获得什么

- 理解 Chatbot、Workflow、Agent 的差别
- 理解 Agent 的最小构成：状态、动作、观察、停止条件
- 能判断一个任务是否适合用 Agent
- 为后续章节建立统一心智模型

## 建议内容结构

### 1. 从最简单的问答系统开始

说明单轮问答能解决什么，不能解决什么。

### 2. 固定工作流为什么会失效

用一个需要多步搜索、判断、修正的任务举例，说明线性流程的局限。

### 3. Agent 的最小定义

把 Agent 描述为一个围绕状态持续运行的决策系统，而不是“更智能的聊天机器人”。

### 4. 三种系统的对比

- Chatbot：只负责回复
- Workflow：按预设流程执行
- Agent：根据中间结果决定下一步

### 5. 引出本教程主线案例

介绍“TypeScript 研究与工程助手”这条主线，以及它后续为什么会需要工具、规划、上下文工程、RAG、MCP、Skill。

## 推荐图示

- 一张对比图：Chatbot / Workflow / Agent
- 一张 Agent 最小闭环图：`state -> model -> action -> observation -> state`

## 本章写作提醒

- 不要一开始堆术语定义
- 不要把 Agent 神秘化
- 要持续强调边界：不是所有任务都值得上 Agent

## 后续代码安排

这一章可以只放少量伪代码或结构图，不要求完整 demo。真正的第一份可运行代码将在下一章出现。

## 待补内容

- 一个统一的对比示例任务
- 一张总览图
- 一段从 Chat API 过渡到 Agent 的自然引导
