---
title: 从零写一个最小 Agent Loop
section: foundations
sectionTitle: 建立正确心智模型
sectionColor: "#2563eb"
sectionOrder: 1
order: 2
code: 02
tag: Agent Loop
summary: Agent 的第一性原理不是框架，而是一个根据状态持续决策和行动的循环。
toolCount: 1
---

上一章我们已经讲清楚了一个边界：Agent 不是“更会聊天的模型”，而是一个会根据中间结果持续决策和行动的系统。

这一章开始，我们把这个定义真正落成代码。

目标很克制：不写 Planner，不接 RAG，不做记忆系统，也不追求“通用框架感”。我们只做一件事:

> 用最少的 TypeScript 代码，跑通一次完整的 `决策 -> 执行 -> 观察 -> 再决策` 闭环。

当这一章结束时，你应该已经拥有一个真正能跑的最小 Agent。它只会一件很简单的事：当用户提出问题时，模型先决定要不要调用一个工具；如果调用了工具，就把结果写回状态，再继续回答。

这听起来并不复杂。事实也确实如此。  
很多 Agent 系统最核心的骨架，真的就是一个循环。

## 先把目标缩到最小

为了让核心结构足够清楚，我们把这个例子限制在最小规模：

- 只有一个工具：`searchDocs`
- 只有两种模型决策：`调用工具` 或 `直接回答`
- 只有一个状态容器：`messages`
- 只有一个停止条件：`得到最终回答` 或 `达到最大轮次`

示例任务也尽量简单：

> 用户问：“这个项目怎么安装？”  
> 如果模型不知道，就先调用 `searchDocs` 查文档，再根据文档结果回答。

这里最重要的不是工具本身，而是整个执行过程必须形成闭环：

1. 用户问题进入状态
2. 模型基于当前状态做决策
3. 如果要调用工具，就执行工具
4. 工具结果回写到状态
5. 模型再次读取更新后的状态
6. 直到给出最终回答或触发停止条件

如果没有第 4 步，这个系统就不是真正的 Agent Loop。

## 最小 Loop 长什么样

先不要急着看类型定义，先看最核心的控制流。

```ts
while (state.step < state.maxSteps) {
  state.step += 1;

  const decision = await callModel(state.messages);

  state.messages.push(decision.message);

  if (decision.type === "final") {
    return decision.message.content;
  }

  const result = await runTool(decision.toolCall);

  state.messages.push({
    role: "tool",
    toolName: decision.toolCall.name,
    content: result.content,
  });
}

throw new Error("Agent exceeded max steps");
```

这个循环里真正关键的地方只有两个：

- 模型每一轮都不是直接输出最终答案，而是先输出“下一步决定”
- 工具执行结果必须回写到 `messages`，成为下一轮推理可见的观察

可以把它理解成一个最小状态机：

- 当前状态是 `messages`
- 模型负责产生下一步动作
- 工具负责产生新的观察
- 循环负责把观察写回状态

Agent 之所以成立，不是因为里面有模型，而是因为系统会围绕状态持续迭代。

## 先定义最小数据结构

现在把上面的循环补成完整代码。先从类型开始。

```ts
export type Message =
  | {
      role: "system" | "user" | "assistant";
      content: string;
    }
  | {
      role: "tool";
      toolName: string;
      content: string;
    };

export type ToolCall = {
  name: string;
  input: Record<string, unknown>;
};

export type ToolResult = {
  ok: boolean;
  content: string;
};

export type AssistantMessage = {
  role: "assistant";
  content: string;
};

export type ModelDecision =
  | {
      type: "final";
      message: AssistantMessage;
    }
  | {
      type: "tool";
      message: AssistantMessage;
      toolCall: ToolCall;
    };

export type AgentState = {
  step: number;
  maxSteps: number;
  messages: Message[];
};
```

这几个类型已经足够表达一个最小 Agent Loop：

