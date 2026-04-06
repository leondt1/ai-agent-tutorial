type Message =
  | {
      role: "system" | "user" | "assistant";
      content: string;
    }
  | {
      role: "tool";
      toolName: string;
      content: string;
    };

type ToolCall = {
  name: string;
  input: Record<string, unknown>;
};

type ToolResult = {
  ok: boolean;
  content: string;
};

type AssistantMessage = {
  role: "assistant";
  content: string;
};

type ModelDecision =
  | {
      type: "final";
      message: AssistantMessage;
    }
  | {
      type: "tool";
      message: AssistantMessage;
      toolCall: ToolCall;
    };

type AgentState = {
  step: number;
  maxSteps: number;
  messages: Message[];
};

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

const searchDocsTool: Tool = {
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

const tools = {
  [searchDocsTool.name]: searchDocsTool,
};

async function callModel(messages: Message[]): Promise<ModelDecision> {
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage) {
    return {
      type: "final",
      message: {
        role: "assistant",
        content: "当前没有可处理的消息。",
      },
    };
  }

  if (lastMessage.role === "user") {
    return {
      type: "tool",
      message: {
        role: "assistant",
        content: "我先去文档里查一下安装步骤。",
      },
      toolCall: {
        name: "searchDocs",
        input: {
          query: lastMessage.content,
        },
      },
    };
  }

  if (lastMessage.role === "tool") {
    return {
      type: "final",
      message: {
        role: "assistant",
        content: `我查到的结果是：\n${lastMessage.content}`,
      },
    };
  }

  return {
    type: "final",
    message: {
      role: "assistant",
      content: "我现在还无法继续这个请求。",
    },
  };
}

async function runTool(toolCall: ToolCall): Promise<ToolResult> {
  const tool = tools[toolCall.name as keyof typeof tools];

  if (!tool) {
    return {
      ok: false,
      content: `未知工具：${toolCall.name}`,
    };
  }

  return tool.execute(toolCall.input);
}

async function runAgent(userInput: string) {
  const state: AgentState = {
    step: 0,
    maxSteps: 4,
    messages: [
      {
        role: "system",
        content: "你是一个会在需要时查文档的工程助手。",
      },
      {
        role: "user",
        content: userInput,
      },
    ],
  };

  while (state.step < state.maxSteps) {
    state.step += 1;

    const decision = await callModel(state.messages);

    console.log(`\n[step ${state.step}] model decision: ${decision.type}`);
    console.log(decision.message.content);

    state.messages.push(decision.message);

    if (decision.type === "final") {
      return {
        answer: decision.message.content,
        state,
      };
    }

    console.log(`[step ${state.step}] run tool: ${decision.toolCall.name}`);
    console.log(decision.toolCall.input);

    const result = await runTool(decision.toolCall);

    console.log(`[step ${state.step}] tool result:`);
    console.log(result.content);

    state.messages.push({
      role: "tool",
      toolName: decision.toolCall.name,
      content: result.content,
    });
  }

  throw new Error(`Agent stopped after ${state.maxSteps} steps.`);
}

async function main() {
  const userInput = process.argv.slice(2).join(" ").trim() || "这个项目怎么安装？";
  const result = await runAgent(userInput);

  console.log("\nFinal answer:");
  console.log(result.answer);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
