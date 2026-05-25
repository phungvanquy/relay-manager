## ADDED Requirements

### Requirement: Vitest is configured for the dashboard
The dashboard SHALL have Vitest configured as the test runner with TypeScript and path alias support matching the existing tsconfig.

#### Scenario: Tests can be run via npm script
- **WHEN** a developer runs `npm test` in the dashboard directory
- **THEN** Vitest executes all `*.test.ts` files and reports results

### Requirement: Rule mutation logic has unit tests
The rule-mutations module SHALL have tests covering add, update, and remove operations including validation and conflict detection.

#### Scenario: Adding a valid rule succeeds
- **WHEN** `addRule` is called with valid input and no port conflict
- **THEN** the rule is inserted and a config event is created with the correct version

#### Scenario: Adding a rule with port conflict fails
- **WHEN** `addRule` is called with a source port already in use for the same protocol
- **THEN** an error is thrown indicating the port conflict

#### Scenario: Updating a rule validates input
- **WHEN** `updateRule` is called with an invalid port (0 or 65536)
- **THEN** an error is thrown with a validation message

#### Scenario: Removing a rule creates a remove event
- **WHEN** `removeRule` is called with a valid rule ID
- **THEN** the rule is deleted and a config event of type "remove" is created

### Requirement: Auth utilities have unit tests
The auth module SHALL have tests covering password verification, session creation, and session verification.

#### Scenario: Correct password passes verification
- **WHEN** `verifyPassword` is called with the configured admin password
- **THEN** it returns true

#### Scenario: Wrong password fails verification
- **WHEN** `verifyPassword` is called with an incorrect password
- **THEN** it returns false

#### Scenario: Valid JWT verifies successfully
- **WHEN** a session is created with `createSession` and then verified
- **THEN** verification returns true

#### Scenario: Expired or tampered JWT fails verification
- **WHEN** an invalid or expired token is verified
- **THEN** verification returns false

### Requirement: WebSocket push logic has unit tests
The push module SHALL have tests verifying that rule changes are dispatched to the correct node connections.

#### Scenario: Push targets only nodes in the affected group
- **WHEN** a rule change occurs in group A
- **THEN** only WebSocket connections for nodes in group A receive the push message
