When asked about the codebase, project structure, or to find code, always use the augment-context-engine MCP tool (codebase-retrieval) in the root workspace first before reading individual files. Use codebase-retrieval instead of the Explore subagent for codebase exploration and search tasks.

# Relay Manager

Centralized relay node management system. Dashboard (Next.js + SQLite) pushes iptables forwarding rules to Go agents on relay nodes via WebSocket.

## Key Design Decisions

- **WebSocket push (not poll)**: Agents connect outbound to dashboard — firewall-friendly, real-time updates, no need to expose agent ports.
- **Desired-state reconciliation**: Each group tracks a monotonic version. On reconnect, the dashboard sends the complete desired rule set; agents reconcile and persist it before acknowledging the version.
- **Incremental iptables updates**: Individual rule add/remove/update — no full flush/reload unless explicitly requested.
- **SQLite**: Sufficient for <100 nodes, zero external dependencies.
- **Single Go binary agent**: Easy to deploy via bootstrap script, runs as systemd service.

## Dev Commands

- Dashboard: `cd dashboard && npm run dev`
- Full checks: `make check`
- Agent release binaries: `make agent` (Linux AMD64 and ARM64 under `releases/`)
- Native agent: `make -C agent build`
- Docker: `make docker`

## Detailed Design

See `docs/ARCHITECTURE.md` for the schema and sync model, `docs/DEPLOYMENT.md` for production operations, and `docs/RELEASING.md` for releases.

UI/UX work must read `openspec/ui-dna.md` before any visual change.
