import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { config } from "dotenv";
import OpenAI from "openai";

const repositoryRoot = process.cwd();
const skillsRoot = path.join(repositoryRoot, "examples/09-skill/skills");

config({
  path: path.join(repositoryRoot, ".env.local"),
  quiet: true,
});

const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

type SkillSummary = {
  name: string;
  description: string;
  directory: string;
  skillFile: string;
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

// 1. 读取 Skill 目录。启动阶段只解析 frontmatter，不把完整说明塞进上下文。
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

// 2. 这个解析器故意保持很小，只支持本章需要的 name 和 description。
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

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    fields.set(key, value);
  }

  const name = fields.get("name");
  const description = fields.get("description");

  if (!name || !description) {
    throw new Error("SKILL.md frontmatter 需要 name 和 description。");
  }

  return { name, description };
}

function formatSkillCatalog(skills: SkillSummary[]) {
  return skills
    .map((skill) => `- ${skill.name}: ${skill.description}`)
    .join("\n");
}

// 3. 当模型决定激活 Skill 时，再读取完整 SKILL.md。
async function activateSkill(name: string, skills: SkillSummary[]) {
  const skill = skills.find((candidate) => candidate.name === name);

  if (!skill) {
    return `没有找到名为 ${name} 的 Skill。`;
  }

  const markdown = await fs.readFile(skill.skillFile, "utf8");

  return [
    `Activated skill: ${skill.name}`,
    `Directory: ${path.relative(repositoryRoot, skill.directory)}`,
    "",
    markdown,
  ].join("\n");
}

const tools = [
  {
    type: "function" as const,
    function: {
      name: "activateSkill",
      description:
        "Load the full SKILL.md instructions for a skill when the user's task matches that skill description.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The skill name from the available skills catalog.",
          },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
];

async function main() {
  const userInput =
    process.argv.slice(2).join(" ").trim() ||
    [
      "请 review 下面这个 TypeScript patch，重点找 correctness、regression 和 missing tests 风险：",
      "",
      "```diff",
      "diff --git a/src/permissions.ts b/src/permissions.ts",
      "--- a/src/permissions.ts",
      "+++ b/src/permissions.ts",
      "@@",
      " type User = {",
      "   id: string;",
      "   name: string;",
      "   isAdmin: boolean;",
      " };",
      "",
      " export function canEditProject(user: User | undefined) {",
      "-  return user?.isAdmin === true;",
      "+  return user!.isAdmin;",
      " }",
      "```",
    ].join("\n");

  const skills = await loadSkillCatalog();

  printSection("[available skills]");
  console.log(chalk.gray(formatSkillCatalog(skills)));

  printSection("[user task]");
  console.log(chalk.white(userInput));

  // 4. 初始上下文只给模型 Skill 目录，让它先判断要不要激活某个 Skill。
  const messages: Message[] = [
    {
      role: "system",
      content: [
        "你是一个 TypeScript Agent 教程里的工程助手。",
        "你可以看到 available skills，但现在还没有看到完整 Skill 内容。",
        "如果用户任务明显匹配某个 Skill 的 description，请先调用 activateSkill。",
        "如果没有匹配的 Skill，请直接回答，不要强行激活。",
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

  const firstResponse = await client.chat.completions.create({
    model,
    messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    tools: tools as OpenAI.Chat.Completions.ChatCompletionTool[],
  });

  const firstMessage = firstResponse.choices[0]?.message;
  const functionCalls =
    firstMessage?.tool_calls?.filter(
      (call): call is ToolCall => call.type === "function",
    ) ?? [];

  if (functionCalls.length === 0) {
    printSection("[model decision: no skill]");
    console.log(chalk.green(firstMessage?.content ?? "模型没有返回可显示的文本。"));
    return;
  }

  messages.push({
    role: "assistant",
    content: firstMessage?.content ?? "",
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
    const input = JSON.parse(call.function.arguments) as { name?: string };
    const skillName = String(input.name ?? "");
    const skillContent = await activateSkill(skillName, skills);

    printSection("[model decision: activate skill]");
    console.log(chalk.yellow(`${call.function.name} ${call.function.arguments}`));

    printSection("[loaded skill]");
    console.log(chalk.gray(skillContent.slice(0, 900)));

    messages.push({
      role: "tool",
      tool_call_id: call.id,
      content: skillContent,
    });
  }

  // 5. 第二次调用模型：这时模型已经拿到完整 Skill 说明，可以按 Skill 完成任务。
  const finalResponse = await client.chat.completions.create({
    model,
    messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    tools: tools as OpenAI.Chat.Completions.ChatCompletionTool[],
    tool_choice: "none",
  });

  printSection("[final answer]");
  console.log(
    chalk.green(
      finalResponse.choices[0]?.message?.content ?? "模型没有返回可显示的文本。",
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
