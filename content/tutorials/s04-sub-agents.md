---
title: 子 Agent
description: 把任务拆给专门角色，可以显著降低单个上下文的复杂度。
section: planning
sectionTitle: 规划与协调
sectionColor: "#23c18b"
sectionOrder: 2
order: 4
code: s04
tag: 规划与协调
quote: 把复杂度拆开，比把上下文堆高更有效。
toolCount: 4
---

当一个 agent 同时负责搜索、实现、评审和汇报时，它的上下文会很快变得臃肿。

## 适合拆成子 Agent 的场景

- 有明显不同的角色职责
- 同时存在可并行的子任务
- 各子任务需要不同的工具集

## 常见拆分方式

1. **研究 Agent**：查资料、找 API、验证外部信息。
2. **实现 Agent**：改代码、补测试、跑构建。
3. **审查 Agent**：找回归风险、补验收意见。

## 注意事项

子 Agent 不是越多越好。每多一个角色，就多一层编排、结果整合和失败处理成本。先从最明确的职责边界开始拆。
