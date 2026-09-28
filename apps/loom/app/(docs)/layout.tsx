import type { Metadata, Viewport } from "next"

import { Search } from "@/app/(docs)/_components/search"
import { SiteFooter } from "@/app/(docs)/_components/site-footer"
import { ThemeScript } from "@/app/(docs)/_components/theme-script"
import { ThemeToggle } from "@/app/(docs)/_components/theme-toggle"
import { Wordmark } from "@/app/(docs)/_components/wordmark"
import { REPOSITORY_URL } from "@/app/(docs)/_lib/surfaces"

import "./globals.css"

export const metadata: Metadata = {
  title: { default: "Loom Documentation", template: "%s — Loom" },
  description:
    "Loom is an AI-powered adaptive UI runtime: a UI is a validated tree, AI proposes discrete changes to it, and a pure Gate decides what is allowed.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

const RootLayout = ({ children }: { readonly children: React.ReactNode }) => (
  <html lang="en" suppressHydrationWarning>
    <head>
      <ThemeScript />
    </head>
    <body className="min-h-screen">
      {/*
       * First in the tab order and off-screen until focused. Every page here
       * carries the same rail of section links, so without this the first thing
       * a keyboard reader does on each navigation is tab past them again.
       */}
      <a
        href="#article"
        className="bg-surface-page text-ink border-edge sr-only rounded-md border px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        skip to the page
      </a>

      <header className="border-edge bg-surface-page/85 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[100rem] items-center justify-between gap-4 px-5">
          {/*
           * Two links, not one — the migration left this surface to decide
           * whether the wordmark should offer the front door, and `wordmark.tsx`
           * is the decision and the reasoning behind it. The short version: a
           * corner mark meaning "back to the docs" and a corner mark meaning
           * "back to the project" are both right, so each word gets one.
           */}
          <Wordmark />

          <div className="flex items-center gap-3">
            {/*
             * The search sits before the badge and after the wordmark, which is
             * where a reader's eye already goes looking for it on every
             * reference site they have used. It is the only control here that
             * is present at every width — the badge and the repository link
             * both stand down on a phone, and search is the one thing a reader
             * on a phone needs most, because the rail is behind a menu there.
             */}
            <Search />

            {/* The header's one green: a mint ring, which is where this theme
                spends the colour it is sparing with. */}
            <span className="border-accent-ring text-ink-faint hidden rounded-full border px-2 py-0.5 text-[0.65rem] tracking-wide uppercase sm:inline">
              pre-production alpha
            </span>
            <a
              href={REPOSITORY_URL}
              className="text-ink-muted hover:text-ink hidden text-sm transition-colors sm:inline"
            >
              GitHub
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {children}

      <SiteFooter />
    </body>
  </html>
)

export default RootLayout
