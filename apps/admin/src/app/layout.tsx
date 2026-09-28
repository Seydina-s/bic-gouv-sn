import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { AppHeader } from "../components/AppHeader";
import { ConsoleNav } from "../components/ConsoleNav";
import { t } from "../lib/i18n";
import { themeCss } from "../lib/theme-css";
import "./globals.css";

// Self-hosted at build time by Next.js: no request to Google from the browser.
// Noto Sans, the app's family (S1-04, chosen by the user on 27/09/2026).
const notoSans = Noto_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-noto-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${t("shell.area")} · ${t("shell.productName")}`,
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Every page is rendered per request, so its scripts carry that request's nonce
  // (Content Security Policy, src/proxy.ts); a page built ahead would be blocked.
  await connection();
  return (
    <html lang="fr" className={notoSans.variable}>
      <head>
        <style>{themeCss()}</style>
      </head>
      <body className="min-h-dvh bg-background text-ink">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-on-primary"
        >
          {t("shell.skipToContent")}
        </a>
        <AppHeader />
        <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:flex lg:gap-12">
          <ConsoleNav />
          <main id="contenu" className="min-w-0 max-w-5xl flex-1 pb-24 pt-12">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
