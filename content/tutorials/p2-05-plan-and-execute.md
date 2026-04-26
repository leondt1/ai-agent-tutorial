---
title: Plan-and-Execute，从反应式到规划式
section: execution
sectionTitle: 让 Agent 学会行动与规划
sectionColor: "#4f7cff"
sectionOrder: 2
order: 3
code: 05
tag: Planning
summary: 显式规划不是更高级的 ReAct，而是面对长任务时的一种权衡。
toolCount: 2
---

上一章我们写出了一个 ReAct 风格的 Agent。

它会根据每一轮 observation 决定下一步 action：

```txt
观察到候选文档
  ↓
读取文档
  ↓
观察到 package script 线索
  ↓
继续读取 script
  ↓
回答用户
```

这个模式很自然，也很轻量。

但如果任务再长一点，新的问题就会出现：

> 如果 Agent 不是查一两个线索，而是要调研、整理、对比多个资料源，它还应该只靠“下一步反应”往前走吗？

这一章要讲的 Plan-and-Execute，就是把长任务里的“下一步怎么走”显式写成计划。

它不是更高级的 ReAct，也不是默认更好的 Agent。
它只是面对长任务时的一种工程权衡：

- 用更多状态管理，换取更好的全局方向感
- 用更复杂的执行流程，减少重复探索和目标漂移
- 用可检查的计划，让 Agent 的中间过程更容易调试

本章会按四步展开：

1. 先看 ReAct 在长任务上的局限
2. 再定义最小计划结构
3. 然后写出 `planner -> executor -> replanner` 的闭环
4. 最后把它和 ReAct 放在一起对比

## ReAct 在长任务上的问题

ReAct 的核心是：

> 每一轮都根据新的 observation 决定下一步 action。

这在短链路任务里非常有效。

比如上一章的任务：

> “这个项目怎么启动？如果文档不够，请继续查 package 脚本。”

它的路径很短：

1. 搜索启动文档
2. 读取文档
3. 读取 `dev` script
4. 回答

这种任务没有必要先写复杂计划。
每一步 observation 都很明确，下一步 action 也很容易判断。

但换一个任务：

> “调研这个教程项目里目前已经讲了哪些 Agent 执行模式，并整理它们分别适合什么场景。”

这个任务就不再只是“找到一个答案”。

Agent 需要：

- 先确认哪些章节和执行模式有关
- 再逐个读取相关资料
- 记录每个模式的依据
- 最后把它们放到一起对比

如果仍然只靠 ReAct，模型很容易遇到三个问题。

第一，容易局部最优。

模型刚读完 ReAct 章节，就可能急着总结 ReAct，而忘了还要看 Tool Calling、Agent Loop 和 Plan-and-Execute。

第二，容易重复搜索。

如果模型没有显式记录“哪些资料已经读过”，后面可能再次搜索同一类关键词，或者反复读取同一篇资料。

第三，长链路状态更难维护。

短任务里，模型可以靠消息历史记住刚刚发生了什么。
长任务里，消息历史会越来越长，真正重要的状态反而可能被淹没。

所以 Plan-and-Execute 要解决的不是“模型不会推理”，而是：

> 当任务跨度变长时，把目标、步骤、进度和证据显式保存下来。

## Plan-and-Execute 是什么

Plan-and-Execute 的最小流程是：

```txt
用户目标
  ↓
Planner 生成计划
  ↓
Executor 执行当前步骤
  ↓
得到 Observation
  ↓
Replanner 更新计划
  ↓
继续执行，直到可以回答
```

和 ReAct 对比，可以先记住一句话：

> ReAct 是边走边看，Plan-and-Execute 是先拆再做。

这里的“先拆”不代表计划一开始就必须完美。

恰恰相反，本章要强调的是：

> 计划不是静态 TODO List，而是会被 observation 修正的中间状态。

比如 planner 一开始可能只知道：

```txt
1. 先搜索和 Agent 执行模式相关的教程资料
```

执行这一步后，搜索结果告诉它有几篇相关资料：

```txt
content/tutorials/p1-02-minimal-loop.md
content/tutorials/p2-03-tool-calling.md
content/tutorials/p2-04-react.md
content/tutorials/p2-05-plan-and-execute.md
```

这时 replanner 才把计划补全：

