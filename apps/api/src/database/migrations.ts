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
  {
    // Notifications prepared and decided in the console (two-person rule, ADM-07):
    // each one whole, validated by the API on the way in and out.
    id: "005-notifications",
    statements: ["CREATE TABLE notifications (id text PRIMARY KEY, data jsonb NOT NULL)"],
  },
  {
    // The team's accounts (validated whole by the API: sealed second-factor
    // secrets, password fingerprints), and the append-only, chained audit journal.
    id: "006-admin",
    statements: [
      `CREATE TABLE admin_accounts (
        position bigserial,
        id text PRIMARY KEY,
        email text NOT NULL UNIQUE,
        data jsonb NOT NULL
      )`,
      `CREATE TABLE audit_journal (
        position bigserial PRIMARY KEY,
        entry jsonb NOT NULL
      )`,
      // "Journal d'audit immuable" (CLAUDE.md §1): the database refuses any change
      // or deletion, whoever asks, the API included.
      `CREATE FUNCTION audit_journal_is_append_only() RETURNS trigger
        LANGUAGE plpgsql AS $body$
        BEGIN
          RAISE EXCEPTION 'the audit journal is append-only';
        END
        $body$`,
      `CREATE TRIGGER audit_journal_append_only
        BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_journal
        FOR EACH STATEMENT EXECUTE FUNCTION audit_journal_is_append_only()`,
    ],
  },
  {
    // Every section by default (decision of 30/09/2026): no list of sections.
    id: "007-push-every-section",
    statements: ["ALTER TABLE push_subscriptions ALTER COLUMN topics DROP NOT NULL"],
  },
  {
    // Settings the console changes for every instance (the pause of the automatic
    // notifications), validated by the API when read.
    id: "008-settings",
    statements: ["CREATE TABLE settings (key text PRIMARY KEY, value jsonb NOT NULL)"],
  },
  {
    // When each phone subscribed, for the console to notice a flood of fake
    // subscriptions (AUD5-03). Phones already there keep no date: they never
    // count as new.
    id: "009-push-subscribed-at",
    statements: [
      "ALTER TABLE push_subscriptions ADD COLUMN subscribed_at timestamptz",
      "ALTER TABLE push_subscriptions ALTER COLUMN subscribed_at SET DEFAULT now()",
      "CREATE INDEX push_subscriptions_subscribed_at ON push_subscriptions (subscribed_at)",
    ],
  },
];
