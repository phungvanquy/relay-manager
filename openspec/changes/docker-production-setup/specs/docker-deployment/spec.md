## ADDED Requirements

### Requirement: Multi-stage Docker image builds dashboard
The system SHALL provide a Dockerfile that builds the Next.js dashboard using a multi-stage build with `node:22-alpine`. The build stage SHALL install native compilation tools (python3, make, g++) for better-sqlite3, run `npm ci`, and build the Next.js app. The production stage SHALL copy only the built output and production node_modules, resulting in a minimal image.

#### Scenario: Successful image build
- **WHEN** user runs `docker build -t relay-dashboard .` from the dashboard directory
- **THEN** the image builds successfully with Next.js compiled output and better-sqlite3 native module

#### Scenario: Production image excludes build tools
- **WHEN** the production image is inspected
- **THEN** it does not contain python3, make, or g++ (only present in build stage)

#### Scenario: Image size is minimal
- **WHEN** the production image is built
- **THEN** the final image size is under 300MB

### Requirement: Docker Compose orchestrates full stack
The system SHALL provide a `docker-compose.yml` that starts the dashboard container and an nginx reverse proxy container with a single `docker compose up -d` command. The compose file SHALL configure environment variables, volumes, networks, and container dependencies.

#### Scenario: Full stack starts with single command
- **WHEN** user runs `docker compose up -d` from the project root
- **THEN** both the dashboard and nginx containers start and become healthy

#### Scenario: Environment configuration via .env
- **WHEN** user creates a `.env` file with ADMIN_PASSWORD, JWT_SECRET, DASHBOARD_URL, and PORT
- **THEN** the dashboard container uses those values without rebuilding the image

#### Scenario: Containers restart on failure
- **WHEN** the dashboard container crashes
- **THEN** Docker automatically restarts it (restart policy: unless-stopped)

### Requirement: SQLite database persists across restarts
The system SHALL mount the dashboard's data directory as a Docker named volume so the SQLite database file survives container recreation and `docker compose down`.

#### Scenario: Data survives container recreation
- **WHEN** user runs `docker compose down` followed by `docker compose up -d`
- **THEN** all previously created nodes, groups, and rules are still present

#### Scenario: Volume is a named volume
- **WHEN** the compose file is inspected
- **THEN** the SQLite data directory uses a named volume (not a bind mount)

### Requirement: Nginx handles HTTPS termination
The system SHALL provide an nginx configuration that terminates HTTPS, proxies requests to the dashboard container, and correctly handles WebSocket upgrade requests. TLS certificates SHALL be mounted from the host filesystem.

#### Scenario: HTTPS requests proxy to dashboard
- **WHEN** a client makes an HTTPS request to the nginx container on port 443
- **THEN** nginx proxies the request to the dashboard container on its internal port

#### Scenario: WebSocket connections upgrade correctly
- **WHEN** a client initiates a WebSocket connection to wss://host/ws/agent
- **THEN** nginx passes the Upgrade and Connection headers to the dashboard container and the WebSocket connection is established

#### Scenario: HTTP redirects to HTTPS
- **WHEN** a client makes an HTTP request on port 80
- **THEN** nginx responds with a 301 redirect to the HTTPS equivalent

#### Scenario: Certificates mounted from host
- **WHEN** the compose file is inspected
- **THEN** the nginx container bind-mounts certificate files from a configurable host path

### Requirement: Agent binaries served via bind mount
The system SHALL serve pre-built Go agent binaries from a host directory mounted into the dashboard container. The user builds agent binaries separately and places them in the mounted directory.

#### Scenario: Binary available for download
- **WHEN** a compiled agent binary exists at `./releases/relay-agent-linux-amd64` on the host
- **THEN** it is accessible via the dashboard's `/releases/relay-agent-linux-amd64` URL path

#### Scenario: New binaries available without rebuild
- **WHEN** user places a new binary version in the releases directory
- **THEN** it becomes immediately available for download without restarting containers
