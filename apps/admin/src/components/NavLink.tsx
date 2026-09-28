"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isCurrentSection } from "../lib/navigation";

/** A console section link that says, visibly and to screen readers, when it is open. */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const current = isCurrentSection(usePathname(), href);
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`flex min-h-11 items-center rounded-md px-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
        current ? "bg-primary-container text-on-primary-container" : "text-ink hover:bg-surface"
      }`}
    >
      {children}
    </Link>
  );
}
