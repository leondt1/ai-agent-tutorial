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
toolCount: 0
---

前面几章里，我们已经让 Agent 逐步具备了三个能力：

- 用 Agent Loop 跑起来
- 用 Tool Calling 调用外部能力
- 用 ReAct 和 Plan-and-Execute 处理多步任务

到这里，Agent 已经不再只是一次问答。
它会有目标、消息历史、工具结果、观察记录、计划步骤和 evidence。

这时新的问题出现了：

> 这些信息到底哪些应该给模型看？应该以什么形式给模型看？

这就是 Context Engineering 要解决的问题。

很多 Agent 的失败，不是因为模型不够强，而是因为上下文组织得不好：

- 重要目标被很长的历史消息淹没
- 工具结果全部塞进去，模型抓不到关键 observation
- 计划状态没有更新，模型继续执行已经完成的步骤
- 外部资料虽然找到了，但没有和当前问题对齐

Context Engineering 关心的不是某一种资料来源，而是一个更基础的问题：

> 当前任务需要的系统规则、用户目标、运行状态、历史消息、工具观察和外部知识，应该如何被组织成模型真正能用的上下文。

本章会按四步展开：

1. 先看为什么上下文不是越多越好
2. 再把上下文拆成几个稳定层
3. 然后写一个最小 `buildContext()`
4. 最后看历史裁剪和 observation 筛选怎么影响输出

## 上下文不是越多越好

刚开始写 Agent 时，一个很自然的做法是：

> 把所有信息都塞进 messages。

比如用户的原始目标、完整对话历史、每一次工具结果、整个计划对象、所有已读文档，全都拼成一大段文本发给模型。

这样做看起来很稳，因为“信息都在”。

但对 Agent 来说，信息都在不等于信息可用。

一个长任务执行到中途时，状态可能像这样：

```txt
用户先问过项目怎么启动。
Agent 查过 setup 文档和 package script。
后来用户改成调研 Agent 执行模式。
Agent 又搜索了教程章节。
现在计划已经读完 ReAct 和 Plan-and-Execute。
下一步应该输出对比总结。
```

如果直接把完整历史塞给模型，模型会同时看到：

- 已经过期的启动问题
- 和当前任务关系不大的 package script
- 搜索章节时的中间日志
- 真正有用的 ReAct 和 Plan-and-Execute evidence

模型当然有可能自己分辨出来。
但这等于把上下文整理工作交给模型临场完成。

Context Engineering 的思路正好相反：

> 系统先整理上下文，再让模型基于整理后的上下文做判断。

也就是说，我们不追求“给模型更多信息”，而是追求“给模型当前最需要的信息”。

这里可以顺手分清一个边界：提示词告诉模型“应该怎么做”，上下文告诉模型“基于什么信息做”。

如果上下文里没有当前计划状态，再好的提示词也很难阻止模型重复执行旧步骤。
如果上下文里混着大量过期工具结果，再好的模型也可能抓错重点。

## 上下文可以分成哪些层

为了让上下文可控，我们先把它拆成几层。

一个实用的最小分层是：

| 层 | 作用 | 示例 |
| --- | --- | --- |
| system | 稳定规则和边界 | 不要编造来源；回答必须基于上下文 |
| task | 当前用户目标 | 整理 Agent 执行模式及适用场景 |
| state | 当前运行状态 | 计划步骤、当前步骤、已完成 evidence |
| history | 最近仍相关的对话 | 用户刚刚修改的要求、上一轮回答 |
| observations | 工具或资料带来的事实 | 已读章节摘要、工具结果摘要 |
| external knowledge | 外部知识片段 | RAG 检索结果，下一章再展开 |

这张表最重要的不是名字，而是边界。

不同层的信息稳定性不一样：

- `system` 通常很稳定
- `task` 会随着用户目标变化
- `state` 每轮执行都会更新
- `history` 需要裁剪或摘要
- `observations` 需要筛选和压缩
- `external knowledge` 需要来源和相关性

如果所有信息都混在一段文本里，后面就很难维护。

## 本章示例

