import { t } from "../lib/i18n";
import { currentAccount } from "../lib/session";
import { NavLink } from "./NavLink";

/**
 * The console's sections, grouped by what the person comes to do: follow the
 * service, look after the contents, change a setting. A column beside the page on
 * a computer, above it on a narrow screen. Shown only once signed in.
 */
const GROUPS = [
  {
    id: "follow",
    label: "nav.groups.follow",
    links: [
      { href: "/", label: "nav.status" },
      { href: "/erreurs", label: "nav.errors" },
      { href: "/recherches", label: "nav.searches" },
    ],
  },
  {
    id: "contents",
    label: "nav.groups.contents",
    links: [
      { href: "/demarches", label: "nav.procedures" },
      { href: "/services", label: "nav.services" },
      { href: "/masques", label: "nav.withdrawn" },
    ],
  },
  {
    id: "settings",
    label: "nav.groups.settings",
    links: [{ href: "/controle", label: "nav.remote" }],
  },
] as const;

export async function ConsoleNav() {
  if ((await currentAccount()) === null) {
    return null;
  }
  return (
    <nav
      aria-label={t("nav.label")}
      className="flex flex-wrap gap-x-10 gap-y-6 border-b border-line py-6 lg:sticky lg:top-0 lg:w-60 lg:shrink-0 lg:flex-col lg:self-start lg:border-b-0 lg:py-12"
    >
      {GROUPS.map((group) => (
        <div key={group.id}>
          <p id={`nav-${group.id}`} className="px-3 text-sm font-semibold text-ink-faint">
            {t(group.label)}
          </p>
          <ul aria-labelledby={`nav-${group.id}`} className="mt-2 space-y-1">
            {group.links.map((link) => (
              <li key={link.href}>
                <NavLink href={link.href}>{t(link.label)}</NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
