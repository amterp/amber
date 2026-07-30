@AGENTS.md

# Dev Script

`./dev` is the main dev automation script (Rad). Uses composable flags:

- `-d` / `--dev` - Start Next.js dev server (Webpack, not Turbopack)
- `-b` / `--build` - Production build
- `-l` / `--lint` - ESLint
- `-t` / `--typecheck` - TypeScript type checking
- `-T` / `--test` - Unit tests (vitest)
- `-c` / `--clean` - Remove `.next` and `node_modules`
- `-i` / `--install` - Install npm dependencies
- `-a` / `--all` - Lint + typecheck + test + build

Flags compose: `./dev -lt` lints then type-checks, `./dev -ci` cleans
and reinstalls, `./dev -ld` lints then starts the dev server.

# Tests

Vitest covers `lib/` only, and deliberately: the thread model, comment
HTML handling, and frame policy are pure functions, so they need no DOM
and no React test setup. `vitest.config.mts` runs in a node environment
with no jsdom, which is why `sanitizeHnHtml`'s `DOMParser` branch is
guarded and left untested.

Keep this boundary. Logic worth testing belongs in `lib/` as a pure
function; components stay thin enough to verify by looking at them.
