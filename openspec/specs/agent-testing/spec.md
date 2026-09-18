## ADDED Requirements

### Requirement: Go tests exist for the iptables manager

The iptables manager package SHALL have tests that verify rule application logic without requiring root or actual iptables.

#### Scenario: Apply add event generates correct iptables commands

- **WHEN** an "add" event is processed for a TCP rule (port 8080 → 10.0.0.1:80)
- **THEN** the manager generates the correct PREROUTING DNAT and POSTROUTING MASQUERADE commands

#### Scenario: Apply remove event generates correct delete commands

- **WHEN** a "remove" event is processed
- **THEN** the manager generates iptables `-D` commands matching the original rule

#### Scenario: Desired-state reconciliation repairs managed rules

- **WHEN** an authoritative desired-state payload is received
- **THEN** stale managed rules are removed and missing or changed rules are installed
- **AND** unrelated host firewall rules are not flushed

### Requirement: Go tests exist for config persistence

The config package SHALL have tests verifying load and save operations.

#### Scenario: Save and reload preserves state

- **WHEN** config state is saved to a temp file and reloaded
- **THEN** the reloaded config matches the original credentials, dashboard URL, state path, and log level

#### Scenario: Missing config file returns an error

- **WHEN** config is loaded from a non-existent path
- **THEN** loading fails with a file error instead of silently starting with empty credentials

### Requirement: Go tests exist for client reconnect logic

The WebSocket client package SHALL have tests verifying reconnection behavior.

#### Scenario: Client reconnects after disconnect

- **WHEN** the WebSocket connection is closed unexpectedly
- **THEN** the client attempts to reconnect with exponential backoff

#### Scenario: Client sends hello with current version on reconnect

- **WHEN** the client reconnects after a disconnect
- **THEN** the hello message includes the last durably persisted config version for reconciliation

### Requirement: Go tests can be run via Makefile

The agent Makefile SHALL have a `test` target that runs all Go tests.

#### Scenario: Running make test

- **WHEN** a developer runs `make test` in the agent directory
- **THEN** all Go test files are executed and results are reported
