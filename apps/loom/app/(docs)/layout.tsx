import type { Metadata, Viewport } from "next"
import Link from "next/link"

import { ThemeScript } from "@/app/(docs)/_components/theme-script"
import { ThemeToggle } from "@/app/(docs)/_components/theme-toggle"

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
           * `/docs`, not `/`. This wordmark went to the first page of the
           * documentation when the docs were their own application and `/` was
           * their redirect; `/` is the marketing site's now (0070), so the same
           * href would quietly have turned "back to the docs" into "leave the
           * docs". Whether the wordmark should offer the front door instead is
           * this surface's call, not the migration's.
           */}
          <Link href="/docs" className="flex items-baseline gap-2">
            <span className="text-ink text-base font-semibold tracking-tight">Loom</span>
            <span className="text-ink-faint text-xs">docs</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="border-edge text-ink-faint hidden rounded-full border px-2 py-0.5 text-[0.65rem] tracking-wide uppercase sm:inline">
              pre-production alpha
            </span>
            <a
              href="https://github.com/jam-overture/loom"
              className="text-ink-muted hover:text-ink text-sm transition-colors"
            >
              GitHub
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {children}
    </body>
  </html>
)

export default RootLayout
