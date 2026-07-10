## ADDED Requirements

### Requirement: Single reusable API session guard

All authenticated dashboard API routes SHALL enforce session authentication through one shared helper rather than duplicated inline checks. The helper SHALL return an unauthorized response when the session is invalid and SHALL allow the handler to continue when the session is valid. The unauthorized response body and status code SHALL be identical to the pre-refactor behavior.

#### Scenario: Unauthenticated request is rejected identically

- **WHEN** a request without a valid session hits any of the nine authenticated API routes
- **THEN** the response status is `401`
- **AND** the response body is exactly `{ "error": "Unauthorized" }`

#### Scenario: Authenticated request proceeds

- **WHEN** a request with a valid session hits an authenticated API route
- **THEN** the shared guard returns no response and the handler executes its normal logic
- **AND** the successful response is unchanged from pre-refactor behavior

#### Scenario: Guard is defined once

- **WHEN** the codebase is inspected for the inline `verifySessionFromRequest` → 401 block
- **THEN** the block exists in exactly one helper (`requireSession` in `@/lib/auth`)
- **AND** no API route file contains a duplicated inline copy of the guard

### Requirement: Named constants for timing and limit values

Timing intervals, timeouts, token lifetimes, and numeric bounds SHALL be expressed as named constants rather than inline magic numbers. The numeric values SHALL remain identical to the pre-refactor values.

#### Scenario: Heartbeat timeout is a named shared constant

- **WHEN** the heartbeat timeout is referenced in both the offline-sweep threshold and the per-connection heartbeat timeout
- **THEN** both reference a single named constant equal to `90000` ms

#### Scenario: Other magic numbers are named with unchanged values

- **WHEN** the offline sweep interval, bootstrap token TTL, port bounds, and agent backoff cap / durations are inspected
- **THEN** each is a named constant (`30000` ms interval, `600000` ms token TTL, port `1`–`65535`, `60` s backoff cap, `10` s handshake, `30` s heartbeat)
- **AND** every value equals its pre-refactor magic number

### Requirement: Idiomatic Go and ESM-only server imports

The Go agent SHALL use `any` instead of `interface{}`, and the dashboard custom server SHALL use top-level ESM imports instead of dynamic CommonJS `require()`.

#### Scenario: Go uses any

- **WHEN** `writeJSON` in the agent client is inspected
- **THEN** its parameter type is `any` and the package builds and vets cleanly

#### Scenario: Server uses top-level imports

- **WHEN** `server.ts` is inspected
- **THEN** the database, schema, and drizzle-orm operators are imported at module top level
- **AND** no `require()` call remains inside the offline-sweep interval
- **AND** the offline-sweep still marks stale online nodes offline

### Requirement: Enforced formatting

All dashboard source files SHALL pass `prettier --check` with no formatting warnings.

#### Scenario: Formatting check passes

- **WHEN** `npm run format:check` runs against the dashboard sources
- **THEN** it reports no code-style issues, including for `dashboard/src/app/(dashboard)/nodes/[id]/page.tsx`

### Requirement: Behavior preservation

The clean-code refactor SHALL NOT change any observable behavior, API contract, response shape, or numeric value. All existing checks SHALL continue to pass.

#### Scenario: All checks pass after refactor

- **WHEN** dashboard `npm run lint`, `npm run format:check`, `npm run build`, `npm run test` and agent `go build ./...`, `go vet ./...`, `go test ./...` are run
- **THEN** every check passes
- **AND** no test assertion required modification to accommodate the refactor
