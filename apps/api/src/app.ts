import { randomUUID } from "node:crypto";
import compress from "@fastify/compress";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import * as Sentry from "@sentry/node";
import Fastify, { type FastifyInstance, type FastifyLoggerOptions } from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import {
  FileProcedureRepository,
  FileProcedureThemeStore,
  FileRemoteConfigStore,
  FileStateServiceStore,
  type ArticleRepository,
  type ProcedureRepository,
} from "@bgs/content-store";
import { FileAdminAccountStore } from "./admin/account-store";
import { FileAuditJournal, type AuditJournal } from "./admin/audit-journal";
import { SecretBox } from "./admin/secret-box";
import { AdminSignIn } from "./admin/sign-in-service";
import type { Config } from "./config";
import { registerErrorHandlers } from "./errors";
import { registerSecurity } from "./security";
import { adminAuthRoutes } from "./routes/admin-auth";
import { adminProcedureThemesRoutes } from "./routes/admin-procedure-themes";
import { adminErrorsRoutes } from "./routes/admin-errors";
import { adminNewsRoutes } from "./routes/admin-news";
import { adminNotificationsRoutes } from "./routes/admin-notifications";
import { adminSearchMissesRoutes } from "./routes/admin-search-misses";
import { adminServicesRoutes } from "./routes/admin-services";
import { adminRemoteConfigRoutes, remoteConfigRoutes } from "./routes/remote-config";
import { type ErrorJournal, journalErrors } from "./journal/error-journal";
import type { SearchMisses } from "./journal/search-misses";
import {
  FileNotificationStore,
  NotificationService,
  noPushProvider,
  type PushProvider,
} from "./notifications/notifications";
import { healthRoutes } from "./routes/health";
import { registerMedia } from "./routes/media";
import { newsRoutes } from "./routes/news";
import { proceduresRoutes } from "./routes/procedures";
import { servicesRoutes } from "./routes/services";
import { mapRoutes } from "./routes/map";
import { statusRoutes } from "./routes/status";

/** Longest path parameter accepted (a procedure slug, an article id). */
const MAX_PARAM_LENGTH = 200;
/** Below this size, compressing costs more than it saves. */
const COMPRESS_FROM_BYTES = 1024;

export interface AppOptions {
  config: Config;
  version: string;
  articles: ArticleRepository;
  /** Defaults to the procedure store at PROCEDURES_STORE_PATH. */
  procedures?: ProcedureRepository;
  /** Defaults to the theme store at PROCEDURE_THEMES_PATH. */
  procedureThemes?: FileProcedureThemeStore;
  /** Defaults to the state services store at STATE_SERVICES_PATH. */
  stateServices?: FileStateServiceStore;
  /** Defaults to the remote control file at REMOTE_CONFIG_PATH. */
  remoteConfig?: FileRemoteConfigStore;
  /** Defaults to the file stores when ADMIN_SECRET_KEY is set; none otherwise. */
  admin?: AdminServices | null;
  /** Where the logs go: standard output by default, tests read them here. */
  logStream?: FastifyLoggerOptions["stream"];
  /** The console's error journal (server.ts opens it); none: errors are only logged. */
  errorJournal?: ErrorJournal | null;
  /** Searches that found nothing (server.ts opens it); none: not counted. */
  searchMisses?: SearchMisses | null;
  /** Push service for approved notifications; none until the app can receive them. */
  pushProvider?: PushProvider;
}

export interface AdminServices {
  signIn: AdminSignIn;
  journal: AuditJournal;
}

function defaultAdmin(config: Config): AdminServices | null {
  if (config.ADMIN_SECRET_KEY === undefined) {
    return null;
  }
  const journal = new FileAuditJournal(config.ADMIN_AUDIT_PATH);
  return {
    journal,
    signIn: new AdminSignIn({
      accounts: new FileAdminAccountStore(config.ADMIN_ACCOUNTS_PATH),
      journal,
      box: new SecretBox(config.ADMIN_SECRET_KEY),
    }),
  };
}

