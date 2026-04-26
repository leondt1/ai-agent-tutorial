---
title: ReAct，让 Agent 学会边想边做
section: execution
sectionTitle: 让 Agent 学会行动与规划
sectionColor: "#4f7cff"
sectionOrder: 2
order: 2
code: 04
tag: ReAct
summary: ReAct 的价值不在于让模型展示思考，而在于让决策依赖真实观察。
toolCount: 4
---

上一章我们已经把 Tool Calling 跑通了。

模型可以请求调用工具，系统负责执行工具，再把工具结果写回消息历史。
这已经让 Agent 有了“行动”的能力。

但到这里还有一个问题：

> 如果一次工具调用不够怎么办？

比如用户问：

> “这个项目怎么启动？如果文档不够，请继续查 package 脚本。”

这个任务通常不是一步就能完成的。Agent 可能要先搜索文档，看到候选路径后再读取文档，发现文档只说“看 package scripts”，最后再去查 `dev` 脚本。

这一章要讲的 ReAct，就是把这种“边观察、边行动”的过程组织成一个稳定循环。

本章会按三个层次展开：

1. 先梳理 ReAct 的核心概念
2. 再用 Prompt 对话观察 ReAct 的运行效果
3. 最后把这个模式写成代码

## ReAct 是什么

ReAct 来自 Reasoning and Acting。
但在工程实践里，我们先不要把重点放在“让模型展示思考过程”上。

对 Agent 来说，更实用的定义是：

> ReAct 让模型在每一轮根据新的 observation 决定下一步 action。

这里有三个核心词：

- `Action`：Agent 决定要做的动作，通常是调用某个 tool
- `Observation`：tool 执行后返回的真实结果
- `Final Answer`：信息足够后给用户的最终回答

一个最小 ReAct 循环可以写成：

```txt
用户目标
  ↓
选择 Action
  ↓
系统执行 Tool
  ↓
得到 Observation
  ↓
基于 Observation 再选择 Action
  ↓
直到 Final Answer
```

它和上一章的 Tool Calling 不是两套东西。
Tool Calling 是行动接口，ReAct 是多轮使用行动接口的执行模式。

## 为什么单轮 Tool Calling 不够

先看一个单轮执行器可能会怎么做：

1. 用户问“这个项目怎么启动”
2. 模型调用 `searchDocs`
3. 工具返回 `docs/setup.md`
4. 模型回答“请查看 docs/setup.md”

这个回答不是完全错，但它没有真正完成任务。
用户要的是启动方式，不是相关文档路径。

一个 ReAct 风格的 Agent 会继续往下走：

1. 先搜索和启动相关的文档
2. 观察到 `docs/setup.md`
3. 再读取 `docs/setup.md`
4. 观察到文档提示“查看 package scripts”
5. 再读取 `dev` 脚本
6. 观察到实际命令
7. 最后回答完整步骤

ReAct 最重要的变化就是：

> 下一步 action 不只依赖用户原始问题，也依赖刚刚得到的 observation。

如果 observation 是候选路径，下一步就读文件。
如果 observation 是“命令在 scripts 里”，下一步就查脚本。
如果 observation 已经包含答案，下一步就停止。

## 不要把 ReAct 等同于思维链

很多早期 ReAct 示例会写成：

```txt
Thought: ...
Action: ...
Observation: ...
Thought: ...
```

这个格式容易让人误会：好像 ReAct 的关键是让模型输出很长的内部思考。

在工程里，我们要避免这个方向。
系统真正需要依赖的是结构化结果：

- 要不要继续行动
- 调用哪个工具
- 工具参数是什么
- 工具返回了什么
- 是否已经可以回答

所以本章后面会用 `Need` 代替 `Thought`：

```txt
Need: 需要先找到和启动相关的项目文档。
Action: searchDocs
Action Input: {"query":"启动"}
```

这里的 `Need` 只是一个可展示的状态说明，不是隐藏思维链。
它的作用是让日志和教学演示更容易读，真正驱动程序的是 `Action` 和 `Action Input`。

## 先用 Prompt 观察 ReAct

在写代码之前，我们先用 Prompt 看一次 ReAct 是怎样工作的。

这一段对应 [react-prompt.md](/Users/leon/Desktop/work/ai-agent-tutorial/examples/04-react/react-prompt.md)。它不是可执行代码，而是一个可以复制到模型对话里的演示 prompt。

Prompt 可以这样写：

