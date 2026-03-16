---
title: Agent 循环
description: 用最小 while 循环理解 agent 如何持续调用模型与工具。
section: execution
sectionTitle: 工具与执行
sectionColor: "#4f7cff"
sectionOrder: 1
order: 1
code: s01
tag: 工具与执行
quote: The minimal agent kernel is a while loop plus one tool.
toolCount: 1
---

Agent 的最小实现并不复杂，它只是一个反复执行的循环：

1. 把当前状态发给模型。
2. 判断模型是否请求调用工具。
3. 如果需要，执行工具并把结果写回消息列表。
4. 如果不需要，就结束本轮任务。

## Agent While 循环

```ts
while (stopReason === "tool_use") {
  const response = await model.generate(messages);

  if (response.stopReason !== "tool_use") {
    return response;
  }

  const toolResult = await runTool(response.toolCall);
  messages.push(response.message, toolResult);
}
```

这段逻辑里最关键的不是“聪明”，而是“可恢复”：

- `messages` 是完整上下文。
- `toolCall` 是显式的动作请求。
- `toolResult` 是下一轮推理的输入。

> 一个稳定的 agent 循环，先追求状态清晰，再追求能力丰富。

## 为什么这个模型好用

这个模式的优点是很容易调试。每一轮的输入、输出和工具执行结果都能被记录下来，所以当 agent 出错时，我们可以快速定位：

- 是提示词没说清楚。
- 是工具参数结构设计有问题。
- 还是工具结果没有被正确回填。

## 实战建议

先用一个工具跑通整条链路，比如 `bash` 或 `search`。等最小闭环稳定以后，再增加更多工具和更复杂的规划逻辑。
