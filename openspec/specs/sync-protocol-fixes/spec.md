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
- **AND** the previously persisted state remains unchanged

#### Scenario: Reconnect after failure reconciles desired state

- **WHEN** the agent reconnects after a failed apply (local version is M, failed event was M+1)
- **THEN** the dashboard sends the complete desired rule set and current group version
- **AND** the agent retries reconciliation without advancing from M until persistence succeeds

### Requirement: Agent WebSocket writes are serialized

The agent SHALL serialize all writes to the WebSocket connection to prevent concurrent write panics. No two goroutines SHALL write to the connection simultaneously.

#### Scenario: Heartbeat during apply_result send

- **WHEN** the heartbeat ticker fires while an apply_result is being written
- **THEN** the heartbeat write waits until the apply_result write completes
- **AND** no panic or data corruption occurs

#### Scenario: Multiple sync events processed rapidly

- **WHEN** multiple sync_events arrive and each triggers an apply_result write
- **THEN** each apply_result is written sequentially without interleaving

### Requirement: Hello acknowledgement contains authoritative desired state

The dashboard SHALL send the complete desired rule set and current group version in every authenticated `hello_ack`. The agent SHALL treat this snapshot as authoritative for rules it manages.

#### Scenario: Agent reconnects behind the group version

- **WHEN** the agent connects with config_version M and the group is at version M+3
- **THEN** the hello_ack contains the group's current `config_version` and all current `desired_rules`
- **AND** the agent removes stale managed rules and repairs missing or changed rules
- **AND** the agent persists the resulting snapshot before acknowledging the current version

#### Scenario: Live event has a version gap

- **WHEN** an authenticated agent at version N receives a live event whose version is not N+1
- **THEN** the agent reports failure and reconnects
- **AND** the next hello acknowledgement restores consistency from authoritative desired state

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