```txt
2. 读取最小 Agent Loop 章节
3. 读取 Tool Calling 章节
4. 读取 ReAct 章节
5. 读取 Plan-and-Execute 章节
```

也就是说，Plan-and-Execute 并不是要求模型一开始就猜中所有路径。
它只是把“当前计划”变成一个可见、可更新、可检查的对象。

## 计划里应该有什么

本章示例用一份最小计划结构：

```ts
type Plan = {
  goal: string;
  steps: PlanStep[];
  finalAnswer: string | null;
};

type PlanStep = {
  id: string;
  title: string;
  status: "pending" | "done" | "skipped";
  action: PlanAction;
  evidence: string[];
};
```

这几个字段各自承担一个教学角色：

- `goal`：原始目标，防止执行几轮后偏离任务
- `steps`：显式拆出来的步骤
- `status`：每一步现在是待执行、已完成，还是可以跳过
- `action`：这一步真正要执行的工具动作
- `evidence`：这一步执行后留下了什么依据
- `finalAnswer`：信息足够后，由 replanner 给出的最终回答

其中最容易被忽略的是 `evidence`。

没有 evidence，计划只是一个任务列表。
有了 evidence，计划才变成“任务进度 + 已获得依据”的运行状态。

后续生成最终答案时，模型不应该只看“读过哪些文件”，而应该看：

- 每篇资料实际提供了什么信息
- 哪些结论有 observation 支撑
- 哪些步骤还没有完成

## 本章示例