```txt
你是一个 ReAct 风格的工程助手。

你的任务是回答用户问题，但不能编造自己没有观察到的信息。
每一轮你只能输出下面两种格式之一。

如果还需要工具：
Need: 用一句话说明当前还缺什么信息。不要输出隐藏思维链。
Action: 工具名，只能是 searchDocs、readDoc、readPackageScript 之一。
Action Input: JSON 参数。

如果已经可以回答：
Final Answer: 给用户的最终答案。

可用工具：
- searchDocs: 在项目文档里搜索关键词。输入 {"query": string}
- readDoc: 读取指定文档。输入 {"path": string}
- readPackageScript: 读取 package.json 中某个 script。输入 {"name": string}

用户问题：
这个项目怎么启动？如果文档不够，请继续查 package 脚本。
```

注意这个 Prompt 做了三件事：

- 限制模型每轮只能输出 `Action` 或 `Final Answer`
- 明确告诉模型可用工具和参数格式
- 要求模型不要编造没有观察到的信息

如果模型第一次输出：

```txt
Need: 需要先找到和启动相关的项目文档。
Action: searchDocs
Action Input: {"query":"启动"}
```

这时真正的系统应该去执行 `searchDocs`，然后把结果作为 observation 发回去。

为了演示，我们手动提供一条 observation：

```txt
Observation:
找到 1 篇可能相关的文档：
docs/setup.md: 项目启动说明
```

模型看到 observation 后，不应该直接回答。
它只知道有一篇候选文档，还不知道文档内容，所以应该继续行动：

```txt
Need: 搜索结果只给出了候选文档路径，需要读取文档确认具体说明。
Action: readDoc
Action Input: {"path":"docs/setup.md"}
```

再给它第二条 observation：

```txt
Observation:
先运行 pnpm install 安装依赖。开发服务器使用项目 package scripts 中的 dev 脚本。
```

这一条 observation 又改变了下一步 action。
现在不是继续搜索文档，而是查 `dev` 脚本：

```txt
Need: 文档没有直接给出 dev 脚本的实际命令，需要继续读取 package script。
Action: readPackageScript
Action Input: {"name":"dev"}
```

最后给它第三条 observation：

```txt
Observation:
pnpm dev -> next dev --webpack
```

这时信息足够，模型应该停止行动：

```txt
Final Answer: 这个项目的启动方式是：先运行 pnpm install 安装依赖，然后运行 pnpm dev 启动开发服务器。
```

到这里，ReAct 的运行效果已经很清楚了：

- 第一轮 observation 告诉模型要读哪个文档
- 第二轮 observation 告诉模型还要查哪个脚本
- 第三轮 observation 告诉模型可以回答了

也就是说，ReAct 不是“多调用几次工具”这么简单。
它真正关心的是 observation 如何改变下一步 action。

## 从 Prompt 到代码

现在把刚才的 Prompt 对话固化成真实代码。

这一章对应的可运行代码在 [react-agent.ts](/Users/leon/Desktop/work/ai-agent-tutorial/examples/04-react/react-agent.ts)。

它和上一章一样，会真实调用模型 API。继续沿用项目根目录的 `.env.local`：

```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5-mini
```

运行命令是：

```bash
pnpm example examples/04-react/react-agent.ts
```

第 03 章已经讲过 Tool Calling 的 API 形态，所以这一章不再用模拟函数。
我们直接让模型真实决定：

- 要不要继续调用工具
- 调用哪个工具
- 工具参数是什么
- 什么时候停止并回答

这一章要多看的，是模型每一轮拿到 observation 后，下一次请求会如何变化。

## 先定义工具结果和观察

Prompt transcript 里的 `Observation`，到了代码里就是一条结构化记录：

```ts
type ToolResult = {
  ok: boolean;
  summary: string;
  content: string;
};

type Observation = {
  step: number;
  toolName: string;
  result: ToolResult;
};
```

这两个类型分别解决两个问题：

- `ToolResult` 是工具真正返回给模型看的结果
- `Observation` 是执行器自己保留的运行日志

再定义 tool 的类型：

```ts
type ToolDefinition = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
  execute(input: Record<string, unknown>): Promise<ToolResult>;
};
```

这里的 `parameters` 给模型看，`execute` 给系统运行。

这也对应上一章的结论：

> 模型只负责请求 action，系统才负责真正执行 action。

## 准备三个工具

示例里的任务还是：

> “这个项目怎么启动？如果文档不够，请继续查 package 脚本。”

所以我们准备三个工具：

- `searchDocs`：搜索可能相关的文档
- `readDoc`：读取某篇文档
- `readPackageScript`：读取某个 package script 的实际命令

为了保持这一章自包含，工具数据直接放在同一个文件里：

```ts
const docs = [
  {
    path: "docs/setup.md",
    title: "项目启动说明",
    keywords: ["安装", "启动", "dev", "setup"],
    content:
      "先运行 pnpm install 安装依赖。开发服务器使用项目 package scripts 中的 dev 脚本。",
  },
  {
    path: "docs/test.md",
    title: "测试说明",
    keywords: ["测试", "test"],
    content: "运行 pnpm test 执行测试。",
  },
];

const packageScripts: Record<string, string> = {
  dev: "next dev --webpack",
  build: "next build --webpack",
  lint: "eslint",
};
```

