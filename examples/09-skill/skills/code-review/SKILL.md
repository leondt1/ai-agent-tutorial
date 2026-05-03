---
name: code-review
description: Use this skill when reviewing TypeScript code changes for correctness, regressions, missing tests, risky edge cases, or pull request feedback.
---

# Code Review Skill

Use this skill when the user asks for a code review, patch review, pull request review, or risk check.

## Workflow

1. Read the changed code before judging it.
2. Focus on bugs, regressions, missing tests, data loss, security risks, and edge cases.
3. Prefer concrete findings over general advice.
4. For each finding, include the file path, the relevant line if available, and why the behavior can fail.
5. If no issues are found, say that clearly and mention any remaining test gap.

## Output Format

Put findings first.

Use this order:

1. Findings
2. Open questions or assumptions
3. Brief summary

Do not lead with praise. Do not spend space on style-only suggestions unless they hide a real risk.
