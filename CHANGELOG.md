# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Expanded production deployment, backup, upgrade, rollback, and release documentation
- Updated active architecture and release specifications to match desired-state reconciliation and GHCR distribution

## [0.1.0] - 2026-09-18

### Added

- Next.js dashboard with SQLite backend for centralized relay node management
- Go agent binary that runs as a systemd service on relay nodes
- Authoritative desired-state reconciliation plus ordered incremental WebSocket updates
- Atomic agent state persistence, firewall rule validation, retry-safe reconciliation, and apply-error reporting
- Versioned SQLite migrations, WAL durability settings, atomic version allocation, and port conflict constraints
- Single-use bootstrap tokens and SHA-256-verified Linux AMD64/ARM64 agent installation
- Hardened authentication, runtime configuration validation, rate limits, health checks, and unprivileged containers
- Public multi-architecture images in GitHub Container Registry with `v0.1.0`, `0.1.0`, and `latest` tags
- GitHub Actions verification with lint, type checking, tests, production builds, dependency audit, and Go race detection
- GitHub Release assets for agent binaries, archives, and SHA-256 checksums
- MIT License

[Unreleased]: https://github.com/phungvanquy/relay-manager/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/phungvanquy/relay-manager/releases/tag/v0.1.0
