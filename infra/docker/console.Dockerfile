# The administration console (apps/admin, Next.js), on Node 24.
# Built from the repository root:
#   docker build -f infra/docker/console.Dockerfile -t bgs-console .
# At run time: API_URL (the API's internal address). No secret in the image.
ARG NODE_IMAGE=node:24.21.0-bookworm-slim

FROM ${NODE_IMAGE} AS base
ENV CI=1 NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@12.6.0 --activate
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile --filter @bgs/admin... \
  && pnpm --filter @bgs/admin build

FROM base AS prod-deps
COPY . .
RUN pnpm install --frozen-lockfile --prod --filter @bgs/admin...

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  PORT=3001
WORKDIR /app
COPY --from=build /app/pnpm-workspace.yaml ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/admin/node_modules ./apps/admin/node_modules
# The workspace packages the console's node_modules link to (shipped as sources).
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/admin/package.json /app/apps/admin/next.config.ts ./apps/admin/
COPY --from=build --chown=node:node /app/apps/admin/.next ./apps/admin/.next
USER node
WORKDIR /app/apps/admin
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT ?? 3001) + '/connexion').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["sh", "-c", "exec node node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port \"$PORT\""]