- `Message` 表示当前上下文里已经发生过什么
- `ToolCall` 表示模型决定调用哪个工具
- `ToolResult` 表示工具执行后观察到了什么
- `ModelDecision` 把模型输出收敛成两种结果：继续行动，或者结束回答
- `AgentState` 保存整个循环运行到当前轮为止的状态

这里有一个刻意的取舍：我们没有一开始就把类型做得很通用。

例如，真实系统里你很快就会遇到这些问题：

- 工具参数要不要做 schema 校验
- tool message 要不要有 `callId`
- 工具结果是不是应该带结构化字段
- 模型输出是不是应该保留原始 provider payload

这些都是真问题，但现在先不要处理。  
第二章的任务不是“设计一个大而全的 Agent Runtime”，而是“看清 Agent 最小到底靠什么跑起来”。

## 只接一个最简单的工具

接下来定义唯一的工具 `searchDocs`。为了让这章的示例能独立运行，我们不用真实文档系统，只做一个内存版文档搜索。

```ts
type Tool = {
  name: string;
  description: string;
  execute(input: Record<string, unknown>): Promise<ToolResult>;
};

const docs = [
  {
    id: "install",
    keywords: ["安装", "启动", "pnpm", "dev", "install"],
    text: "安装步骤：先运行 pnpm install，再运行 pnpm dev 启动开发服务器。",
  },
  {
    id: "test",
    keywords: ["测试", "test"],
    text: "测试命令：运行 pnpm test。",
  },
];

export const searchDocsTool: Tool = {
  name: "searchDocs",
  description: "在项目文档里搜索安装、启动和使用说明。",
  async execute(input) {
    const query = String(input.query ?? "").trim().toLowerCase();

    const matches = docs.filter((doc) =>
      doc.keywords.some((keyword) => query.includes(keyword.toLowerCase()))
    );

    if (matches.length === 0) {
      return {
        ok: false,
        content: "没有找到相关文档。",
      };
    }

    return {
      ok: true,
      content: matches.map((doc) => `${doc.id}: ${doc.text}`).join("\n"),
    };
  },
};

export const tools = {
  [searchDocsTool.name]: searchDocsTool,
};
```

这里我们故意把工具做得很朴素，只保留三个要素：

- 它叫什么
- 它是干什么的
- 它收到输入后返回什么结果

这和下一章要讲的“适合模型调用的工具接口设计”还不是一回事。  
现在我们只是先证明：哪怕只有一个非常粗糙的工具，Agent Loop 也已经可以成立。

## 先把模型当成一个黑盒决策器

到这里最容易卡住的地方是：真实模型 SDK 怎么接？

答案是，先不要让 SDK 细节淹没主线。  
在这一章里，我们把模型抽象成一个函数：

```ts
async function callModel(messages: Message[]): Promise<ModelDecision> {
  // 把当前消息历史发送给模型
  // 模型返回两种结果之一：
  // 1. 直接给最终回答
  // 2. 请求调用某个工具
}
```

这个抽象非常重要。  
无论你后面接 OpenAI、Anthropic，还是别的模型服务，外层 Agent Loop 都不应该关心 provider 的原始响应格式。Loop 真正在意的只有一件事：

> 当前这轮，模型是要继续行动，还是已经可以结束？

为了让本章示例可以完整运行，下面先用一个极小的模拟版 `callModel()` 代替真实 LLM。它不是为了“假装模型很聪明”，而是为了把注意力集中在 Loop 本身。

```ts
async function callModel(messages: Message[]): Promise<ModelDecision> {
  const lastMessage = messages[messages.length - 1];

  if (lastMessage.role === "user") {
    return {
      type: "tool",
      message: {
        role: "assistant",
        content: "我先去文档里查一下安装步骤。",
      },
      toolCall: {
        name: "searchDocs",
        input: {
          query: lastMessage.content,
        },
      },
    };
  }

  if (lastMessage.role === "tool") {
    return {
      type: "final",
      message: {
        role: "assistant",
        content: `我查到的结果是：\n${lastMessage.content}`,
      },
    };
  }

  return {
    type: "final",
    message: {
      role: "assistant",
      content: "我现在还无法继续这个请求。",
    },
  };
}
```

