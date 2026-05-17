## Why

The relay manager dashboard currently runs via `npx tsx server.ts` directly on the host. For production deployment, we need containerized builds for reproducibility, easy deployment, and isolation. Docker + Docker Compose provides a standard way to deploy the dashboard (and eventually the agent build pipeline) on any VPS.

## What Changes

- Add a multi-stage Dockerfile for the Next.js dashboard (build + production image)
- Add a Docker Compose file for production deployment with environment configuration
- Include nginx reverse proxy configuration for HTTPS termination
- Ensure the SQLite database persists via Docker volumes

## Capabilities

### New Capabilities
- `docker-deployment`: Dockerfile, Docker Compose, and nginx config for production deployment of the dashboard

### Modified Capabilities

## Impact

- New files: `Dockerfile`, `docker-compose.yml`, `nginx.conf` at project root or `dashboard/`
- Dashboard must build cleanly in Docker (Node.js 22 + better-sqlite3 native module)
- SQLite database file must be mounted as a volume for persistence
- Agent binary distribution: built binaries served from a volume or baked into the image
- Environment variables (`ADMIN_PASSWORD`, `JWT_SECRET`, `DASHBOARD_URL`, `PORT`) configured via compose
