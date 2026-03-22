@AGENTS.md

# Dev Script

`./dev` is the main dev automation script (Rad). Uses composable flags:

- `-d` / `--dev` - Start Next.js dev server (Webpack, not Turbopack)
- `-b` / `--build` - Production build
- `-l` / `--lint` - ESLint
- `-t` / `--typecheck` - TypeScript type checking
- `-c` / `--clean` - Remove `.next` and `node_modules`
- `-i` / `--install` - Install npm dependencies
- `-a` / `--all` - Lint + typecheck + build

Flags compose: `./dev -lt` lints then type-checks, `./dev -ci` cleans
and reinstalls, `./dev -ld` lints then starts the dev server.
