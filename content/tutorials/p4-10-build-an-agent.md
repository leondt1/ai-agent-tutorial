---
title: 组装一个真正可用的 Code Agent
section: systems
sectionTitle: 把能力变成工程系统
sectionColor: "#b45309"
sectionOrder: 4
order: 3
code: 10
tag: Integration
summary: 一个可用的 Agent，不是功能堆砌，而是让每一层能力都各司其职。
toolCount: 5
---

到这里，我们已经逐个写过 Agent 的核心能力：

- Agent Loop
- Tool Calling
- ReAct
- Plan-and-Execute
- Context Engineering
- RAG
- MCP
- Skill

最后一章不再引入新概念。

我们要做的是把这些能力按任务需要组装起来，写一个真正能产生副作用的 Agent：

> 一个用 TypeScript 写出来的受限 code agent。用户让它创建 React TodoList 应用，它会创建项目、写业务代码、安装依赖、构建验证，并启动开发服务器。

这一章对应的代码在 [code-agent.ts](https://github.com/leondt1/ai-agent-tutorial/blob/main/examples/10-build-an-agent/code-agent.ts)。

运行命令是：

```bash
pnpm example examples/10-build-an-agent/code-agent.ts
```

默认任务是：

```txt
创建一个 React TodoList 应用，能添加、完成和删除任务，并自动安装依赖、构建验证和启动项目。
```

你也可以传入自己的任务：

```bash
pnpm example examples/10-build-an-agent/code-agent.ts "创建一个 React TodoList 应用"
```

运行后，示例会把应用生成在：

```txt
examples/10-build-an-agent/generated/todo-app/
```

## 不做概念打卡

一个常见误区是：最后一章必须把前面所有技术都用一遍。

但真正可用的 Agent 不是概念堆叠。

它应该按任务选择能力。

这个 code agent 会用到：

- `Loop / Tool Calling`：模型请求工具，runtime 执行工具，再把 observation 写回上下文。
- `ReAct`：命令输出或构建错误会改变下一步动作。
- `Planning`：模型需要按 scaffold、inspect、edit、install、build、run 的顺序推进。
- `Context Engineering`：只把目录结构、关键文件和命令输出放进上下文，而不是把整个项目塞给模型。
- `Skill`：React/Vite 小应用的开发经验从系统提示词里拿出来，放进可维护的 Skill 文件。

它不会强行使用：

- `RAG`：当前任务不需要检索外部知识库。
- `MCP`：当前工具都直接运行在本地 runtime 里，不需要通过协议接入外部 server。

这也是终章最重要的工程判断之一：

> Agent 系统不是把所有能力都打开，而是让每一层能力在需要它的地方出现。

## 这次要组装什么

这一章的 Agent 由四层组成：

```txt
User Goal
  ↓
Model
  ↓
Tool Calls
  ↓
Runtime Boundary
  ↓
真实文件系统和 pnpm 命令
```

再展开一点：

```txt
用户目标
  ↓
激活 react-vite-app Skill
  ↓
调用 pnpm create vite 创建项目
  ↓
读取项目结构和关键文件
  ↓
写入 TodoList 业务代码
  ↓
安装依赖并构建
  ↓
如果失败，读取错误并修复
  ↓
启动 dev server
```

注意这里有一个很重要的边界：

> 模型不直接拥有 shell，也不直接拥有文件系统。

模型只能请求工具。

工具是否真的执行，由 TypeScript runtime 判断。

## 为什么用 Skill

第 09 章说过，Skill 适合沉淀一类重复任务的执行经验。

创建 React 小应用就是一个典型例子。

每次做这类任务时，Agent 都应该记住一些稳定经验：

- 用 Vite React TypeScript 模板创建项目
- scaffold 后先看目录结构
- 主要业务代码放在 `src/App.tsx`
- 应用样式放在 `src/App.css`
- 写完后运行 `pnpm build`
- 构建失败时根据错误修复
- 最后启动开发服务器

这些规则不应该长期塞在全局系统提示词里。

所以本章新增一个 Skill：

```txt
examples/10-build-an-agent/skills/react-vite-app/SKILL.md
```

它的 frontmatter 是：

```md
---
name: react-vite-app
description: Use this skill when building or modifying a small React app with Vite and TypeScript.
---
```

启动时，Agent 只看到 Skill catalog：

```txt
- react-vite-app: Use this skill when building or modifying a small React app with Vite and TypeScript.
```

当用户任务明显匹配这个描述时，模型先调用 `activateSkill`。

这一步之后，完整 `SKILL.md` 才进入上下文。

这就是第 09 章讲过的 progressive disclosure：

```txt
先看摘要
  ↓
需要时激活
  ↓
再读取完整说明
```

## 为什么不用 MCP

这一章不使用 MCP。

不是因为 MCP 不重要，而是因为当前任务不需要它。

MCP 解决的是：

> 外部工具、资源、提示模板，如何用标准协议暴露给 Agent？

本章的工具都在本地 TypeScript runtime 里：

- 读文件
- 写文件
- 列目录
- 运行少数 pnpm 命令
- 激活本地 Skill

这些能力没有跨进程、跨应用、跨服务的接入问题。

如果强行套一层 MCP，读者会多看一层协议细节，却看不清 code agent 的核心边界。

所以这里直接实现本地工具。

等你真的要接入 GitHub、浏览器、数据库、设计工具或远程执行环境时，再考虑把这些能力放到 MCP server 后面。

## 受限工具，而不是通用 shell

code agent 最大的风险来自副作用。

它会写文件，也会运行命令。

所以本章刻意不提供通用的 `runShell(command)`。

我们只提供一个受限的 `runCommand` 工具。

模型可以请求运行命令，但 runtime 只接受白名单：

```txt
cwd=workspace: pnpm create vite@latest todo-app --template react-ts
cwd=app:       pnpm install
cwd=app:       pnpm build
cwd=app:       pnpm dev --host 127.0.0.1
```

这里的 `workspace` 指：

```txt
examples/10-build-an-agent/generated/
```

这里的 `app` 指：

```txt
examples/10-build-an-agent/generated/todo-app/
```

这个教程仓库本身是一个 pnpm workspace。

所以当模型请求 `pnpm install` 时，runtime 实际执行的是：

```txt
pnpm install --ignore-workspace
```

这样生成的 Vite 应用会按独立项目安装依赖，而不是触发父级 workspace 的安装逻辑。

代码里不是把模型给出的字符串直接交给 shell。

它会先匹配命令：

```ts
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

  // 其他白名单命令...
}
```

真正执行时，用的是 `spawn("pnpm", args)`，不是任意 shell 字符串。

这个设计让示例保持真实：

- `pnpm create vite` 真的会创建项目
- `pnpm install` 真的会安装依赖
- `pnpm build` 真的会验证代码
- `pnpm dev` 真的会启动项目

同时也保持可解释：

- 模型只能请求动作
- runtime 检查动作是否合法
- observation 再回到模型上下文

这就是 code agent 的最小安全边界。

## 文件工具也要有边界

命令需要边界，文件系统也一样。

本章的文件工具只能访问：

```txt
examples/10-build-an-agent/generated/todo-app/
```

`readFile`、`writeFile` 和 `listFiles` 都会通过 `resolveInside` 检查路径：

```ts
function resolveInside(baseDirectory: string, inputPath: string) {
  const resolvedPath = path.resolve(baseDirectory, inputPath);
  const relativePath = path.relative(baseDirectory, resolvedPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`路径越界：${inputPath}`);
  }

  return resolvedPath;
}
```

这样模型即使请求读取 `../../package.json`，工具也会拒绝。

这不是为了让示例复杂。

这是为了让读者看到：只要 Agent 能产生真实副作用，runtime 就必须负责边界。

## 工具层长什么样

本章使用五个工具：

| 工具 | 作用 |
| --- | --- |
| `activateSkill` | 读取完整 Skill 指令 |
| `runCommand` | 运行白名单里的 pnpm 命令 |
| `listFiles` | 查看生成项目的目录结构 |
| `readFile` | 读取生成项目里的文件 |
| `writeFile` | 写入生成项目里的文件 |

它们都返回同一种结果：

```ts
type ToolResult = {
  ok: boolean;
  summary: string;
  content: string;
};
```

`summary` 用来给日志看。

`content` 用来给模型继续决策。

例如 `pnpm build` 成功时，observation 会告诉模型构建通过。

如果失败，`content` 会包含构建错误。

模型下一轮就应该读取或重写相关文件，再次运行 `pnpm build`。

## 主循环

终章的主循环和前面章节是一脉相承的。

模型请求工具：

```ts
const response = await client.chat.completions.create({
  model,
  messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  tools: registry.chatTools,
});
```

runtime 执行工具：

```ts
const result = await registry.run(call);
```

再把结果写回消息历史：

```ts
messages.push({
  role: "tool",
  tool_call_id: call.id,
  content: JSON.stringify(result),
});
```

循环继续，直到模型不再请求工具，而是给出最终回答。

这就是从第 02 章到第 10 章一直在累积的核心结构：

```txt
State
  ↓
Model
  ↓
Action
  ↓
Observation
  ↓
State
```

只不过这一章的 action 终于变成了真实工程动作。

## 系统提示词的职责

本章的系统提示词不负责写具体业务代码。

它负责告诉模型当前 runtime 的边界和任务顺序：

```txt
如果用户任务匹配 available skills，请先调用 activateSkill。
创建项目时必须调用 runCommand。
业务代码应写在 generated/todo-app 内。
修改后必须运行 pnpm install 和 pnpm build。
如果 build 失败，请根据 observation 修复相关文件。
构建通过后，调用 pnpm dev --host 127.0.0.1 启动项目。
完成后说明生成目录、验证结果和访问地址。
```

这里可以看到 Skill 和系统提示词的分工：

- 系统提示词讲 runtime 边界
- Skill 讲 React/Vite 任务经验
- 工具 schema 讲可调用动作
- observation 讲真实世界刚刚发生了什么

这四类上下文不要混在一起。

分清边界，Agent 才容易调试和扩展。

## 一次运行会发生什么

理想情况下，运行 transcript 会像这样：

```txt
[available skills]
- react-vite-app: Use this skill when building or modifying a small React app with Vite and TypeScript.

[user task]
创建一个 React TodoList 应用...

[tool call 1] activateSkill
{"name":"react-vite-app"}

[observation]
已激活 Skill：react-vite-app

[tool call 2] runCommand
{"cwd":"workspace","command":"pnpm create vite@latest todo-app --template react-ts"}

[observation]
命令执行成功：pnpm create vite@latest todo-app --template react-ts

[tool call 3] listFiles
{"path":"."}

[tool call 4] readFile
{"path":"src/App.tsx"}

[tool call 5] writeFile
{"path":"src/App.tsx","content":"..."}

[tool call 6] writeFile
{"path":"src/App.css","content":"..."}

[tool call 7] runCommand
{"cwd":"app","command":"pnpm install"}

[tool call 8] runCommand
{"cwd":"app","command":"pnpm build"}

[tool call 9] runCommand
{"cwd":"app","command":"pnpm dev --host 127.0.0.1"}
```

如果构建失败，中间会多出几轮：

```txt
build error
  ↓
readFile
  ↓
writeFile
  ↓
pnpm build
```

这就是 ReAct 在 code agent 里的实际用途：

> observation 不是展示给人看的日志，而是下一步动作的依据。

## 这个 Agent 已经“真正可用”了吗

它已经具备一个 code agent 的最小闭环：

- 能理解用户目标
- 能选择任务 Skill
- 能创建真实项目
- 能读写真实文件
- 能运行真实命令
- 能根据构建反馈继续修正
- 能启动生成的应用

但它仍然是一个受限示例，不是通用编程助手。

它只适合演示小型 React/Vite 应用创建。

如果要扩展成更通用的 code agent，可以继续加入：

- 更细的命令权限模型
- 文件 diff 工具，而不是每次整文件写入
- 测试运行和浏览器截图验证
- Git checkpoint
- 更丰富的前端 Skill
- 通过 MCP 接入浏览器、GitHub 或远程执行环境

这些都可以往后加。

但终章先停在这里是有意的。

读者应该先看清楚最小可用系统的形状，再考虑更大的工程化。

## 回顾整套教程

现在再回头看前面章节，每一章都变成了这个 code agent 的一部分：

| 章节 | 在终章里的位置 |
| --- | --- |
| 最小 Agent Loop | 主循环的状态流转 |
| Tool Calling | 模型请求文件和命令工具 |
| ReAct | 根据 observation 决定下一步 |
| Plan-and-Execute | 按 scaffold、edit、build、run 推进 |
| Context Engineering | 只放入当前需要的 Skill、文件和命令输出 |
| RAG | 当前任务不需要，所以不使用 |
| MCP | 当前任务不需要协议接入，所以不使用 |
| Skill | 激活 React/Vite 开发经验 |

这就是一个实用 Agent 系统最重要的原则：

> 能力不是越多越好。边界清楚、反馈真实、每一步都能被观察和修正，才是 Agent 变得可用的开始。
