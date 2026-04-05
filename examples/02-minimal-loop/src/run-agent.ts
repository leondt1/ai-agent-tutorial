import { callModel } from "./call-model.js";
import type { AgentState, ToolCall, ToolResult } from "./types.js";
import { tools } from "./tools/search-docs.js";

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

export async function runAgent(userInput: string) {
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
