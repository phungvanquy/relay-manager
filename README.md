# Relay Manager

Centralized management system for iptables port forwarding rules across multiple relay nodes. Replaces manual per-node bash scripts with a web dashboard and lightweight Go agents that sync rules in real time.

[Latest release](https://github.com/phungvanquy/relay-manager/releases/latest) · [Container package](https://github.com/phungvanquy/relay-manager/pkgs/container/relay-manager) · [Deployment guide](docs/DEPLOYMENT.md)

## Architecture

```
┌──────────────────────────────────────────────┐
│           Dashboard (Next.js)                 │
│   Web UI ─── REST API ─── WebSocket Server   │
│                    │                          │
│                 SQLite                        │
└────────────────────┬─────────────────────────┘
                     │  wss://
        ┌────────────┼────────────┐
        │            │            │
   ┌────┴────┐  ┌────┴────┐  ┌───┴─────┐
   │ Agent 1 │  │ Agent 2 │  │ Agent N │
   │ Go bin  │  │ Go bin  │  │ Go bin  │
   │iptables │  │iptables │  │iptables │
   └─────────┘  └─────────┘  └─────────┘
```

| Component | Stack | Purpose |
|-----------|-------|---------|
| Dashboard | Next.js 16, Drizzle, SQLite | Web UI + REST API + WebSocket server |
| Agent | Go 1.22, gorilla/websocket | Runs on each node, applies iptables rules |
| Proxy | Nginx | HTTPS termination, WebSocket proxy |

### Key concepts

**Groups** — rules are organized into groups. Each group has a monotonic `config_version` that increments on every change. Nodes are assigned to a group and receive that group's rules.

**Desired-state reconciliation** — on every connection, the dashboard sends the complete desired rule set and its version. The agent removes stale rules, repairs missing rules, persists the resulting state, and only then acknowledges the version.

**Incremental sync** — after reconciliation, the dashboard pushes ordered deltas (`add` / `update` / `remove`). A failed or out-of-order event closes the connection and is retried from authoritative desired state.

**Reconciliation** — on startup the agent compares its local state file against actual iptables rules and re-adds any that are missing (e.g. after a reboot).

## Production Deployment

The public multi-architecture image supports Linux AMD64 and ARM64. Pin a version in production instead of tracking `latest`:

```bash
git clone https://github.com/phungvanquy/relay-manager.git
cd relay-manager/deploy
cp .env.example .env
```

Edit `.env`, replacing every placeholder and setting a released image tag:

```env
ADMIN_PASSWORD=replace-with-a-long-random-password
JWT_SECRET=replace-with-at-least-32-random-characters
DASHBOARD_URL=https://relay.example.com
PORT=4000
BIND_ADDRESS=127.0.0.1
IMAGE_TAG=v0.1.0
```

Start the dashboard:

```bash
docker compose pull
docker compose up -d
docker compose ps
```

The service listens on `127.0.0.1:4000` by default. Put an HTTPS reverse proxy in front of it and preserve WebSocket upgrades for `/ws/agent`. See [Production Deployment](docs/DEPLOYMENT.md) for upgrades, rollback, backups, health checks, and proxy requirements.

## Source Deployment

### 1. Clone and configure

```bash
git clone https://github.com/phungvanquy/relay-manager.git
cd relay-manager
cp .env.example .env
```

Edit `.env`:

```env
ADMIN_PASSWORD=your-secure-password
JWT_SECRET=at-least-32-random-characters-here
DASHBOARD_URL=https://yourdomain.com
CERT_PATH=/etc/letsencrypt/live/yourdomain.com
```

### 2. Obtain a TLS certificate

```bash
sudo certbot certonly --standalone -d yourdomain.com
# CERT_PATH → /etc/letsencrypt/live/yourdomain.com
```

### 3. Build agent binaries

```bash
make agent # builds linux/amd64 + linux/arm64 binaries and checksums
```

The dashboard serves files from `./releases/` as part of the bootstrap script.

### 4. Start the dashboard

```bash
docker compose up -d
docker compose logs -f dashboard
```

Navigate to `https://yourdomain.com` and log in with `ADMIN_PASSWORD`.

### 5. Create a group and a node

1. **Groups → + Create** — give it a name (e.g. `production`)
2. **Nodes → + Create** — enter a name, assign to the group
3. Copy the bootstrap command shown after creation

### 6. Bootstrap an agent

SSH into the relay node and run the command copied from step 5:

```bash
curl -fsSL https://yourdomain.com/api/bootstrap/<TOKEN> | bash
```

The bootstrap script:
- Downloads and verifies the agent binary for Linux amd64 or arm64
- Installs it to `/usr/local/bin/relay-agent`
- Writes config to `/etc/relay-agent/config.json`
- Creates and starts a systemd service

Check agent status:

```bash
sudo systemctl status relay-agent
sudo journalctl -u relay-agent -f
```

### 7. Add forwarding rules

Go to **Groups → [your group] → + Add Rule**:

| Field | Example |
|-------|---------|
| Name | `wireguard-us` |
| Source Port | `51820` |
| Destination IP | `10.0.0.5` |
| Destination Port | `51820` |
| Protocol | `udp` |

The rule is saved, the group version increments, and all online agents in the group receive the change within ~1 second.

## Configuration

### Dashboard (`docker-compose.yml` environment)

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_PASSWORD` | — | Web UI password; at least 12 characters, **must be set** |
| `JWT_SECRET` | — | Session signing secret; at least 32 characters, **must be set** |
| `DASHBOARD_URL` | — | HTTPS public URL used in bootstrap commands and agent WebSocket config |
| `PORT` | `3000` | Internal listen port (inside container) |

### Agent (`/etc/relay-agent/config.json`)

```json
{
  "dashboard_url": "wss://yourdomain.com/ws/agent",
  "node_id": "node-xxxx",
  "api_key": "...",
  "state_file": "/etc/relay-agent/state.json",
  "log_level": "info"
}
```

The agent accepts an optional path argument: `relay-agent /path/to/config.json`. Default is `/etc/relay-agent/config.json`.

### Agent state (`/etc/relay-agent/state.json`)

Tracks the current config version and every applied rule. Updates are written atomically with private file permissions before a version is acknowledged.

## Deployment

### Docker Compose

```bash
docker compose up -d                             # start
docker compose down                              # stop
docker compose logs -f                           # logs
docker compose pull && docker compose up -d      # update
docker compose ps                                # health/status
```

The SQLite database is stored in the `dashboard_data` named volume and persists across restarts.

**Consistent backup:** stop dashboard writes briefly before archiving the SQLite volume.

```bash
DATA_VOLUME=$(docker inspect "$(docker compose ps -q dashboard)" \
  --format '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Name}}{{end}}{{end}}')
docker compose stop dashboard
docker run --rm \
  -v "$DATA_VOLUME":/data:ro \
  -v "$(pwd)":/backup \
  alpine tar czf /backup/db-$(date +%F).tar.gz -C /data .
docker compose start dashboard
```

Periodically restore a backup into a temporary volume and start the dashboard against it; a backup is only useful once its restore has been tested.

The published-image Compose file binds to `127.0.0.1` by default. Put an HTTPS reverse proxy in front of it and set `DASHBOARD_URL` to the public HTTPS URL.

Release images are public and published for `linux/amd64` and `linux/arm64` at `ghcr.io/phungvanquy/relay-manager`.

```bash
docker pull ghcr.io/phungvanquy/relay-manager:v0.1.0 # recommended: immutable release
docker pull ghcr.io/phungvanquy/relay-manager:latest # moving tag
```

Each release publishes `vX.Y.Z`, `X.Y.Z`, and `latest` tags pointing to the same multi-platform image. See [Releasing](docs/RELEASING.md) for the automated workflow and verification commands.

### Nginx

The included `nginx/nginx.conf`:
- Redirects HTTP → HTTPS
- Proxies all requests to the dashboard container
- Handles WebSocket upgrade for `/ws/agent` with a 24-hour read timeout

Certificates are mounted from `CERT_PATH` on the host.

## WebSocket Protocol

Agents connect to `wss://yourdomain.com/ws/agent`. All messages are JSON.

| Message | Direction | Purpose |
|---------|-----------|---------|
| `bootstrap` | Agent → Dashboard | Exchange single-use token for API key |
| `bootstrap_ack` | Dashboard → Agent | Returns `node_id`, `api_key`, `group_id` |
| `hello` | Agent → Dashboard | Authenticate and report `config_version` |
| `hello_ack` | Dashboard → Agent | Sends authoritative `desired_rules` and `config_version` |
| `sync_event` | Dashboard → Agent | Push a single rule change (`add`/`update`/`remove`) |
| `apply_result` | Agent → Dashboard | Report success/failure of a rule application |
| `heartbeat` | Agent → Dashboard | Sent every 30 s |
| `heartbeat_ack` | Dashboard → Agent | Acknowledge heartbeat, return server time |

Agents are marked **offline** after 90 seconds without a heartbeat.

## API Reference

All endpoints require a valid session cookie (set by `POST /api/auth/login`), except bootstrap.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | `{"password":"..."}` → sets cookie |
| `POST` | `/api/auth/logout` | Clears session cookie |
| `GET` | `/api/auth/check` | Returns `{"authenticated": true/false}` |

### Groups
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/groups` | List all groups |
| `POST` | `/api/groups` | Create group `{"name":"..."}` |
| `GET` | `/api/groups/:id` | Get group with rules and nodes |
| `PUT` | `/api/groups/:id` | Update group name |
| `DELETE` | `/api/groups/:id` | Delete group (cascades rules) |

### Rules
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/groups/:id/rules` | List rules for a group |
| `POST` | `/api/groups/:id/rules` | Create rule |
| `PUT` | `/api/groups/:id/rules/:rid` | Update rule |
| `DELETE` | `/api/groups/:id/rules/:rid` | Delete rule |

### Nodes
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/nodes` | List all nodes |
| `POST` | `/api/nodes` | Create node, returns bootstrap token + command |
| `GET` | `/api/nodes/:id` | Get node |
| `PUT` | `/api/nodes/:id` | Update node (name, group) |
| `DELETE` | `/api/nodes/:id` | Delete node |
| `POST` | `/api/nodes/:id/bootstrap` | Issue a new bootstrap token |

### Other
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/bootstrap/:token` | Returns bootstrap shell script (no auth) |
| `GET` | `/api/audit` | Audit log (`?limit=50&offset=0`) |
| `GET` | `/api/health` | Database-backed health check |

## Development

### Dashboard

```bash
cd dashboard
npm install
npm run dev          # http://localhost:3000
npm run build        # production build
npm run db:studio    # Drizzle Studio GUI
```

Requires a `.env.local` (copy from `dashboard/.env.example`).

### Agent

```bash
cd agent
make build           # bin/relay-agent (native)
make build-linux     # bin/relay-agent-linux-amd64 + arm64
make clean
```

Run locally (needs a config file):

```bash
./bin/relay-agent /path/to/config.json
```

## Project Structure

```
relay-manager/
├── dashboard/
│   ├── src/
│   │   ├── app/              # Next.js App Router pages + API routes
│   │   ├── components/       # React components
│   │   └── lib/
│   │       ├── db/           # Drizzle schema, migrations, relations
│   │       ├── ws/           # WebSocket server, registry, push
│   │       ├── sync/         # Rule mutation + config event helpers
│   │       └── auth.ts       # JWT session utilities
│   ├── server.ts             # Custom HTTP+WebSocket server entry point
│   └── Dockerfile
├── agent/
│   ├── cmd/relay-agent/      # main.go — entry point + reconciliation
│   └── internal/
│       ├── client/           # WebSocket client + message types
│       ├── config/           # Config file load/save
│       ├── iptables/         # Rule add/remove/exists/persist
│       └── state/            # Local state file (version + applied rules)
├── nginx/
│   └── nginx.conf
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   └── RELEASING.md
├── releases/                 # Agent binaries served to bootstrap scripts
├── docker-compose.yml
├── .env.example
├── port_forwarding.bash      # Legacy script (kept for reference)
└── rules.conf                # Legacy rules format (pipe-delimited)
```

## Troubleshooting

**Agent won't connect**
```bash
sudo journalctl -u relay-agent -n 50
cat /etc/relay-agent/config.json        # check dashboard_url
```

**Rules not applied**
```bash
cat /etc/relay-agent/state.json         # check applied_rules and config_version
sudo iptables -t nat -L PREROUTING -n   # verify iptables directly
docker compose logs dashboard           # check for sync errors
```

**Node stuck offline**
- Nodes go offline after 90 s without heartbeat
- Check outbound connectivity from node to dashboard on port 443
- Check agent logs for reconnect backoff messages

## Migration from Legacy

The legacy `port_forwarding.bash` + `rules.conf` workflow remains intact for backward compatibility. To migrate:

1. Create a group in the dashboard matching your node set
2. Import rules manually via the UI (or use the REST API)
3. Bootstrap agents on each node
4. Stop running `port_forwarding.bash` — agents take over iptables management