这一章对应的可运行代码在 [plan-and-execute-agent.ts](https://github.com/leondt1/ai-agent-tutorial/blob/main/examples/05-plan-and-execute/plan-and-execute-agent.ts)。

运行前继续沿用项目根目录的 `.env.local`：

```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5-mini
```

运行命令是：

```bash
pnpm example examples/05-plan-and-execute/plan-and-execute-agent.ts
```

默认任务是：

```txt
调研这个教程项目里目前已经讲了哪些 Agent 执行模式，并整理它们分别适合什么场景。
```

这个任务故意比上一章长一点。
它不是为了查到单个命令，而是为了展示计划如何分阶段收集资料、记录证据、最后汇总。

## 准备一份小资料库

为了让示例保持自包含，我们仍然不直接读取真实文件系统。
示例里准备了一份很小的教程资料库：

```ts
const tutorialNotes = [
  {
    path: "content/tutorials/p1-02-minimal-loop.md",
    title: "从零写一个最小 Agent Loop",
    summary: "Agent 的核心是状态、模型、动作、观察和停止条件组成的循环。",
  },
  {
    path: "content/tutorials/p2-03-tool-calling.md",
    title: "Tool Calling，给 Agent 行动力",
    summary: "Tool Calling 把外部能力暴露成模型可请求的动作接口。",
  },
  {
    path: "content/tutorials/p2-04-react.md",
    title: "ReAct，让 Agent 学会边想边做",
    summary: "ReAct 让模型在每一轮根据新的 observation 决定下一步 action。",
  },
  {
    path: "content/tutorials/p2-05-plan-and-execute.md",
    title: "Plan-and-Execute，从反应式到规划式",
    summary: "Plan-and-Execute 先把长任务拆成计划，再逐步执行和重规划。",
  },
];
```

真实代码里的每条资料还带有 `keywords` 和 `content`。

这里继续保持和上一章一样的取舍：

> 本章不是在教搜索实现，而是在教计划如何驱动执行。

所以工具数据直接放在同一个文件里。
读者打开示例文件后，可以从上到下看到完整流程。

## 两个最小工具

本章只需要两个工具。

第一个是 `searchTutorials`：

```ts
async function searchTutorials(input: Record<string, string>): Promise<ToolResult> {
  const query = String(input.query ?? "").trim().toLowerCase();
  const queryWords = query.split(/\s+/).filter(Boolean);

  const matches = tutorialNotes.filter((note) => {
    const haystack = [note.path, note.title, note.summary, note.content]
      .join(" ")
      .toLowerCase();

    return queryWords.some((word) => haystack.includes(word));
  });

  const results = matches.length > 0 ? matches : tutorialNotes;

  return {
    ok: true,
    summary: `找到 ${results.length} 篇可能相关的教程资料。`,
    content: results
      .map((note) => `${note.path}: ${note.title} - ${note.summary}`)
      .join("\n"),
  };
}
```

它只返回候选路径和摘要。

第二个是 `readTutorial`：

```ts
async function readTutorial(input: Record<string, string>): Promise<ToolResult> {
  const filePath = String(input.path ?? "").trim();
  const note = tutorialNotes.find((item) => item.path === filePath);

  if (!note) {
    return {
      ok: false,
      summary: `没有找到教程资料：${filePath}`,
      content: "请先搜索可用教程路径，再读取其中一个路径。",
    };
  }

  return {
    ok: true,
    summary: `已读取 ${note.path}。`,
    content: `${note.title}\n${note.content}`,
  };
}
```

这两个工具和上一章的工具一样，都只提供 observation，不替 Agent 直接完成总结。

区别在于：

- ReAct 里，模型每一轮直接决定下一次 tool call
- Plan-and-Execute 里，模型先把 tool call 写进计划步骤，再由 executor 执行当前步骤

## Planner：先生成初始计划

Planner 的职责很窄：

> 根据用户目标，生成一份当前可执行的计划。

示例里用真实模型请求完成这一步：

```ts
async function createPlan(goal: string): Promise<Plan> {
  const plan = await requestJson<Plan>([
    {
      role: "system",
      content:
        "你是一个规划器。请把用户目标拆成可执行计划。只返回 JSON，不要返回 Markdown。计划必须先搜索资料，再根据搜索结果由 replanner 决定要读哪些资料。",
    },
    {
      role: "user",
      content: `用户目标：${goal}`,
    },
  ]);

  return normalizePlan(plan, goal);
}
```

这里有一个重要限制：

> 初始计划不应该假装自己已经知道所有路径。

所以 system message 明确要求：先搜索资料，再让 replanner 根据搜索结果决定后续步骤。

这和很多人第一次写 planning prompt 的直觉不一样。
我们不是希望 planner 一次性写出完美计划，而是希望它写出“当前有依据的下一步计划”。

## Executor：只执行下一步

Executor 不负责重新思考目标。
它只做一件事：

> 找到第一个 `pending` step，执行里面的 action。

```ts
async function executeNextStep(plan: Plan): Promise<Observation | null> {
  const step = plan.steps.find((item) => item.status === "pending");

  if (!step) {
    return null;
  }

  const result = await runAction(step.action);

  return {
    stepId: step.id,
    action: step.action.name,
    result,
  };
}
```

这个分工看起来简单，但很关键。

Planner 和 replanner 负责“想清楚计划怎么变”。
Executor 负责“忠实执行计划里的当前动作”。

如果 executor 一边执行一边重写计划，整个系统就很难调试。
你将不知道一个行为到底来自原计划、执行器的临时判断，还是模型后来改了主意。

## Replanner：让计划吸收 observation

Plan-and-Execute 最重要的部分不是 planner，而是 replanner。

因为真实任务里，计划一定会遇到新信息：

- 搜索结果告诉你应该读哪些资料
- 读取资料后发现某一步已经不需要了
- 某个 observation 说明当前证据还不够
- 已经有足够 evidence，可以直接回答

示例里的 replanner 收到两样东西：

- 当前 `plan`
- 刚刚执行得到的 `observation`

然后返回一份新的计划：

```ts
async function replan(plan: Plan, observation: Observation): Promise<Plan> {
  const updatedPlan = await requestJson<Plan>([
    {
      role: "system",
      content:
        "你是一个重规划器。你会收到当前计划和刚刚的 observation。请更新计划：把刚执行的 step 标记为 done 或 skipped，把 observation 中有用的信息写进 evidence；如果还需要资料，就追加新的 pending step；如果已经足够回答，就设置 finalAnswer。",
    },
    {
      role: "user",
      content: JSON.stringify({ plan, observation }, null, 2),
    },
  ]);

  return normalizePlan(updatedPlan, plan.goal);
}
```

这一段体现了 Plan-and-Execute 的核心：

> observation 不是只进入下一轮 prompt，而是会改写显式计划。

当 `searchTutorials` 返回候选资料后，replanner 可以追加多个 `readTutorial` 步骤。

当 `readTutorial` 返回正文后，replanner 可以把摘要写进对应 step 的 `evidence`。

当 evidence 已经足够支撑最终回答后，replanner 可以设置 `finalAnswer`，主循环停止。

## 主循环

最后把三部分串起来：

```ts
async function runPlanAndExecuteAgent(goal: string) {
  let plan = await createPlan(goal);

  for (let turn = 1; turn <= maxSteps; turn += 1) {
    if (plan.finalAnswer) {
      return plan;
    }

    const observation = await executeNextStep(plan);

    if (!observation) {
      throw new Error("计划没有 pending step，也没有 finalAnswer。");
    }

    plan = await replan(plan, observation);
  }

  throw new Error(`Plan-and-Execute stopped after ${maxSteps} steps.`);
}
```

这个循环和 ReAct 主循环很像，但状态中心变了。

ReAct 的核心状态是消息历史：

```txt
messages -> model -> tool call -> tool result -> messages
```

Plan-and-Execute 的核心状态是计划：

```txt
plan -> execute step -> observation -> updated plan
```

当然，真实模型请求仍然需要 messages。
但教学重点已经从“消息历史如何驱动下一次工具调用”，转到了“计划如何吸收观察结果并改变执行路径”。

## 运行时会看到什么

运行示例后，命令行会按这个节奏打印：

```txt
Goal:
调研这个教程项目里目前已经讲了哪些 Agent 执行模式，并整理它们分别适合什么场景。

Current Plan:
pending step-1: 搜索与 Agent 执行模式相关的教程资料

Execute: step-1
Action: searchTutorials
Action Input: {"query":"Agent 执行模式"}

Observation:
找到 4 篇可能相关的教程资料。

Current Plan:
done step-1: 搜索与 Agent 执行模式相关的教程资料
pending step-2: 读取最小 Agent Loop 章节
pending step-3: 读取 Tool Calling 章节
pending step-4: 读取 ReAct 章节
pending step-5: 读取 Plan-and-Execute 章节
```

后面每读取一篇资料，replanner 都会把对应 evidence 写回计划。

最终，它会输出一份对比总结。

这份输出的重点不在于文字是否华丽，而在于你能清楚看到：

- 当前目标是什么
- 哪些步骤已经完成
- 每一步的依据是什么
- 为什么可以停止

这就是显式计划带来的可调试性。

## Plan-and-Execute 的代价

到这里，你可能会觉得 Plan-and-Execute 比 ReAct 更稳。

但不要急着把所有 Agent 都改成 planning 架构。

它至少引入了三类成本。

第一，状态更复杂。

现在你不只要维护 messages，还要维护 plan、step status、evidence 和 final answer。

第二，模型调用更多。

除了执行步骤本身，你还需要 planner 和 replanner。
如果任务很短，这些额外调用可能完全不划算。

第三，计划可能制造假确定性。

如果 planner 一开始写出一份看起来很完整、但没有 observation 支撑的计划，系统反而更容易沿着错误方向执行。

所以本章示例才刻意要求：

> 初始计划先搜索，不提前猜路径；后续步骤由 observation 驱动的 replanner 追加。

Plan-and-Execute 的价值不在于“计划看起来完整”，而在于“计划能随着证据变得更准确”。

## ReAct 和 Plan-and-Execute 对比

最后把两种执行模式放在一起看：

| 维度 | ReAct | Plan-and-Execute |
| --- | --- | --- |
| 基本节奏 | 边观察边行动 | 先拆计划，再逐步执行 |
| 核心状态 | 消息历史和最新 observation | 显式 plan、step status、evidence |
| 适合任务 | 短链路搜索、排查、补充信息 | 调研、整理、迁移、跨多资料源任务 |
| 优点 | 轻量、直接、实现简单 | 全局目标更清楚，过程更可检查 |
| 代价 | 长任务里容易重复或漂移 | 状态更多，调用更多，计划可能过度设计 |

一个实用判断是：

- 如果任务只需要一两次工具调用，用 ReAct
- 如果任务需要跨多个资料源收集证据，用 Plan-and-Execute
- 如果计划本身会频繁被新信息修正，就一定要有 replanner

这也为下一章 Context Engineering 做好了铺垫。

当 Agent 开始维护计划、证据、历史和工具结果时，新的问题会出现：

> 这些信息到底哪些应该进入模型上下文？应该以什么形式进入？

下一章我们就从这里开始。