这段代码当然不是一个真正的 LLM。  
但它已经满足了 Agent Loop 所需的最小接口：看到用户问题时先决定调用工具；看到工具结果后再输出最终回答。

等你把它替换成真实模型时，外层循环逻辑几乎不用改。

## 实现最小 `runAgent()`

现在把类型、工具和模型决策器串起来。

```ts
import { callModel } from "./call-model.js";
import type { AgentState, ToolCall, ToolResult } from "./types.js";
import { tools } from "./tools/search-docs.js";

async function runTool(toolCall: ToolCall): Promise<ToolResult> {
  const tool = tools[toolCall.name as keyof typeof tools];

  if (!tool) {
    return {
      ok: false,
      content: `未知工具：${toolCall.name}`,
    };
  }

  return tool.execute(toolCall.input);
}

export async function runAgent(userInput: string) {
  const state: AgentState = {
    step: 0,
    maxSteps: 4,
    messages: [
      {
        role: "system",
        content: "你是一个会在需要时查文档的工程助手。",
      },
      {
        role: "user",
        content: userInput,
      },
    ],
  };

  while (state.step < state.maxSteps) {
    state.step += 1;

    const decision = await callModel(state.messages);

    console.log(`\n[step ${state.step}] model decision: ${decision.type}`);
    console.log(decision.message.content);

    state.messages.push(decision.message);

    if (decision.type === "final") {
      return {
        answer: decision.message.content,
        state,
      };
    }

    console.log(`[step ${state.step}] run tool: ${decision.toolCall.name}`);
    console.log(decision.toolCall.input);

    const result = await runTool(decision.toolCall);

    console.log(`[step ${state.step}] tool result:`);
    console.log(result.content);

    state.messages.push({
      role: "tool",
      toolName: decision.toolCall.name,
      content: result.content,
    });
  }

  throw new Error(`Agent stopped after ${state.maxSteps} steps.`);
}
```

如果你把这段代码拆成几个文件，本章的最小示例其实就已经完成了。

完整可运行版本可以放在 `examples/02-minimal-loop`，并通过根目录脚本直接运行。

它做的事非常直接：

1. 初始化系统消息和用户消息
2. 把完整消息历史交给模型
3. 如果模型要工具，就执行工具
4. 把工具结果写回消息历史
5. 再次把更新后的历史交给模型
6. 如果模型给出最终回答，就结束

这个版本还非常简陋，但“Agent 的骨架”已经完整出现了。

## 跑一次看看发生了什么

加一个最小入口：

```ts
const result = await runAgent("这个项目怎么安装？");

console.log("\nFinal answer:");
console.log(result.answer);
```

你大概会看到类似输出：

```txt
[step 1] model decision: tool
我先去文档里查一下安装步骤。
[step 1] run tool: searchDocs
{ query: '这个项目怎么安装？' }
[step 1] tool result:
install: 安装步骤：先运行 pnpm install，再运行 pnpm dev 启动开发服务器。

[step 2] model decision: final
我查到的结果是：
install: 安装步骤：先运行 pnpm install，再运行 pnpm dev 启动开发服务器。

Final answer:
我查到的结果是：
install: 安装步骤：先运行 pnpm install，再运行 pnpm dev 启动开发服务器。
```

请注意，这里真正值得你盯住看的不是“回答内容”，而是这个执行过程本身：

- 第 1 轮，模型没有直接回答，而是先决定去查
- 工具执行后，系统得到了新的观察
- 第 2 轮，模型基于新的观察给出了最终答案

这就是最小 Agent Loop 的全部精髓。

## 为什么“状态回填”是核心

很多人第一次实现 Agent 时，最容易写错的地方恰恰就在这里：  
工具虽然执行了，但结果没有真正进入下一轮上下文。

例如下面这种写法看起来很像对的，其实是错的：

```ts
const decision = await callModel(messages);

if (decision.type === "tool") {
  const result = await runTool(decision.toolCall);
  return await callModel(messages);
}
```

