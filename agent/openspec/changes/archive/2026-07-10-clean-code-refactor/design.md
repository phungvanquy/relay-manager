## Context

Relay Manager spans a Next.js dashboard (TypeScript) and a Go agent. The code works and is covered by lint/format/test tooling, but several small clean-code issues have crept in: a duplicated auth guard across nine API routes, magic numbers for timing/limits, a pre-1.18 `interface{}` in Go, and dynamic `require()` inside the server's offline-sweep loop. These are quality-only issues — the runtime behavior is correct today. The goal is to reduce duplication and improve clarity without changing any observable behavior.

Constraints:
- Strictly behavior-preserving. Every numeric value, response body, and status code stays identical.
- Follow existing patterns: auth helpers already live in `dashboard/src/lib/auth.ts`; Go timing values are already `time.Duration` expressions in `client.go`.
- Existing checks must stay green: dashboard lint/format/build/test, agent build/vet/test.

## Goals / Non-Goals

**Goals:**
- One reusable session guard used by every authenticated API route.
- Named constants for all identified magic numbers, values unchanged.
- Idiomatic `any` in Go.
- Top-level ESM imports in `server.ts` (no dynamic `require()`).
- Prettier-clean formatting for the one flagged file.

**Non-Goals:**
- No new features, endpoints, or config.
- No change to numeric timing/limit values.
- No change to API response shapes, status codes, or error strings.
- No refactor of business logic (rule sync, iptables, bootstrap flow).
- No new dependencies.

## Decisions

**1. `requireSession(req)` helper returning `NextResponse | null`.**
Signature: `async function requireSession(req: NextRequest): Promise<NextResponse | null>`. Returns the 401 `NextResponse` when unauthenticated, or `null` when authenticated. Call sites become:
```ts
const unauthorized = await requireSession(req);
if (unauthorized) return unauthorized;
```
Rationale: returning the response (rather than throwing) matches the existing route style, where each handler already returns `NextResponse.json(...)` directly. Alternatives considered: (a) a higher-order `withAuth(handler)` wrapper — rejected as a larger structural change that alters every export signature and risks behavior drift with Next.js route typing; (b) throwing and catching — rejected because most routes don't have a try/catch and adding one changes control flow. The helper keeps the diff minimal and the 401 body identical.

**2. Constant placement.**
- Dashboard timing constants shared between `server.ts` and `ws/server.ts`: define `HEARTBEAT_TIMEOUT_MS = 90_000` in `dashboard/src/lib/ws/server.ts` (the module that owns heartbeat semantics) and import it into `server.ts`. Define `OFFLINE_SWEEP_INTERVAL_MS = 30_000` local to `server.ts` (only used there).
- `BOOTSTRAP_TOKEN_TTL_MS = 10 * 60 * 1000` in `dashboard/src/app/api/nodes/route.ts` (module-local; the only user).
- `MIN_PORT = 1`, `MAX_PORT = 65535` in `dashboard/src/lib/sync/rule-mutations.ts` (module-local).
- Go client: name the backoff cap and durations as package-level `const` in `client.go` (e.g., `maxBackoffSeconds = 60`, `handshakeTimeout = 10 * time.Second`, `heartbeatInterval = 30 * time.Second`). Keep existing expressions' values exactly.
Rationale: keep constants close to their single use; only promote to a shared module when genuinely shared (the 90s heartbeat value). Avoids inventing a premature "constants" module.

**3. ESM imports in `server.ts`.**
Move `db`, `nodes`, and `{ lt, eq, and }` to top-level `import` statements. Rationale: the dynamic `require()` was likely a workaround; top-level imports are already used elsewhere in the file (`handleAgentConnection`, `migrate`) and tsx/Next resolve them fine. Verify build passes — if a genuine circular-import or load-order issue surfaces, fall back to top-of-module import with lazy access, but do not revert to `require()`.

**4. `any` over `interface{}`.**
Direct token swap in `writeJSON`. `go vet`/`staticcheck` accept both; `any` is the idiomatic alias since Go 1.18 and the module targets 1.22.

## Risks / Trade-offs

- **Auth helper behavior drift** → Mitigation: helper returns the exact same `NextResponse.json({ error: "Unauthorized" }, { status: 401 })`; existing `auth.test.ts` plus a spot-check of one route's 401 path confirm parity. The guard's placement (before any body parsing) is preserved at each call site.
- **`server.ts` import move changes load order** → Mitigation: `npm run build` + `npm run dev` smoke to confirm the offline-sweep still runs and DB access works; the imported symbols are already imported the same way in sibling modules.
- **Constant extraction typo changes a value** → Mitigation: values are copied verbatim; `format:check` and full test suite guard against drift; reviewer diffs constant definitions against originals.
- **Prettier reformat touches unrelated lines** → Mitigation: run `--write` only on the single flagged file; diff is formatting-only.

## Migration Plan

Pure in-place refactor, no data or deployment migration. Rollback = revert the commit. Deploy is a normal rebuild of dashboard and agent binaries.
