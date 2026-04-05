import type { ToolResult } from "../types.js";

type Tool = {
  name: string;
  description: string;
  execute(input: Record<string, unknown>): Promise<ToolResult>;
};

const docs = [
  {
    id: "install",
    keywords: ["安装", "启动", "pnpm", "dev", "install"],
    text: "安装步骤：先运行 pnpm install，再运行 pnpm dev 启动开发服务器。",
  },
  {
    id: "test",
    keywords: ["测试", "test"],
    text: "测试命令：运行 pnpm test。",
  },
];

export const searchDocsTool: Tool = {
  name: "searchDocs",
  description: "在项目文档里搜索安装、启动和使用说明。",
  async execute(input) {
    const query = String(input.query ?? "").trim().toLowerCase();

    const matches = docs.filter((doc) =>
      doc.keywords.some((keyword) => query.includes(keyword.toLowerCase())),
    );

    if (matches.length === 0) {
      return {
        ok: false,
        content: "没有找到相关文档。",
      };
    }

    return {
      ok: true,
      content: matches.map((doc) => `${doc.id}: ${doc.text}`).join("\n"),
    };
  },
};

export const tools = {
  [searchDocsTool.name]: searchDocsTool,
};
