## ADDED Requirements

### Requirement: ESLint is configured for the dashboard
The dashboard SHALL have ESLint configured with the `next/core-web-vitals` preset and TypeScript support.

#### Scenario: Lint script available
- **WHEN** a developer runs `npm run lint` in the dashboard directory
- **THEN** ESLint checks all TypeScript and TSX files in `src/`

#### Scenario: Lint errors are reported
- **WHEN** code violates an ESLint rule
- **THEN** the lint command exits with a non-zero code and reports the violation

### Requirement: Prettier is configured for the dashboard
The dashboard SHALL have Prettier configured for consistent formatting of TypeScript, TSX, and JSON files.

#### Scenario: Format check script available
- **WHEN** a developer runs `npm run format:check` in the dashboard directory
- **THEN** Prettier reports files that do not match the configured format

#### Scenario: Format fix script available
- **WHEN** a developer runs `npm run format` in the dashboard directory
- **THEN** Prettier reformats all applicable files in place

### Requirement: golangci-lint is configured for the agent
The agent SHALL have a `.golangci.yml` configuration enabling standard linters (govet, errcheck, staticcheck, unused).

#### Scenario: Lint target available in Makefile
- **WHEN** a developer runs `make lint` in the agent directory
- **THEN** golangci-lint runs against all Go packages and reports issues

#### Scenario: Clean code passes lint
- **WHEN** the agent code has no lint violations
- **THEN** `make lint` exits with code 0

### Requirement: Root Makefile has a check target
The root Makefile SHALL have a `check` target that runs all quality gates (lint, typecheck, test) for both dashboard and agent.

#### Scenario: Running make check
- **WHEN** a developer runs `make check` from the project root
- **THEN** dashboard lint, typecheck, and tests run, followed by agent lint and tests

#### Scenario: Any failure causes check to fail
- **WHEN** any individual check fails
- **THEN** `make check` exits with a non-zero code
