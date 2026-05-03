---
title: Skill，把重复任务沉淀成能力单元
section: systems
sectionTitle: 把能力变成工程系统
sectionColor: "#b45309"
sectionOrder: 4
order: 2
code: 09
tag: Skill
summary: Tool 是动作接口，Skill 是任务能力封装，它们解决的不是同一个问题。
toolCount: 3
---

第 08 章里，我们用 MCP 解决了一个接入问题：

> 外部工具、资源、提示模板，如何用标准方式暴露给 Agent？

现在 Agent 已经能调用工具、读取上下文、检索外部知识，也能通过 MCP 接入外部系统。

但还有一个问题没有解决：

> 一类重复任务的执行经验，应该放在哪里？

比如代码审查。

每次做 code review 时，你都可能希望 Agent 遵守类似规则：

- 先读改动，再下判断
- 优先找 bug、回归、数据丢失、安全风险
- 不要把风格建议放在真正风险前面
- 输出时把 findings 放在最前面
- 如果没发现问题，要明确说没有发现

再比如技术调研。

你可能希望 Agent 每次都能：

- 先复述研究问题
- 区分事实、假设和不确定性
- 比较方案时讲 tradeoff，而不是堆 feature list
- 最后给出建议和下一步

这些规则当然可以都写进系统提示词。

但系统提示词会越来越长。
不同任务的规则也会互相干扰。
更麻烦的是，很多规则并不是每次都需要。

当用户只是问一个普通问题时，模型没必要同时看到代码审查流程、调研报告格式、文档修订规范和发布检查清单。

Skill 要解决的就是这个问题：

> 把一类重复任务需要的流程、约束、参考资料和可执行脚本，放进一个可版本管理的目录里，让 Agent 在需要时再加载。

这一章会实现一个最小 Skill 闭环。

它不会一开始就做复杂的 Skill 市场、权限系统或插件机制。
我们只先看清楚一件事：

```txt
启动时只加载 Skill 摘要。
任务匹配时再加载完整 Skill。
执行过程中再按需读取参考资料或脚本。
```

