export type Message =
  | {
      role: "system" | "user" | "assistant";
      content: string;
    }
  | {
      role: "tool";
      toolName: string;
      content: string;
    };

export type ToolCall = {
  name: string;
  input: Record<string, unknown>;
};

export type ToolResult = {
  ok: boolean;
  content: string;
};

export type AssistantMessage = {
  role: "assistant";
  content: string;
};

export type ModelDecision =
  | {
      type: "final";
      message: AssistantMessage;
    }
  | {
      type: "tool";
      message: AssistantMessage;
      toolCall: ToolCall;
    };

export type AgentState = {
  step: number;
  maxSteps: number;
  messages: Message[];
};
