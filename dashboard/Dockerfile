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

# ---- Production stage ----
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/src/ ./src/

RUN mkdir -p /app/data /app/releases

# Copy pre-built agent binaries into the image
COPY releases/ /app/releases/

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
