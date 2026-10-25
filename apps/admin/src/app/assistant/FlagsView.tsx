import type { AssistantFlag } from "@bgs/shared-types";
import { t } from "../../lib/i18n";

const STATUS_STYLE: Record<AssistantFlag["status"], string> = {
  answered: "bg-primary-container text-on-primary-container",
  not_found: "bg-accent-container text-on-accent-container",
  out_of_scope: "bg-surface text-ink-soft",
};

const STATUS_KEYS = {
  answered: "assistant.flags.statuses.answered",
  not_found: "assistant.flags.statuses.not_found",
  out_of_scope: "assistant.flags.statuses.out_of_scope",
} as const;

const MODE_KEYS = {
  ask: "assistant.flags.modes.ask",
  verify: "assistant.flags.modes.verify",
} as const;

const LANG_KEYS = {
  fr: "assistant.flags.langs.fr",
  wo: "assistant.flags.langs.wo",
  en: "assistant.flags.langs.en",
} as const;

/** "25 octobre 2026 à 10:00", Dakar's time (UTC all year). */
function receivedOn(at: string): string {
  return new Intl.DateTimeFormat("fr-SN", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(at));
}

/** The official site a source comes from, as people know it ("e-senegal.sn"). */
function siteOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

function FlagCard({ flag }: { flag: AssistantFlag }) {
  return (
    <li className="space-y-4 rounded-lg border border-line p-5">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
        <span className={`rounded-full px-3 py-0.5 font-semibold ${STATUS_STYLE[flag.status]}`}>
          {t(STATUS_KEYS[flag.status])}
        </span>
        <span>{t("assistant.flags.received", { date: receivedOn(flag.receivedAt) })}</span>
        <span>
          {t(MODE_KEYS[flag.mode])} {t(LANG_KEYS[flag.lang])}
        </span>
      </p>
      <figure className="space-y-1">
        <figcaption className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {t("assistant.flags.question")}
        </figcaption>
        {/* The citizen's own words, shown as written (React escapes them). */}
        <blockquote
          lang={flag.lang}
          className="border-l-4 border-primary pl-4 font-display text-lg font-bold leading-snug"
        >
          {flag.question}
        </blockquote>
      </figure>
      <div className="space-y-1 rounded-md bg-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {t("assistant.flags.answer")}
        </p>
        <p lang={flag.lang} className="max-w-prose">
          {flag.answer ?? t("assistant.flags.noAnswer")}
        </p>
      </div>
      {flag.sources.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {t("assistant.flags.sources")}
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            {flag.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand underline underline-offset-4"
                >
                  {source.title}
                </a>{" "}
                <span className="text-sm text-ink-soft">({siteOf(source.url)})</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </li>
  );
}

/**
 * « Signaler cette réponse » (AST-30e): the answers people flagged, newest first, with
 * their question and the sources cited, for the team to correct the assistant. The
 * links were checked by the server: only official sources are accepted.
 */
export function FlagsView({ flags }: { flags: readonly AssistantFlag[] }) {
  if (flags.length === 0) {
    return <p className="max-w-prose text-ink-soft">{t("assistant.flags.none")}</p>;
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">{t("assistant.flags.count", { count: flags.length })}</p>
      <ol className="space-y-4">
        {flags.map((flag) => (
          <FlagCard key={flag.id} flag={flag} />
        ))}
      </ol>
    </div>
  );
}
