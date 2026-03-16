---
title: 后台任务
description: 把慢任务移到后台，让交互体验保持流畅，同时保留结果追踪能力。
section: concurrency
sectionTitle: 并发
sectionColor: "#ff9f0a"
sectionOrder: 4
order: 6
code: s06
tag: 并发
quote: 不是所有任务都应该阻塞用户等待。
toolCount: 5
---

像批量抓取、长时间测试、索引构建这类操作，天然适合后台执行。

## 基本模式

1. 前台接收请求并创建任务 ID。
2. 后台工作器异步执行。
3. 前台轮询或订阅任务状态。
4. 完成后展示结果摘要。

## 任务状态建议

```ts
type JobStatus = "queued" | "running" | "succeeded" | "failed";
```

## 设计重点

- 状态要可查询
- 失败要可重试
- 日志要能定位问题

如果后台任务会影响用户的下一步操作，记得在界面上明确展示“正在处理中”和“预计何时可用”。
