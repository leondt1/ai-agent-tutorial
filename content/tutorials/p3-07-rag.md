---
title: RAG，给 Agent 补充外部知识
description: 把外部文档变成可检索、可引用、可注入上下文的知识供给系统。
section: context
sectionTitle: 让 Agent 看见正确的信息
sectionColor: "#0f766e"
sectionOrder: 3
order: 2
code: 07
tag: RAG
quote: RAG 的本质不是让模型记住知识，而是在需要时拿到正确知识。
toolCount: 4
---

## 本章定位

RAG 不是一门孤立技术，而是 Context Engineering 在外部知识场景下的具体实现。这一章要把它放回 Agent 主线中讲。

## 本章目标

- 讲清楚 RAG 在 Agent 体系里的位置
- 让读者理解检索、切块、引用和回填的完整链路
- 实现一个最小可用的知识检索模块

## 建议内容结构

### 1. 为什么模型不知道你的私有知识

先讲问题背景，再引出 RAG 的价值。

### 2. 文档如何被切块

重点说明 chunk 设计为什么会直接影响效果。

### 3. 检索与排序

建议讲：

- embedding
- top-k retrieval
- reranking
- 为什么“检索到了”不等于“检索得好”

### 4. 检索结果如何进入 Agent 上下文

说明结果需要带：

- 片段内容
- 来源
- 摘要或引用信息

### 5. 一个最小知识库示例

用教程文档、产品文档或项目说明做演示。

## 建议代码产出

- `chunk-documents.ts`
- `embed-documents.ts`
- `retrieve.ts`
- `format-retrieval-results.ts`

## 本章写作提醒

- 不要把整章写成向量数据库介绍
- 要强调 RAG 和上下文构建的关系
- 最好展示错误切块和正确切块的对比

## 待补内容

- 一份最小知识库样本
- 检索结果注入上下文的代码示例
- 一张 RAG 数据流图
