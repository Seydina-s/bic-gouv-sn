# The public and admin API (apps/api), bundled by tsdown, on Node 24.
# Built from the repository root:
#   docker build -f infra/docker/api.Dockerfile -t bgs-api .
# Secrets come from the hosting secret manager at run time, never from the image
# (docs/securite-des-secrets.md). Data: a volume on /app/.data.
ARG NODE_IMAGE=node:24.21.0-bookworm-slim

FROM ${NODE_IMAGE} AS base
ENV CI=1
RUN corepack enable && corepack prepare pnpm@12.6.0 --activate
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile --filter @bgs/api... \
  && pnpm --filter @bgs/api build

FROM base AS prod-deps
COPY . .
RUN pnpm install --frozen-lockfile --prod --filter @bgs/api...

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
  HOST=0.0.0.0 \
  PORT=3000
WORKDIR /app
# The workspace file makes /app the root the data paths are read from (/app/.data).
COPY --from=build /app/pnpm-workspace.yaml ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/apps/api/dist ./apps/api/dist
RUN mkdir -p /app/.data && chown node:node /app/.data
USER node
WORKDIR /app/apps/api
EXPOSE 3000
VOLUME ["/app/.data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT ?? 3000) + '/v1/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "--import", "./dist/instrument.mjs", "dist/server.mjs"]
