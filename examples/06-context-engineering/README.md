# 06 - Context Engineering

本目录对应教程第 06 章《Context Engineering，决定 Agent 的上限》。

本章的示例代码：

- `build-context.ts`：一个最小上下文构建器，展示如何把 Agent 状态分层组织成模型可用的上下文。

运行命令：

```bash
pnpm example examples/06-context-engineering/build-context.ts
```

这个示例不调用模型，而是直接打印两份上下文：

- `Naive Context`：把完整历史、完整计划和所有 observation 直接塞进去。
- `Engineered Context`：按 system、task、state、history、observations 分层，只保留当前任务需要的信息。

这个示例刻意保持在单文件内，方便读者从上到下看清：

- Agent 状态如何拆成 `goal`、`plan`、`history` 和 `observations`
- 为什么直接堆叠所有信息会让上下文变乱
- `buildContext()` 如何按层组织信息
- 历史消息如何用滑动窗口裁剪
- observation 如何根据当前步骤筛选
