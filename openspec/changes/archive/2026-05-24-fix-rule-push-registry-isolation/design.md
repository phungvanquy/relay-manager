## Context

The relay-manager dashboard uses a custom Next.js server (`server.ts`) that creates both an HTTP server (for Next.js request handling) and a WebSocket server (for agent connections). The WebSocket server populates a `ConnectionRegistry` singleton with active agent connections, keyed by node ID and group ID.

When rules are mutated via the dashboard's API routes, `pushRuleChange()` looks up connections from this registry to push sync events. However, Next.js compiles API route handlers through its own bundler (webpack/turbopack), which can create separate module instances. The `registry` imported in the API route's execution context is a freshly-instantiated `ConnectionRegistry` with no connections — not the one populated by the WebSocket server in `server.ts`.

This means `pushRuleChange` always sees zero connections and silently drops all push notifications. Agents only receive updates on reconnect (via catch-up events), not in real-time.

## Goals / Non-Goals

**Goals:**
- Ensure the WebSocket connection registry is a true process-wide singleton shared between the custom server and Next.js API routes
- Real-time rule pushes work in both development and production modes
- Zero changes to the agent codebase
- Minimal refactoring — fix the isolation, don't redesign the sync system

**Non-Goals:**
- Switching to an external message broker (Redis pub/sub, etc.) — overkill for this scale
- Changing the WebSocket protocol or message format
- Adding retry/acknowledgment logic for push delivery (catch-up sync already handles missed events)

## Decisions

### 1. Use `globalThis` to store the registry singleton

**Choice**: Attach the `ConnectionRegistry` instance to `globalThis` (e.g., `globalThis.__relayRegistry`) so that regardless of how many times the module is evaluated by different bundler contexts, they all resolve to the same instance.

**Alternatives considered**:
- **Separate push service via HTTP**: API routes POST to an internal endpoint handled by the custom server, which then pushes to WebSocket clients. Adds latency and complexity for a problem that has a simpler fix.
- **Event emitter on `process`**: Use `process.emit`/`process.on` to bridge contexts. Works but adds indirection and makes the push logic harder to follow.
- **Move rule mutations into the custom server**: Handle rule CRUD outside Next.js API routes entirely. Breaks the clean Next.js architecture and loses middleware/auth patterns.

**Rationale**: `globalThis` is the standard pattern for ensuring singletons survive module re-evaluation in Node.js. Next.js itself uses this pattern for dev-mode database connections (the "global prisma" pattern). It's zero-dependency, zero-latency, and the fix is contained to one file.

### 2. Type-safe global declaration

Add a TypeScript declaration for the global property to avoid `any` casts and catch misuse at compile time.

## Risks / Trade-offs

- **[Risk] `globalThis` pollution** → Mitigated by using a namespaced key (`__relayRegistry`) and keeping it as an implementation detail of the registry module. No other code should access it directly.
- **[Risk] Hot-reload in dev creates new registry instances** → The `globalThis` check (`globalThis.__relayRegistry ??= new ConnectionRegistry()`) ensures the first instance survives hot reloads. This is the same pattern used for Prisma/Drizzle clients in Next.js dev mode.
- **[Trade-off] Tight coupling to single-process deployment** → If the dashboard were ever split into multiple processes, this approach wouldn't work. Acceptable given the stated scale (<100 nodes) and architecture (single Next.js server).
