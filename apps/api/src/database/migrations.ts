/**
 * The database schema, one step at a time. A step is never edited once merged:
 * a change is a new step. Steps live in the code so the API bundle carries them.
 */
export const MIGRATIONS: readonly { id: string; statements: readonly string[] }[] = [
  {
    // Anonymous usage counters (ADM-12): one number per period, measure and name,
    // added to by every API instance. Nothing about who sent the signals.
    id: "001-usage-counts",
    statements: [
      `CREATE TABLE usage_counts (
      period text NOT NULL,
      metric text NOT NULL,
      name text NOT NULL DEFAULT '',
      count bigint NOT NULL CHECK (count >= 0),
      PRIMARY KEY (period, metric, name)
    )`,
    ],
  },
  {
    // Searches that found nothing, per area, language and normalized wording, with
    // the last day only ("2026-09-29"), never the time, nothing about who searched.
    id: "002-search-misses",
    statements: [
      `CREATE TABLE search_misses (
      area text NOT NULL,
      lang text NOT NULL,
      query text NOT NULL,
      count bigint NOT NULL CHECK (count > 0),
      last_on text NOT NULL,
      PRIMARY KEY (area, lang, query)
    )`,
    ],
  },
  {
    // Errors the API answered, grouped by code and place (a route pattern, never
    // the address itself). Times as ISO text in UTC: they sort as they read.
    id: "003-error-journal",
    statements: [
      `CREATE TABLE error_journal (
      code text NOT NULL,
      place text NOT NULL,
      count bigint NOT NULL CHECK (count > 0),
      first_at text NOT NULL,
      last_at text NOT NULL,
      last_request_id text,
      PRIMARY KEY (code, place)
    )`,
    ],
  },
  {
    // Sections each phone follows (PUSH-01): the Expo token, the sections, the
    // quiet hours and the language, nothing else. Found by section when sending.
    id: "004-push-subscriptions",
    statements: [
      `CREATE TABLE push_subscriptions (
        token text PRIMARY KEY,
        topics text[] NOT NULL,
        quiet_hours jsonb,
        lang text NOT NULL
      )`,
      "CREATE INDEX push_subscriptions_topics ON push_subscriptions USING gin (topics)",
    ],
  },
];
