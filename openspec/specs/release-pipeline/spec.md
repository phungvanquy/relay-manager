# release-pipeline Specification

## Purpose
TBD - created by archiving change release-infrastructure. Update Purpose after archive.
## Requirements
### Requirement: Project has an MIT LICENSE file
The repository SHALL contain a LICENSE file at the project root with the MIT license text, copyright holder "Relay Manager Contributors", and current year.

#### Scenario: LICENSE file exists
- **WHEN** a user inspects the repository root
- **THEN** a LICENSE file is present containing the full MIT license text

### Requirement: Project maintains a CHANGELOG
The repository SHALL contain a CHANGELOG.md at the project root following the Keep a Changelog format with an initial v0.1.0 entry.

#### Scenario: CHANGELOG contains initial release
- **WHEN** a user reads CHANGELOG.md
- **THEN** it contains a `## [0.1.0]` section listing the initial features (dashboard, agent, WebSocket sync, iptables management)

#### Scenario: CHANGELOG has Unreleased section
- **WHEN** a new change is made before tagging
- **THEN** developers add entries under the `## [Unreleased]` section

### Requirement: Release workflow triggers on version tags
The repository SHALL have a GitHub Actions workflow at `.github/workflows/release.yml` that triggers on push of tags matching `v*`.

#### Scenario: Tag push triggers release
- **WHEN** a developer pushes a tag like `v0.1.0`
- **THEN** the release workflow starts automatically

#### Scenario: Non-tag push does not trigger release
- **WHEN** a developer pushes a regular commit to main
- **THEN** the release workflow does NOT run

### Requirement: Release workflow builds agent binaries
The release workflow SHALL build agent binaries for linux/amd64 and linux/arm64 using the existing Makefile targets, with the version derived from the git tag.

#### Scenario: Binaries are built with correct version
- **WHEN** the release workflow runs for tag `v1.2.3`
- **THEN** agent binaries are built with VERSION=v1.2.3 injected via ldflags
- **THEN** `.tar.gz` archives are created for each platform

### Requirement: Release workflow publishes Docker image
The release workflow SHALL build and push the Docker image to Docker Hub as `phungvanquy/relay-manager` with both the version tag and `latest` tag.

#### Scenario: Docker image pushed with version tag
- **WHEN** the release workflow runs for tag `v1.2.3`
- **THEN** Docker image `phungvanquy/relay-manager:v1.2.3` is pushed to Docker Hub
- **THEN** Docker image `phungvanquy/relay-manager:latest` is also pushed

#### Scenario: Docker Hub credentials are required
- **WHEN** the workflow attempts to push
- **THEN** it uses `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets from the repository settings

### Requirement: Release workflow creates GitHub Release
The release workflow SHALL create a GitHub Release with the agent binary archives attached.

#### Scenario: GitHub Release is created
- **WHEN** the release workflow completes successfully
- **THEN** a GitHub Release exists for the tag with release notes
- **THEN** the release has `relay-agent-linux-amd64.tar.gz` and `relay-agent-linux-arm64.tar.gz` attached as assets