这一章对应的可运行代码在 [build-context.ts](https://github.com/leondt1/ai-agent-tutorial/blob/main/examples/06-context-engineering/build-context.ts)。

运行命令是：

```bash
pnpm example examples/06-context-engineering/build-context.ts
```

这个示例不调用模型。

因为本章的重点不是“模型会怎么回答”，而是“在调用模型之前，系统应该怎样构造上下文”。

示例会打印两份上下文：

- `Naive Context`：把所有历史、计划和 observation 直接塞进去
- `Engineered Context`：按层组织，只保留当前任务需要的信息

## 定义 Agent 状态

示例先定义一份最小 `AgentState`：

```ts
type AgentState = {
  goal: string;
  currentStep: string;
  plan: PlanStep[];
  history: Message[];
  observations: Observation[];
};
```

这里的每个字段都来自前几章：

- `goal` 来自用户目标
- `currentStep` 来自 Plan-and-Execute 的当前步骤
- `plan` 保存步骤状态和 evidence
- `history` 保存最近对话
- `observations` 保存工具或资料返回的事实

注意这里没有把所有东西都叫做 messages。

这一步很重要。

如果所有状态都只存在消息历史里，系统就很难单独更新“计划”、单独裁剪“历史”、单独筛选“观察结果”。

Context Engineering 的第一步，往往就是把混在一起的信息拆成结构化状态。

## 先看一个反例

反例函数叫 `buildNaiveContext()`：

```ts
function buildNaiveContext(input: AgentState): string {
  return [
    "你是一个工程助手。",
    "",
    `用户目标：${input.goal}`,
    "",
    "完整历史：",
    ...input.history.map((message) => `${message.role}: ${message.content}`),
    "",
    "完整计划：",
    ...input.plan.map(
      (step) =>
        `${step.id} [${step.status}] ${step.title} evidence=${JSON.stringify(
          step.evidence,
        )}`,
    ),
    "",
    "所有工具观察：",
    ...input.observations.map(
      (item) => `${item.source}\n${item.summary}\n${item.content}`,
    ),
  ].join("\n");
}
```

这个函数不是完全错误。
它至少把信息给到了模型。

但它有几个明显问题：

- 历史消息没有区分新旧，过期任务也会进入上下文
- 计划和 evidence 被直接序列化，读起来不够清楚
- observation 全量进入上下文，没有按当前步骤筛选
- 不同信息层混在一起，后续很难单独优化

这种上下文在小 demo 里可能能跑。
但任务一长，它就会变成噪音源。

## 写一个 `buildContext()`

现在看整理后的版本。

`buildContext()` 不急着拼一整段文本，而是先构建多个 layer：

```ts
function buildContext(input: AgentState): BuiltContext {
  const layers: ContextLayer[] = [
    {
      name: "system",
      content: "你是一个工程助手。回答必须基于给定上下文，不要编造来源。",
    },
    {
      name: "task",
      content: `当前目标：${input.goal}\n当前步骤：${input.currentStep}`,
    },
    {
      name: "state",
      content: formatPlanState(input.plan),
    },
    {
      name: "history",
      content: compressHistory(input.history),
    },
    {
      name: "observations",
      content: formatRelevantObservations(
        selectRelevantObservations(input.observations, input.currentStep),
      ),
    },
  ];

  return {
    layers,
    text: layers
      .map((layer) => `## ${layer.name}\n${layer.content}`)
      .join("\n\n"),
  };
}
```

这个函数做了三件事：

- 分层：让每类信息有明确位置
- 筛选：不是所有 history 和 observation 都进入上下文
- 格式化：把结构化状态转成模型容易读的文本

这就是 Context Engineering 最小闭环。

它不是一个更长的 prompt。
它是一次有意识的信息组织。

## `state` 层：让计划可读

上一章里，我们已经维护了计划和 evidence。

这一章要做的是：把计划状态转换成模型容易使用的上下文。

```ts
function formatPlanState(plan: PlanStep[]) {
  return plan
    .map((step) => {
      const evidence =
        step.evidence.length > 0 ? `\n  evidence: ${step.evidence.join("；")}` : "";

      return `- ${step.id} [${step.status}] ${step.title}${evidence}`;
    })
    .join("\n");
}
```

这段格式化很朴素，但比直接 `JSON.stringify(plan)` 更容易让模型抓住重点。

模型能直接看到：

- 哪些步骤已经完成
- 当前还剩什么
- 每一步有什么 evidence

注意，这里没有隐藏计划状态。

Plan-and-Execute 维护计划，Context Engineering 决定计划如何进入上下文。

## `history` 层：保留最近相关内容

历史消息最容易越积越多。

本章示例先用最小策略：

```ts
function compressHistory(history: Message[]) {
  const latestMessages = history.slice(-4);

  return latestMessages
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
}
```

这叫滑动窗口。

它不聪明，但很容易理解：

> 只保留最近几条消息，把更早的历史排除在本轮上下文之外。

真实系统通常会更进一步：

- 把旧历史压缩成结构化摘要
- 保留用户明确修改过的约束
- 丢弃已经完成且不再影响当前目标的中间日志

但在这个阶段，还不需要引入复杂记忆系统。

先把历史从“无限追加的消息列表”变成“可以被裁剪和压缩的上下文层”。

## `observations` 层：只保留当前步骤需要的事实

工具结果和资料内容也不能无脑全塞。

本章示例用当前步骤来筛选 observation：

```ts
function selectRelevantObservations(
  observations: Observation[],
  currentStep: string,
) {
  const keywords = currentStep
    .toLowerCase()
    .split(/\s+|和|与|的|适合|场景/)
    .map((word) => word.trim())
    .filter(Boolean);

  return observations.filter((observation) => {
    const text = `${observation.source} ${observation.summary} ${observation.content}`
      .toLowerCase();

    return keywords.some((keyword) => text.includes(keyword));
  });
}
```

这个筛选方式很简单。
它不是为了做一个完美检索器。

真正的检索和排序，我们会放到下一章 RAG。

这里要学的是更基础的原则：

> observation 进入上下文前，应该先问一句：它和当前步骤有什么关系？

如果当前步骤是“对比 ReAct 和 Plan-and-Execute”，那最重要的 observation 就是这两章的摘要。

如果当前步骤是“说明项目怎么启动”，那 package script 的 observation 才重要。

同一条 observation 是否进入上下文，取决于当前任务。

## 运行结果怎么看

运行示例后，你会先看到 `Naive Context`。

它会把完整历史、完整计划和所有 observation 都拼进去。

再往下看 `Engineered Context`，结构会更像这样：

```txt
## system
你是一个工程助手。回答必须基于给定上下文，不要编造来源。

