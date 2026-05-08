# syntax=docker/dockerfile:1.7
#
# Build context expected at the REPO ROOT (not the keeper/ directory) — this
# Dockerfile reads from both keeper/ and shared/. On Railway: leave the
# service's "Root Directory" blank and set "Dockerfile Path" to
# `keeper/Dockerfile`.
#
# Cache-bust 2026-05-08: Railway deploy was stuck on pre-Phase-18 image
# despite a no-op trigger commit. Touching the Dockerfile invalidates the
# `deps`/`builder` layer cache so the next deploy rebuilds from source.

FROM node:20-bookworm-slim AS deps

# corepack ships with Node 20; pin pnpm and avoid the network prompt.
RUN corepack enable && corepack prepare pnpm@10.33.3 --activate

WORKDIR /app

# Workspace manifest first so dep resolution caches independently of source.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY keeper/package.json ./keeper/

# We deploy only the keeper, but pnpm needs the other workspaces' package.json
# files referenced from the lockfile to satisfy the workspace protocol.
COPY web/package.json ./web/
COPY shared/package.json ./shared/
COPY programs/looking_glass/package.json ./programs/looking_glass/

RUN pnpm install --filter keeper... --frozen-lockfile

# --- builder ----------------------------------------------------------------

FROM deps AS builder

COPY tsconfig.json ./
COPY shared/ ./shared/
COPY keeper/ ./keeper/

WORKDIR /app/keeper
RUN pnpm exec tsc -p .

# --- runtime ----------------------------------------------------------------

FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV LOG_FORMAT=json

WORKDIR /app

# Bring over only what the runtime needs: dist + node_modules + the IDL the
# anchor client reads at startup.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/keeper/node_modules ./keeper/node_modules
COPY --from=builder /app/keeper/dist ./keeper/dist
COPY --from=builder /app/keeper/package.json ./keeper/package.json
COPY --from=builder /app/shared ./shared

# Drop privileges
USER node

EXPOSE 7777
WORKDIR /app/keeper
CMD ["node", "dist/index.js"]
