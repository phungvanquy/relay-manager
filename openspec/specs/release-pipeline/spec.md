# release-pipeline Specification

## Purpose

Define the verified release process for agent artifacts, GitHub Releases, and public multi-architecture images in GitHub Container Registry.

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

The release workflow SHALL build and push the image to GitHub Container Registry as `ghcr.io/phungvanquy/relay-manager` for linux/amd64 and linux/arm64.

#### Scenario: Docker image pushed with version tag

- **WHEN** the release workflow runs for tag `v1.2.3`
- **THEN** image `ghcr.io/phungvanquy/relay-manager:v1.2.3` is published
- **THEN** image `ghcr.io/phungvanquy/relay-manager:1.2.3` is published
- **THEN** image `ghcr.io/phungvanquy/relay-manager:latest` is also published
- **THEN** each tag resolves to linux/amd64 and linux/arm64 manifests

#### Scenario: GitHub token authorizes publication

- **WHEN** the workflow attempts to push
- **THEN** it logs in to `ghcr.io` with the repository-scoped `GITHUB_TOKEN`
- **THEN** the release job has `packages: write` permission

### Requirement: Release workflow creates GitHub Release

The release workflow SHALL create a GitHub Release with the agent binary archives attached.

#### Scenario: GitHub Release is created

- **WHEN** the release workflow completes successfully
- **THEN** a GitHub Release exists for the tag with release notes
- **THEN** the release has `relay-agent-linux-amd64.tar.gz` and `relay-agent-linux-arm64.tar.gz` attached as assets
- **THEN** raw binaries and SHA-256 checksum files are attached for both supported architectures