/** Builds the API without listening, so tests can call it in memory. */
export async function buildApp({
  config,
  version,
  articles,
  procedures = new FileProcedureRepository(config.PROCEDURES_STORE_PATH),
  procedureThemes = new FileProcedureThemeStore(config.PROCEDURE_THEMES_PATH),
  stateServices = new FileStateServiceStore(config.STATE_SERVICES_PATH),
  remoteConfig = new FileRemoteConfigStore(config.REMOTE_CONFIG_PATH),
  admin = defaultAdmin(config),
  logStream,
  errorJournal = null,
  searchMisses = null,
  pushProvider = noPushProvider,
}: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      redact: ["req.headers.authorization", "req.headers.cookie"],
      ...(logStream === undefined ? {} : { stream: logStream }),
    },
    genReqId: () => randomUUID(),
    // Official procedure slugs exceed the default 100 characters: those procedures
    // were answered 414 and could not be opened. Matches the routes' own limit (200).
    routerOptions: { maxParamLength: MAX_PARAM_LENGTH },
  });

  // Reports unexpected (5xx) errors to Sentry when monitoring is on (see instrument.ts).
  if (Sentry.isInitialized()) {
    Sentry.setupFastifyErrorHandler(app);
  }
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandlers(app);
  if (errorJournal !== null) {
    journalErrors(app, errorJournal);
  }
  // Answers leave compressed (gzip, or brotli when asked): on 3G, the services list
  // goes from 35 to 9 KB and the map style from 60 to 4 KB. Registered after the
  // journal, which reads error bodies before compression. Tiles are already
  // compressed and images are not compressible: both are left as they are.
  await app.register(compress, { threshold: COMPRESS_FROM_BYTES });
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
  await app.register(proceduresRoutes, {
    prefix: "/v1",
    procedures,
    themes: procedureThemes,
    searchMisses,
  });
  await app.register(servicesRoutes, { prefix: "/v1", services: stateServices });
  await app.register(mapRoutes, {
    prefix: "/v1",
    // The tiles someone loads around them tell roughly where they are: map requests
    // stay out of the logs (warnings and errors are still logged).
    logLevel: "warn",
    tilesPath: config.MAP_TILES_PATH,
    assetsRoot: config.MAP_ASSETS_ROOT,
  });
  await app.register(remoteConfigRoutes, { prefix: "/v1", store: remoteConfig });
  await app.register(statusRoutes, {
    prefix: "/v1",
    ingestionStatusPath: config.INGESTION_STATUS_PATH,
  });
  await app.register(newsRoutes, {
    prefix: "/v1",
    articles,
    mediaBaseUrl: config.MEDIA_BASE_URL,
    searchMisses,
  });
  if (searchMisses !== null) {
    app.addHook("onClose", async () => {
      await searchMisses.close();
    });
  }
  // With a CDN configured, media are served from there, not by the API.
  if (config.MEDIA_BASE_URL === undefined) {
    await registerMedia(app, config.MEDIA_ROOT);
  }
  if (admin !== null) {
    await app.register(adminAuthRoutes, { prefix: "/admin/v1", signIn: admin.signIn });
    await app.register(adminProcedureThemesRoutes, {
      prefix: "/admin/v1",
      ...admin,
      procedures,
      themes: procedureThemes,
    });
    await app.register(adminServicesRoutes, {
      prefix: "/admin/v1",
      ...admin,
      services: stateServices,
    });
    await app.register(adminRemoteConfigRoutes, {
      prefix: "/admin/v1",
      ...admin,
      store: remoteConfig,
    });
    await app.register(adminNewsRoutes, { prefix: "/admin/v1", signIn: admin.signIn, articles });
    await app.register(adminNotificationsRoutes, {
      prefix: "/admin/v1",
      signIn: admin.signIn,
      notifications: new NotificationService(
        new FileNotificationStore(config.NOTIFICATIONS_PATH),
        articles,
        pushProvider,
        admin.journal,
      ),
    });
    if (searchMisses !== null) {
      await app.register(adminSearchMissesRoutes, {
        prefix: "/admin/v1",
        signIn: admin.signIn,
        searchMisses,
      });
    }
    if (errorJournal !== null) {
      await app.register(adminErrorsRoutes, {
        prefix: "/admin/v1",
        signIn: admin.signIn,
        errorJournal,
      });
    }
  }
  app.get("/v1/openapi.json", { schema: { hide: true } }, () => app.swagger());

  return app;
}
