## ADDED Requirements

### Requirement: Build supported platform binaries

The build system SHALL produce Linux AMD64 and ARM64 agent binaries in a single command.

#### Scenario: Build all targets

- **WHEN** the user runs `make build-all`
- **THEN** the system produces `relay-agent-linux-amd64` and `relay-agent-linux-arm64` in the `bin/` directory

#### Scenario: Build single target still works

- **WHEN** the user runs `make build`
- **THEN** the system produces a binary for the host platform only

### Requirement: Version metadata embedded in binaries

Each built binary SHALL contain version, git commit hash, and build date metadata injected at compile time.

#### Scenario: Version flag output

- **WHEN** the user runs `relay-agent --version`
- **THEN** the output displays the version string, commit hash, and build date

#### Scenario: No version set during development

- **WHEN** the binary is built without explicit version ldflags
- **THEN** the version displays as "dev" with the current commit hash

### Requirement: Compressed archives for distribution

The build system SHALL produce compressed tar.gz archives for each platform binary.

#### Scenario: Archive creation

- **WHEN** the user runs `make release`
- **THEN** the system produces `relay-agent-{os}-{arch}.tar.gz` files in `bin/` for each target platform

#### Scenario: Archive contents

- **WHEN** a tar.gz archive is extracted
- **THEN** it contains the `relay-agent` binary (without OS/arch suffix) ready to install

### Requirement: Bootstrap script detects platform

The bootstrap script SHALL detect the target platform's OS and architecture and download the correct binary.

#### Scenario: Linux amd64 detection

- **WHEN** the bootstrap script runs on a Linux x86_64 system
- **THEN** it downloads the `relay-agent-linux-amd64` binary

#### Scenario: Linux ARM64 detection

- **WHEN** the bootstrap script runs on a Linux aarch64 system
- **THEN** it downloads the `relay-agent-linux-arm64` binary

#### Scenario: Unsupported platform

- **WHEN** the bootstrap script runs on an unsupported OS/architecture combination
- **THEN** it exits with a clear error message listing supported platforms

### Requirement: Consistent binary naming

All built binaries SHALL follow the naming convention `relay-agent-{goos}-{goarch}`.

#### Scenario: Naming matches Go conventions

- **WHEN** binaries are built for linux/arm64
- **THEN** the output file is named `relay-agent-linux-arm64`

#### Scenario: Archive naming matches binary naming

- **WHEN** archives are created
- **THEN** each archive is named `relay-agent-{goos}-{goarch}.tar.gz`
