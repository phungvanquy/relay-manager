## Context

The relay-manager system uses a WebSocket-based sync protocol between the Next.js dashboard and Go agents. The dashboard pushes rule changes to agents, and agents report back success/failure. Several logic bugs exist in the current implementation that would cause version drift and potential crashes in production.

Current state:
- Agent advances its local `config_version` unconditionally in `applyEvent()`, even on failure
- Agent writes to the WebSocket from multiple goroutines without synchronization
- Dashboard sends catch-up events without the `type` field that live-push events include
- Dashboard rule mutations are not atomic (multiple DB writes without a transaction)

## Goals / Non-Goals

**Goals:**
- Ensure agent version only advances when a rule is successfully applied
- Prevent concurrent WebSocket write panics in the agent
- Make catch-up events structurally identical to live-push events
- Make dashboard rule mutations atomic to prevent partial state corruption

**Non-Goals:**
- Changing the WebSocket protocol message format (all fixes are backward-compatible)
- Adding retry logic for failed rule applications (separate concern)
- Implementing full-sync/reconciliation from dashboard (already handled by agent on startup)

## Decisions

### 1. Agent version advancement: only on success

The agent's `applyEvent` currently calls `c.state.SetVersion(event.Version)` unconditionally after attempting to apply. On failure, this means the agent "skips" the event — on reconnect it reports a version higher than what it actually applied, so the dashboard won't resend the failed event.

**Fix**: Move `SetVersion` inside the success branch. On failure, the version stays at the last successful version. On reconnect, the dashboard will resend all events from that version forward, including the one that failed.

**Alternative considered**: Track failed versions separately and request retry. Rejected — adds protocol complexity for something the existing catch-up mechanism already handles correctly once the version bug is fixed.

### 2. WebSocket write mutex in agent

gorilla/websocket documents that connections do not support concurrent writers. The agent currently writes from:
- The reader goroutine (sending `apply_result` after processing a sync event)
- The main goroutine (sending heartbeats on a ticker)

**Fix**: Add a `sync.Mutex` to the `Client` struct, wrap all `conn.WriteJSON` / `conn.WriteMessage` calls.

**Alternative considered**: Channel-based write serialization. Rejected — mutex is simpler and sufficient for this low-throughput use case (heartbeat every 30s + occasional apply results).

### 3. Catch-up events include `type` field

The dashboard's `handleHello` builds catch-up events as `{ version, action, rule }` but live-push events from `pushRuleChange` include `{ type: "sync_event", group_id, version, action, rule }`. The agent's `HelloAckMessage.CatchUpEvents` is typed as `[]SyncEvent` which has a `Type` field.

**Fix**: Add `type: "sync_event"` and `group_id` to catch-up events in the dashboard's `handleHello` response. This makes the format consistent and means the agent can use the same deserialization path for both.

### 4. Transaction wrapping for rule mutations

`addRule`, `updateRule`, and `removeRule` each perform 4 DB operations (rule write + group version bump + config_event insert + audit_log insert). If the process crashes between operations, the group version could increment without a corresponding config_event, causing agents to miss that version permanently.

**Fix**: Wrap each mutation in a SQLite transaction using `db.transaction()`. better-sqlite3 transactions are synchronous and atomic.

## Risks / Trade-offs

- **[Risk] Agent retries failed events on every reconnect** → Acceptable. If a rule consistently fails (e.g., invalid IP), the agent will log the error each time but continue processing subsequent events. The dashboard UI should surface the error via the `apply_result` message.
- **[Risk] Write mutex adds latency to heartbeats** → Negligible. Lock contention is near-zero given the low message frequency.
- **[Risk] Transaction wrapping changes error behavior** → If any step fails, the entire mutation rolls back. This is strictly better than partial application.
