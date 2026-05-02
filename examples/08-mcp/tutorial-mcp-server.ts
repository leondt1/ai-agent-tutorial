import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const chapters: Record<string, { title: string; summary: string }> = {
  "03": {
    title: "Tool Calling，给 Agent 行动力",
    summary:
      "Tool Calling 让模型在需要外部动作时发出结构化调用请求，系统执行工具后再把观察结果写回上下文。",
  },
  "07": {
    title: "RAG，给 Agent 补充外部知识",
    summary:
      "RAG 在回答前检索外部知识片段，把相关资料带着来源注入上下文，让模型基于资料回答。",
  },
  "08": {
    title: "MCP，用标准协议接入工具与资源",
    summary:
      "MCP 让外部工具、资源和提示模板可以通过标准协议暴露给 Agent，而不是每接一个系统都重写一套适配逻辑。",
  },
};

const chapter08Resource = `## MCP 在本教程里的位置

Tool Calling 解决模型如何请求动作。
RAG 解决外部知识如何被检索并放进上下文。
MCP 解决外部工具和资源如何被标准化暴露给 Agent。

本章的最小示例使用 stdio transport：client 启动一个本地 MCP server 进程，然后通过 MCP 协议列出能力、调用 tool、读取 resource。
`;

// 1. Create a server that exposes tutorial-specific capabilities.
const server = new McpServer({
  name: "tutorial-mcp-server",
  version: "0.1.0",
});

// 2. Register a tool: a callable action with structured input.
server.registerTool(
  "getChapterSummary",
  {
    title: "Get chapter summary",
    description: "Return a short summary for one tutorial chapter.",
    inputSchema: {
      code: z.string().describe("Chapter code, for example 03, 07, or 08."),
    },
  },
  ({ code }) => {
    const chapter = chapters[code];

    if (!chapter) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `No chapter found for code ${code}.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `${chapter.title}\n\n${chapter.summary}`,
        },
      ],
    };
  },
);

// 3. Register a resource: readable context with a stable URI.
server.registerResource(
  "chapter-08-note",
  "tutorial://chapters/08",
  {
    title: "Chapter 08 note",
    description: "A short note about how MCP fits into the tutorial.",
    mimeType: "text/markdown",
  },
  (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "text/markdown",
        text: chapter08Resource,
      },
    ],
  }),
);

// 4. Register a prompt: a reusable task template that points to the tool and resource.
server.registerPrompt(
  "explainChapterWithMcp",
  {
    title: "Explain a chapter with MCP",
    description: "Create a task prompt that combines the chapter summary tool and chapter resource.",
    argsSchema: {
      code: z.string().describe("Chapter code, for example 08."),
      resourceUri: z.string().describe("Resource URI to read for extra context."),
    },
  },
  ({ code, resourceUri }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            `请解释第 ${code} 章在教程中的作用。`,
            "",
            "请按这个顺序组织上下文：",
            `1. 调用 getChapterSummary tool，参数为 { "code": "${code}" }，拿到章节摘要。`,
            `2. 读取 ${resourceUri} resource，拿到补充说明。`,
            "3. 综合 tool 结果和 resource 内容，用三句话解释这一章为什么需要 MCP。",
          ].join("\n"),
        },
      },
    ],
  }),
);

async function main() {
  // 5. Listen over stdio. Do not print normal logs to stdout in a stdio MCP server.
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
