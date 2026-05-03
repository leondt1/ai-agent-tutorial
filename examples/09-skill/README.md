# 09 - Skill

本目录对应教程第 09 章《Skill，把重复任务沉淀成能力单元》。

这一章展示一个最小 Skill 闭环：

1. 启动时扫描 `skills/*/SKILL.md`
2. 只把每个 Skill 的 `name` 和 `description` 放进上下文
3. 让模型判断当前任务是否需要激活某个 Skill
4. 当模型调用 `activateSkill` 时，再读取完整 `SKILL.md`
5. 带着 Skill 说明生成最终回答

运行示例：

```bash
pnpm example examples/09-skill/skill-agent.ts
```

默认任务会要求 Agent review 一段内嵌的 TypeScript patch。
这样可以看到模型先激活 `code-review` Skill，再按 Skill 对具体代码给出 findings。

也可以传入自己的任务：

```bash
pnpm example examples/09-skill/skill-agent.ts "把 Skill 和 Tool 的区别整理成一份技术调研 brief"
```

示例文件：

- `skill-agent.ts`：最小 Skill 加载与激活流程
- `skills/code-review/SKILL.md`：代码审查 Skill
- `skills/research-brief/SKILL.md`：技术调研 Skill
- `skills/research-brief/references/report-template.md`：按需读取的长参考资料

这个示例需要 `.env.local` 里有可用的 `OPENAI_API_KEY`。
如果你使用自定义兼容服务，也可以配置 `OPENAI_BASE_URL`。

默认使用：

```txt
OPENAI_MODEL=gpt-5-mini
```
