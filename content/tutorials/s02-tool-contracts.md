---
title: 工具接口设计
description: 好的工具契约会直接决定 agent 是否稳定、是否容易扩展。
section: execution
sectionTitle: 工具与执行
sectionColor: "#4f7cff"
sectionOrder: 1
order: 2
code: s02
tag: 工具与执行
quote: 工具接口越清晰，模型越容易做对。
toolCount: 3
---

工具不是“给模型一段任意代码”，而是给模型一个可预测的动作接口。

## 好工具的三个特征

### 1. 参数尽量结构化

模型更擅长生成结构化输入，而不是自由格式字符串。

```json
{
  "cmd": "rg --files src",
  "workdir": "/workspace/project"
}
```

### 2. 返回值可读

工具结果要服务下一轮推理，所以返回值不应该只有“成功”或“失败”，而应该带上关键上下文，例如摘要、路径、错误信息。

### 3. 错误要可恢复

如果工具失败，最好能让模型知道：

- 失败原因是什么
- 是否可以重试
- 推荐的修复方向是什么

## 设计提醒

不要把多个职责塞进同一个工具里。与其做一个无所不能的 `project_manager`，不如拆成 `search_files`、`read_file`、`run_tests` 这类边界清晰的小工具。
