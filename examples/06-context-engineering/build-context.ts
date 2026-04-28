import chalk from "chalk";

// 1. 定义上下文工程要处理的最小状态。
type Message = {
  role: "user" | "assistant" | "tool";
  content: string;
};

type PlanStep = {
  id: string;
  title: string;
  status: "pending" | "done" | "skipped";
  evidence: string[];
};

type Observation = {
  source: string;
  summary: string;
  content: string;
};

type AgentState = {
  goal: string;
  currentStep: string;
  plan: PlanStep[];
  history: Message[];
  observations: Observation[];
};

type ContextLayer = {
  name: string;
  content: string;
};

type BuiltContext = {
  layers: ContextLayer[];
  text: string;
};

// 2. 准备一份故意有点“乱”的 Agent 状态，模拟长任务执行到中途。
const state: AgentState = {
  goal: "整理 Agent 执行模式，并说明每种模式适合什么场景。",
  currentStep: "对比 ReAct 和 Plan-and-Execute 的适用场景",
  plan: [
    {
      id: "step-1",
      title: "确认哪些章节和执行模式有关",
      status: "done",
      evidence: [
        "相关章节包括最小 Agent Loop、Tool Calling、ReAct、Plan-and-Execute。",
      ],
    },
    {
      id: "step-2",
      title: "整理 ReAct 的适用场景",
      status: "done",
      evidence: [
        "ReAct 适合短链路探索，每一轮根据 observation 决定下一步 action。",
      ],
    },
    {
      id: "step-3",
      title: "整理 Plan-and-Execute 的适用场景",
      status: "done",
      evidence: [
        "Plan-and-Execute 适合跨度更长、需要收集多个 evidence 的任务。",
      ],
    },
    {
      id: "step-4",
      title: "输出对比总结",
      status: "pending",
      evidence: [],
    },
  ],
  history: [
    {
      role: "user",
      content: "先帮我看看这个项目怎么启动。",
    },
    {
      role: "assistant",
      content: "需要先搜索启动相关文档。",
    },
    {
      role: "tool",
      content: "docs/setup.md: 项目启动说明",
    },
    {
      role: "assistant",
      content: "启动方式是先安装依赖，再运行 pnpm dev。",
    },
    {
      role: "user",
      content: "现在调研这个教程项目里有哪些 Agent 执行模式。",
    },
    {
      role: "assistant",
      content: "我会先搜索相关章节，再逐个读取资料。",
    },
    {
      role: "tool",
      content:
        "搜索结果：p1-02-minimal-loop.md、p2-03-tool-calling.md、p2-04-react.md、p2-05-plan-and-execute.md。",
    },
    {
      role: "assistant",
      content: "我已经找到相关章节，接下来读取 ReAct 和 Plan-and-Execute。",
    },
  ],
  observations: [
    {
      source: "content/tutorials/p1-02-minimal-loop.md",
      summary: "最小 Agent Loop 是状态、模型、动作、观察和停止条件组成的循环。",
      content:
        "这一章强调 Agent 的核心不是框架，而是清晰的循环。它说明 message history、tool result 和 stop condition 如何串起来。",
    },
    {
      source: "content/tutorials/p2-03-tool-calling.md",
      summary: "Tool Calling 把外部能力变成模型可请求的动作接口。",
      content:
        "这一章说明模型只负责请求工具，系统负责执行工具，再把结果写回消息历史。",
    },
    {
      source: "content/tutorials/p2-04-react.md",
      summary: "ReAct 让下一步 action 依赖刚刚得到的 observation。",
      content:
        "ReAct 适合短链路搜索、排查、补充信息。它的重点不是展示思维链，而是根据真实观察继续行动。",
    },
    {
      source: "content/tutorials/p2-05-plan-and-execute.md",
      summary: "Plan-and-Execute 先维护显式计划，再逐步执行和重规划。",
      content:
        "Plan-and-Execute 适合调研、整理、迁移这类跨度更长的任务。它用 goal、steps、status 和 evidence 保存中间状态。",
    },
  ],
};

// 3. 反例：把所有东西直接塞进上下文，信息多，但重点很散。
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

// 4. 正例：分层构建上下文，只保留当前任务真正需要的信息。
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

function formatPlanState(plan: PlanStep[]) {
  return plan
    .map((step) => {
      const evidence =
        step.evidence.length > 0 ? `\n  evidence: ${step.evidence.join("；")}` : "";

      return `- ${step.id} [${step.status}] ${step.title}${evidence}`;
    })
    .join("\n");
}

function compressHistory(history: Message[]) {
  const latestMessages = history.slice(-4);

  return latestMessages
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
}

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

function formatRelevantObservations(observations: Observation[]) {
  return observations
    .map(
      (observation) =>
        `- source: ${observation.source}\n  summary: ${observation.summary}`,
    )
    .join("\n");
}

// 5. 打印对比结果。这里用字符数粗略代表上下文大小，真实系统会用 tokenizer 计算 token。
function printSection(title: string) {
  console.log(`\n${chalk.bold.cyan(title)}`);
}

function printContext(label: string, context: string) {
  printSection(`${label} (${context.length} chars)`);
  console.log(context);
}

function main() {
  const naiveContext = buildNaiveContext(state);
  const engineeredContext = buildContext(state);

  printContext("Naive Context", naiveContext);
  printContext("Engineered Context", engineeredContext.text);
}

main();