## task
当前目标：整理 Agent 执行模式，并说明每种模式适合什么场景。
当前步骤：对比 ReAct 和 Plan-and-Execute 的适用场景

## state
- step-1 [done] 确认哪些章节和执行模式有关
  evidence: 相关章节包括最小 Agent Loop、Tool Calling、ReAct、Plan-and-Execute。
- step-4 [pending] 输出对比总结

## history
user: 现在调研这个教程项目里有哪些 Agent 执行模式。
assistant: 我会先搜索相关章节，再逐个读取资料。

## observations
- source: content/tutorials/p2-04-react.md
  summary: ReAct 让下一步 action 依赖刚刚得到的 observation。
- source: content/tutorials/p2-05-plan-and-execute.md
  summary: Plan-and-Execute 先维护显式计划，再逐步执行和重规划。
```

这份上下文不一定更长。
但它更清楚。

模型接下来要做什么、依据是什么、哪些信息是背景、哪些信息是事实，都更容易分辨。

## Context Engineering 的判断标准

最后，把本章的判断标准收束成几句话。

好的上下文，不是信息最多的上下文。

好的上下文应该满足：

- 目标清楚：模型知道当前要完成什么
- 状态清楚：模型知道任务执行到哪一步
- 依据清楚：模型知道哪些结论来自哪些 observation
- 历史克制：旧消息不会淹没当前任务
- 格式稳定：每一层信息都有固定位置

这也是为什么本教程先讲 Context Engineering，再讲 RAG。

因为 RAG 检索出来的内容，最终也只是上下文的一部分。

如果没有上下文工程，RAG 很容易变成“把更多文档塞给模型”。
如果先有上下文工程，RAG 才能变成“把当前任务需要的外部知识放到正确的位置”。

下一章我们就沿着这个思路继续：

> 当上下文缺少外部知识时，如何用 RAG 找到并注入正确资料。
