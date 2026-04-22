---
title: Tool Calling，给 Agent 行动力
section: execution
sectionTitle: 让 Agent 学会行动与规划
sectionColor: "#4f7cff"
sectionOrder: 2
order: 1
code: 03
tag: Tool Calling
summary: 好的工具不是把函数暴露给模型，而是把能力变成可预测的动作接口。
toolCount: 4
---

上一章里，我们已经写出了一个最小 Agent Loop。  
它已经会根据当前状态决定下一步动作。

但如果你是第一次接触 Agent，这里还会有一个更基础的问题：

> Tool Calling 到底是干什么的？

这一章我们不打算先讲抽象定义，而是先让它真的跑起来。

我们会把这一章拆成两部分：

1. 先写一个真实调用模型的最小 `readFile` tool，让你直观看到 Tool Calling 的用途
2. 再在这个基础上，把 tool 从“能用”做成“稳定、清晰、适合模型调用”

## Tool Calling 到底解决什么问题

先看一个非常直白的任务：

> “帮我看看这个项目 README 里有没有安装步骤。”

如果没有 tool，模型其实做不了这件事。  
它看不到你的本地文件，也不能自己去读 `README.md`。

这时它只有几种不太好的选择：

- 靠记忆猜
- 让用户手动把 README 内容贴进来
- 在信息不足的情况下硬答

而一旦系统提供了 `readFile` 这样的 tool，情况就变了：

- 模型可以先请求读取 `README.md`
- 系统真的去读这个文件
- 文件内容再回到模型上下文
- 模型基于真实内容回答问题

这就是 Tool Calling 的起点。

> Tool Calling 不是让模型“更会说”，而是让模型在需要时真的有事可做。

## 先准备真实示例

这一章对应的可运行代码在 `examples/03-tool-calling/` 目录下。

为了让示例真的能调用模型，我们先准备环境变量。  
在项目根目录创建 `.env.local`：

```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5-mini
```

然后安装依赖：

```bash
pnpm add openai zod dotenv chalk
```

这里三者分别负责：

- `openai`：真实调用模型
- `zod`：第二部分做参数校验
- `dotenv`：从 `.env.local` 读取环境变量
- `chalk`：让命令行输出更易读

## 第一部分：先写一个最小 Tool

第一部分对应 [part1-minimal-tool.ts](/Users/leon/Desktop/work/ai-agent-tutorial/examples/03-tool-calling/part1-minimal-tool.ts)。

目标非常简单：

- 用户问：“帮我看看 README 里有没有安装步骤”
- 模型请求调用 `readFile`
- 系统执行 `readFile`
- 把工具结果追加到消息历史里，再发给模型
- 模型再给出最终回答

### 先加载环境变量和模型客户端

为了方便顺着源码往下读，示例把环境变量加载、模型客户端初始化和 tool 定义都放在同一个文件里。文件顶部先做最小准备：

```ts
import path from "node:path";
import chalk from "chalk";
import { config } from "dotenv";
import OpenAI from "openai";

const repositoryRoot = process.cwd();

config({
  path: path.join(repositoryRoot, ".env.local"),
});

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
```

这一层的作用只是让后面示例不要反复写样板代码。

### 写一个最小 `readFile`

最小 tool 放在 [part1-minimal-tool.ts](/Users/leon/Desktop/work/ai-agent-tutorial/examples/03-tool-calling/part1-minimal-tool.ts) 里。

