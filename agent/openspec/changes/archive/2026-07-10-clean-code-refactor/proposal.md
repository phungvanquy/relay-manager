## Why

The codebase has accumulated small clean-code violations that hurt readability and maintainability: the API authentication guard is copy-pasted across nine route files, timing/limit values appear as unexplained magic numbers in multiple places, one Go method uses the pre-1.18 `interface{}` spelling, and the custom server relies on dynamic CommonJS `require()` inside a hot loop. None of these change behavior, but they raise the cost of every future edit and invite drift (e.g., a heartbeat-timeout value changed in one place but not another).

## What Changes

- Extract the repeated `verifySessionFromRequest` → 401 guard into a single reusable `requireSession(req)` helper in `@/lib/auth`, and adopt it in all nine API route files. The 401 response body (`{ error: "Unauthorized" }`) and status code stay byte-for-byte identical.
- Replace `interface{}` with `any` in `agent/internal/client/client.go` (`writeJSON`).
- Introduce named constants for magic numbers, preserving their exact values:
  - Heartbeat timeout `90_000` ms (shared between `server.ts` offline sweep threshold and `ws/server.ts` heartbeat timeout).
  - Offline sweep interval `30_000` ms in `server.ts`.
  - Bootstrap token TTL `10 * 60 * 1000` ms in `nodes/route.ts`.
  - Port range bounds `1` / `65535` in `rule-mutations.ts`.
  - Backoff cap `60` s and handshake/heartbeat durations in the Go agent client.
- Convert the dynamic `require()` calls in `server.ts` (inside `setInterval`) to top-level ESM imports.
- Apply Prettier formatting to `dashboard/src/app/(dashboard)/nodes/[id]/page.tsx`.

This is a strictly behavior-preserving refactor. No new features, no functional/numeric changes, no response-shape changes.

## Capabilities

### New Capabilities
- `code-quality`: Codebase-wide clean-code standards — no duplicated auth guards, no unexplained magic numbers, idiomatic Go, ESM-only imports in the server, and enforced formatting. Captures the behavior-preservation contract these refactors must satisfy.

### Modified Capabilities
<!-- None: no existing spec-level requirements change. This is implementation-quality only. -->

## Impact

- **Dashboard (TypeScript/Next.js)**:
  - `dashboard/src/lib/auth.ts` — new `requireSession` helper.
  - `dashboard/src/app/api/**/route.ts` (9 files) — adopt helper.
  - `dashboard/server.ts` — top-level imports + named timing constants.
  - `dashboard/src/lib/ws/server.ts` — heartbeat-timeout constant.
  - `dashboard/src/lib/sync/rule-mutations.ts` — port-bound constants.
  - `dashboard/src/app/api/nodes/route.ts` — token-TTL constant.
  - `dashboard/src/app/(dashboard)/nodes/[id]/page.tsx` — formatting only.
- **Agent (Go)**:
  - `agent/internal/client/client.go` — `any` + timing constants.
- **No** database schema, API contract, dependency, or deployment changes.
- **Checks**: dashboard `npm run lint`, `npm run format:check`, `npm run build`, `npm run test`; agent `go build ./...`, `go vet ./...`, `go test ./...`.
