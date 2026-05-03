---
name: react-vite-app
description: Use this skill when building or modifying a small React app with Vite and TypeScript.
---

# React Vite App Skill

Use this skill when the user asks you to create or modify a small React app.

## Workflow

1. Create the app with Vite's React TypeScript template.
2. Inspect the generated project structure before editing business code.
3. Put the main UI behavior in `src/App.tsx`.
4. Put app-specific styles in `src/App.css`.
5. Keep the first version small, complete, and easy to read.
6. Run `pnpm install` before building the generated app.
7. Run `pnpm build` after editing.
8. If the build fails, read the error, fix the relevant file, and build again.
9. Start the app with `pnpm dev --host 127.0.0.1`.

## TodoList Requirements

For a TodoList app, include:

- Add a todo
- Toggle completed state
- Delete a todo
- Show an empty state
- Show how many todos are still active
- Keep the UI simple and readable

## Editing Notes

- Prefer one self-contained `App.tsx` for the main example.
- When rewriting `App.tsx`, explicitly import every React hook you use, such as `useState`.
- Use normal React state instead of adding a state management library.
- Do not add routing, persistence, authentication, or backend code unless the user asks for it.
- Prefer clear component code over clever abstractions.
