## ADDED Requirements

### Requirement: Registry is a process-wide singleton
The `ConnectionRegistry` instance SHALL be stored on `globalThis` so that all module contexts within the same Node.js process resolve to the identical instance. Any code importing the registry module SHALL receive the same object reference regardless of bundler context.

#### Scenario: API route accesses registry populated by WebSocket server
- **WHEN** the WebSocket server registers an agent connection in the registry
- **AND** an API route imports the registry module
- **THEN** the API route SHALL see the same connections that the WebSocket server registered

#### Scenario: Module hot-reload in development
- **WHEN** Next.js hot-reloads a module that imports the registry
- **THEN** the reloaded module SHALL receive the existing registry instance (not a new empty one)

### Requirement: pushRuleChange delivers to connected agents
The `pushRuleChange` function SHALL successfully send WebSocket messages to all agents connected to the specified group when called from any execution context (custom server or API route handler).

#### Scenario: Rule added via API triggers push to group agents
- **WHEN** a rule is added via `POST /api/groups/:id/rules`
- **AND** one or more agents in that group have active WebSocket connections
- **THEN** each connected agent SHALL receive a `sync_event` message with the new rule

#### Scenario: Rule updated via API triggers push to group agents
- **WHEN** a rule is updated via `PUT /api/groups/:id/rules/:rid`
- **AND** one or more agents in that group have active WebSocket connections
- **THEN** each connected agent SHALL receive a `sync_event` message with action "update"

#### Scenario: Rule removed via API triggers push to group agents
- **WHEN** a rule is deleted via `DELETE /api/groups/:id/rules/:rid`
- **AND** one or more agents in that group have active WebSocket connections
- **THEN** each connected agent SHALL receive a `sync_event` message with action "remove"

#### Scenario: No agents connected
- **WHEN** a rule is mutated via the API
- **AND** no agents for that group have active WebSocket connections
- **THEN** the push SHALL complete without error (events are stored in config_events for catch-up)

### Requirement: Type-safe global declaration
The global registry property SHALL be declared via TypeScript's `declare global` to provide compile-time type safety. Direct access to the `globalThis` property outside the registry module SHALL not be required by any consumer.

#### Scenario: Importing registry provides typed interface
- **WHEN** any module imports from the registry module
- **THEN** it SHALL receive a properly typed `ConnectionRegistry` instance without type assertions
