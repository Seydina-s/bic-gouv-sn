"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isCurrentSection } from "../lib/navigation";

export interface NavBadge {
  /** Shown: a short count. */
  count: number;
  /** Read by screen readers after the link text, e.g. "1 à vérifier". */
  label: string;
}

/**
 * A console section link that says, visibly and to screen readers, when it is open,
 * and how many things wait there when some do.
 */
export function NavLink({
  href,
  children,
  badge,
}: {
  href: string;
  children: ReactNode;
  badge?: NavBadge | undefined;
}) {
  const current = isCurrentSection(usePathname(), href);
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`flex min-h-11 items-center gap-2 rounded-md px-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
        current ? "bg-primary-container text-on-primary-container" : "text-ink hover:bg-surface"
      }`}
    >
      {children}
      {badge !== undefined && badge.count > 0 && (
        <span className="ml-auto rounded-full bg-accent-container px-2 text-sm font-bold tabular-nums text-on-accent-container">
          <span aria-hidden="true">{badge.count}</span>
          <span className="sr-only">{badge.label}</span>
        </span>
      )}
    </Link>
  );
}
