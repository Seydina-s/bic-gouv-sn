# The real-time collection of presidence.sn (services/ingestion), on Node 24.
# Built from the repository root:
#   docker build -f infra/docker/ingestion.Dockerfile -t bgs-ingestion .
# One single instance per data volume (a lock refuses a second one). Data: a
# volume on /app/.data, shared with the API. No secret in the image.
ARG NODE_IMAGE=node:24.21.0-bookworm-slim

FROM ${NODE_IMAGE} AS base
ENV CI=1
RUN corepack enable && corepack prepare pnpm@12.6.0 --activate
WORKDIR /app

FROM base AS runtime
COPY . .
# tsx runs the TypeScript sources, as in development (a dev dependency here).
RUN pnpm install --frozen-lockfile --filter @bgs/ingestion... \
  && mkdir -p /app/.data \
  && chown node:node /app/.data
ENV NODE_ENV=production
USER node
WORKDIR /app/services/ingestion
VOLUME ["/app/.data"]
CMD ["node_modules/.bin/tsx", "src/cli/watch.ts"]
