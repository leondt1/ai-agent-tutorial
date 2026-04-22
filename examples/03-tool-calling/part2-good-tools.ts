import fsPromises from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { config } from "dotenv";
import OpenAI from "openai";
import { z, type ZodType } from "zod";

config({
  path: path.join(process.cwd(), ".env.local"),
});

const repositoryRoot = process.cwd();
const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

// ── 统一类型 ──────────────────────────────────────────

// 工具执行结果的标准结构：包含成功标识、简短总结和详细数据
type ToolResult = {
  ok: boolean;
  summary: string;
  data?: unknown;
  error?: string;
};

// 工具的定义标准：约束了工具名称、描述、给模型看的参数结构和实际校验的 schema
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

type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

// ── 最小注册器 ────────────────────────────────────────

// 注册器核心：统一管理多个工具，并负责将模型的工具调用转化为实际的函数执行
function createToolRegistry(definitions: ToolDefinition<unknown>[]) {
  const toolsByName = new Map(definitions.map((tool) => [tool.name, tool]));

  return {
    chatTools: definitions.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        strict: true,
        parameters: tool.parameters,
      },
    })),

    // 执行工具调用的主逻辑：查找工具、校验参数、执行逻辑
    async run(call: ToolCall): Promise<ToolResult> {
      const tool = toolsByName.get(call.function.name);

      if (!tool) {
        return {
          ok: false,
          summary: `未知工具：${call.function.name}`,
          error: `Tool ${call.function.name} is not registered.`,
        };
      }

      let rawInput: unknown;

      try {
        rawInput = JSON.parse(call.function.arguments);
      } catch {
        return {
          ok: false,
          summary: `工具参数不是合法 JSON：${call.function.name}`,
          error: "Arguments is not valid JSON.",
        };
      }

      const parsed = tool.inputSchema.safeParse(rawInput);

      if (!parsed.success) {
        return {
          ok: false,
          summary: `工具参数校验失败：${call.function.name}`,
          error: parsed.error.issues
            .map(
              (issue) =>
                `${issue.path.join(".") || "input"}: ${issue.message}`,
            )
            .join("; "),
        };
      }

      return tool.execute(parsed.data);
    },
  };
}

// ── 三个工具定义 ──────────────────────────────────────

