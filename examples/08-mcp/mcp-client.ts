import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import chalk from "chalk";

type TextContent = {
  type: string;
  text?: string;
};

function textBlocks(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }

  return (content as TextContent[])
    .filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n");
}

function section(title: string) {
  console.log(chalk.bold.cyan(`\n[${title}]`));
}

const repositoryRoot = process.cwd();
const serverPath = path.join(
  repositoryRoot,
  "examples/08-mcp/tutorial-mcp-server.ts",
);

// 1. Create an MCP client. This is the object an Agent host would keep.
const client = new Client({
  name: "tutorial-mcp-client",
  version: "0.1.0",
});

// 2. Start the tutorial MCP server as a local stdio process.
const transport = new StdioClientTransport({
  command: "pnpm",
  args: ["exec", "tsx", serverPath],
  cwd: repositoryRoot,
  stderr: "pipe",
});

transport.stderr?.on("data", (chunk) => {
  console.error(chalk.gray(String(chunk)));
});

async function main() {
  try {
    await client.connect(transport);

    section("server");
    console.log(client.getServerVersion());

    // 3. Discover the capabilities exposed by the server.
    section("tools");
    const tools = await client.listTools();
    for (const tool of tools.tools) {
      console.log(`- ${tool.name}: ${tool.description}`);
    }

    section("resources");
    const resources = await client.listResources();
    for (const resource of resources.resources) {
      console.log(`- ${resource.uri}: ${resource.description}`);
    }

    section("prompts");
    const prompts = await client.listPrompts();
    for (const prompt of prompts.prompts) {
      console.log(`- ${prompt.name}: ${prompt.description}`);
    }

    // 4. Call a tool exposed by the MCP server.
    section("call tool");
    const toolResult = await client.callTool({
      name: "getChapterSummary",
      arguments: {
        code: "08",
      },
    });
    console.log(textBlocks(toolResult.content));

    // 5. Read a resource exposed by the MCP server.
    section("read resource");
    const resourceResult = await client.readResource({
      uri: "tutorial://chapters/08",
    });
    for (const item of resourceResult.contents) {
      if ("text" in item) {
        console.log(chalk.gray(item.uri));
        console.log(item.text);
      }
    }

    // 6. Get a prompt template exposed by the MCP server.
    section("get prompt");
    const promptResult = await client.getPrompt({
      name: "explainChapterWithMcp",
      arguments: {
        code: "08",
        resourceUri: "tutorial://chapters/08",
      },
    });

    for (const message of promptResult.messages) {
      if (message.content.type === "text") {
        console.log(`${message.role}: ${message.content.text}`);
      }
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
