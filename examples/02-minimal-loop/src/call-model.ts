import type { Message, ModelDecision } from "./types.js";

export async function callModel(messages: Message[]): Promise<ModelDecision> {
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