```ts
import fs from "node:fs/promises";

type ToolResult = {
  ok: boolean;
  content: string;
};

async function readFile(filePath: string): Promise<ToolResult> {
  try {
    const absolutePath = path.resolve(repositoryRoot, filePath);
    const content = await fs.readFile(absolutePath, "utf8");

    return {
      ok: true,
      content,
    };
  } catch (error) {
    return {
      ok: false,
      content: `读取文件失败：${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
```

这段代码很朴素，但已经具备了一个最小 tool 的三个要素：

- 有明确动作：读取文件
- 有明确输入：`path`
- 有明确结果：成功或失败

另外这个示例还会在日志开头先打印用户问题，并用 `chalk` 给每个阶段加一点颜色，让命令行输出更适合教学演示。

### 让模型真实请求这个 tool

接下来，真正关键的部分来了：  
我们不是自己手写一个假的 `callModel()`，而是直接调用模型 API，并手动维护 `messages`。

```ts
const messages: Message[] = [
  {
    role: "system",
    content:
      "你是一个工程助手。如果需要查看本地文件，请优先调用 readFile，然后再回答用户问题。",
  },
  {
    role: "user",
    content: "帮我看看这个项目 README 里有没有安装步骤。",
  },
];

const tools = [
  {
    type: "function" as const,
    function: {
      name: "readFile",
      description: "读取项目中的 UTF-8 文本文件。",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "相对于仓库根目录的文件路径，例如 README.md",
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
];

const response = await client.chat.completions.create({
  model,
  messages,
  tools,
});
```

这时你也可以先打印一下用户问题，让读者一开始就知道这次完整流程在解决什么：

```ts
console.log(chalk.bold.cyan("[user question]"));
console.log(chalk.white(userInput));
```

这里最重要的是 `messages` 和 `tools` 这两段定义。

- `messages` 代表当前完整对话状态
- `tools` 告诉模型现在有哪些可调用能力

这就是 Tool Calling 的核心入口。

### 处理模型发出的 tool 请求

模型请求 tool 后，不会自动帮你执行。  
它会先在 assistant message 里带上 `tool_calls`。

示例里直接从 `assistantMessage.tool_calls` 里拿出这些请求：

```ts
const assistantMessage = response.choices[0]?.message;
const functionCalls =
  assistantMessage?.tool_calls?.filter((call): call is ToolCall => call.type === "function") ?? [];
```

然后在执行 tool 之前，先把这条 assistant message 写回消息历史：

```ts
messages.push({
  role: "assistant",
  content: assistantMessage?.content ?? "",
  tool_calls: functionCalls.map((call) => ({
    id: call.id,
    type: "function",
    function: {
      name: call.function.name,
      arguments: call.function.arguments,
    },
  })),
});
```

再由系统自己执行 `readFile`：

```ts
await Promise.all(
  functionCalls.map(async (call) => {
    const input = JSON.parse(call.function.arguments) as { path?: string };
    const result = await readFile(String(input.path ?? ""));

    messages.push({
      role: "tool",
      tool_call_id: call.id,
      content: result.content,
    });
  }),
);
```

这里就是 Tool Calling 最值得你盯住看的地方：

- 模型负责决定“读哪个文件”
- 系统负责真的去读
- 读完后，系统把 assistant 的 tool request 和 tool result 都追加进 `messages`

如果没有这一步，模型只是“提出请求”，并没有真正完成动作。

### 把更新后的消息历史再发给模型

最后，再调用一次模型，把完整消息历史带回去：

```ts
const finalResponse = await client.chat.completions.create({
  model,
  messages,
  tools,
  tool_choice: "none",
});
```

这里显式传 `tool_choice: "none"`，意思是：

- 这一轮不要再继续调工具
- 直接基于现有消息历史给出最终回答

这一步非常重要。  
它和上一章的“把 tool 结果写回状态”其实是同一个思想，只不过这里的状态就是我们自己维护的 `messages`。

请注意这里的两个关键点：

- 先把 assistant 的 `tool_calls` 写回历史
- 再把 tool 结果作为 `tool` message 写回历史

到这里，读者应该已经能清楚看到 Tool Calling 的最小闭环了：

1. 模型决定调用 tool
2. 系统执行 tool
3. 系统把 tool 结果写回消息历史
4. 模型基于结果继续回答

### 跑一次看看

第一部分的运行命令是：

```bash
pnpm example examples/03-tool-calling/part1-minimal-tool.ts
```

如果一切正常，你会看到类似日志：

```txt
[user question]
帮我看看这个项目 README 里有没有安装步骤。

[step 1] model decision: tool
readFile {"path":"README.md"}
[step 1] tool result:
# 项目标题
...

[step 2] model decision: final
README 里提到了安装步骤……
```

到这里，Tool Calling 的用途就会非常直观：

- 没有 tool 时，模型不能自己读取本地文件
- 有了 tool 后，模型可以先请求动作
- 系统代它完成动作
- 再把动作结果放回消息历史给它继续推理

## 第二部分：怎样写一个好的 Tool

当你真的开始接第二个、第三个 tool，很快就会发现一个新问题：

> Agent 的问题，很多时候不在有没有 tool，而在 tool 接口本身。

工具如果定义得太随意，模型就会频繁犯下面这些错：

- 参数名猜错
- 把多个任务塞进同一个 tool
- 返回结果太乱，导致下一轮推理接不上
- 工具失败了，但模型根本不知道为什么失败

所以第二部分要解决的是：

> 怎样把 tool 设计成模型更容易正确调用的动作接口？

第二部分对应 [part2-good-tools.ts](/Users/leon/Desktop/work/ai-agent-tutorial/examples/03-tool-calling/part2-good-tools.ts)。

### 为什么自由函数不够

一个只给人调用的函数，可能长这样：

```ts
async function searchFiles(query: string) {
  return "...";
}
```

对人来说也许“够用了”，但对模型来说边界很模糊：

- `query` 里到底应该放什么
- 能不能限制目录
- 能不能限制返回条数
- 返回的 `"..."` 究竟是结果，还是错误

所以在第二部分里，我们开始把 tool 定义成统一形态。

### 统一工具类型

为了减少来回跳转，第二部分把这些公共类型也直接写在 [part2-good-tools.ts](/Users/leon/Desktop/work/ai-agent-tutorial/examples/03-tool-calling/part2-good-tools.ts) 里。

```ts
type ToolResult = {
  ok: boolean;
  summary: string;
  data?: unknown;
  error?: string;
};

type ToolDefinition<TInput> = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
  inputSchema: ZodType<TInput>;
  execute(input: TInput): Promise<ToolResult>;
};
```

这里比第一部分多出来了两层关键约束：

- `parameters`
  给模型看，让模型知道怎样组织参数
- `inputSchema`
  给运行时校验用，防止模型传错参数

这就是“好 tool”设计和“最小 tool”之间最重要的差别。

### 结构化输入

第二部分的 `readFile` 不再只收一个自由字符串，而是写成了更明确的结构：

```ts
inputSchema: z.object({
  path: z.string().min(1),
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(),
})
```

对应给模型看的参数说明也一起定义：

```ts
parameters: {
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "相对于项目根目录的文件路径，例如 README.md",
    },
    startLine: {
      type: "number",
      description: "可选，开始行号，从 1 开始。",
    },
    endLine: {
      type: "number",
      description: "可选，结束行号，从 1 开始。",
    },
  },
  required: ["path"],
  additionalProperties: false,
}
```

这样模型就不需要猜太多：

- `path` 是必填
- `startLine` 和 `endLine` 是可选
- 不允许额外字段

在 tool 调用里，减少猜测，通常就等于减少错误。

### 输出要服务下一轮

第一部分的 `readFile` 只返回 `ok + content`，已经够最小示例跑起来。  
但如果想让模型在多 tool 场景下更稳定，输出还要再清楚一点。

第二部分统一返回：

```ts
{
  ok: true,
  summary: "已读取 README.md 的第 1-40 行。",
  data: {
    path: "README.md",
    startLine: 1,
    endLine: 40,
    content: "...",
    totalLines: 120,
  }
}
```

这里每个字段都服务于下一轮推理：

- `ok`：让模型知道这次调用是否成功
- `summary`：给模型一个短摘要
- `data`：保留真正还会继续用到的结构化结果

这比单纯返回一大段文本更稳。

### 参数校验和统一错误

参数校验、统一错误处理和最小注册器也都放在同一个文件里，方便从上到下读完一整套执行路径。里面的注册器核心逻辑是：

```ts
const parsed = tool.inputSchema.safeParse(rawInput);

