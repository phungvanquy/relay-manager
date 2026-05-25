## Context

The relay-manager project has two components: a Next.js dashboard (~32 TypeScript files) and a Go agent (~6 files). Currently there are no automated tests, no linting/formatting enforcement, and no CI pipeline. All verification is manual (`npm run build`, `go build`). The codebase is small enough that adding tooling now is low-effort but high-leverage.

## Goals / Non-Goals

**Goals:**
- Catch regressions automatically before merge
- Enforce consistent code style without manual review effort
- Test critical business logic (rule sync, auth, iptables application)
- Make it easy to run all checks locally with one command

**Non-Goals:**
- E2E/integration tests (WebSocket server ↔ agent communication) — too complex for this phase
- 100% coverage targets — focus on high-value paths only
- Pre-commit hooks — keep it opt-in, CI is the gate

## Decisions

### Vitest for dashboard testing (over Jest)
Vitest is faster, natively supports ESM/TypeScript, and aligns with the Vite ecosystem. Next.js projects increasingly adopt it. Zero-config for the TS setup already in place.

### golangci-lint for Go (over standalone go vet)
Bundles go vet + staticcheck + errcheck + more in one tool. Standard in Go projects. CI can install it via the official GitHub Action.

### ESLint flat config + Prettier (over Biome)
ESLint + Prettier is the established Next.js ecosystem choice. `next/core-web-vitals` preset catches React-specific issues. Biome is newer but less integrated with Next.js tooling.

### GitHub Actions (over other CI)
Project is hosted on GitHub. Native integration, free for public repos, simple YAML config.

### Single `make check` entry point
One command runs everything: lint, typecheck, test (both dashboard and agent). Developers don't need to remember multiple commands.

## Risks / Trade-offs

- [Lint rules may flag existing code] → Run `eslint --fix` as part of the setup task. Accept remaining warnings initially, fix incrementally.
- [golangci-lint may be slow on first run] → Cache the lint results in CI. Locally it's fast for a 6-file project.
- [Vitest mocking for SQLite] → Use in-memory SQLite for test DB rather than mocking Drizzle. Keeps tests realistic without needing a file.
- [CI adds ~2-3 min to PR cycle] → Acceptable for a project of this size. Parallelizing dashboard and agent jobs keeps it fast.
