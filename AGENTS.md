<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Management

This project uses [Kan](https://github.com/amterp/kan), a file-based
kanban board. Data lives in `.kan/`. Use the `kan` CLI to interact with
the board - keep it up to date as you work. When starting a task, move
its card to `in-progress`. When done, move it to `done`. If you create
new work items, add cards. Run `kan --help` or `kan <command> --help`
for usage.
