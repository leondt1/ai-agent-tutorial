# 10 - Build a Code Agent

本目录对应教程第 10 章《组装一个真正可用的 Code Agent》。

这一章会组装一个受限的 code agent。用户给出一句需求：

```txt
创建一个 React TodoList 应用，能添加、完成和删除任务，并自动安装依赖、构建验证和启动项目。
```

Agent 会：

1. 激活 `react-vite-app` Skill
2. 调用 `pnpm create vite@latest todo-app --template react-ts` 创建项目
3. 读取生成后的项目结构
4. 写入 TodoList 业务代码
5. 运行 `pnpm install`
6. 运行 `pnpm build`
7. 构建通过后启动 `pnpm dev --host 127.0.0.1`

## 文件结构

```txt
examples/10-build-an-agent/
├── code-agent.ts
├── README.md
└── skills/
    └── react-vite-app/
        └── SKILL.md
```

运行后会生成：

```txt
examples/10-build-an-agent/generated/todo-app/
```

## 运行方式

先在项目根目录准备 `.env.local`：

```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5-mini
```

然后运行：

```bash
pnpm example examples/10-build-an-agent/code-agent.ts
```

也可以传入自己的任务：

```bash
pnpm example examples/10-build-an-agent/code-agent.ts "创建一个 React TodoList 应用"
```

## 这个示例刻意做了哪些限制

- 文件工具只能读写 `generated/todo-app`。
- 命令工具不是通用 shell，只允许少数白名单命令。
- 因为教程仓库本身是 pnpm workspace，runtime 会把 `pnpm install` 映射成 `pnpm install --ignore-workspace`。
- Skill 只提供 React/Vite 小应用的工作流经验，不负责执行动作。
- 本章不强行使用 MCP，因为这些工具直接运行在本地 runtime 里，不需要额外协议层。