这里没有接真实文件系统。
因为这一章不是在教搜索实现，而是在教 observation 如何驱动下一步 action。

每个工具都只做一件事：

- `searchDocs` 只返回候选文档路径
- `readDoc` 只返回文档内容
- `readPackageScript` 只返回脚本命令

例如 `searchDocs` 的定义是：

```ts
const searchDocsTool: ToolDefinition = {
  name: "searchDocs",
  description: "在项目文档里搜索关键词，返回可能相关的文档路径。",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "要搜索的关键词，例如“启动”或“测试”。",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  async execute(input) {
    const query = String(input.query ?? "")
      .trim()
      .toLowerCase();

    const matches = docs.filter((doc) =>
      doc.keywords.some((keyword) => query.includes(keyword.toLowerCase())),
    );

    return {
      ok: true,
      summary: `找到 ${matches.length} 篇可能相关的文档。`,
      content: matches.map((doc) => `${doc.path}: ${doc.title}`).join("\n"),
    };
  },
};
```

这也是 ReAct 示例里很重要的设计：工具只提供观察，不替 Agent 做最终判断。

## 把工具注册给模型

接下来用一个最小注册器把本地工具转换成模型 API 能识别的 `tools`：

```ts
function createToolRegistry(definitions: ToolDefinition[]) {
  const toolsByName = new Map(definitions.map((tool) => [tool.name, tool]));

  return {
    chatTools: definitions.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    })),

    async run(call: ToolCall): Promise<ToolResult> {
      const tool = toolsByName.get(call.function.name);
      // 查找工具、解析参数、执行工具
    },
  };
}
```

这里没有引入更复杂的 runtime。
它只做两件事：

- `chatTools`：告诉模型有哪些工具可用
- `run`：根据模型返回的 tool call 执行本地函数

然后注册本章的三个工具：

```ts
const registry = createToolRegistry([
  searchDocsTool,
  readDocTool,
  readPackageScriptTool,
]);
```

这一步之后，ReAct 的 `Action` 就不再只是 Prompt 里的文本，而是模型真实返回的 `tool_calls`。

## 发起真实模型请求

主流程开始时，先准备消息历史：

```ts
const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
  {
    role: "system",
    content:
      "你是一个 ReAct 风格的工程助手。你需要根据观察结果决定下一步 action。不要编造没有观察到的信息；如果文档只给出线索，就继续调用合适的工具。调用工具时，请在 assistant content 中只写一行 Need: 说明当前还缺什么信息，并且必须同时发起对应 tool call，不要把 Need 当作最终答案。拿到足够信息后，不要再写 Need，直接给出简洁最终答案。",
  },
  {
    role: "user",
    content: userInput,
  },
];
```

然后在每一轮循环里真实请求模型：

```ts
const response = await client.chat.completions.create({
  model,
  messages,
  tools: registry.chatTools,
});

const assistantMessage = response.choices[0]?.message;
```

这一步就是模型决策发生的地方。

如果模型认为还缺信息，它会返回 `tool_calls`。
如果模型认为信息够了，它会直接返回最终回答。

## ReAct 主循环

最后看执行器主循环。

它的工作只有一件事：不断把模型请求、工具执行结果和 observation 串起来。

```ts
for (let step = 1; step <= maxSteps; step += 1) {
  const response = await client.chat.completions.create({
    model,
    messages,
    tools: registry.chatTools,
  });

  const assistantMessage = response.choices[0]?.message;
  const toolCalls =
    assistantMessage?.tool_calls?.filter(
      (call): call is ToolCall => call.type === "function",
    ) ?? [];

  if (toolCalls.length === 0) {
    return {
      answer: assistantMessage?.content ?? "模型没有返回可显示的文本。",
      observations,
    };
  }

  messages.push({
    role: "assistant",
    content: assistantMessage?.content ?? "",
    tool_calls: toolCalls,
  });

  for (const call of toolCalls) {
    const result = await registry.run(call);

    observations.push({
      step,
      toolName: call.function.name,
      result,
    });

    messages.push({
      role: "tool",
      tool_call_id: call.id,
      content: JSON.stringify(result),
    });
  }
}
```

这段循环里有四个关键点：

- 每一轮都把当前 `messages` 发给真实模型
- 模型返回 `tool_calls` 时，系统执行对应工具
- 工具结果同时写入 `observations` 和 `messages`
- 模型不再请求工具时，循环停止并返回最终答案

