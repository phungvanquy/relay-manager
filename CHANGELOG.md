# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2024-01-01

### Added

- Next.js dashboard with SQLite backend for centralized relay node management
- Go agent binary that runs as a systemd service on relay nodes
- WebSocket-based push sync: agents connect outbound to dashboard, receiving rule updates in real time without exposing agent ports
- Monotonic config versioning with catch-up sync on reconnect via `config_events` table
- Incremental iptables rule management (add/remove/update individual rules, no full flush)
- Bootstrap script for zero-touch agent deployment
- GitHub Actions CI pipeline (lint, typecheck, test for both dashboard and agent)
- MIT License

[Unreleased]: https://github.com/phungvanquy/relay-manager/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/phungvanquy/relay-manager/releases/tag/v0.1.0
