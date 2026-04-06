# AGENTS.md

This repository is a tutorial project. When editing code or docs here, optimize first for teaching clarity, not framework-style abstraction.

## Core Goal

Help readers understand how an AI agent works by reading the code from top to bottom with as little context switching as possible.

## Working Style

- Prefer tutorial readability over reuse.
- Prefer self-contained examples over shared helper layers.
- Prefer explicit code over clever abstractions.
- Prefer a clear reading path over DRY.
- Allow small, intentional duplication when it makes examples easier to follow.

## Example Code Rules

These rules are especially important for files under `examples/`.

- One example should usually map to one file.
- A reader should be able to open the example file and follow the main flow from top to bottom.
- Do not extract helpers just to avoid repetition if that forces readers to jump between files.
- Do not introduce registries, runtimes, wrappers, or utility layers before the tutorial actually needs them.
- Keep defensive engineering to the minimum needed for the lesson.
- Avoid over-abstracting setup code if the abstraction is not itself part of the lesson.
- If a chapter is teaching a minimal concept, keep the example intentionally narrow and a little "hard-coded".

## Chapter Progression Rules

- Early chapters should show the smallest working version of an idea.
- Later chapters can introduce better design, better tools, and more abstraction step by step.
- Do not introduce concepts from later chapters too early.
- When in doubt, choose the version that makes the current chapter's teaching goal clearest.

## Tool Calling Examples

For tool-calling examples:

- First show the minimal closed loop: model asks for a tool, the system runs it, the result goes back to the model.
- Only after that should the code introduce ideas like better tool schemas, validation, registry patterns, or reusable execution structure.
- In early examples, it is acceptable to write the interaction flow directly instead of building a general agent loop.

## Documentation Sync

When changing tutorial example structure or teaching flow:

- Update the relevant `examples/*/README.md`.
- Update the related files under `content/tutorials/`.
- Make sure code snippets, file paths, and explanations still match the repository.

## Editing Heuristics

Before finalizing a change, check:

- Does the reader need to jump across many files to understand one example?
- Did I extract code mainly for engineering neatness rather than teaching value?
- Did I add infrastructure earlier than the tutorial actually needs?
- Is the main teaching idea visible in the example without extra explanation?

## Default Bias

If there is a tradeoff:

- choose clarity over reuse
- choose explicitness over abstraction
- choose self-contained examples over shared utilities
- choose the current lesson over future extensibility
