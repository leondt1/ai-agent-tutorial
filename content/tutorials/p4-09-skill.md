---
title: Skill，把重复任务沉淀成能力单元
section: systems
sectionTitle: 把能力变成工程系统
sectionColor: "#b45309"
sectionOrder: 4
order: 2
code: 09
tag: Skill
summary: Tool 是动作接口，Skill 是任务能力封装，它们解决的不是同一个问题。
toolCount: 3
---

## 本章定位

当前面已经有了工具、上下文、RAG、MCP 之后，下一步自然问题是：如何让一类重复任务不必每次从零开始组织。

## 本章目标

- 解释 Skill 的本质与边界
- 区分 Skill、Tool、Prompt、Workflow 的角色
- 搭一个最小 Skill 加载与激活机制

## 建议内容结构

### 1. 为什么不能把所有逻辑都放进系统提示词

先展示痛点，例如：

- 提示词越来越长
- 不同任务互相干扰
- 可维护性越来越差

### 2. 什么样的任务适合做成 Skill

建议挑选两三类重复任务：

- 代码审查
- 技术调研
- 文档总结

### 3. Skill 的定义格式

说明 Skill 至少应该包含：

- 任务目标
- 适用场景
- 推荐流程
- 可用工具
- 输出要求

### 4. Skill 如何与现有能力协作

展示 Skill 如何调度：

- Tools
- RAG
- Context 策略
- MCP 资源

## 建议代码产出

- `skills/skill-types.ts`
- `skills/load-skill.ts`
- `skills/select-skill.ts`
- 两个示例 Skill

## 本章写作提醒

- 不要把 Skill 写成“Prompt 片段拼装”
- 要讲清楚它与 Tool 的分工
- 最好加入一个没有 Skill 和有 Skill 的任务对比

## 待补内容

- 一个 Skill 文件示例
- 技术调研 Skill 的完整案例
- Skill 选择逻辑的最小实现
