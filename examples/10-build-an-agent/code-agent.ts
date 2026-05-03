import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { config } from "dotenv";
import OpenAI from "openai";

// 1. 固定本章示例的工作区：Agent 只能在 generated/todo-app 里创建应用。
const repositoryRoot = process.cwd();
const chapterRoot = path.join(repositoryRoot, "examples/10-build-an-agent");
const skillsRoot = path.join(chapterRoot, "skills");
const generatedRoot = path.join(chapterRoot, "generated");
const appName = "todo-app";
const appRoot = path.join(generatedRoot, appName);

// 2. 读取环境变量，并初始化真实的 OpenAI 客户端。
config({
  path: path.join(repositoryRoot, ".env.local"),
  quiet: true,
});

const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

// 3. 这些类型是本章 runtime 的最小协议：Skill 摘要、工具结果、工具定义和消息历史。
type SkillSummary = {
  name: string;
  description: string;
  directory: string;
  skillFile: string;
};

type ToolResult = {
  ok: boolean;
  summary: string;
  content: string;
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

function printSection(title: string) {
  console.log(`\n${chalk.bold.cyan(title)}`);
}

function truncate(text: string, maxLength = 6000) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}\n...输出过长，已截断。`;
}

// 4. 启动时只读取 Skill frontmatter，让模型先看到很短的 Skill catalog。
function parseFrontmatter(markdown: string) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);

  if (!match) {
    throw new Error("SKILL.md 缺少 frontmatter。");
  }

  const fields = new Map<string, string>();

  for (const line of match[1]?.split("\n") ?? []) {
    const separator = line.indexOf(":");

    if (separator === -1) {
      continue;
    }

    fields.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }

  const name = fields.get("name");
  const description = fields.get("description");

  if (!name || !description) {
    throw new Error("SKILL.md frontmatter 需要 name 和 description。");
  }

  return { name, description };
}

async function loadSkillCatalog(): Promise<SkillSummary[]> {
  const entries = await fs.readdir(skillsRoot, { withFileTypes: true });
  const skills: SkillSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const directory = path.join(skillsRoot, entry.name);
    const skillFile = path.join(directory, "SKILL.md");
    const markdown = await fs.readFile(skillFile, "utf8");
    const frontmatter = parseFrontmatter(markdown);

    skills.push({
      name: frontmatter.name,
      description: frontmatter.description,
      directory,
      skillFile,
    });
  }

  return skills;
}

function formatSkillCatalog(skills: SkillSummary[]) {
  return skills
    .map((skill) => `- ${skill.name}: ${skill.description}`)
    .join("\n");
}

// 5. 文件工具共用这个边界检查，确保模型不能读写 generated/todo-app 之外的路径。
function resolveInside(baseDirectory: string, inputPath: string) {
  const resolvedPath = path.resolve(baseDirectory, inputPath);
  const relativePath = path.relative(baseDirectory, resolvedPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`路径越界：${inputPath}`);
  }

  return resolvedPath;
}

async function pathExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listDirectoryRecursive(directory: string, prefix = "", depth = 0): Promise<string[]> {
  if (depth > 3) {
    return [];
  }

  const entries = await fs.readdir(directory, { withFileTypes: true });
  const lines: string[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === "node_modules" || entry.name === "dist") {
      continue;
    }

    const relativePath = path.join(prefix, entry.name);
    lines.push(entry.isDirectory() ? `${relativePath}/` : relativePath);

    if (entry.isDirectory()) {
      lines.push(
        ...(await listDirectoryRecursive(
          path.join(directory, entry.name),
          relativePath,
          depth + 1,
        )),
      );
    }
  }

  return lines;
}

// 6. 命令工具不是通用 shell。模型只能请求这些白名单命令，runtime 再映射成 spawn 参数。
function commandSpec(command: string, cwdName: string) {
  const normalizedCommand = command.trim().replace(/\s+/g, " ");

  if (
    normalizedCommand ===
      `pnpm create vite@latest ${appName} --template react-ts` &&
    cwdName === "workspace"
  ) {
    return {
      cwd: generatedRoot,
      command: "pnpm",
      args: ["create", "vite@latest", appName, "--template", "react-ts"],
      longRunning: false,
    };
  }

  if (normalizedCommand === "pnpm install" && cwdName === "app") {
    return {
      cwd: appRoot,
      command: "pnpm",
      // 这个仓库本身是 pnpm workspace。生成的 Vite app 在更深一层目录里，
      // 所以安装时要忽略父级 workspace，才能把依赖装进 generated/todo-app。
      args: ["install", "--ignore-workspace"],
      longRunning: false,
    };
  }

  if (normalizedCommand === "pnpm build" && cwdName === "app") {
    return {
      cwd: appRoot,
      command: "pnpm",
      args: ["build"],
      longRunning: false,
    };
  }

  if (
    normalizedCommand === "pnpm dev --host 127.0.0.1" &&
    cwdName === "app"
  ) {
    return {
      cwd: appRoot,
      command: "pnpm",
      args: ["dev", "--host", "127.0.0.1"],
      longRunning: true,
    };
  }

  return null;
}

// 7. 短命令会等待退出，并把 stdout/stderr 作为 observation 返回给模型。
async function runShortCommand(
  spec: { cwd: string; command: string; args: string[] },
  timeoutMs = 180000,
): Promise<ToolResult> {
  await fs.mkdir(spec.cwd, { recursive: true });

  return new Promise((resolve) => {
    const child = spawn(spec.command, spec.args, {
      cwd: spec.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({
        ok: false,
        summary: `命令超时：${spec.command} ${spec.args.join(" ")}`,
        content: truncate(output),
      });
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      resolve({
        ok: false,
        summary: `命令启动失败：${error.message}`,
        content: truncate(output),
      });
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({
        ok: code === 0,
        summary:
          code === 0
            ? `命令执行成功：${spec.command} ${spec.args.join(" ")}`
            : `命令退出码：${code}`,
        content: truncate(output),
      });
    });
  });
}

// 8. dev server 是长运行命令，启动成功后就把进程留在后台。
async function startDevServer(spec: {
  cwd: string;
  command: string;
  args: string[];
}): Promise<ToolResult> {
  const child = spawn(spec.command, spec.args, {
    cwd: spec.cwd,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";

  return new Promise((resolve) => {
    const finish = (ok: boolean, summary: string) => {
      child.stdout?.destroy();
      child.stderr?.destroy();
      child.unref();

      resolve({
        ok,
        summary,
        content: truncate(output),
      });
    };

    const timeout = setTimeout(() => {
      finish(
        true,
        `开发服务器已启动，进程 PID：${child.pid}。通常可以访问 http://127.0.0.1:5173`,
      );
    }, 8000);

    child.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();

      if (output.includes("Local:")) {
        clearTimeout(timeout);
        finish(true, `开发服务器已启动，进程 PID：${child.pid}。`);
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      finish(false, `开发服务器启动失败：${error.message}`);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);

      if (code !== null && code !== 0) {
        finish(false, `开发服务器提前退出，退出码：${code}`);
      }
    });
  });
}

