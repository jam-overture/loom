import { GeistSans } from "geist/font/sans"
import type { Metadata, Viewport } from "next"

import { currentActor } from "@/app/(portal)/_lib/auth/identity"

import { Sidebar } from "./_components/shell/sidebar"
import { TopBar } from "./_components/shell/topbar"

import "./globals.css"

export const metadata: Metadata = {
  title: "Loom Portal",
  description: "Inspect, propose and gate changes to a stored Loom tree",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

/**
 * Every page under this layout is rendered per request, and this line is load
 * bearing rather than cautious.
 *
 * A guarded page has no cookie at build time, so `requireActor` redirects — and
 * Next stores that redirect as the page's prerendered output, with a stale time,
 * to be served to whoever asks next. `/portal/primitives` shipped in exactly
 * that state: a signed-in reviewer who clicked it was answered from the build
 * with `307 → /portal/sign-in`, having already been let through by the proxy.
 *
 * The pages that escaped it escaped by accident — reading `searchParams` is a
 * dynamic API, and `/portal/activity`, `/portal/audit` and `/portal/trust`
 * all happen to take a tree. A page whose correctness depends on which query
 * parameters it happens to accept is a page that breaks the day it stops
 * accepting one, so the property is declared here for the whole segment instead.
 *
 * It sits in the `(portal)` group's layout rather than the application's, so it
 * covers this surface and not the three public ones — which is what let the
 * marketing site and the documentation go back to being prerendered (0070).
 */
export const dynamic = "force-dynamic"

/**
 * The rail is hidden until there is someone to navigate as. It is not a guard —
 * the middleware is (0027) — it is that a nav offering four routes which all
 * redirect back to sign-in is a claim the portal cannot honour.
 */
const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const signedIn = (await currentActor()) !== null

  return (
    /*
     * The `minimal-sans` font pack names Geist first, and a font pack carries a
     * family name rather than a file — Loom never fetches a font, deliberately.
     * So the family only becomes real where a surface loads it, which is here.
     *
     * The `geist` package rather than `next/font/google`, because that one
     * fetches from a font CDN at build time: a network dependency in `next build`
     * turns a deploy red for a reason that has nothing to do with the change
     * being deployed. This ships the files with the dependency and binds them to
     * `--font-geist-sans`, which `globals.css` reads.
     */
    <html lang="en" className={GeistSans.variable}>
      <body className="min-h-screen">
        {/*
         * First in the tab order, and off-screen until it is focused. The
         * chrome above and beside every page is a topbar and a rail of six
         * routes, so without this the first thing a keyboard user does on
         * every navigation is tab past the same nine stops again.
         */}
        <a href="#page" className="loom-skip-link">
          skip to the page
        </a>
        <TopBar />
        {signedIn && <Sidebar />}
        {/*
         * `tabIndex={-1}` so the skip link moves real focus here rather than
         * only scrolling — a screen reader that was not moved is still reading
         * the rail. The ring is suppressed on this one element on purpose: it
         * is the whole viewport, so a 2px outline around it is noise rather
         * than the "you are here" a ring is for. Every focusable thing inside
         * it still gets one.
         */}
        <main
          id="page"
          tabIndex={-1}
          className={`min-h-screen pt-14 focus-visible:outline-none ${signedIn ? "pl-14" : ""}`}
        >
          {children}
        </main>
      </body>
    </html>
  )
}

export default RootLayout
