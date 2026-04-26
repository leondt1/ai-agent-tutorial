# 04 - ReAct

本目录对应教程第 04 章《ReAct，让 Agent 学会边想边做》。

本章的示例代码：

- `react-prompt.md`：一个可复制的 Prompt 对话演示，用来先观察 ReAct 的运行模式。
- `react-agent.ts`：一个真实调用模型的最小 ReAct 执行器，展示模型如何根据每一轮观察继续选择工具。

运行前需要在项目根目录准备 `.env.local`：

```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5-mini
```

运行命令：

```bash
pnpm example examples/04-react/react-agent.ts
```

这个示例刻意保持在单文件内，方便读者从上到下看清：

- 初始目标如何进入状态
- 模型如何选择下一步动作
- 工具结果如何变成 observation
- observation 如何改变下一轮动作
- 最大轮次如何阻止无限循环