// 9. 工具注册器做两件事：把工具 schema 交给模型，以及执行模型返回的 tool call。
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

      try {
        return await tool.execute(input);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        return {
          ok: false,
          summary: `工具执行失败：${call.function.name}`,
          content: message,
        };
      }
    },
  };
}

async function main() {
  // 10. 命令行参数就是用户目标；不传参数时使用本章默认的 TodoList 任务。
  const userInput =
    process.argv.slice(2).join(" ").trim() ||
    "创建一个 React TodoList 应用，能添加、完成和删除任务，并自动安装依赖、构建验证和启动项目。";

  await fs.mkdir(generatedRoot, { recursive: true });
  const skills = await loadSkillCatalog();

  // 11. 这里是模型可以调用的全部动作。每个工具都返回 ToolResult，方便写回上下文。
  const tools: ToolDefinition[] = [
    {
      name: "activateSkill",
      description:
        "当用户任务匹配某个 Skill 时，读取完整 SKILL.md，让 Agent 获得这类任务的执行经验。",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "要激活的 Skill 名称，必须来自 available skills。",
          },
        },
        required: ["name"],
        additionalProperties: false,
      },
      async execute(input) {
        const name = String(input.name ?? "").trim();
        const skill = skills.find((candidate) => candidate.name === name);

        if (!skill) {
          return {
            ok: false,
            summary: `没有找到 Skill：${name}`,
            content: formatSkillCatalog(skills),
          };
        }

        const markdown = await fs.readFile(skill.skillFile, "utf8");

        return {
          ok: true,
          summary: `已激活 Skill：${skill.name}`,
          content: [
            `Skill directory: ${path.relative(repositoryRoot, skill.directory)}`,
            "",
            markdown,
          ].join("\n"),
        };
      },
    },
    {
      name: "runCommand",
      description:
        "运行受白名单限制的项目命令。只能创建 Vite React TS 应用、安装依赖、构建验证或启动开发服务器。",
      parameters: {
        type: "object",
        properties: {
          cwd: {
            type: "string",
            enum: ["workspace", "app"],
            description:
              "workspace 表示 examples/10-build-an-agent/generated；app 表示 generated/todo-app。",
          },
          command: {
            type: "string",
            description:
              "允许命令之一：pnpm create vite@latest todo-app --template react-ts、pnpm install、pnpm build、pnpm dev --host 127.0.0.1。",
          },
        },
        required: ["cwd", "command"],
        additionalProperties: false,
      },
      async execute(input) {
        const cwd = String(input.cwd ?? "").trim();
        const command = String(input.command ?? "").trim();
        const spec = commandSpec(command, cwd);

        if (!spec) {
          return {
            ok: false,
            summary: "命令不在白名单内。",
            content: [
              "允许的命令：",
              `- cwd=workspace: pnpm create vite@latest ${appName} --template react-ts`,
              "- cwd=app: pnpm install",
              "- cwd=app: pnpm build",
              "- cwd=app: pnpm dev --host 127.0.0.1",
            ].join("\n"),
          };
        }

        // 重新运行示例时，如果项目已经创建过，就把 scaffold 变成幂等操作。
        if (
          command.trim().replace(/\s+/g, " ") ===
            `pnpm create vite@latest ${appName} --template react-ts` &&
          (await pathExists(path.join(appRoot, "package.json")))
        ) {
          return {
            ok: true,
            summary: "Vite 项目已经存在，跳过 scaffold。",
            content: `已存在：${path.relative(repositoryRoot, appRoot)}`,
          };
        }

        if (spec.longRunning) {
          return startDevServer(spec);
        }

        return runShortCommand(spec);
      },
    },
    {
      name: "listFiles",
      description: "列出 generated/todo-app 里的文件结构，不包含 node_modules 和 dist。",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "相对 generated/todo-app 的目录路径，通常传 .。",
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
      async execute(input) {
        const relativePath = String(input.path ?? ".").trim() || ".";
        const directory = resolveInside(appRoot, relativePath);

        if (!(await pathExists(directory))) {
          return {
            ok: false,
            summary: `目录不存在：${relativePath}`,
            content: "请先创建 Vite 项目。",
          };
        }

        const lines = await listDirectoryRecursive(directory);

        return {
          ok: true,
          summary: `已列出 ${relativePath}。`,
          content: lines.join("\n"),
        };
      },
    },
    {
      name: "readFile",
      description: "读取 generated/todo-app 内的一个文本文件。",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "相对 generated/todo-app 的文件路径，例如 src/App.tsx。",
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
      async execute(input) {
        const relativePath = String(input.path ?? "").trim();
        const filePath = resolveInside(appRoot, relativePath);
        const content = await fs.readFile(filePath, "utf8");

        return {
          ok: true,
          summary: `已读取 ${relativePath}。`,
          content: truncate(content),
        };
      },
    },
    {
      name: "writeFile",
      description: "写入 generated/todo-app 内的一个文本文件，会自动创建父目录。",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "相对 generated/todo-app 的文件路径，例如 src/App.tsx。",
          },
          content: {
            type: "string",
            description: "完整文件内容。",
          },
        },
        required: ["path", "content"],
        additionalProperties: false,
      },
      async execute(input) {
        const relativePath = String(input.path ?? "").trim();
        const content = String(input.content ?? "");
        const filePath = resolveInside(appRoot, relativePath);

        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, "utf8");

        return {
          ok: true,
          summary: `已写入 ${relativePath}。`,
          content: `${content.split("\n").length} 行。`,
        };
      },
    },
  ];

  const registry = createToolRegistry(tools);

  printSection("[available skills]");
  console.log(chalk.gray(formatSkillCatalog(skills)));

  printSection("[user task]");
  console.log(chalk.white(userInput));

  // 12. 系统提示词只说明 runtime 边界和任务顺序；React/Vite 经验放在 Skill 里按需加载。
  const messages: Message[] = [
    {
      role: "system",
      content: [
        "你是一个受限的 TypeScript code agent，正在教程最后一章里演示如何组装一个真正可用的 Agent。",
        "你可以请求工具来激活 Skill、创建项目、读写文件、安装依赖、构建验证和启动开发服务器。",
        "重要边界：你不能假装自己已经执行命令或写入文件。所有副作用都必须通过工具完成。",
        "如果用户任务匹配 available skills，请先调用 activateSkill，再按 Skill 的流程行动。",
        "创建项目时必须调用 runCommand，cwd=workspace，command=\"pnpm create vite@latest todo-app --template react-ts\"。",
        "业务代码应写在 generated/todo-app 内。修改后必须运行 pnpm install 和 pnpm build。",
        "如果 build 失败，请根据 observation 修复相关文件，然后再次 build。",
        "构建通过后，调用 pnpm dev --host 127.0.0.1 启动项目。",
        "完成后直接给出简洁总结，说明生成目录、验证结果和访问地址。",
        "",
        "available skills:",
        formatSkillCatalog(skills),
      ].join("\n"),
    },
    {
      role: "user",
      content: userInput,
    },
  ];

  const maxSteps = 18;

  // 13. 主循环：模型请求工具，runtime 执行工具，再把 observation 写回消息历史。
  for (let step = 1; step <= maxSteps; step += 1) {
    const response = await client.chat.completions.create({
      model,
      messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
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

    // 没有 tool call 就表示模型认为任务已经完成，可以给用户最终答案。
    if (toolCalls.length === 0) {
      printSection("[final answer]");
      console.log(chalk.green(assistantMessage.content ?? "模型没有返回可显示文本。"));
      return;
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
      printSection(`[tool call ${step}] ${call.function.name}`);
      console.log(chalk.yellow(call.function.arguments));

      const result = await registry.run(call);

      printSection("[observation]");
      console.log(result.ok ? chalk.gray(result.summary) : chalk.red(result.summary));
      console.log(chalk.gray(truncate(result.content, 2000)));

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  throw new Error(`Agent stopped after ${maxSteps} steps.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
