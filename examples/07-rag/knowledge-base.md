# TypeScript Agent Assistant Knowledge Base

这份知识库模拟一个项目内部文档。第 07 章会把它当作模型参数之外的外部知识来源。

## Context Engineering

Context Engineering 负责决定模型每一轮应该看到什么信息。它会把系统规则、用户目标、当前状态、历史消息、工具观察和外部知识组织成清楚的上下文层。

好的上下文不是越长越好，而是要让模型知道当前任务是什么、任务执行到哪一步、回答依据来自哪里，以及哪些旧信息已经不再重要。

## RAG

RAG 是 Retrieval-Augmented Generation 的缩写。它的重点不是让模型永久记住新知识，而是在回答前从外部知识库里检索当前问题需要的片段，再把这些片段作为上下文提供给模型。

在 Agent 里，RAG 通常不是一个独立终点，而是 Context Engineering 的一个知识来源。检索结果需要带上来源、片段内容和相关性信息，然后进入上下文里的 external knowledge 层。

## Chunking

文档切块会直接影响检索质量。如果 chunk 太大，里面会混入很多和问题无关的内容；如果 chunk 太小，模型可能看不到完整语义。

一个适合入门示例的做法是按 Markdown 二级标题切块。这样每个 chunk 通常对应一个完整主题，既比整篇文档更聚焦，也比单句切分更容易保留上下文。

## Embedding Retrieval

Embedding 会把文本转换成向量。查询和文档片段都转换成向量后，可以用 cosine similarity 计算它们的相似度。

最小 RAG 可以只做 top-k retrieval：把所有 chunk 按相似度排序，取最相关的几个片段。真实系统还可能继续加入 reranking、权限过滤、增量索引和向量数据库。

## Grounded Answering

RAG 检索到片段以后，Agent 不应该直接把它们当作最终答案。系统需要把片段注入上下文，并要求模型只根据给定资料回答。

回答中最好带上来源引用。引用不是装饰，它让用户和系统都能检查结论是否真的来自检索结果。

## When To Use A RAG Framework

LangChain、LlamaIndex 和向量数据库适合生产系统，尤其是文档多、更新频繁、需要权限过滤或复杂检索策略的时候。

但在教学和早期原型里，先手写一个最小 RAG 链路更容易理解。读者应该先看清楚文档切块、embedding、相似度排序、top-k 检索和上下文注入分别在做什么，再决定要不要换成框架。
