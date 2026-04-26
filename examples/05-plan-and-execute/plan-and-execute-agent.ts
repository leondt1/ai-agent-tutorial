import path from "node:path";
import chalk from "chalk";
import { config } from "dotenv";
import OpenAI from "openai";

// 1. 读取环境变量，并初始化真实的 OpenAI 客户端。
config({
  path: path.join(process.cwd(), ".env.local"),
  quiet: true,
});

const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

// 2. 定义 Plan-and-Execute 需要维护的最小计划结构。
type StepStatus = "pending" | "done" | "skipped";
type ActionName = "searchTutorials" | "readTutorial";

type PlanAction = {
  name: ActionName;
  input: Record<string, string>;
};

type PlanStep = {
  id: string;
  title: string;
  status: StepStatus;
  action: PlanAction;
  evidence: string[];
};

type Plan = {
  goal: string;
  steps: PlanStep[];
  finalAnswer: string | null;
};

type ToolResult = {
  ok: boolean;
  summary: string;
  content: string;
};

type Observation = {
  stepId: string;
  action: ActionName;
  result: ToolResult;
};

// 3. 准备一份很小的教程资料库，让示例专注展示“计划如何被执行结果修正”。
const tutorialNotes = [
  {
    path: "content/tutorials/p1-02-minimal-loop.md",
    title: "从零写一个最小 Agent Loop",
    keywords: ["agent loop", "执行模式", "循环", "state", "observation"],
    summary: "Agent 的核心是状态、模型、动作、观察和停止条件组成的循环。",
    content:
      "最小 Agent Loop 让模型基于当前状态决定下一步动作。它强调 message history、tool result 和 stop condition 如何串起来，是后续 Tool Calling、ReAct 和规划式执行的基础。",
  },
  {
    path: "content/tutorials/p2-03-tool-calling.md",
    title: "Tool Calling，给 Agent 行动力",
    keywords: ["tool calling", "工具", "行动", "执行模式"],
    summary: "Tool Calling 把外部能力暴露成模型可请求的动作接口。",
    content:
      "Tool Calling 解决的是模型不能直接读取文件、查询资料或执行外部动作的问题。模型只负责请求工具，系统负责执行工具并把结果写回上下文。",
  },
  {
    path: "content/tutorials/p2-04-react.md",
    title: "ReAct，让 Agent 学会边想边做",
    keywords: ["react", "observation", "action", "执行模式", "反应式"],
    summary: "ReAct 让模型在每一轮根据新的 observation 决定下一步 action。",
    content:
      "ReAct 适合短链路探索。它的关键不是展示思维链，而是让下一步 action 依赖刚刚得到的 observation。它轻量、直接，但长任务里容易被局部信息牵着走。",
  },
  {
    path: "content/tutorials/p2-05-plan-and-execute.md",
    title: "Plan-and-Execute，从反应式到规划式",
    keywords: ["plan", "execute", "planner", "replanner", "执行模式", "规划式"],
    summary: "Plan-and-Execute 先把长任务拆成计划，再逐步执行和重规划。",
    content:
      "Plan-and-Execute 适合跨度更长、需要整理多个来源的任务。它会显式维护 goal、steps、status 和 evidence，并在执行后根据 observation 修正计划。",
  },
];

