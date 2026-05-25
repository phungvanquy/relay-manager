## ADDED Requirements

### Requirement: CI workflow runs on push and pull request
The repository SHALL have a GitHub Actions workflow that triggers on push to `main` and on pull requests targeting `main`.

#### Scenario: Push to main triggers CI
- **WHEN** a commit is pushed to the `main` branch
- **THEN** the CI workflow runs lint, typecheck, and test jobs for both dashboard and agent

#### Scenario: PR triggers CI
- **WHEN** a pull request is opened or updated targeting `main`
- **THEN** the CI workflow runs and reports status on the PR

### Requirement: Dashboard checks run in CI
The CI workflow SHALL run ESLint, TypeScript type checking, and Vitest for the dashboard.

#### Scenario: Dashboard lint failure blocks merge
- **WHEN** the dashboard contains ESLint errors
- **THEN** the CI job fails and reports the lint errors

#### Scenario: Dashboard type errors block merge
- **WHEN** the dashboard contains TypeScript type errors
- **THEN** the CI job fails and reports the type errors

#### Scenario: Dashboard test failure blocks merge
- **WHEN** a Vitest test fails
- **THEN** the CI job fails and reports which tests failed

### Requirement: Agent checks run in CI
The CI workflow SHALL run `go vet`, `golangci-lint`, and `go test` for the agent.

#### Scenario: Agent lint failure blocks merge
- **WHEN** the agent code has golangci-lint violations
- **THEN** the CI job fails and reports the violations

#### Scenario: Agent test failure blocks merge
- **WHEN** a Go test fails
- **THEN** the CI job fails and reports which tests failed

### Requirement: Dashboard and agent jobs run in parallel
The CI workflow SHALL run dashboard and agent checks as separate parallel jobs to minimize total CI time.

#### Scenario: Parallel execution
- **WHEN** CI is triggered
- **THEN** the dashboard job and agent job start simultaneously rather than sequentially
