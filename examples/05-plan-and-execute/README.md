# 05 - Plan and Execute

本目录对应教程第 05 章《Plan-and-Execute，从反应式到规划式》。

本章的示例代码：

- `plan-and-execute-agent.ts`：一个真实调用模型的最小 Plan-and-Execute 执行器，展示计划如何被执行结果持续更新。

运行前需要在项目根目录准备 `.env.local`：

```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5-mini
```

运行命令：

```bash
pnpm example examples/05-plan-and-execute/plan-and-execute-agent.ts
```

这个示例刻意保持在单文件内，方便读者从上到下看清：

- 用户目标如何变成初始计划
- executor 如何只执行当前 pending step
- 工具结果如何变成 observation
- replanner 如何把 observation 写回计划
- evidence 如何支撑最终回答
- 最大轮次如何阻止无限执行
