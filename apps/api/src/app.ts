import { randomUUID } from "node:crypto";
import compress from "@fastify/compress";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import * as Sentry from "@sentry/node";
import Fastify, {
  type FastifyInstance,
  type FastifyLoggerOptions,
  type FastifyRequest,
} from "fastify";
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
import type { AdminAccountStore } from "./admin/account-store";
import { adminStores } from "./admin/admin-stores";
import type { AuditJournal } from "./admin/audit-journal";
import { SecretBox } from "./admin/secret-box";
import { AdminSignIn } from "./admin/sign-in-service";
import { AccountAdmin } from "./admin/account-admin";
import { ExpoPushProvider } from "./notifications/expo-push-provider";
import {
  FilePushSubscriptionStore,
  PostgresPushSubscriptionStore,
  type PushSubscriptionStore,
} from "./notifications/push-subscriptions";
import { pushSubscriptionRoutes } from "./routes/push-subscriptions";
import { registerIdempotency } from "./idempotency/idempotency";
import { Redis } from "ioredis";
import {
  MemoryKeyValueStore,
  RedisKeyValueStore,
  type KeyValueStore,
} from "./shared-state/key-value-store";
import type { Config } from "./config";
import { registerErrorHandlers } from "./errors";
import { registerSecurity } from "./security";
import { adminAuthRoutes } from "./routes/admin-auth";
import { adminProcedureThemesRoutes } from "./routes/admin-procedure-themes";
import { adminErrorsRoutes } from "./routes/admin-errors";
import { adminAuditRoutes } from "./routes/admin-audit";
import { adminNewsRoutes } from "./routes/admin-news";
import { adminNotificationsRoutes } from "./routes/admin-notifications";
import { adminAccountsRoutes } from "./routes/admin-accounts";
import { adminSearchMissesRoutes } from "./routes/admin-search-misses";
import type { Database } from "./database/database";
import {
  FileNotificationStore,
  PostgresNotificationStore,
} from "./notifications/notification-store";
import { AutomaticNotifier } from "./notifications/automatic-notifier";
import { FileSettingStore, PostgresSettingStore } from "./admin/setting-store";
import { adminServicesRoutes } from "./routes/admin-services";
import { adminRemoteConfigRoutes, remoteConfigRoutes } from "./routes/remote-config";
import { type ErrorJournal, journalErrors } from "./journal/error-journal";
import type { SearchMisses } from "./journal/search-misses";
import { adminUsageRoutes, usageSignalsRoutes } from "./routes/usage";
import type { UsageStats } from "./usage/usage-stats";
import {
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
  /** Anonymous usage counters (server.ts opens them); none: signals not accepted. */
  usageStats?: UsageStats | null;
  /** Push service for approved notifications; none until the app can receive them. */
  pushProvider?: PushProvider;
  /** Redis shared by the instances (REDIS_URL); none: this process only. */
  redis?: Redis | null;
  /** Sessions, sign-in steps, idempotency keys (SCALE-01); defaults from redis. */
  sharedState?: KeyValueStore;
  /** PostgreSQL shared by the instances (DATABASE_URL, SCALE-02); none: files. */
  database?: Database | null;
  /** Sections each phone follows (FEED-04); defaults from database. */
  pushSubscriptions?: PushSubscriptionStore;
  /** New articles looked for this often (PUSH-03); null: not at all (tests). */
  automaticNotificationsEveryMs?: number | null;
}

export interface AdminServices {
  signIn: AdminSignIn;
  journal: AuditJournal;
  /** The team's accounts: managed in the console, names shown in the audit journal. */
  accounts: AdminAccountStore;
}

/** Expo's free push service when configured; otherwise approvals send nothing. */
function defaultPushProvider(config: Config, subscriptions: PushSubscriptionStore): PushProvider {
  return config.PUSH_PROVIDER === "expo"
    ? new ExpoPushProvider({ subscriptions, accessToken: config.EXPO_ACCESS_TOKEN })
    : noPushProvider;
}

/** A Redis client that fails fast: every command has a time limit (CLAUDE.md §4.5). */
function connectRedis(url: string): Redis {
  return new Redis(url, { commandTimeout: 2000, maxRetriesPerRequest: 2, connectTimeout: 5000 });
}

