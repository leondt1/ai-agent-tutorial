---
title: MCP，用标准协议接入工具与资源
section: systems
sectionTitle: 把能力变成工程系统
sectionColor: "#b45309"
sectionOrder: 4
order: 1
code: 08
tag: MCP
summary: Tool Calling 解决的是“怎么调用”，MCP 解决的是“怎么标准化接入”。
toolCount: 5
---

## 本章定位

当前面的本地工具、知识库和外部能力逐渐增多时，工程复杂度会开始快速上升。这一章要引入 MCP，作为工具与资源的标准化接入方式。

## 本章目标

- 讲清楚 MCP 想解决的问题
- 区分 Tool、Resource、Prompt 在 MCP 中的角色
- 用 TypeScript 接入一个最小 MCP Client

## 建议内容结构

### 1. 为什么需要标准协议

从“工具越接越乱”的现实问题切入，而不是直接讲协议字段。

### 2. MCP 的核心对象

建议依次讲：

- Server
- Client
- Tools
- Resources
- Prompts

### 3. 在 TypeScript 中连接一个 MCP Server

从最小握手开始，再展示一次真实调用。

### 4. 把 MCP 能力接入现有 Agent

说明如何把本地工具系统和 MCP 暴露的能力统一起来。

### 5. MCP 的边界

强调它不是 Agent 本身，也不是 Tool Calling 的替代品。

## 建议代码产出

- `mcp/client.ts`
- `mcp/types.ts`
- `mcp/tool-adapter.ts`
- 一个最小 MCP Server 接入示例

## 本章写作提醒

- 不要陷入协议术语堆砌
- 要先讲工程问题，再讲协议
- 一定要有最小接入 demo

## 待补内容

- 一张 MCP 角色关系图
- 一个最小 client 代码示例
- MCP 能力与本地工具统一路由的示意