if (!parsed.success) {
  return {
    ok: false,
    summary: `工具参数校验失败：${call.function.name}`,
    error: parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
      .join("; "),
  };
}
```

这一步的价值非常直接：

- 模型传错字段时，能立刻被拦住
- 错误会变成字符串返回，而不是直接抛异常
- 下一轮模型能理解失败原因，并决定要不要重试

也就是说，失败信息不是“额外补充”，而是 tool 设计的一部分。

### 最小注册器

第二部分里，我们不再手写 `if / else` 找 tool，而是用一个最小注册器统一管理：

```ts
const registry = createToolRegistry([
  listFilesTool,
  searchFilesTool,
  readFileTool,
] as const);
```

注册器会统一做三件事：

1. 把 tool 转成模型可见的 `tools` 定义
2. 在运行时按名字找到对应 tool
3. 先校验参数，再执行业务逻辑

这样一来，模型侧和执行侧终于有了一个稳定连接点。

### 第二部分也是实际调用模型

最重要的是，第二部分并不是“只讲理论”。  
它同样是真实调用模型的版本。

[part2-good-tools.ts](/Users/leon/Desktop/work/ai-agent-tutorial/examples/03-tool-calling/part2-good-tools.ts) 里会：

- 先把 `listFiles`、`searchFiles`、`readFile` 都注册进来
- 再把这些 tool 定义传给 `client.chat.completions.create`
- 然后在每一轮里处理模型发出的 `tool_calls`
- 最后把执行结果作为 `tool` 消息回填给模型

运行命令是：

```bash
pnpm example examples/03-tool-calling/part2-good-tools.ts
```

这个版本展示的就不只是“tool 能用”，而是“tool 怎么设计得更稳”。

### 设计清单

如果你只想记住一张最小清单，可以先记这几条：

- 一个 tool 只做一件事
- 名字要能直接看出用途
- 参数字段要减少歧义
- 必填、选填和默认值要明确
- 运行前要做参数校验
- 返回值要同时覆盖成功和失败
- 失败信息要能帮助下一轮继续推理
- 多个 tool 最好走统一注册和执行入口

这份清单看起来并不华丽，但它几乎决定了后面 Agent 的稳定上限。

## 小结

这一章分成了两步：

- 第一步，用真实调用模型的 `readFile` 示例建立对 Tool Calling 的直觉
- 第二步，再把重点放到“怎样写一个好的 tool”

如果用一句话总结，Tool Calling 的本质其实很简单：

> 模型决定要做什么，系统替它完成动作，再把结果返回给模型继续推理。

而真正好的 tool，则要在这个基础上继续做到：

- 输入清楚
- 输出稳定
- 错误可理解
- 调用入口统一

当你把这一层打稳之后，后面的多轮执行、规划执行、MCP 接入才会有一个可靠地基。

## 下一章

下一章我们继续往前一步，不再只看“单个 tool 如何设计”，而是开始看一个更动态的问题：

> 当 Agent 需要多轮调用 tool、根据观察反复修正动作时，它该怎样边想边做？

到那时，Tool Calling 就不再只是一个独立能力，而会真正进入多轮执行过程，成为 ReAct 的基础。
