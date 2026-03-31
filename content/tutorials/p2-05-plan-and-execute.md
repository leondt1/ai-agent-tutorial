---
title: Plan-and-Execute，从反应式到规划式
description: 当任务链路变长时，让 Agent 先规划，再执行，并在必要时重规划。
section: execution
sectionTitle: 让 Agent 学会行动与规划
sectionColor: "#4f7cff"
sectionOrder: 2
order: 3
code: 05
tag: Planning
quote: 显式规划不是更高级的 ReAct，而是面对长任务时的一种权衡。
toolCount: 5
---

## 本章定位

这一章紧接 ReAct，用来回答一个自然问题：如果任务明显比单次搜索更长、更复杂，Agent 是否应该先有一个计划。

## 本章目标

- 理解 Plan-and-Execute 的适用场景
- 搭出最小的 `planner + executor + replanner`
- 讲清楚它与 ReAct 的差异、优势与复杂度

## 建议内容结构

### 1. ReAct 在长任务上的问题

可以从以下角度展开：

- 容易局部最优
- 容易重复搜索
- 长链路状态更难维护

### 2. 计划结构如何设计

建议讲：

- `goal`
- `steps`
- `status`
- `evidence`
- `nextAction`

### 3. Planner 与 Executor 的分工

说明为什么“规划”和“执行”最好分成两个角色。

### 4. 重规划为什么必要

强调计划不是静态文件，而是可根据执行结果更新的中间产物。

### 5. 与 ReAct 放在一起对比

必须明确说明：

- ReAct：边走边看
- Plan-and-Execute：先拆再做

## 建议代码产出

- `planner.ts`
- `executor.ts`
- `replanner.ts`
- `plan-types.ts`

## 推荐示例任务

- “调研一个技术方案并输出摘要”
- “列出需要查看的资料，再逐项读取和整理”

## 本章写作提醒

- 不要把它描述成更高等级的 Agent
- 要讲清楚它额外引入了哪些复杂度
- 最好用与上一章同类任务做对比

## 待补内容

- 一套计划数据结构
- 一个带重规划的示例流程
- ReAct 与 Plan-and-Execute 的对照表
