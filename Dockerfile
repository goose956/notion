FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_OPTIONS="--max-old-space-size=3072"
ENV NEXT_TELEMETRY_DISABLED="1"
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/adapter-runtime/package.json ./packages/adapter-runtime/
COPY packages/agent-runtime/package.json ./packages/agent-runtime/
COPY packages/agent-tools/package.json ./packages/agent-tools/
COPY packages/ai/package.json ./packages/ai/
COPY packages/db/package.json ./packages/db/
COPY packages/deployer/package.json ./packages/deployer/
COPY packages/exporter/package.json ./packages/exporter/
COPY packages/notion-client/package.json ./packages/notion-client/
COPY packages/schema/package.json ./packages/schema/
COPY packages/sync-engine/package.json ./packages/sync-engine/
COPY niches/package.json ./niches/
RUN pnpm install --frozen-lockfile

# Build
FROM deps AS builder
WORKDIR /app
COPY . .
RUN pnpm --filter web build

# Runtime
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app .
EXPOSE 3000
CMD pnpm --filter @niche-factory/db migrate ; pnpm --filter @niche-factory/db seed ; pnpm --filter web start
