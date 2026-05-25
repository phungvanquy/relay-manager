## Why

The project has zero automated tests, no linting or formatting enforcement, and no CI pipeline. Every change relies entirely on manual verification (`npm run build`, `go build`). As the codebase grows, this makes regressions invisible until production and makes onboarding new contributors risky. Adding quality tooling now — while the codebase is small (~32 TS files, ~6 Go files) — is cheap and prevents compounding tech debt.

## What Changes

- Add ESLint + Prettier to the dashboard with a `lint` and `format` script
- Add `go vet` / `golangci-lint` target to the agent Makefile
- Add unit tests for critical dashboard logic (rule mutations, auth, sync protocol)
- Add Go tests for the agent's iptables manager and WebSocket client reconnect logic
- Add a GitHub Actions CI workflow that runs lint + typecheck + tests on push/PR
- Add a `make check` target at the root that runs all quality gates locally

## Capabilities

### New Capabilities
- `ci-pipeline`: GitHub Actions workflow running lint, typecheck, and tests for both dashboard and agent on push/PR
- `dashboard-testing`: Vitest setup with unit tests for rule-mutations, auth utilities, and WebSocket push logic
- `agent-testing`: Go test files for iptables manager (mock exec), config persistence, and client reconnect
- `linting-and-formatting`: ESLint + Prettier config for dashboard; golangci-lint for agent

### Modified Capabilities

## Impact

- **Dashboard**: New devDependencies (vitest, eslint, prettier). New scripts in package.json. Possible minor code adjustments to satisfy stricter lint rules.
- **Agent**: New Makefile targets (`test`, `lint`). Requires `golangci-lint` binary (CI installs it; local is optional).
- **Root**: New `Makefile` targets (`check`, `ci`). New `.github/workflows/ci.yml`.
- **No runtime behavior changes** — this is purely developer tooling and CI infrastructure.
