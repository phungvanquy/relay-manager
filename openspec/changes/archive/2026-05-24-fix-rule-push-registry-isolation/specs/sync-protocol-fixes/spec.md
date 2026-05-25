## MODIFIED Requirements

### Requirement: Dashboard rule mutations are atomic

The dashboard SHALL execute all database operations for a single rule mutation (rule write, group version increment, config_event insert, audit_log insert) within a single database transaction. Either all operations succeed or none are persisted. The WebSocket push SHALL use the process-wide singleton registry (via `globalThis`) to ensure it reaches agents regardless of which module context the mutation runs in.

#### Scenario: Crash during rule addition
- **WHEN** the dashboard process crashes after inserting the rule but before inserting the config_event
- **THEN** on restart, neither the rule nor the version increment are present in the database

#### Scenario: Successful rule mutation
- **WHEN** a rule is added/updated/removed and all DB operations succeed
- **THEN** the rule change, version increment, config_event, and audit_log are all persisted atomically
- **AND** the WebSocket push is sent after the transaction commits

#### Scenario: Push reaches agents when called from API route context
- **WHEN** a rule mutation is triggered by a Next.js API route handler
- **AND** the `pushRuleChange` function resolves the registry
- **THEN** it SHALL resolve to the same registry instance populated by the WebSocket server in `server.ts`
- **AND** connected agents for the group SHALL receive the sync_event message
