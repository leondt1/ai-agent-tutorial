# 08 - MCP

本目录对应教程第 08 章《MCP，用标准协议接入工具与资源》。

这一章先不调用模型，而是单独跑通 MCP 的最小接入闭环：

1. `tutorial-mcp-server.ts` 暴露一个 MCP Server
2. `mcp-client.ts` 启动并连接这个 Server
3. Client 列出 tools、resources、prompts
4. Client 调用一个 tool
5. Client 读取一个 resource
6. Client 获取一个 prompt

运行：

```bash
pnpm example examples/08-mcp/mcp-client.ts
```

这个示例不需要 `OPENAI_API_KEY`。

文件说明：

- `tutorial-mcp-server.ts`：注册 `getChapterSummary` tool、`tutorial://chapters/08` resource 和 `explainChapterWithMcp` prompt
- `mcp-client.ts`：用 stdio transport 启动 server，并演示 MCP Client 的发现与调用流程

注意：stdio MCP Server 的 stdout 是协议通信通道，不要在 server 里随意 `console.log`。如果需要调试，请写到 stderr。
