---
title: 组装一个真正可用的 TypeScript Agent
description: 把前面的所有能力整合起来，形成一个可运行、可调试、可扩展的完整 Agent Demo。
section: systems
sectionTitle: 把能力变成工程系统
sectionColor: "#b45309"
sectionOrder: 4
order: 3
code: 10
tag: Integration
quote: 一个可用的 Agent，不是功能堆砌，而是让每一层能力都各司其职。
toolCount: 8
---

## 本章定位

这一章不是引入新概念，而是把前面九章的能力真正组装起来，让读者第一次看到完整 Agent 的工程形态。

## 本章目标

- 梳理整套系统的模块边界
- 把 Loop、Tool、Planner、Context、RAG、MCP、Skill 串起来
- 给出一个可运行的最终 demo

## 建议内容结构

### 1. 从整体架构图开始

建议先给出总览：

- Runtime
- Model Layer
- Tool Layer
- Planning Layer
- Context Layer
- Knowledge Layer
- Skill Layer

### 2. 模块之间如何协同

用一次完整任务运行来解释数据流。

### 3. 做一个端到端 Demo

推荐任务：

- “阅读本地说明文档，必要时检索知识库，再调用外部能力，最后整理成结构化答案”

### 4. 日志、调试与扩展点

为后面的附录埋下伏笔。

### 5. 本教程的能力地图回顾

帮读者完成一次整体复盘。

## 建议代码产出

- `agent-runtime.ts`
- `run-task.ts`
- `config.ts`
- 最终 demo 的入口

## 本章写作提醒

- 不要把它写成大段文件清单
- 要强调“模块分工”与“运行链路”
- 最好有一张完整系统图和一次端到端执行过程

## 待补内容

- 一张系统总览图
- 最终 demo 的目录结构
- 一个完整任务的运行示例
