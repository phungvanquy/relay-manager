# Relay Manager - Architecture

## Overview

Centralized relay node management system. Replaces manual bash-based iptables port forwarding with a dashboard + agent architecture.

## Components

```
┌─────────────────────────────────────────────────────────┐
│                    Dashboard (Next.js)                    │
│  ┌───────────┐  ┌───────────┐  ┌────────────────────┐  │
│  │  Web UI   │  │  REST API │  │  WebSocket Server  │  │
│  └───────────┘  └───────────┘  └────────────────────┘  │
│                       │                    │             │
│                  ┌────┴────┐               │             │
│                  │ SQLite  │               │             │
│                  └─────────┘               │             │
└────────────────────────────────────────────┼─────────────┘
                                             │
                    ┌────────────────────────┬┼──────────────┐
                    │                        ││              │
              ┌─────┴─────┐          ┌──────┴┴────┐  ┌─────┴─────┐
              │  Agent 1  │          │  Agent 2   │  │  Agent N  │
              │  (Go bin) │          │  (Go bin)  │  │  (Go bin) │
              │  iptables │          │  iptables  │  │  iptables │
              └───────────┘          └────────────┘  └───────────┘
```

## Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Dashboard | Next.js (fullstack) | SSR + API routes in one app |
| Database | SQLite | Simple, no external deps, sufficient for <100 nodes |
| ORM | Drizzle | Lightweight, type-safe, good SQLite support |
| Agent | Go | Single binary, WebSocket native, systemd-friendly |
| Sync | WebSocket (push) | Real-time, firewall-friendly (outbound from nodes) |
| Auth | API Key | Simple, sufficient for this scale |

## Sync Model: Desired State + Ordered WebSocket Push

1. Each group has a monotonic `config_version`
2. When rules change → version increments → dashboard pushes diff to connected agents
3. Agent stores its current version and applied rules in an atomic local state file
4. On every connection, the dashboard sends the complete desired rule set and current version
5. Agent reconciles stale, missing, and changed rules before acknowledging the version
6. Subsequent changes are applied incrementally; failed or out-of-order events force a reconnect and full reconciliation

## Data Model

```sql
-- Nodes
nodes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ip TEXT,
  api_key TEXT NOT NULL UNIQUE,
  group_id TEXT REFERENCES groups(id),
  status TEXT DEFAULT 'offline',  -- online/offline
  last_heartbeat INTEGER,
  config_version INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
)

-- Groups
groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  config_version INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
)

-- Forwarding Rules
rules (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id),
  name TEXT NOT NULL,
  source_port INTEGER NOT NULL,
  destination_ip TEXT NOT NULL,
  destination_port INTEGER NOT NULL,
  note TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  UNIQUE(group_id, source_port)
)

-- Config change history (for catch-up sync)
config_events (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id),
  version INTEGER NOT NULL,
  action TEXT NOT NULL,        -- 'add' | 'update' | 'remove'
  rule_snapshot TEXT NOT NULL, -- JSON of the rule at that point
  created_at INTEGER
)

-- Audit log
audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,               -- JSON
  created_at INTEGER
)
```

## Bootstrap Flow

1. Admin creates node on dashboard → gets bootstrap token (short-lived, single-use)
2. Dashboard shows copy-able command:
   ```
   curl -fsSL https://<dashboard>/api/bootstrap/<token> | bash
   ```
3. Bootstrap script:
   - Downloads Go agent binary for the platform
   - Installs to `/usr/local/bin/relay-agent`
   - Creates systemd service
   - Configures agent with dashboard URL + token
   - Starts service
4. Agent connects to dashboard via WebSocket
5. Dashboard exchanges token for permanent API key
6. Agent joins assigned group, receives full rule set, applies

## Incremental Sync Strategy (Rule Diffing)

When rules are modified on dashboard:

| Change | Action on Node |
|--------|---------------|
| Rule added | `iptables -t nat -A` for the new rule only |
| Rule updated (port/ip changed) | Remove old iptables rules + add new ones |
| Rule removed | `iptables -t nat -D` for that rule only |

No full flush/reload unless explicitly requested.

## Edge Cases

- **Node offline during update**: on reconnect the dashboard sends the group's current desired state, so recovery does not depend on retaining every historical event.
- **Duplicate iptables rules**: Agent maintains local state file (`/etc/relay-agent/state.json`) as source of truth for what's currently applied. On startup, reconciles with actual iptables state.
- **Dashboard unreachable**: Agent keeps running with last-known config. Reconnects with exponential backoff.
- **Port conflict**: Dashboard validates port uniqueness within a group before saving.
- **Partial apply failure**: the agent does not advance its version, reports the failure, and reconnects to retry from desired state.
- **Group reassignment/deletion**: the live connection is closed; reconnect reconciliation removes rules from the previous group before acknowledging the new state.
- **Rollback**: restore a tested SQLite backup or apply a compensating rule change; arbitrary version rollback is not currently exposed in the UI.

## Security

- Dashboard behind HTTPS (recommend nginx reverse proxy + Let's Encrypt)
- API keys are random 256-bit tokens, stored hashed in DB
- Bootstrap tokens: single-use, expire in 10 minutes
- Bootstrap token claiming is atomic, and downloaded agent binaries are SHA-256 verified
- WebSocket connection authenticated via API key in initial handshake
- Agent validates dashboard TLS certificate
