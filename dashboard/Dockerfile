# ---- Dependencies stage ----
# Isolated so the npm ci layer is cached independently of source code changes.
# Only invalidated when package.json / package-lock.json change.
FROM node:22-alpine AS deps

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY dashboard/package.json dashboard/package-lock.json* ./
RUN npm ci

# ---- Build stage ----
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY dashboard/package.json dashboard/package-lock.json* ./
COPY dashboard/tsconfig.json dashboard/next.config.ts dashboard/postcss.config.mjs dashboard/drizzle.config.ts ./
COPY dashboard/server.ts ./
COPY dashboard/src/ ./src/

RUN npm run build
RUN npm prune --omit=dev

# ---- Production stage ----
FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache su-exec

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/tsconfig.json ./
COPY --from=builder --chown=node:node /app/next.config.ts ./
COPY --from=builder --chown=node:node /app/server.ts ./
COPY --from=builder --chown=node:node /app/src/ ./src/

RUN mkdir -p /app/data /app/releases && chown -R node:node /app/data /app/releases

# Copy pre-built agent binaries into the image
COPY --chown=node:node releases/ /app/releases/
COPY --chmod=755 dashboard/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN cd /app/releases && for file in relay-agent-*; do \
      case "$file" in *.sha256) continue ;; esac; \
      [ -f "$file" ] && sha256sum "$file" > "$file.sha256"; \
    done && chown -R node:node /app/releases

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["./node_modules/.bin/tsx", "server.ts"]
