## Why

The dashboard and agent have several logic conflicts in their WebSocket sync protocol that can cause version drift, missed rule applications, and potential crashes under concurrent operations. These bugs would surface in production when agents reconnect after failures or when rules fail to apply on specific nodes.

## What Changes

- **Fix agent version advancement on failure**: Agent currently sets `config_version` even when a rule fails to apply, causing it to skip that event on reconnect. Version should only advance on success.
- **Fix concurrent WebSocket writes in agent**: The agent writes to the WebSocket connection from both the reader goroutine (apply_result) and the heartbeat ticker without synchronization — this violates gorilla/websocket's thread-safety contract and can cause panics.
- **Fix catch-up events missing `type` field**: Dashboard sends catch-up events in `hello_ack` without the `type: "sync_event"` field. While the agent doesn't check it during catch-up processing, this inconsistency means the `SyncEvent` struct's `Type` field is empty for catch-up events vs populated for live pushes.
- **Fix node not registered after bootstrap reconnect**: After bootstrap completes, the dashboard closes the connection. The agent reconnects with `hello`, but if the node has no group assigned yet, the registry won't track it for push events until the next reconnect after group assignment.
- **Add atomicity to dashboard rule mutations**: The `addRule`/`updateRule`/`removeRule` functions perform multiple DB writes (rule + group version + config_event + audit_log) without a transaction. A crash mid-operation could leave version and events out of sync.

## Capabilities

### New Capabilities
- `sync-protocol-fixes`: Fixes to the WebSocket sync protocol between dashboard and agent covering version tracking, concurrent writes, and catch-up event format

### Modified Capabilities

## Impact

- `agent/internal/client/client.go`: Fix version advancement logic and add write mutex
- `dashboard/src/lib/ws/server.ts`: Add `type` field to catch-up events
- `dashboard/src/lib/sync/rule-mutations.ts`: Wrap mutations in transactions
- WebSocket protocol behavior: No breaking changes to message format, only correctness fixes
