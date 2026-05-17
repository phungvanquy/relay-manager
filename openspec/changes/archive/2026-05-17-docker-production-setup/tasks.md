## 1. Dockerfile

- [x] 1.1 Create multi-stage Dockerfile in `dashboard/` with build stage (node:22-alpine + build tools + npm ci + next build)
- [x] 1.2 Add production stage that copies built output, production node_modules, and server.ts
- [x] 1.3 Add `.dockerignore` to exclude node_modules, .next, .env, and data/

## 2. Nginx Configuration

- [x] 2.1 Create `nginx/nginx.conf` with HTTPS termination, HTTP→HTTPS redirect, and proxy_pass to dashboard
- [x] 2.2 Add WebSocket upgrade headers (Upgrade, Connection) for /ws/agent path
- [x] 2.3 Add proxy headers (X-Real-IP, X-Forwarded-For, X-Forwarded-Proto, Host)

## 3. Docker Compose

- [x] 3.1 Create `docker-compose.yml` with dashboard service (build context, env vars, named volume for data, bind mount for releases)
- [x] 3.2 Add nginx service with cert bind mounts, port 80/443 exposure, depends_on dashboard
- [x] 3.3 Define named volume for SQLite persistence and internal network
- [x] 3.4 Add restart policy (unless-stopped) to both services

## 4. Environment and Documentation

- [x] 4.1 Create `docker-compose.yml` compatible `.env.example` with all required variables (ADMIN_PASSWORD, JWT_SECRET, DASHBOARD_URL, PORT, CERT_PATH)
- [x] 4.2 Verify dashboard image builds successfully with `docker build`
