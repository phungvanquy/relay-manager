## Why

When rules are added, updated, or removed via the dashboard API, the changes are saved to the database but never reach connected agents. The root cause is module instance isolation: the custom `server.ts` (which manages WebSocket connections and populates the `ConnectionRegistry`) runs in a different module context than Next.js-compiled API routes (which call `pushRuleChange`). The API routes import a separate instance of the registry singleton that has no connections registered, so `pushRuleChange` always finds zero connections and sends nothing.

## What Changes

- Replace the in-process registry lookup in `pushRuleChange` with a cross-context communication mechanism that bridges the custom server process and Next.js API routes.
- Use a `globalThis`-based singleton pattern to ensure the registry instance is shared across module boundaries regardless of how Next.js bundles the code.
- Add a fallback: if the global registry has connections for the group, push directly; this ensures the fix works in both dev (where modules may be re-evaluated) and production builds.

## Capabilities

### New Capabilities

- `global-registry-bridge`: Ensure the WebSocket connection registry is accessible as a true process-wide singleton, bridging Next.js module isolation between the custom server and API route handlers.

### Modified Capabilities

- `sync-protocol-fixes`: The push delivery path changes from a module-local import to a global singleton lookup, affecting how sync events reach agents.

## Impact

- `dashboard/src/lib/ws/registry.ts` — refactored to use `globalThis` for singleton guarantee
- `dashboard/src/lib/ws/push.ts` — may need adjustment if registry access pattern changes
- `dashboard/server.ts` — no changes needed (already imports registry, which will now register on globalThis)
- No agent-side changes required
- No database schema changes
- No breaking API changes
