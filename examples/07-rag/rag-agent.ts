import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { config } from "dotenv";
import OpenAI from "openai";

// 1. 读取环境变量，并初始化真实的 OpenAI 客户端。
config({
  path: path.join(process.cwd(), ".env.local"),
  quiet: true,
});

const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
const embeddingModel =
  process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

type DocumentChunk = {
  id: string;
  source: string;
  title: string;
  content: string;
};

type EmbeddedChunk = DocumentChunk & {
  embedding: number[];
};

type RetrievalResult = {
  chunk: DocumentChunk;
  score: number;
};

const knowledgeBasePath = "examples/07-rag/knowledge-base.md";

// 2. 加载一份很小的外部知识库，让示例专注展示 RAG 链路。
async function loadKnowledgeBase(): Promise<string> {
  const absolutePath = path.join(process.cwd(), knowledgeBasePath);

  return fs.readFile(absolutePath, "utf8");
}

// 3. 把 Markdown 按二级标题切成 chunk。
// 这不是最强切块策略，但很适合入门：每个 chunk 都对应一个清楚主题。
function chunkMarkdown(source: string, markdown: string): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const lines = markdown.split(/\r?\n/);
  let currentTitle = "Introduction";
  let currentLines: string[] = [];

  function flushChunk() {
    const content = currentLines.join("\n").trim();

    if (!content) {
      return;
    }

    const id = `chunk-${chunks.length + 1}`;

    chunks.push({
      id,
      source,
      title: currentTitle,
      content,
    });
  }

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);

    if (heading) {
      flushChunk();
      currentTitle = heading[1]?.trim() || "Untitled";
      currentLines = [line];
      continue;
    }

    currentLines.push(line);
  }

  flushChunk();

  return chunks;
}

// 4. 用 embedding 模型把每个 chunk 转成向量。
async function embedChunks(chunks: DocumentChunk[]): Promise<EmbeddedChunk[]> {
  const response = await client.embeddings.create({
    model: embeddingModel,
    input: chunks.map((chunk) => `${chunk.title}\n${chunk.content}`),
  });

  return chunks.map((chunk, index) => ({
    ...chunk,
    embedding: response.data[index]?.embedding ?? [],
  }));
}

// 5. 用户问题也转成向量，再用 cosine similarity 找最相关的 top-k chunk。
async function retrieveRelevantChunks(
  question: string,
  chunks: EmbeddedChunk[],
  topK: number,
): Promise<RetrievalResult[]> {
  const response = await client.embeddings.create({
    model: embeddingModel,
    input: question,
  });

  const queryEmbedding = response.data[0]?.embedding ?? [];

  return chunks
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, topK);
}

function cosineSimilarity(left: number[], right: number[]) {
  if (left.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dotProduct = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;

    dotProduct += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }

  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

// 6. 把检索结果格式化成上下文层，而不是直接让模型“自由发挥”。
function buildRagContext(question: string, results: RetrievalResult[]) {
  const retrievedKnowledge = results
    .map((result, index) => {
      const rank = index + 1;
      const score = result.score.toFixed(3);

      return [
        `[${rank}] source: ${result.chunk.source}#${result.chunk.id}`,
        `title: ${result.chunk.title}`,
        `score: ${score}`,
        result.chunk.content,
      ].join("\n");
    })
    .join("\n\n");

  return [
    "## task",
    question,
    "",
    "## external knowledge",
    retrievedKnowledge,
  ].join("\n");
}

// 7. 最后再调用生成模型。注意：RAG 的检索结果只是上下文，不是最终答案。
async function answerWithRetrievedKnowledge(
  question: string,
  results: RetrievalResult[],
) {
  const context = buildRagContext(question, results);

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "你是一个工程教程助手。只能根据用户提供的 external knowledge 回答；如果资料不足，请说明不知道。回答要简洁，并在关键结论后引用 source。",
      },
      {
        role: "user",
        content: context,
      },
    ],
  });

  return {
    context,
    answer: response.choices[0]?.message?.content ?? "模型没有返回可显示的文本。",
  };
}

function printSection(title: string) {
  console.log(`\n${chalk.bold.cyan(title)}`);
}

function printChunks(chunks: DocumentChunk[]) {
  for (const chunk of chunks) {
    console.log(
      chalk.gray(`${chunk.id}: ${chunk.title} (${chunk.content.length} chars)`),
    );
  }
}

function printRetrievalResults(results: RetrievalResult[]) {
  for (const [index, result] of results.entries()) {
    console.log(
      chalk.yellow(
        `${index + 1}. ${result.chunk.title} score=${result.score.toFixed(3)} source=${result.chunk.source}#${result.chunk.id}`,
      ),
    );
  }
}

// 8. 命令行入口：串起“加载 -> 切块 -> embedding -> 检索 -> 注入上下文 -> 回答”的完整闭环。
async function main() {
  const question =
    process.argv.slice(2).join(" ").trim() ||
    "RAG 和 Context Engineering 是什么关系？什么时候需要引入 RAG 框架？";

  printSection("User Question");
  console.log(chalk.white(question));

  const knowledgeBase = await loadKnowledgeBase();
  const chunks = chunkMarkdown(knowledgeBasePath, knowledgeBase);

  printSection("Chunks");
  printChunks(chunks);

  printSection("Embedding");
  console.log(chalk.gray(`Embedding ${chunks.length} chunks with ${embeddingModel}.`));
  const embeddedChunks = await embedChunks(chunks);

  printSection("Retrieval");
  const results = await retrieveRelevantChunks(question, embeddedChunks, 3);
  printRetrievalResults(results);

  printSection("RAG Context");
  const { context, answer } = await answerWithRetrievedKnowledge(
    question,
    results,
  );
  console.log(chalk.gray(context));

  printSection("Final Answer");
  console.log(chalk.green(answer));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
