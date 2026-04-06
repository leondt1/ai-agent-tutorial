import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
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
});

type ToolError = {
  code: string;
  message: string;
  retryable: boolean;
};

type ToolResult<TData = unknown> = {
  ok: boolean;
  summary: string;
  data?: TData;
  error?: ToolError;
};

type ToolDefinition<TInput, TData = unknown> = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
  inputSchema: ZodType<TInput>;
  execute(input: TInput): Promise<ToolResult<TData>>;
};

type FunctionCallLike = {
  type: "function_call";
  call_id: string;
  name: string;
  arguments: string;
};

function createToolError(code: string, message: string, retryable: boolean): ToolError {
  return {
    code,
    message,
    retryable,
  };
}

function getFunctionCalls(response: { output: unknown[] }) {
  return response.output.filter(
    (item): item is FunctionCallLike =>
      typeof item === "object" &&
      item !== null &&
      "type" in item &&
      item.type === "function_call" &&
      "name" in item &&
      typeof item.name === "string" &&
      "arguments" in item &&
      typeof item.arguments === "string" &&
      "call_id" in item &&
      typeof item.call_id === "string",
  );
}

function createToolRegistry<const TTools extends readonly ToolDefinition<unknown, unknown>[]>(
  definitions: TTools,
) {
  const toolsByName = new Map(definitions.map((tool) => [tool.name, tool]));

  return {
    openAITools: definitions.map((tool) => ({
      type: "function" as const,
      name: tool.name,
      description: tool.description,
      strict: true,
      parameters: tool.parameters,
    })),
    async run(call: FunctionCallLike): Promise<ToolResult> {
      const tool = toolsByName.get(call.name);

      if (!tool) {
        return {
          ok: false,
          summary: `未知工具：${call.name}`,
          error: createToolError("TOOL_NOT_FOUND", `Tool ${call.name} is not registered.`, false),
        };
      }

      let rawInput: unknown;

      try {
        rawInput = JSON.parse(call.arguments);
      } catch (error) {
        return {
          ok: false,
          summary: `工具参数不是合法 JSON：${call.name}`,
          error: createToolError(
            "INVALID_JSON",
            error instanceof Error ? error.message : String(error),
            true,
          ),
        };
      }

      const parsed = tool.inputSchema.safeParse(rawInput);

      if (!parsed.success) {
        return {
          ok: false,
          summary: `工具参数校验失败：${call.name}`,
          error: createToolError(
            "INVALID_ARGUMENTS",
            parsed.error.issues
              .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
              .join("; "),
            true,
          ),
        };
      }

      return tool.execute(parsed.data);
    },
  };
}

const ignoredDirectories = new Set([".git", ".next", "node_modules", "dist"]);

async function collectFiles(directory: string, result: string[] = []) {
  const entries = await fsPromises.readdir(directory, { withFileTypes: true });

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

const listFilesTool: ToolDefinition<
  {
    directory?: string;
    limit?: number;
  },
  Array<{
    path: string;
    type: "file" | "directory";
  }>
> = {
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
      const entries = await fsPromises.readdir(directory, { withFileTypes: true });
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
        error: createToolError(
          "LIST_FILES_ERROR",
          error instanceof Error ? error.message : String(error),
          true,
        ),
      };
    }
  },
};

const searchFilesTool: ToolDefinition<
  {
    query: string;
    directory?: string;
    limit?: number;
  },
  Array<{
    path: string;
    line: number;
    snippet: string;
  }>
> = {
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
    try {
      const directory = path.resolve(repositoryRoot, input.directory ?? ".");
      const limit = input.limit ?? 5;
      const query = input.query.toLowerCase();
      const files = await collectFiles(directory);
      const matches: Array<{ path: string; line: number; snippet: string }> = [];

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
        summary: `找到 ${matches.length} 条与“${input.query}”相关的结果。`,
        data: matches,
      };
    } catch (error) {
      return {
        ok: false,
        summary: `搜索失败：${input.query}`,
        error: createToolError(
          "SEARCH_ERROR",
          error instanceof Error ? error.message : String(error),
          true,
        ),
      };
    }
  },
};

const readFileTool: ToolDefinition<
  {
    path: string;
    startLine?: number;
    endLine?: number;
  },
  {
    path: string;
    startLine: number;
    endLine: number;
    content: string;
    totalLines: number;
  }
> = {
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
        error: createToolError(
          "FILE_READ_ERROR",
          error instanceof Error ? error.message : String(error),
          false,
        ),
      };
    }
  },
};

const registry = createToolRegistry([listFilesTool, searchFilesTool, readFileTool] as const);

async function main() {
  const userInput =
    process.argv.slice(2).join(" ").trim() ||
    "请告诉我这个项目怎么启动。如果 README 不够，就继续搜索相关文件，再读取关键内容。";

  let response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "你是一个工程助手。优先使用最合适的工具来查看本地项目信息。拿到足够信息后，再给出简洁、明确的最终回答。",
      },
      {
        role: "user",
        content: userInput,
      },
    ],
    tools: registry.openAITools,
  });

  for (let step = 1; step <= 6; step += 1) {
    const functionCalls = getFunctionCalls(response);

    if (functionCalls.length === 0) {
      console.log(`\n[step ${step}] final answer`);
      console.log(response.output_text);
      return;
    }

    const toolOutputs: Array<{
      type: "function_call_output";
      call_id: string;
      output: string;
    }> = [];

    for (const call of functionCalls) {
      console.log(`\n[step ${step}] run tool: ${call.name}`);
      console.log(call.arguments);

      const result = await registry.run(call);

      console.log(`[step ${step}] tool summary: ${result.summary}`);

      toolOutputs.push({
        type: "function_call_output" as const,
        call_id: call.call_id,
        output: JSON.stringify(result),
      });
    }

    response = await client.responses.create({
      model,
      previous_response_id: response.id,
      input: toolOutputs,
    });
  }

  throw new Error("Model exceeded max tool steps.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