问题在于，`result` 只是存在了一个局部变量里，但它并没有被写回 `messages`。

这意味着下一轮模型看到的上下文和上一轮几乎一样。  
对模型来说，系统仿佛什么都没有观察到。

真正正确的做法是：

```ts
const result = await runTool(decision.toolCall);

messages.push({
  role: "tool",
  toolName: decision.toolCall.name,
  content: result.content,
});
```

只有这样，模型才会在下一轮真正“看到”刚刚发生了什么。

所以如果你只记住这一章一个结论，那就是：

> Agent Loop 的关键不是“会调工具”，而是“会把观察写回状态，再继续推理”。

## 停止条件一定要先写

最小 Agent Loop 很容易写成死循环，所以停止条件不是可选项，而是骨架的一部分。

这一章至少要有三个保护：

### 1. 模型给出最终回答时停止

这是正常退出路径。

```ts
if (decision.type === "final") {
  return decision.message.content;
}
```

### 2. 超过最大轮次时停止

这是防止无限循环的兜底保护。

```ts
while (state.step < state.maxSteps) {
  // ...
}

throw new Error("Agent exceeded max steps");
```

### 3. 工具不存在或工具失败时要有可观察结果

最小版本里，你可以先把失败也当成一种普通观察写回上下文，或者直接抛错。关键是不要让系统悄悄失败。

```ts
if (!tool) {
  return {
    ok: false,
    content: `未知工具：${toolCall.name}`,
  };
}
```

真正成熟的系统还会继续加很多保护，例如：

- 重试策略
- 重复调用检测
- 超时控制
- 幂等保护
- 中断与恢复

但在第二章，先把最基本的停止路径写清楚就够了。

## 这已经算 Agent 了吗

很多人写到这里会有一点不踏实：

> 这也太小了，它真的算 Agent 吗？

算，而且这正是理解 Agent 的关键时刻。

它之所以算，不是因为它有多少功能，而是因为它已经具备了 Agent 的最小闭环：

- 有目标：回答用户问题
- 有状态：`messages`
- 有动作：调用 `searchDocs`
- 有观察：工具返回文档结果
- 有状态更新：把工具结果写回消息历史
- 有停止条件：最终回答或达到最大轮次

从工程角度看，Agent 的第一性原理从来不是“复杂”，而是“闭环”。

后面我们会不断往这个骨架上叠能力：

- 更多工具
- 更稳定的工具接口
- 更长的多轮执行
- 明确的规划
- 更复杂的上下文组织

但无论叠多少层，这个最小循环几乎都会保留下来。

## 本章故意没做什么

为了避免把第二章写成一个半成品框架，我们刻意没有做这些事：

- 没有引入通用工具注册协议
- 没有设计复杂的 JSON schema
- 没有讨论不同模型厂商的 tool calling 差异
- 没有引入 Planner、ReAct、RAG 或 Memory
- 没有解决真实生产环境里的恢复、重试和观测问题

这不是缺点，而是本章的边界。

如果现在就把这些全塞进来，你看到的将不再是“最小 Agent Loop”，而是一堆尚未建立心智模型的抽象层。

## 小结

这一章最重要的收获，不是多写了几个 TypeScript 类型，而是第一次把 Agent 的骨架真正跑通了。

请把下面这件事记牢：

> Agent 的核心不是模型自己会做很多事，而是系统允许模型在状态中持续做决定，并把动作结果变成下一轮可见的观察。

所以一个最小 Agent Loop，本质上只需要四步：

1. 读取当前状态
2. 决定下一步动作
3. 执行动作得到观察
4. 把观察写回状态

接下来你再看更复杂的 Agent 设计，都会轻松很多，因为你知道那些变化大多只是这个循环外面的“增强件”。

## 下一章

下一章我们继续往前走，但不会急着加更多能力，而是先把一件同样基础的事情讲透：

> 工具接口到底该怎么设计，模型才更容易稳定地调用它？

这一章里我们的工具还很粗糙，只是“能用”。  
下一章要解决的是，怎样把工具从“能用”做成“可靠”。
