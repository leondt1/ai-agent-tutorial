import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { config } from "dotenv";
import OpenAI from "openai";

const repositoryRoot = process.cwd();

config({
  path: path.join(repositoryRoot, ".env.local"),
});

// 1. 初始化 OpenAI 客户端
const model = process.env.OPENAI_MODEL?.trim() || "";
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

type Message =
  | {
      role: "system" | "user";
      content: string;
    }
  | {
      role: "assistant";
      content: string;
      tool_calls?: ToolCall[];
    }
  | {
      role: "tool";
      tool_call_id: string;
      content: string;
    };

type ToolResult = {
  ok: boolean;
  content: string;
};

function printSection(title: string) {
  console.log(`\n${chalk.bold.cyan(title)}`);
}

// 2. 实现一个最小的工具函数：读取本地文件
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

async function main() {
  const userInput =
    process.argv.slice(2).join(" ").trim() ||
    "帮我看看这个项目 README 里有没有安装步骤。";

  printSection("[user question]");
  console.log(chalk.white(userInput));

  // 3. 准备初始的消息历史，告诉模型它的角色和可用的工具策略
  const messages: Message[] = [
    {
      role: "system",
      content:
        "你是一个工程助手。如果需要查看本地文件，请优先调用 readFile，然后再回答用户问题。",
    },
    {
      role: "user",
      content: userInput,
    },
  ];

  // 4. 以 OpenAI 期望的格式定义工具列表
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

  // 5. 第一次调用模型：让模型根据用户问题决定下一步行动（调用工具或直接回答）
  const response = await client.chat.completions.create({
    model,
    messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    tools: tools as OpenAI.Chat.Completions.ChatCompletionTool[],
  });

  const assistantMessage = response.choices[0]?.message;
  const functionCalls =
    assistantMessage?.tool_calls?.filter(
      (call): call is ToolCall => call.type === "function",
    ) ?? [];

  if (functionCalls.length === 0) {
    printSection("[step 1] model decision: final");
    console.log(
      chalk.green(assistantMessage?.content ?? "模型没有返回可显示的文本。"),
    );
    return;
  }

  // 6. 如果模型决定调用工具，先将模型的“调用请求”保存到消息历史中
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

  for (const call of functionCalls) {
    printSection("[step 1] model decision: tool");
    console.log(
      chalk.yellow(`${call.function.name} ${call.function.arguments}`),
    );
  }

  // 7. 在本地实际执行工具代码，并将执行结果作为 tool 角色追加到消息历史中
  await Promise.all(
    functionCalls.map(async (call) => {
      const input = JSON.parse(call.function.arguments) as { path?: string };
      const result = await readFile(String(input.path ?? ""));

      console.log(chalk.magenta("[step 1] tool result:"));
      console.log(chalk.gray(result.content.slice(0, 600)));

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result.content,
      });
    }),
  );

  // 8. 第二次调用模型：带着包含了工具执行结果的完整历史，让模型生成最终的回答
  const finalResponse = await client.chat.completions.create({
    model,
    messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    tools: tools as OpenAI.Chat.Completions.ChatCompletionTool[],
    tool_choice: "none",
  });

  printSection("[step 2] model decision: final");
  console.log(
    chalk.green(
      finalResponse.choices[0]?.message?.content ??
        "模型没有返回可显示的文本。",
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
