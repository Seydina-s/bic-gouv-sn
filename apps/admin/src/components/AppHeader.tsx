import { ChatCircleDotsIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { signOut } from "../app/connexion/actions";
import { t } from "../lib/i18n";
import { unreadCount } from "../lib/participation-count";
import { participationInbox } from "../lib/participation-inbox";
import { currentAccount, readCookie, SESSION_COOKIE } from "../lib/session";

/** The flag of Senegal as a hairline: green, yellow with its green star, red. */
function FlagStripe() {
  return (
    <div aria-hidden="true" className="flex h-2">
      <span className="flex-1 bg-flag-green" />
      <span className="flex flex-1 items-center justify-center bg-flag-yellow">
        <svg viewBox="0 0 20 20" className="size-2 fill-flag-green">
          <polygon points="10,0 12.35,6.76 19.51,6.91 13.8,11.24 15.88,18.09 10,14 4.12,18.09 6.2,11.24 0.49,6.91 7.65,6.76" />
        </svg>
      </span>
      <span className="flex-1 bg-flag-red" />
    </div>
  );
}

/**
 * The citizens' messages and reports at hand (owner's request, 14/10/2026): an icon
 * with how many nobody has read yet; one click opens them.
 */
async function InboxLink() {
  const token = await readCookie(SESSION_COOKIE);
  const entries = token === null ? null : await participationInbox(token);
  const unread = entries === null ? 0 : unreadCount(entries);
  return (
    <Link
      href="/participation"
      aria-label={unread > 0 ? t("nav.inboxUnread", { count: unread }) : t("nav.inbox")}
      className="relative flex size-11 items-center justify-center rounded-md text-brand hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <ChatCircleDotsIcon aria-hidden="true" weight="duotone" className="size-7" />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 flex min-w-6 items-center justify-center rounded-full border border-current bg-danger-surface px-1.5 text-xs font-bold tabular-nums text-on-danger-surface"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

/** Product identity and the signed-in person; the sections are in ConsoleNav. */
export async function AppHeader() {
  const account = await currentAccount();
  return (
    <header className="border-b border-line">
      <FlagStripe />
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-5 md:px-10">
        <Link
          href="/"
          className="rounded-md font-display text-xl font-extrabold tracking-tight text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          {t("shell.productName")}
        </Link>
        <span className="text-sm font-semibold text-ink-soft">{t("shell.area")}</span>
        {account !== null && (
          <div className="ml-auto flex items-center gap-4">
            <InboxLink />
            <form action={signOut} className="flex items-center gap-3">
              <span className="text-sm text-ink-soft">
                {t("nav.signedInAs", { name: account.name })}
              </span>
              <button
                type="submit"
                className="min-h-11 rounded-md border border-line-strong px-4 font-semibold text-brand hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {t("nav.signOut")}
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
