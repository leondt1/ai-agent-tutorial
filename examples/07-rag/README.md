# 07 - RAG

本目录对应教程第 07 章《RAG，给 Agent 补充外部知识》。

运行示例：

```bash
pnpm example examples/07-rag/rag-agent.ts
```

也可以传入自己的问题：

```bash
pnpm example examples/07-rag/rag-agent.ts "为什么 RAG 不等于把整篇文档塞进 prompt？"
```

这个示例使用：

- `knowledge-base.md`：一份很小的外部知识库
- `rag-agent.ts`：从上到下展示最小 RAG 闭环

阅读 `rag-agent.ts` 时，可以按注释顺序看：

1. 加载外部知识库
2. 按 Markdown 二级标题切块
3. 用 embedding 模型把 chunk 转成向量
4. 把用户问题转成向量并做 top-k 检索
5. 把检索结果注入 Agent 上下文
6. 要求模型只基于检索结果回答

本章故意不引入 LangChain、LlamaIndex 或向量数据库。
这些工具在生产系统里很有价值，但入门阶段先手写最小链路，更容易看清 RAG 在 Agent 中的位置。
