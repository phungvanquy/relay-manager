## 1. Reusable API session guard

- [x] 1.1 Add `requireSession(req: NextRequest): Promise<NextResponse | null>` to `dashboard/src/lib/auth.ts` — returns `NextResponse.json({ error: "Unauthorized" }, { status: 401 })` when unauthenticated (via `verifySessionFromRequest`), else `null`
- [x] 1.2 Adopt `requireSession` in `dashboard/src/app/api/groups/route.ts` (all handlers)
- [x] 1.3 Adopt `requireSession` in `dashboard/src/app/api/groups/[id]/route.ts`
- [x] 1.4 Adopt `requireSession` in `dashboard/src/app/api/groups/[id]/rules/route.ts`
- [x] 1.5 Adopt `requireSession` in `dashboard/src/app/api/groups/[id]/rules/[rid]/route.ts`
- [x] 1.6 Adopt `requireSession` in `dashboard/src/app/api/nodes/route.ts`
- [x] 1.7 Adopt `requireSession` in `dashboard/src/app/api/nodes/[id]/route.ts`
- [x] 1.8 Adopt `requireSession` in `dashboard/src/app/api/nodes/[id]/bootstrap/route.ts`
- [x] 1.9 Adopt `requireSession` in `dashboard/src/app/api/audit/route.ts`
- [x] 1.10 Adopt `requireSession` in `dashboard/src/app/api/auth/check/route.ts`, then grep to confirm zero remaining inline `verifySessionFromRequest` → 401 blocks in route files ← (verify: all 9 routes return identical 401 body/status; no inline guard duplication remains; auth.test.ts still passes)

## 2. Named constants (values unchanged)

- [x] 2.1 Define and export `HEARTBEAT_TIMEOUT_MS = 90_000` in `dashboard/src/lib/ws/server.ts`; use it in `resetHeartbeatTimeout`
- [x] 2.2 Import `HEARTBEAT_TIMEOUT_MS` into `dashboard/server.ts` and use it for the offline-sweep threshold; add local `OFFLINE_SWEEP_INTERVAL_MS = 30_000` for the `setInterval` period
- [x] 2.3 Add `BOOTSTRAP_TOKEN_TTL_MS = 10 * 60 * 1000` in `dashboard/src/app/api/nodes/route.ts` and use it for `expiresAt`
- [x] 2.4 Add `MIN_PORT = 1` / `MAX_PORT = 65535` in `dashboard/src/lib/sync/rule-mutations.ts` and use them in `validateRuleInput`
- [x] 2.5 Add package-level Go constants in `agent/internal/client/client.go` for backoff cap (`60`), handshake timeout (`10s`), heartbeat interval (`30s`) and use them ← (verify: every constant equals its original literal; no numeric value changed)

## 3. Idiomatic Go + ESM server imports

- [x] 3.1 Change `writeJSON(v interface{})` to `writeJSON(v any)` in `agent/internal/client/client.go`
- [x] 3.2 Replace dynamic `require()` calls in `dashboard/server.ts` offline-sweep with top-level ESM imports (`db`, `nodes`, `{ lt, eq, and }`) ← (verify: no `require()` remains in server.ts; build succeeds; offline-sweep logic unchanged)

## 4. Formatting

- [x] 4.1 Run `npx prettier --write "src/app/(dashboard)/nodes/[id]/page.tsx"` in `dashboard/`

## 5. Verification

- [x] 5.1 Dashboard: `npm run lint` passes
- [x] 5.2 Dashboard: `npm run format:check` passes (no warnings)
- [x] 5.3 Dashboard: `npm run build` passes
- [x] 5.4 Dashboard: `npm run test` passes
- [x] 5.5 Agent: `go build ./...`, `go vet ./...`, `go test ./...` all pass ← (verify: all checks green; behavior preserved — no test assertions changed to accommodate refactor)
