/** The section being shown, a service page included ("/services/…" is in "/services"). */
export function isCurrentSection(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
