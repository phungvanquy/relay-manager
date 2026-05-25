## ADDED Requirements

### Requirement: Agent builds only for linux/amd64 and linux/arm64
The build system SHALL produce agent binaries only for linux/amd64 and linux/arm64 platforms. All other platform targets SHALL be removed from the PLATFORMS list.

#### Scenario: Build-all produces exactly two binaries
- **WHEN** `make build-all` is run in the agent directory
- **THEN** exactly two binaries are produced: `relay-agent-linux-amd64` and `relay-agent-linux-arm64`

#### Scenario: No MIPS or FreeBSD binaries produced
- **WHEN** `make build-all` is run
- **THEN** no binaries for mips, mipsle, mips64, mips64le, freebsd, or darwin are produced