这里最容易漏掉的是 assistant 的 tool call message。

```ts
messages.push({
  role: "assistant",
  content: assistantMessage.content ?? "",
  tool_calls: toolCalls.map((call) => ({
    id: call.id,
    type: "function",
    function: {
      name: call.function.name,
      arguments: call.function.arguments,
    },
  })),
});
```

为什么要先写入这条 assistant message？

因为对模型来说，一次 tool 调用不是只有结果。
完整上下文应该包含：

1. 模型请求调用哪个工具
2. 系统执行后返回什么结果

少了第一步，后面的 `tool` message 就失去了对应关系。

ReAct 执行器一定要有停止保护。
因为真实模型可能重复调用同一个工具，也可能在错误参数之间来回尝试。没有最大轮次，Agent 就可能无限循环。

## 跑一次看看

运行：

```bash
pnpm example examples/04-react/react-agent.ts
```

你会看到类似输出：

```txt
User:
这个项目怎么启动？如果文档不够，请继续查 package 脚本。

Assistant:
Need: 需要先找到和启动相关的项目文档。
Action: searchDocs
Action Input: {"query":"启动"}

Observation:
找到 1 篇可能相关的文档。

Assistant:
Need: 搜索结果只给出了候选文档路径，需要读取文档确认具体内容。
Action: readDoc
Action Input: {"path":"docs/setup.md"}

Observation:
已读取 docs/setup.md。

Assistant:
Need: 文档只给出了 package script 线索，需要继续读取实际脚本命令。
Action: readPackageScript
Action Input: {"name":"dev"}

Observation:
package.json 里的 dev 脚本是：next dev --webpack

Assistant:
Final Answer:
项目启动步骤如下：

1. 运行 `pnpm install` 安装依赖；
2. 运行 `pnpm dev` 启动开发服务器（实际执行 `next dev --webpack`）。
```

这段输出和前面的 Prompt transcript 是同一件事的两个形态：

- Prompt transcript 让你先看见 ReAct 模式
- TypeScript 代码把这个模式固定成可运行执行器

## 工具失败时怎么办

ReAct 不只是在成功路径上多调用几次工具。
它也要处理失败 observation。

在这个示例里，工具失败也会被包装成 `ToolResult`：

```ts
if (!tool) {
  return {
    ok: false,
    summary: `未知工具：${call.function.name}`,
    content: "请检查工具名称。",
  };
}
```

然后它会像成功结果一样写回消息历史：

```ts
messages.push({
  role: "tool",
  tool_call_id: call.id,
  content: JSON.stringify(result),
});
```

这意味着模型下一轮可以看到失败原因，再决定是换参数重试，还是停止并解释原因。

真实系统里可以更进一步：

- 参数错了，就换一组参数重试
- 路径错了，就重新搜索可用路径
- 权限不足，就请用户授权
- 外部服务失败，就等待或切换备用工具

但无论策略多复杂，都离不开同一个基础：

> 失败也必须成为 observation，并进入下一轮决策。

如果工具失败只是在控制台里报错，而没有回到 Agent 状态里，模型就没有机会修正。

## ReAct 的边界

ReAct 很适合这类任务：

- 需要边查边判断
- 每一步都依赖上一步结果
- 工具调用成本不高
- 任务长度比较短
- 中间结果能清楚改变下一步动作

例如：

- 先搜索文件，再读取命中的文件
- 先查 API 文档，再提取启动命令
- 先调用查询接口，再根据结果选择详情接口

但 ReAct 不是所有任务的答案。

如果任务明显很长，比如：

- 调研一个技术方案并输出完整报告
- 迁移一个大型模块
- 分析几十个文件后提出重构计划
- 多个子任务之间有依赖和优先级

这时让 Agent 只靠“边走边看”容易出现几个问题：

- 被局部结果带偏
- 重复搜索相同信息
- 忘记原始目标
- 很难解释整体进度
- 工具调用次数变得不可控

这种时候，下一章要讲的 Plan-and-Execute 会更合适。
它不是比 ReAct “更高级”，而是用显式计划换取更稳定的长任务控制。

## 小结

这一章我们按三个层次理解了 ReAct：

1. 概念上，它是 `Action -> Observation -> Action` 的多轮执行模式
2. Prompt 上，它要求模型每轮输出下一步动作，等系统回填观察后再继续
3. 代码上，它就是一个围绕真实模型请求、tool calls 和 observation 回填的循环

如果用一句话总结：

> ReAct 让 Agent 的下一步不再只依赖原始问题，而是依赖它刚刚观察到的真实结果。

到这里，你已经有了一个会连续行动的 Agent 执行器。
下一章我们继续看另一种模式：当任务太长、不能只靠边走边看时，Agent 要不要先做计划？
