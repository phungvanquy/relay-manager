## ADDED Requirements

### Requirement: Agent version advances only on successful apply

The agent SHALL only update its local `config_version` when a rule event is successfully applied. When an event fails to apply, the version MUST remain at the last successfully applied version.

#### Scenario: Rule apply succeeds
- **WHEN** the agent receives a sync_event with version N and the iptables operation succeeds
- **THEN** the agent's local config_version is set to N and the state file is saved

#### Scenario: Rule apply fails
- **WHEN** the agent receives a sync_event with version N and the iptables operation fails
- **THEN** the agent's local config_version remains unchanged at its previous value
- **AND** the agent sends an apply_result with `success: false` and the error message
- **AND** the state file is saved with the unchanged version

#### Scenario: Reconnect after failure resends missed events
- **WHEN** the agent reconnects after a failed apply (local version is M, failed event was M+1)
- **THEN** the dashboard sends catch-up events starting from version M+1 (inclusive)
- **AND** the previously failed event is included in the catch-up

### Requirement: Agent WebSocket writes are serialized

The agent SHALL serialize all writes to the WebSocket connection to prevent concurrent write panics. No two goroutines SHALL write to the connection simultaneously.

#### Scenario: Heartbeat during apply_result send
- **WHEN** the heartbeat ticker fires while an apply_result is being written
- **THEN** the heartbeat write waits until the apply_result write completes
- **AND** no panic or data corruption occurs

#### Scenario: Multiple sync events processed rapidly
- **WHEN** multiple sync_events arrive and each triggers an apply_result write
- **THEN** each apply_result is written sequentially without interleaving

### Requirement: Catch-up events match live-push event format

The dashboard SHALL send catch-up events in the `hello_ack` message with the same structure as live-push `sync_event` messages. Each catch-up event MUST include the `type` field set to `"sync_event"` and the `group_id` field.

#### Scenario: Agent receives catch-up events after reconnect
- **WHEN** the agent connects with config_version M and the group is at version M+3
- **THEN** the hello_ack contains 3 catch-up events
- **AND** each event has `type: "sync_event"`, `group_id`, `version`, `action`, and `rule` fields

#### Scenario: Catch-up event is structurally identical to live event
- **WHEN** comparing a catch-up event for version N with what would have been pushed live for version N
- **THEN** both contain the same fields: `type`, `group_id`, `version`, `action`, `rule`

### Requirement: Dashboard rule mutations are atomic

The dashboard SHALL execute all database operations for a single rule mutation (rule write, group version increment, config_event insert, audit_log insert) within a single database transaction. Either all operations succeed or none are persisted.

#### Scenario: Crash during rule addition
- **WHEN** the dashboard process crashes after inserting the rule but before inserting the config_event
- **THEN** on restart, neither the rule nor the version increment are present in the database

#### Scenario: Successful rule mutation
- **WHEN** a rule is added/updated/removed and all DB operations succeed
- **THEN** the rule change, version increment, config_event, and audit_log are all persisted atomically
- **AND** the WebSocket push is sent after the transaction commits

### Requirement: Apply result reports version only on success

The dashboard SHALL only update a node's stored `config_version` when it receives an `apply_result` with `success: true`. Failed apply results SHALL NOT advance the node's version in the database.

#### Scenario: Successful apply result
- **WHEN** the dashboard receives `apply_result` with `success: true` and `version: N`
- **THEN** the node's `config_version` in the database is updated to N

#### Scenario: Failed apply result
- **WHEN** the dashboard receives `apply_result` with `success: false` and `version: N`
- **THEN** the node's `config_version` in the database remains unchanged