// 工具 1：列出目录下的文件
const listFilesTool: ToolDefinition<{
  directory?: string;
  limit?: number;
}> = {
  name: "listFiles",
  description: "列出某个目录下的文件和子目录。",
  parameters: {
    type: "object",
    properties: {
      directory: {
        type: "string",
        description: "可选，要列出的目录，相对于仓库根目录。",
      },
      limit: {
        type: "number",
        description: "可选，最多返回多少条结果。",
      },
    },
    additionalProperties: false,
  },
  inputSchema: z.object({
    directory: z.string().optional(),
    limit: z.number().int().positive().max(100).optional(),
  }),
  async execute(input) {
    try {
      const directory = path.resolve(repositoryRoot, input.directory ?? ".");
      const entries = await fsPromises.readdir(directory, {
        withFileTypes: true,
      });
      const limit = input.limit ?? 20;
      const data = entries.slice(0, limit).map((entry) => ({
        path: path.relative(repositoryRoot, path.join(directory, entry.name)),
        type: entry.isDirectory() ? ("directory" as const) : ("file" as const),
      }));

      return {
        ok: true,
        summary: `目录 ${input.directory ?? "."} 下共有 ${data.length} 条结果。`,
        data,
      };
    } catch (error) {
      return {
        ok: false,
        summary: `列目录失败：${input.directory ?? "."}`,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// 工具 2：在项目文件中搜索关键词
const searchFilesTool: ToolDefinition<{
  query: string;
  directory?: string;
  limit?: number;
}> = {
  name: "searchFiles",
  description: "在项目文件中搜索关键词，返回匹配的路径、行号和片段。",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "要搜索的关键词。",
      },
      directory: {
        type: "string",
        description: "可选，限制搜索目录，相对于仓库根目录。",
      },
      limit: {
        type: "number",
        description: "可选，最多返回多少条匹配结果。",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  inputSchema: z.object({
    query: z.string().min(1),
    directory: z.string().optional(),
    limit: z.number().int().positive().max(20).optional(),
  }),
  async execute(input) {
    const ignoredDirectories = new Set([
      ".git",
      ".next",
      ".gemini",
      "node_modules",
      "dist",
    ]);

    async function collectFiles(directory: string, result: string[] = []) {
      const entries = await fsPromises.readdir(directory, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        if (ignoredDirectories.has(entry.name)) {
          continue;
        }

        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          await collectFiles(entryPath, result);
          continue;
        }

        result.push(entryPath);
      }

      return result;
    }

    try {
      const directory = path.resolve(repositoryRoot, input.directory ?? ".");
      const limit = input.limit ?? 5;
      const query = input.query.toLowerCase();
      const files = await collectFiles(directory);
      const matches: Array<{ path: string; line: number; snippet: string }> =
        [];

      for (const filePath of files) {
        if (matches.length >= limit) {
          break;
        }

        const relativePath = path.relative(repositoryRoot, filePath);

        if (!/\.(md|mdx|ts|tsx|js|json|txt|yaml|yml)$/.test(relativePath)) {
          continue;
        }

        const content = await fsPromises.readFile(filePath, "utf8");
        const lines = content.split("\n");

        lines.forEach((lineContent, index) => {
          if (matches.length >= limit) {
            return;
          }

          if (lineContent.toLowerCase().includes(query)) {
            matches.push({
              path: relativePath,
              line: index + 1,
              snippet: lineContent.trim(),
            });
          }
        });
      }

      if (matches.length === 0) {
        return {
          ok: true,
          summary: `没有找到关键词：${input.query}`,
          data: [],
        };
      }

      return {
        ok: true,
        summary: `找到 ${matches.length} 条与"${input.query}"相关的结果。`,
        data: matches,
      };
    } catch (error) {
      return {
        ok: false,
        summary: `搜索失败：${input.query}`,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// 工具 3：读取指定文件的内容
const readFileTool: ToolDefinition<{
  path: string;
  startLine?: number;
  endLine?: number;
}> = {
  name: "readFile",
  description: "读取项目中的 UTF-8 文本文件，可选指定起止行。",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "相对于仓库根目录的文件路径，例如 README.md",
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
  },
  inputSchema: z.object({
    path: z.string().min(1),
    startLine: z.number().int().positive().optional(),
    endLine: z.number().int().positive().optional(),
  }),
  async execute(input) {
    try {
      const filePath = path.resolve(repositoryRoot, input.path);
      const fileContent = await fsPromises.readFile(filePath, "utf8");
      const lines = fileContent.split("\n");
      const startLine = input.startLine ?? 1;
      const endLine = input.endLine ?? lines.length;
      const sliced = lines.slice(startLine - 1, endLine).join("\n");

      return {
        ok: true,
        summary: `已读取 ${input.path} 的第 ${startLine}-${endLine} 行。`,
        data: {
          path: input.path,
          startLine,
          endLine,
          content: sliced,
          totalLines: lines.length,
        },
      };
    } catch (error) {
      return {
        ok: false,
        summary: `读取文件失败：${input.path}`,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ── 注册工具 & 主流程 ────────────────────────────────

const registry = createToolRegistry([
  listFilesTool,
  searchFilesTool,
  readFileTool,
]);

function printSection(title: string) {
  console.log(`\n${chalk.bold.cyan(title)}`);
}

async function main() {
  const userInput =
    process.argv.slice(2).join(" ").trim() ||
    "请告诉我这个项目怎么启动。如果 README 不够，就继续搜索相关文件，再读取关键内容。";

  printSection("[user question]");
  console.log(chalk.white(userInput));

  // 步骤 1：准备初始的消息历史，告知模型身份和任务目标
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "你是一个工程助手。优先使用最合适的工具来查看本地项目信息。拿到足够信息后，再给出简洁、明确的最终回答。",
    },
    {
      role: "user",
      content: userInput,
    },
  ];

  // 步骤 2：启动一个循环，允许模型与工具多次交互，直到得出最终答案
  // 设置一个最大交互次数，防止无限循环
  const maxSteps = 6;

  for (let step = 1; step <= maxSteps; step += 1) {
    const response = await client.chat.completions.create({
      model,
      messages,
      tools: registry.chatTools,
    });

    const assistantMessage = response.choices[0]?.message;

    if (!assistantMessage) {
      break;
    }

    const toolCalls =
      assistantMessage.tool_calls?.filter(
        (call): call is ToolCall => call.type === "function",
      ) ?? [];

    // 如果模型没有请求任何工具，说明它直接给出了回答，此时跳出循环
    if (toolCalls.length === 0) {
      printSection(`[step ${step}] model decision: final`);
      console.log(
        chalk.green(assistantMessage.content ?? "模型没有返回可显示的文本。"),
      );
      return;
    }

    // 步骤 3：如果模型请求调用工具，先将模型的请求记录到消息历史中
    messages.push({
      role: "assistant",
      content: assistantMessage.content ?? "",
      tool_calls: toolCalls.map((call) => ({
        id: call.id,
        type: "function" as const,
        function: {
          name: call.function.name,
          arguments: call.function.arguments,
        },
      })),
    });

    // 步骤 4：实际执行模型请求的工具，并将结果追加到消息历史中，以便进入下一轮循环让模型读取
    for (const call of toolCalls) {
      printSection(`[step ${step}] model decision: tool`);
      console.log(
        chalk.yellow(`${call.function.name}(${call.function.arguments})`),
      );

      const result = await registry.run(call);

      console.log(chalk.magenta(`[step ${step}] tool result:`));
      console.log(chalk.gray(result.summary));

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  printSection("[error]");
  console.log(chalk.red("模型超过了最大工具调用轮次。"));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
