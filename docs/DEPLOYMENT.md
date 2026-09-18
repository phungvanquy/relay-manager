# Production Deployment

Relay Manager is published as a public multi-architecture image in GitHub Container Registry:

```text
ghcr.io/phungvanquy/relay-manager
```

Supported platforms are `linux/amd64` and `linux/arm64`. Use a versioned tag such as `v0.1.0` for production. The `latest` tag moves whenever a new release is published.

## Prerequisites

- Docker Engine with the Compose plugin
- A persistent Docker volume for SQLite data
- An HTTPS reverse proxy with WebSocket support
- A public DNS name for the dashboard

The dashboard intentionally refuses weak placeholder credentials and plain HTTP unless `ALLOW_INSECURE_HTTP=true` is explicitly set for local testing.

## Install

Clone the repository to obtain the deployment Compose file:

```bash
git clone https://github.com/phungvanquy/relay-manager.git
cd relay-manager/deploy
cp .env.example .env
```

Configure `.env`:

```env
ADMIN_PASSWORD=replace-with-a-long-random-password
JWT_SECRET=replace-with-at-least-32-random-characters
DASHBOARD_URL=https://relay.example.com
PORT=4000
BIND_ADDRESS=127.0.0.1
IMAGE_TAG=v0.1.0
```

Generate the JWT secret with a cryptographically secure tool, for example:

```bash
openssl rand -hex 32
```

Start the service:

```bash
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 dashboard
```

The health check calls `/api/health` and verifies database access. Wait for the container to report `healthy` before routing traffic to it.

## Reverse Proxy

The published Compose file binds to `127.0.0.1:4000` by default. Terminate TLS at the reverse proxy and forward both normal HTTP requests and WebSocket upgrades.

Required behavior:

- Proxy normal requests to `http://127.0.0.1:4000`
- Preserve `Host`, `X-Forwarded-For`, and `X-Forwarded-Proto`
- Upgrade `/ws/agent` connections to WebSocket
- Use a long WebSocket read timeout
- Redirect public HTTP traffic to HTTPS

The source deployment includes [a reference Nginx configuration](../nginx/nginx.conf).

## Persistent Data

The `dashboard_data` volume contains the SQLite database. Removing the container does not remove this volume, but `docker compose down -v` does. Do not use `-v` during routine updates.

Create a consistent backup by stopping writes briefly:

```bash
DATA_VOLUME=$(docker inspect "$(docker compose ps -q dashboard)" \
  --format '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Name}}{{end}}{{end}}')
docker compose stop dashboard
docker run --rm \
  -v "$DATA_VOLUME":/data:ro \
  -v "$(pwd)":/backup \
  alpine tar czf /backup/relay-manager-$(date +%F).tar.gz -C /data .
docker compose start dashboard
```

The volume name depends on the Compose project name. Confirm it with `docker volume ls` before backing up or restoring. Periodically test restoration into a separate volume.

## Upgrade

Read the [release notes](https://github.com/phungvanquy/relay-manager/releases), take a backup, and then update the pinned tag:

```env
IMAGE_TAG=v0.2.0
```

Apply the update:

```bash
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 dashboard
```

Database migrations run automatically at startup. Do not run two dashboard versions against the same SQLite volume during an upgrade.

## Rollback

If the release notes allow rollback, restore the previous `IMAGE_TAG` and recreate the service:

```bash
docker compose pull
docker compose up -d
```

If a newer release changed the database incompatibly, stop the dashboard and restore the backup made before the upgrade. Never restore a live SQLite volume while the dashboard is running.

## Verify the Published Image

Inspect the remote multi-platform manifest without pulling it:

```bash
docker buildx imagetools inspect ghcr.io/phungvanquy/relay-manager:v0.1.0
```

For strict pinning, deploy the release digest shown by that command:

```yaml
image: ghcr.io/phungvanquy/relay-manager@sha256:2ab3e6a4ed1e16b27d3c2ab03931dc3f0cc9a777aa39f72dec3866cc6e179ec0
```

## Troubleshooting

Check service state and recent logs:

```bash
docker compose ps
docker compose logs --tail=200 dashboard
curl -fsS http://127.0.0.1:4000/api/health
```

Common startup failures are rejected placeholder credentials, a `JWT_SECRET` shorter than 32 characters, an invalid `DASHBOARD_URL`, an unwritable data volume, or a port already in use.
