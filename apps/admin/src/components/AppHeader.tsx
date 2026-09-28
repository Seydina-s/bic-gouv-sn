import Link from "next/link";
import { signOut } from "../app/connexion/actions";
import { t } from "../lib/i18n";
import { currentAccount } from "../lib/session";

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
          <form action={signOut} className="ml-auto flex items-center gap-3">
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
        )}
      </div>
    </header>
  );
}
