## Context

The relay manager dashboard is a Next.js app with a custom server (for WebSocket support), SQLite database, and serves Go agent binaries. Currently deployed by running `npx tsx server.ts` directly. For production, we need a containerized setup that handles:
- Building the Next.js app with native dependencies (better-sqlite3)
- Running behind nginx for HTTPS termination
- Persisting the SQLite database across container restarts
- Serving pre-built Go agent binaries for bootstrap downloads

## Goals / Non-Goals

**Goals:**
- Single `docker compose up -d` to deploy the full stack (dashboard + nginx)
- Minimal image size using multi-stage builds
- SQLite data persists via named volume
- Environment-based configuration (no secrets in image)
- nginx handles HTTPS with Let's Encrypt certs (mounted from host)

**Non-Goals:**
- Building the Go agent inside Docker (built separately, binaries mounted or copied in)
- Automated Let's Encrypt cert renewal (user handles via certbot on host)
- Horizontal scaling (single instance is sufficient for <100 nodes)
- CI/CD pipeline

## Decisions

**1. Multi-stage Dockerfile for dashboard**
- Stage 1: `node:22-alpine` — install deps + build Next.js
- Stage 2: `node:22-alpine` — copy built output + production deps only
- Rationale: Keeps final image small (~200MB vs ~1GB). Alpine for minimal attack surface.
- Alternative: Single-stage (simpler but 3x image size) — rejected.

**2. better-sqlite3 native compilation**
- Install build tools (`python3`, `make`, `g++`) in build stage only
- The native module compiles during `npm install` in the build stage
- Final stage only needs the compiled `.node` binary
- Rationale: better-sqlite3 requires native compilation but we don't need build tools at runtime.

**3. nginx as reverse proxy in separate container**
- Handles HTTPS termination, WebSocket upgrade (`Upgrade` + `Connection` headers)
- Proxies to dashboard container on internal Docker network
- Certs mounted from host path (user manages certbot separately)
- Rationale: Standard pattern. Keeps dashboard container simple. Easy to swap for Caddy/Traefik later.

**4. SQLite database as named volume**
- Mount `/app/data` as a Docker named volume
- Dashboard writes `relay-manager.db` there
- Rationale: Named volumes survive `docker compose down` and are easy to backup.

**5. Agent binaries as bind mount**
- Mount `./releases/` from host into container at `/app/public/releases/`
- User builds Go agent separately and places binaries there
- Rationale: Decouples agent build from dashboard deployment. Binaries are large and change infrequently.

## Risks / Trade-offs

- [SQLite in Docker] WAL mode requires the volume to be on a local filesystem (not NFS) → Document this requirement
- [Single container] No HA, but acceptable for <100 nodes → Non-goal
- [Cert management] User must handle certbot/renewal outside Docker → Document in README
- [Alpine + native modules] Occasionally breaks with new Node versions → Pin Node version in Dockerfile
