When asked about the codebase, project structure, or to find code, always use the augment-context-engine MCP tool (codebase-retrieval) in the root workspace first before reading individual files. Use codebase-retrieval instead of the Explore subagent for codebase exploration and search tasks.

# Relay Manager

Centralized relay node management system. Dashboard (Next.js + SQLite) pushes iptables forwarding rules to Go agents on relay nodes via WebSocket.

## Key Design Decisions

- **WebSocket push (not poll)**: Agents connect outbound to dashboard — firewall-friendly, real-time updates, no need to expose agent ports.
- **Monotonic config versioning**: Each group tracks a version number. On reconnect, agents report their version and receive only missed changes (catch-up sync via `config_events` table).
- **Incremental iptables updates**: Individual rule add/remove/update — no full flush/reload unless explicitly requested.
- **SQLite**: Sufficient for <100 nodes, zero external dependencies.
- **Single Go binary agent**: Easy to deploy via bootstrap script, runs as systemd service.

## Dev Commands

- Dashboard: `cd dashboard && npm run dev`
- Agent: `make` (builds to `agent/relay-agent`)
- Agent (Linux cross-compile): `make build-linux`
- Docker: `make docker`

## Detailed Design

See `docs/ARCHITECTURE.md` for full schema, sync strategy, bootstrap flow, edge cases, and security model.

UI/UX work must read `openspec/ui-dna.md` before any visual change.