// 4. 工具一：先搜索教程资料，只返回候选路径和摘要，不直接替 Agent 下结论。
async function searchTutorials(input: Record<string, string>): Promise<ToolResult> {
  const query = String(input.query ?? "").trim().toLowerCase();

  if (!query) {
    return {
      ok: false,
      summary: "搜索关键词为空。",
      content: "请提供 query。",
    };
  }

  const queryWords = query
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  const matches = tutorialNotes.filter((note) => {
    const haystack = [
      note.path,
      note.title,
      note.summary,
      note.content,
      ...note.keywords,
    ]
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

// 5. 工具二：读取计划中选定的教程资料，给重规划提供 evidence。
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

async function runAction(action: PlanAction): Promise<ToolResult> {
  if (action.name === "searchTutorials") {
    return searchTutorials(action.input);
  }

  return readTutorial(action.input);
}

// 6. Planner：先根据目标产出一份可执行计划。
async function createPlan(goal: string): Promise<Plan> {
  const plan = await requestJson<Plan>([
    {
      role: "system",
      content:
        "你是一个规划器。请把用户目标拆成可执行计划。只返回 JSON，不要返回 Markdown。计划必须先搜索资料，再根据搜索结果由 replanner 决定要读哪些资料。每个 step 的 action.name 只能是 searchTutorials 或 readTutorial。初始计划通常只需要 1 到 2 步，避免提前猜测不存在的路径。",
    },
    {
      role: "user",
      content: `用户目标：${goal}\n\n请返回 JSON：{"goal": string, "steps": [{"id": string, "title": string, "status": "pending", "action": {"name": "searchTutorials" | "readTutorial", "input": object}, "evidence": []}], "finalAnswer": null}`,
    },
  ]);

  return normalizePlan(plan, goal);
}

// 7. Executor：只执行当前计划里的下一个 pending step。
async function executeNextStep(plan: Plan): Promise<Observation | null> {
  const step = plan.steps.find((item) => item.status === "pending");

  if (!step) {
    return null;
  }

  printSection(`Execute: ${step.id}`);
  console.log(chalk.white(step.title));
  console.log(chalk.yellow(`Action: ${step.action.name}`));
  console.log(chalk.yellow(`Action Input: ${JSON.stringify(step.action.input)}`));

  const result = await runAction(step.action);

  printSection("Observation:");
  console.log(chalk.gray(result.summary));
  console.log(chalk.gray(result.content));

  return {
    stepId: step.id,
    action: step.action.name,
    result,
  };
}

// 8. Replanner：根据 observation 更新步骤状态、补充 evidence，必要时追加新步骤。
async function replan(plan: Plan, observation: Observation): Promise<Plan> {
  const updatedPlan = await requestJson<Plan>([
    {
      role: "system",
      content:
        "你是一个重规划器。你会收到当前计划和刚刚的 observation。请更新计划：把刚执行的 step 标记为 done 或 skipped，把 observation 中有用的信息写进 evidence；如果还需要资料，就追加新的 pending step；如果已经足够回答，就设置 finalAnswer。只返回 JSON，不要返回 Markdown。每个 action.name 只能是 searchTutorials 或 readTutorial。",
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          plan,
          observation,
          requiredOutput:
            '{"goal": string, "steps": PlanStep[], "finalAnswer": string | null}',
        },
        null,
        2,
      ),
    },
  ]);

  return normalizePlan(updatedPlan, plan.goal);
}

// 9. 这里故意只做轻量清洗，下一章 Context Engineering 再处理更复杂的上下文与状态问题。
function normalizePlan(input: Plan, fallbackGoal: string): Plan {
  return {
    goal: typeof input.goal === "string" ? input.goal : fallbackGoal,
    steps: Array.isArray(input.steps)
      ? input.steps.map((step, index) => normalizeStep(step, index))
      : [],
    finalAnswer:
      typeof input.finalAnswer === "string" && input.finalAnswer.trim()
        ? input.finalAnswer
        : null,
  };
}

function normalizeStep(input: PlanStep, index: number): PlanStep {
  const actionName =
    input.action?.name === "readTutorial" ? "readTutorial" : "searchTutorials";

  return {
    id: typeof input.id === "string" && input.id.trim() ? input.id : `step-${index + 1}`,
    title:
      typeof input.title === "string" && input.title.trim()
        ? input.title
        : "执行计划步骤",
    status:
      input.status === "done" || input.status === "skipped"
        ? input.status
        : "pending",
    action: {
      name: actionName,
      input:
        input.action?.input && typeof input.action.input === "object"
          ? stringifyRecord(input.action.input)
          : {},
    },
    evidence: Array.isArray(input.evidence)
      ? input.evidence.map(String).filter(Boolean)
      : [],
  };
}

function stringifyRecord(input: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, String(value)]),
  );
}

async function requestJson<T>(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
): Promise<T> {
  const response = await client.chat.completions.create({
    model,
    messages,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message.content;

  if (!content) {
    throw new Error("模型没有返回 JSON 内容。");
  }

  return JSON.parse(content) as T;
}

// 10. 日志函数只负责让命令行输出呈现出 plan -> execute -> replan 的阅读路径。
function printSection(title: string) {
  console.log(`\n${chalk.bold.cyan(title)}`);
}

function printPlan(plan: Plan) {
  printSection("Current Plan:");

  for (const step of plan.steps) {
    const marker =
      step.status === "done" ? chalk.green("done") : chalk.yellow(step.status);

    console.log(`${marker} ${step.id}: ${step.title}`);

    for (const evidence of step.evidence) {
      console.log(chalk.gray(`  evidence: ${evidence}`));
    }
  }
}

// 11. 主循环：先规划，再执行一步，再重规划，直到得到 finalAnswer。
async function runPlanAndExecuteAgent(goal: string) {
  printSection("Goal:");
  console.log(chalk.white(goal));

  let plan = await createPlan(goal);
  printPlan(plan);

  const maxSteps = 8;

  for (let turn = 1; turn <= maxSteps; turn += 1) {
    if (plan.finalAnswer) {
      printSection("Final Answer:");
      console.log(chalk.green(plan.finalAnswer));
      return plan;
    }

    const observation = await executeNextStep(plan);

    if (!observation) {
      throw new Error("计划没有 pending step，也没有 finalAnswer。");
    }

    plan = await replan(plan, observation);
    printPlan(plan);
  }

  throw new Error(`Plan-and-Execute stopped after ${maxSteps} steps.`);
}

async function main() {
  const goal =
    process.argv.slice(2).join(" ").trim() ||
    "调研这个教程项目里目前已经讲了哪些 Agent 执行模式，并整理它们分别适合什么场景。";

  await runPlanAndExecuteAgent(goal);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
