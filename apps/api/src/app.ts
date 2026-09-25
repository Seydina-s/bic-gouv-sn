import { randomUUID } from "node:crypto";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import * as Sentry from "@sentry/node";
import Fastify, { type FastifyInstance } from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import type { ArticleRepository } from "@bgs/content-store";
import type { Config } from "./config";
import { registerErrorHandlers } from "./errors";
import { registerSecurity } from "./security";
import { healthRoutes } from "./routes/health";
import { registerMedia } from "./routes/media";
import { newsRoutes } from "./routes/news";

export interface AppOptions {
  config: Config;
  version: string;
  articles: ArticleRepository;
}

/** Builds the API without listening, so tests can call it in memory. */
export async function buildApp({
  config,
  version,
  articles,
}: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      redact: ["req.headers.authorization", "req.headers.cookie"],
    },
    genReqId: () => randomUUID(),
  });

  // Reports unexpected (5xx) errors to Sentry when monitoring is on (see instrument.ts).
  if (Sentry.isInitialized()) {
    Sentry.setupFastifyErrorHandler(app);
  }
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandlers(app);
  // Returned to the client so an incident can be traced from the app to the logs.
  app.addHook("onRequest", (request, reply, done) => {
    void reply.header("x-request-id", request.id);
    done();
  });

  await registerSecurity(app, config);

  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: { title: "Bic Gouv SN API", version },
    },
    transform: jsonSchemaTransform,
  });
  // Interactive docs only outside production: nothing extra exposed publicly.
  if (config.NODE_ENV !== "production") {
    await app.register(swaggerUi, { routePrefix: "/docs" });
  }

  await app.register(healthRoutes, {
    prefix: "/v1",
    version,
    // Ready = able to read the article store.
    isReady: () =>
      articles.list({ limit: 1 }).then(
        () => true,
        () => false,
      ),
  });
  await app.register(newsRoutes, {
    prefix: "/v1",
    articles,
    mediaBaseUrl: config.MEDIA_BASE_URL,
  });
  // With a CDN configured, media are served from there, not by the API.
  if (config.MEDIA_BASE_URL === undefined) {
    await registerMedia(app, config.MEDIA_ROOT);
  }
  app.get("/v1/openapi.json", { schema: { hide: true } }, () => app.swagger());

  return app;
}
