## 1. Linting & Formatting Setup

- [x] 1.1 Install ESLint with `next/core-web-vitals` preset and TypeScript parser as devDependencies
- [x] 1.2 Create ESLint flat config (`eslint.config.mjs`) in dashboard
- [x] 1.3 Install Prettier and `eslint-config-prettier` as devDependencies
- [x] 1.4 Create `.prettierrc` config in dashboard
- [x] 1.5 Add `lint`, `format`, and `format:check` scripts to dashboard `package.json`
- [x] 1.6 Run `eslint --fix` and `prettier --write` on existing code to establish baseline
- [x] 1.7 Create `.golangci.yml` in agent directory with govet, errcheck, staticcheck, unused
- [x] 1.8 Add `lint` target to agent Makefile (runs `golangci-lint run ./...`)
- [x] 1.9 Run `golangci-lint` on existing agent code and fix any issues

## 2. Dashboard Testing Setup

- [x] 2.1 Install Vitest and related devDependencies (`vitest`, `@vitest/coverage-v8`)
- [x] 2.2 Create `vitest.config.ts` with path alias resolution matching tsconfig
- [x] 2.3 Add `test` and `test:coverage` scripts to dashboard `package.json`
- [x] 2.4 Create test helper for in-memory SQLite database setup (shared across tests)
- [x] 2.5 Write unit tests for `lib/auth.ts` (verifyPassword, createSession, verifySession)
- [x] 2.6 Write unit tests for `lib/sync/rule-mutations.ts` (addRule, updateRule, removeRule, validation, port conflicts)
- [x] 2.7 Write unit tests for `lib/ws/push.ts` (push targets correct group nodes)

## 3. Agent Testing Setup

- [x] 3.1 Add `test` target to agent Makefile (runs `go test ./...`)
- [x] 3.2 Write tests for `internal/iptables/manager.go` (add/remove command generation, full sync)
- [x] 3.3 Write tests for `internal/config/config.go` (save/load round-trip, missing file defaults)
- [x] 3.4 Write tests for `internal/client/client.go` (reconnect behavior, hello message version)

## 4. CI Pipeline

- [x] 4.1 Create `.github/workflows/ci.yml` with push/PR triggers on main
- [x] 4.2 Add dashboard job: install deps, lint, typecheck (`npx tsc --noEmit`), test
- [x] 4.3 Add agent job: install Go, install golangci-lint, lint, test
- [x] 4.4 Configure jobs to run in parallel

## 5. Root Integration

- [x] 5.1 Add `check` target to root Makefile that runs all quality gates sequentially
- [x] 5.2 Run `make check` end-to-end and verify all gates pass
