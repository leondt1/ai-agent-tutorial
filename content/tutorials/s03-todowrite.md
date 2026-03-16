---
title: TodoWrite
description: 让 agent 把计划显式写出来，通常比把计划藏在脑子里更可靠。
section: planning
sectionTitle: 规划与协调
sectionColor: "#23c18b"
sectionOrder: 2
order: 3
code: s03
tag: 规划与协调
quote: 公开计划让协作和回滚都变容易。
toolCount: 1
---

规划不是为了“看起来更聪明”，而是为了让执行过程更透明。

## 为什么要把计划写出来

当任务比较长时，显式的计划有几个直接收益：

- 用户知道现在做到哪一步了。
- agent 知道下一步该干什么。
- 出现偏差时更容易重排优先级。

## 一个简单的计划结构

```ts
type PlanItem = {
  step: string;
  status: "pending" | "in_progress" | "completed";
};
```

计划不需要太细。三到五步通常已经足够，让它能指导执行，而不是变成新的维护负担。

## 什么时候更新计划

- 完成一个阶段后更新。
- 发现假设不成立时更新。
- 用户改变目标时更新。
