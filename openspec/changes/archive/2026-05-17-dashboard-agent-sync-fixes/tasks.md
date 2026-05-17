## 1. Agent: Fix version advancement logic

- [x] 1.1 In `agent/internal/client/client.go` `applyEvent()`, move `c.state.SetVersion(event.Version)` and `c.state.Save()` inside the success branch only. On failure, save state without advancing version.
- [x] 1.2 Verify that `ApplyResultMessage` still sends the event version (not the agent's current version) so the dashboard knows which version failed.

## 2. Agent: Add WebSocket write mutex

- [x] 2.1 Add a `sync.Mutex` field (`writeMu`) to the `Client` struct in `agent/internal/client/client.go`.
- [x] 2.2 Create a helper method `writeJSON(v interface{}) error` that locks the mutex, calls `c.conn.WriteJSON(v)`, and unlocks.
- [x] 2.3 Replace all direct `c.conn.WriteJSON()` and `c.conn.WriteMessage()` calls with the mutex-protected helper (heartbeat, apply_result, close message).

## 3. Dashboard: Fix catch-up event format

- [x] 3.1 In `dashboard/src/lib/ws/server.ts` `handleHello()`, add `type: "sync_event"` and `group_id` fields to each catch-up event in the `catchUpEvents` mapping.

## 4. Dashboard: Wrap rule mutations in transactions

- [x] 4.1 In `dashboard/src/lib/sync/rule-mutations.ts`, wrap `addRule()` body in `db.transaction()`.
- [x] 4.2 Wrap `updateRule()` body in `db.transaction()`.
- [x] 4.3 Wrap `removeRule()` body in `db.transaction()`.
- [x] 4.4 Move `pushRuleChange()` calls to after the transaction commits (outside the transaction callback).

## 5. Verification

- [x] 5.1 Build the Go agent (`cd agent && go build ./...`) and confirm no compilation errors.
- [x] 5.2 Build the dashboard (`cd dashboard && npm run build`) and confirm no type errors.
- [x] 5.3 Verify the agent's `applyEvent` logic: on failure, version stays unchanged; on success, version advances.
