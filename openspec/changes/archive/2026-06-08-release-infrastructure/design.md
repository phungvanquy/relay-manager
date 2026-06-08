## Context

The relay-manager project has CI (lint, typecheck, test) but no release automation. Agent binaries are built locally via `make agent` and Docker images via `make docker`. There are no version tags, no changelog, and no license file — preventing distribution as a standard open-source project.

The existing agent Makefile already handles cross-compilation (`build-all` for linux/amd64 + linux/arm64) and archive creation (`release` target creates `.tar.gz` per binary). The root Makefile references `phungvanquy/relay-manager` as the Docker image name. Version injection into the Go binary uses ldflags (Version, Commit, BuildDate).

## Goals / Non-Goals

**Goals:**
- Make the repo legally distributable (LICENSE)
- Provide release history (CHANGELOG)
- Automate artifact publishing on version tags (binaries + Docker image + GitHub Release)

**Non-Goals:**
- Automated version bumping or semantic-release tooling — manual tagging is sufficient for this project size
- Signing binaries or Docker images — can be added later
- Release branches or hotfix workflows — single `main` branch is adequate
- Dashboard standalone packaging — it's deployed via Docker

## Decisions

### MIT License
Permissive, widely understood, standard for infrastructure tools. No copyleft complexity for users embedding the agent in their infrastructure.

### Keep Changelog format for CHANGELOG.md
Follows https://keepachangelog.com — groups entries by Added/Changed/Fixed/Removed per version. Matches the conventional commit style already in use.

### Tag-triggered release workflow (over manual dispatch)
Push a `v*` tag → workflow runs automatically. Simpler than workflow_dispatch, impossible to forget, standard Git convention. The tag name IS the version.

### Reuse existing Makefile targets in CI
The release workflow calls `make -C agent build-all` and `make -C agent release` rather than duplicating build commands. Single source of truth for build logic.

### Docker build uses root Dockerfile
Existing `dashboard/Dockerfile` handles multi-stage build. The workflow builds from repo root with `docker build -f dashboard/Dockerfile .` matching the existing `make docker` pattern.

## Risks / Trade-offs

- [Docker Hub secrets required] → Document in CHANGELOG/README that `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` must be configured as GitHub repo secrets before first release
- [No changelog automation] → Manual changelog updates before tagging; acceptable for low release frequency
- [Tag without CI pass] → Release workflow does NOT gate on CI passing; mitigated by branch protection requiring CI on main