function defaultAdmin(
  config: Config,
  state: KeyValueStore,
  database: Database | null,
): AdminServices | null {
  if (config.ADMIN_SECRET_KEY === undefined) {
    return null;
  }
  const { journal, accounts } = adminStores(config, database);
  return {
    journal,
    accounts,
    signIn: new AdminSignIn({
      accounts,
      journal,
      box: new SecretBox(config.ADMIN_SECRET_KEY, config.ADMIN_SECRET_KEYS_PREVIOUS),
      state,
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
  redis = config.REDIS_URL === undefined ? null : connectRedis(config.REDIS_URL),
  sharedState = redis === null ? new MemoryKeyValueStore() : new RedisKeyValueStore(redis),
  database = null,
  admin = defaultAdmin(config, sharedState, database),
  logStream,
  errorJournal = null,
  searchMisses = null,
  usageStats = null,
  pushSubscriptions = database === null
    ? new FilePushSubscriptionStore(config.PUSH_SUBSCRIPTIONS_PATH)
    : new PostgresPushSubscriptionStore(database),
  pushProvider = defaultPushProvider(config, pushSubscriptions),
  automaticNotificationsEveryMs = null,
}: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      redact: ["req.headers.authorization", "req.headers.cookie"],
      // Data minimisation (CLAUDE.md §1): a request is logged by its method and path
      // only, never the address it came from nor what it asked (search words…).
      serializers: {
        req: (request: FastifyRequest) => ({
          method: request.method,
          url: request.url.split("?")[0] ?? request.url,
        }),
      },
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
  // Before compression: a repeated write gets the first answer as it was sent.
  registerIdempotency(app, sharedState);
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

  await registerSecurity(app, config, redis);
  redis?.on("error", (error: unknown) => {
    app.log.warn({ err: error }, "Shared state (Redis) unavailable");
  });
  app.addHook("onClose", async () => {
    await sharedState.close();
  });

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
  await app.register(pushSubscriptionRoutes, { prefix: "/v1", subscriptions: pushSubscriptions });
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
  if (usageStats !== null) {
    await app.register(usageSignalsRoutes, { prefix: "/v1", usageStats });
    app.addHook("onClose", async () => {
      await usageStats.close();
    });
  }
  // With a CDN configured, media are served from there, not by the API.
  if (config.MEDIA_BASE_URL === undefined) {
    await registerMedia(app, config.MEDIA_ROOT);
  }
  if (admin !== null) {
    const notificationServices = {
      // One store for both: the file store serializes its writers itself.
      store:
        database === null
          ? new FileNotificationStore(config.NOTIFICATIONS_PATH)
          : new PostgresNotificationStore(database),
      articles,
      push: pushProvider,
      journal: admin.journal,
      mediaBaseUrl: config.MEDIA_BASE_URL,
    };
    const automatic = new AutomaticNotifier({
      ...notificationServices,
      settings:
        database === null
          ? new FileSettingStore(config.SETTINGS_PATH)
          : new PostgresSettingStore(database),
      perHour: config.AUTO_NOTIFICATIONS_PER_HOUR,
    });
    if (automaticNotificationsEveryMs !== null) {
      app.addHook("onReady", () => {
        automatic.start(automaticNotificationsEveryMs, (error) => {
          app.log.error({ err: error }, "Automatic notifications failed");
        });
        return Promise.resolve();
      });
      app.addHook("onClose", () => automatic.close());
    }
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
    await app.register(adminAuditRoutes, {
      prefix: "/admin/v1",
      signIn: admin.signIn,
      journal: admin.journal,
      accounts: admin.accounts,
    });
    await app.register(adminAccountsRoutes, {
      prefix: "/admin/v1",
      signIn: admin.signIn,
      accountAdmin: new AccountAdmin(admin),
    });
    await app.register(adminNotificationsRoutes, {
      prefix: "/admin/v1",
      signIn: admin.signIn,
      notifications: new NotificationService(notificationServices),
      automatic,
      subscriptions: pushSubscriptions,
    });
    if (usageStats !== null) {
      await app.register(adminUsageRoutes, {
        prefix: "/admin/v1",
        signIn: admin.signIn,
        usageStats,
        articles,
      });
    }
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
        journal: admin.journal,
      });
    }
  }
  app.get("/v1/openapi.json", { schema: { hide: true } }, () => app.swagger());

  return app;
}