这也是官方 [Agent Skills 文档](https://agentskills.io/home)里的核心思路：progressive disclosure。
中文可以理解成“渐进式披露”。

Agent 不需要一开始看到所有能力细节。
它先知道有哪些 Skill，等确定当前任务需要某个 Skill 后，再把完整说明放进上下文。

## Skill 和其他概念的边界

Skill 很容易和前面几章的概念混在一起。

先把边界说清楚。

| 概念 | 解决什么问题 | 例子 |
| --- | --- | --- |
| Tool | 让模型执行一个动作 | 读取文件、搜索资料、运行命令 |
| Prompt | 给模型一段当前任务指令 | “请按三段式总结” |
| Workflow | 固定步骤的程序流程 | 先检索，再总结，再输出 |
| MCP | 标准化接入外部能力 | 从外部 server 发现 tools、resources、prompts |
| Skill | 复用一类任务的执行经验 | 代码审查、技术调研、文档修订 |

最重要的区别是：

```txt
Tool 是“能做什么动作”。
Skill 是“遇到这类任务时，应该怎么做”。
```

读取文件是 Tool。

“做代码审查时，先读 diff，优先找会导致线上行为错误的问题，输出 findings 时带文件和行号”是 Skill。

Skill 也不是简单的 Prompt 片段拼接。

Prompt 通常是一次请求里的指令。
Skill 则是一个能力目录。
它可以包含：

- `SKILL.md`：这类任务的说明、流程和输出要求
- `scripts/`：稳定、重复、容易写错的自动化步骤
- `references/`：较长的参考资料、规范、模板
- `assets/`：图片、表格、样例文件、报告模板

换句话说，Skill 不只是“多写几句话”。
它是把任务经验从一次性的 prompt 里拿出来，变成可以维护、测试和复用的工程资产。

## 一个 Skill 目录长什么样

官方推荐的 Skill 通常是一个目录：

```txt
code-review/
└── SKILL.md
```

如果任务需要更多材料，可以继续加入子目录：

```txt
research-brief/
├── SKILL.md
└── references/
    └── report-template.md
```

`SKILL.md` 是入口。

它最前面有一段 frontmatter：

```md
---
name: code-review
description: Use this skill when reviewing TypeScript code changes for correctness, regressions, missing tests, risky edge cases, or pull request feedback.
---
```

这里的 `name` 是 Skill 标识。
官方建议它和目录名保持一致。

`description` 更关键。

它不是给人看的介绍文案，而是给模型判断“什么时候应该使用这个 Skill”的触发条件。

`SKILL.md` 后面的正文才是完整执行说明：

```md
# Code Review Skill

Use this skill when the user asks for a code review, patch review, pull request review, or risk check.

## Workflow

1. Read the changed code before judging it.
2. Focus on bugs, regressions, missing tests, data loss, security risks, and edge cases.
3. Prefer concrete findings over general advice.
4. For each finding, include the file path, the relevant line if available, and why the behavior can fail.
5. If no issues are found, say that clearly and mention any remaining test gap.

## Output Format

Put findings first.

Use this order:

1. Findings
2. Open questions or assumptions
3. Brief summary
```

注意这里的写法。

它没有解释 TypeScript 语法。
它也没有把每一种 review 场景都写成复杂程序。

它只是把这类任务最稳定的经验沉淀下来：

- 先做什么
- 重点看什么
- 不要被什么带偏
- 最后按什么格式输出

这就是适合 Skill 的内容。

## Progressive Disclosure

如果 Agent 启动时就把所有 Skill 的完整内容都读进上下文，Skill 很快也会变成另一种系统提示词膨胀。

所以 Skill 的关键不是“集中存放 prompt”。

关键是加载时机。

```txt
启动时：
  只加载每个 Skill 的 name 和 description

任务匹配时：
  加载完整 SKILL.md

执行过程中：
  按需读取 references / scripts / assets
```

这和第 06 章的 Context Engineering 是同一个原则：

> 好的上下文不是信息最多，而是信息最贴近当前任务。

Skill catalog 适合长期放进上下文，因为它很短：

```txt
available skills:
- code-review: Use this skill when reviewing TypeScript code changes...
- research-brief: Use this skill when turning technical research into a concise brief...
```

完整 `SKILL.md` 不适合一开始就放进去。

只有当模型判断“当前任务需要 code-review”时，程序才读取：

```txt
examples/09-skill/skills/code-review/SKILL.md
```

然后把这份说明作为 tool result 写回消息历史。

这就是本章示例要实现的最小闭环。

## 本章示例

本章对应的可运行代码在 [examples/09-skill/](https://github.com/leondt1/ai-agent-tutorial/tree/main/examples/09-skill) 目录下。

目录结构：

```txt
examples/09-skill/
├── README.md
├── skill-agent.ts
└── skills/
    ├── code-review/
    │   └── SKILL.md
    └── research-brief/
        ├── SKILL.md
        └── references/
            └── report-template.md
```

运行命令：

```bash
pnpm example examples/09-skill/skill-agent.ts
```

也可以传入自己的任务：

```bash
pnpm example examples/09-skill/skill-agent.ts "把 Skill 和 Tool 的区别整理成一份技术调研 brief"
```

示例会依次打印：

- available skills
- 用户任务
- 模型是否调用 `activateSkill`
- 被加载的完整 Skill 内容
- 最终回答

这个示例需要 `.env.local` 里有可用的 `OPENAI_API_KEY`。
如果你使用自定义兼容服务，也可以配置 `OPENAI_BASE_URL`。

默认使用：

```txt
OPENAI_MODEL=gpt-5-mini
```

## Skill 加载全流程

接下来把代码按一次完整运行拆开看。

这条链路分成三步：

```txt
加载 Skill Catalog
-> 让模型选择是否激活 Skill
-> 读取完整 SKILL.md 并继续生成回答
```

这三步对应的不是三个独立功能，而是同一个 progressive disclosure 流程。

### 第一步：加载 Skill Catalog，只把摘要放进上下文

先看 Skill 的类型：

```ts
type SkillSummary = {
  name: string;
  description: string;
  directory: string;
  skillFile: string;
};
```

它只保留四个字段。

`name` 和 `description` 会进入上下文。
`directory` 和 `skillFile` 留给程序后面读取完整 Skill。

加载 catalog 的代码是：

```ts
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
```

这段代码没有读取 `references/`，也没有读取 `scripts/`。

原因很简单：

> 还不知道当前任务要不要用这个 Skill，就不要提前加载它的全部材料。

本章的 frontmatter 解析器也故意写得很小：

```ts
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
```

真实项目里可以用成熟的 frontmatter 解析库。

这里手写解析器，是为了让读者把注意力放在 Skill 加载流程上，而不是库 API 上。

### 第二步：让模型根据任务选择是否激活 Skill

我们把 catalog 格式化成一段短文本：

```ts
function formatSkillCatalog(skills: SkillSummary[]) {
  return skills
    .map((skill) => `- ${skill.name}: ${skill.description}`)
    .join("\n");
}
```

然后放进系统消息：

```ts
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
```

这里有一个很重要的设计选择：

> 示例没有在程序里写关键词匹配，而是让模型根据 description 判断是否激活 Skill。

比如用户说：

```diff
请 review 下面这个 TypeScript patch，重点找 correctness、regression 和 missing tests 风险：

diff --git a/src/permissions.ts b/src/permissions.ts
--- a/src/permissions.ts
+++ b/src/permissions.ts
@@
 type User = {
   id: string;
   name: string;
   isAdmin: boolean;
 };

 export function canEditProject(user: User | undefined) {
-  return user?.isAdmin === true;
+  return user!.isAdmin;
 }
```

模型看到 catalog：

```txt
- code-review: Use this skill when reviewing TypeScript code changes for correctness...
- research-brief: Use this skill when turning technical research into a concise brief...
```

它应该判断当前任务匹配 `code-review`。

于是它调用工具：

```txt
activateSkill({ "name": "code-review" })
```

### 第三步：执行 `activateSkill`，读取完整 `SKILL.md`

本章只有一个工具：

```ts
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
```

这个工具不会执行代码审查。
它也不会替模型写答案。

它只做一件事：

> 根据 Skill 名称读取完整 `SKILL.md`。

实现如下：

```ts
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
```

然后和前面 Tool Calling 章节一样，把工具结果写回消息历史：

```ts
messages.push({
  role: "tool",
  tool_call_id: call.id,
  content: skillContent,
});
```

到这里，模型才第一次看见完整 Skill 内容。

第二次调用模型时，我们设置：

```ts
tool_choice: "none"
```

意思是这一轮不要再调用工具，直接根据已经加载的 Skill 完成回答。

这个流程和第 03 章的最小工具闭环非常像。

区别在于：

- 第 03 章的 tool 返回文件内容
- 第 09 章的 tool 返回任务能力说明

## 怎么写好 `description`

Skill 是否会被正确激活，很大程度取决于 `description`。

它不是广告语。
它应该回答：

> 用户说什么、做什么、请求什么时，应该使用这个 Skill？

一个太弱的描述是：

```md
description: Helps with code review.
```

它的问题是太泛。
模型很难判断什么算 “helps”。

更好的写法是：

```md
description: Use this skill when reviewing TypeScript code changes for correctness, regressions, missing tests, risky edge cases, or pull request feedback.
```

这个描述更像触发条件。

它告诉模型：

- 用户请求 code review 时使用
- 用户请求 patch review 或 PR feedback 时使用
- 重点是 correctness、regression、tests、edge cases

再看 `research-brief`：

```md
description: Use this skill when turning technical research into a concise brief with context, findings, tradeoffs, recommendation, and next steps.
```

这个描述没有说“useful for research”。

它明确说：当用户要把技术调研整理成 brief，并且需要 context、findings、tradeoffs、recommendation、next steps 时使用。

写 `description` 时可以遵守三个规则：

1. 写“什么时候用”，不要只写“它是什么”
2. 描述用户意图，而不是内部实现
3. 覆盖应该触发的场景，但不要宽到所有任务都会误触发

调试 Skill 时，也应该优先看 `description`。

如果模型经常漏触发，通常是 description 没覆盖用户的真实说法。

如果模型经常误触发，通常是 description 写得太宽。

## 什么时候使用 references 和 scripts

并不是所有内容都要写进 `SKILL.md`。

`SKILL.md` 适合放稳定、短小、每次都要看的说明。

长资料可以放进 `references/`。

例如本章的 `research-brief` 写了：

```md
## References

If the brief needs a more formal structure, read:

- `references/report-template.md`
```

这样模型先看到入口说明。

只有当任务真的需要更正式的报告模板时，才去读 `references/report-template.md`。

脚本则适合放进 `scripts/`。

适合脚本化的步骤通常有这些特征：

- 每次都要重复执行
- 模型容易手写错
- 输出需要稳定格式
- 可以被程序验证
- 适合非交互式运行

比如一个文档发布 Skill 可以有：

```txt
scripts/check-links.ts
scripts/validate-frontmatter.ts
scripts/build-preview.ts
```

这些步骤如果只写在自然语言里，模型每次都要重新组织命令。

放进脚本后，Skill 只需要告诉模型：

```txt
Before finalizing, run scripts/check-links.ts.
```

这就是把重复、稳定、易错的动作从提示词里拿出来。

不过本章示例没有实现脚本执行。

因为当前教学目标是 Skill 的加载与激活。
脚本执行会牵涉权限、参数、运行环境和错误处理，更适合后面整合完整 Agent 时再加。

## Skill 的调试方式

调试 Skill 不应该只看一次任务。

更好的方式是准备两组样例。

一组是应该触发的任务：

```txt
帮我 review 这个 TypeScript patch
看一下这个 PR 有没有明显风险
检查这段工具调用代码可能有什么 bug
```

另一组是不应该触发的任务：

```txt
解释一下 tool calling 是什么
帮我把这段话翻译成英文
总结 README 里的安装步骤
```

然后观察：

- 应该触发时有没有漏掉
- 不该触发时有没有误触发
- 触发后输出是否真的按 Skill 工作
- Skill 内容是不是太长，反而分散了模型注意力

如果触发不准，先改 `description`。

如果触发准但输出不稳，再改 `SKILL.md` 正文。

如果某个步骤反复出错，再考虑把它放进 `scripts/`。

这个顺序很重要。

Skill 的迭代通常不是一上来就写更多内容。

而是先让它在正确的任务上被正确加载。

## 本章小结

这一章没有引入新的大框架。

我们只做了一个很小的闭环：

```txt
扫描 skills 目录
-> 解析每个 SKILL.md 的 name 和 description
-> 把 Skill catalog 放进上下文
-> 模型调用 activateSkill
-> 程序读取完整 SKILL.md
-> 模型按 Skill 完成任务
```

把它放回整套 Agent 能力地图里：

```txt
Tool：执行动作
MCP：标准化接入外部能力
RAG：补充外部知识
Context Engineering：决定放什么进上下文
Skill：把重复任务的过程经验按需加载
```

Skill 的价值不是让 Agent 看见更多文字。

它的价值是让 Agent 在正确时机看见正确的任务经验。

下一章不再引入新概念。

我们会把前面学过的能力按任务需要组装起来，做一个真正可用的 code agent。
