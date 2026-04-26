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

// 2. 定义 ReAct 执行过程中需要记录的最小数据结构。
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

type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

// 3. 准备一份很小的“项目资料”，让示例专注展示 ReAct 流程。
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

// 4. 工具一：先搜索文档，只返回候选路径，不直接替 Agent 回答。
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
    const query = String(input.query ?? "").trim().toLowerCase();

    if (!query) {
      return {
        ok: false,
        summary: "搜索关键词为空。",
        content: "请提供 query。",
      };
    }

    const matches = docs.filter((doc) =>
      doc.keywords.some((keyword) => query.includes(keyword.toLowerCase())),
    );

    if (matches.length === 0) {
      return {
        ok: true,
        summary: `没有找到与“${query}”相关的文档。`,
        content: "[]",
      };
    }

    return {
      ok: true,
      summary: `找到 ${matches.length} 篇可能相关的文档。`,
      content: matches
        .map((doc) => `${doc.path}: ${doc.title}`)
        .join("\n"),
    };
  },
};

// 5. 工具二：读取搜索得到的文档内容，给下一轮模型请求提供 observation。
const readDocTool: ToolDefinition = {
  name: "readDoc",
  description: "读取指定文档的完整内容。",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "要读取的文档路径，例如 docs/setup.md。",
      },
    },
    required: ["path"],
    additionalProperties: false,
  },
  async execute(input) {
    const filePath = String(input.path ?? "").trim();
    const doc = docs.find((item) => item.path === filePath);

    if (!doc) {
      return {
        ok: false,
        summary: `没有找到文档：${filePath}`,
        content: "请先搜索可用文档路径，再读取其中一个路径。",
      };
    }

    return {
      ok: true,
      summary: `已读取 ${doc.path}。`,
      content: doc.content,
    };
  },
};

// 6. 工具三：读取 package script，用来演示“根据文档线索继续行动”。
const readPackageScriptTool: ToolDefinition = {
  name: "readPackageScript",
  description: "读取 package.json 中某个 script 的实际命令。",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "script 名称，例如 dev、build 或 lint。",
      },
    },
    required: ["name"],
    additionalProperties: false,
  },
  async execute(input) {
    const scriptName = String(input.name ?? "").trim();
    const command = packageScripts[scriptName];

    if (!command) {
      return {
        ok: false,
        summary: `没有找到 script：${scriptName}`,
        content: `可用 scripts：${Object.keys(packageScripts).join(", ")}`,
      };
    }

    return {
      ok: true,
      summary: `package.json 里的 ${scriptName} 脚本是：${command}`,
      content: `pnpm ${scriptName} -> ${command}`,
    };
  },
};

// 7. 最小工具注册器：把本地工具转换成模型可见的 tools，并负责执行 tool call。
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

      if (!tool) {
        return {
          ok: false,
          summary: `未知工具：${call.function.name}`,
          content: "请检查工具名称。",
        };
      }

      let input: Record<string, unknown>;

      try {
        input = JSON.parse(call.function.arguments) as Record<string, unknown>;
      } catch {
        return {
          ok: false,
          summary: `工具参数不是合法 JSON：${call.function.name}`,
          content: call.function.arguments,
        };
      }

      return tool.execute(input);
    },
  };
}

const registry = createToolRegistry([
  searchDocsTool,
  readDocTool,
  readPackageScriptTool,
]);

// 8. 下面几个函数只负责把运行日志打印成和 Prompt 演示一致的 transcript 风格。
function printSection(title: string) {
  console.log(`\n${chalk.bold.cyan(title)}`);
}

function formatActionInput(argumentsText: string) {
  try {
    return JSON.stringify(JSON.parse(argumentsText));
  } catch {
    return argumentsText;
  }
}

function fallbackNeed(toolName: string) {
  if (toolName === "searchDocs") {
    return "需要先找到和用户问题相关的项目文档。";
  }

  if (toolName === "readDoc") {
    return "搜索结果只给出了候选文档路径，需要读取文档确认具体内容。";
  }

  if (toolName === "readPackageScript") {
    return "文档只给出了 package script 线索，需要继续读取实际脚本命令。";
  }

  return "还需要调用工具获得更多观察结果。";
}

function formatNeed(content: string | null | undefined, toolName: string) {
  const text = content?.trim();

  if (!text) {
    return fallbackNeed(toolName);
  }

  return text.replace(/^Need:\s*/i, "");
}

// 9. ReAct 主循环：模型决定 action，系统执行工具，再把 observation 回填给模型。
async function runReActAgent(userInput: string) {
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

  const observations: Observation[] = [];
  const maxSteps = 6;

  for (let step = 1; step <= maxSteps; step += 1) {
    const response = await client.chat.completions.create({
      model,
      messages,
      tools: registry.chatTools,
    });

    const assistantMessage = response.choices[0]?.message;

    if (!assistantMessage) {
      throw new Error("模型没有返回消息。");
    }

    const toolCalls =
      assistantMessage.tool_calls?.filter(
        (call): call is ToolCall => call.type === "function",
      ) ?? [];

    if (toolCalls.length === 0) {
      const answer = assistantMessage.content ?? "模型没有返回可显示的文本。";

      printSection(`Assistant:`);
      console.log(chalk.green(`Final Answer:\n${answer}`));

      return {
        answer,
        observations,
      };
    }

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

    for (const call of toolCalls) {
      printSection(`Assistant:`);
      console.log(
        chalk.white(`Need: ${formatNeed(assistantMessage.content, call.function.name)}`),
      );
      console.log(chalk.yellow(`Action: ${call.function.name}`));
      console.log(
        chalk.yellow(`Action Input: ${formatActionInput(call.function.arguments)}`),
      );

      const result = await registry.run(call);

      printSection(`Observation:`);
      console.log(chalk.gray(result.summary));

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

  throw new Error(`Agent stopped after ${maxSteps} steps.`);
}

// 10. 命令行入口：准备用户问题，并启动 ReAct 执行器。
async function main() {
  const userInput =
    process.argv.slice(2).join(" ").trim() ||
    "这个项目怎么启动？如果文档不够，请继续查 package 脚本。";

  printSection("User:");
  console.log(chalk.white(userInput));

  await runReActAgent(userInput);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
