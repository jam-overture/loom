import { GeistSans } from "geist/font/sans"
import type { Metadata, Viewport } from "next"
import { headers } from "next/headers"

import { PATH_HEADER } from "@/proxy"


import { TopBar } from "./_components/shell/topbar"

import "./globals.css"

/**
 * The one sentence a browser tab, a bookmark and a search result show, and it
 * was the last unqualified piece of runtime vocabulary the portal said to a
 * person before they had opened anything: *"Inspect, propose and gate changes
 * to a stored Loom tree."* Four words of it — *gate*, *stored*, *Loom tree* —
 * are the runtime talking to itself, in the sentence that has to explain the
 * portal to somebody who has never seen it. There is no disclosure to move it
 * behind, so it is said the way the sign-in page already says it.
 */
export const metadata: Metadata = {
  title: "Loom Portal",
  description: "Review the changes an AI proposes to your pages, before any of them go live",
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
 * dynamic API, and `/portal/activity`, `/portal/checkup` and `/portal/trust`
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
 * The rails are hidden until there is someone to navigate as. It is not a
 * guard — the middleware is (0027) — it is that a nav offering four routes
 * which all redirect back to sign-in is a claim the portal cannot honour.
 */
/**
 * The shell prototype brings its own topbar and rails, and they are a proposal
 * to replace the ones below. Mounting both would stack two chromes on top of
 * each other, so this layout stands aside for that one subtree — see
 * `PATH_HEADER` in `proxy.ts`. It is temporary in the same way the prototype
 * is.
 */
const BRINGS_ITS_OWN_CHROME = "/portal/preview"

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const path = (await headers()).get(PATH_HEADER) ?? ""
  const ownChrome =
    path === BRINGS_ITS_OWN_CHROME || path.startsWith(`${BRINGS_ITS_OWN_CHROME}/`)

  if (ownChrome) {
    return (
      <html lang="en" className={GeistSans.variable}>
        <body className="min-h-screen">{children}</body>
      </html>
    )
  }

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
         * every navigation is tab past the same stops again — and there are
         * more of them since the rail grew a second level: six sections, and
         * up to five screens of the one you are in.
         */}
        <a href="#page" className="loom-skip-link">
          skip to the page
        </a>
        <TopBar />
        {/*
         * A row that holds one child, which is what unit 0 left of it.
         *
         * The rails were here until 13 October: a navigation listing the twenty
         * screens this route group served, built as a row rather than a fixed
         * rail so that no file had to be told how wide another one was. They
         * went with the screens they pointed at — a rail naming routes that
         * 404 is worse than no rail — and what replaces them is each surface's
         * own shell, because the workspace and a project are different shapes
         * and the prototype draws both ([`docs/portal.md`](../../../../docs/portal.md)).
         *
         * The row stays rather than collapsing to the `<main>` alone, because
         * the navigation comes back at unit 3 and it comes back here. The
         * column direction and the top padding are the only things it is
         * currently doing, and both are still right.
         */}
        <div className="flex min-h-screen flex-col pt-14 md:flex-row">
          {/*
           * `tabIndex={-1}` so the skip link moves real focus here rather than
           * only scrolling — a screen reader that was not moved is still reading
           * the rail. The ring is suppressed on this one element on purpose: it
           * is the whole viewport, so a 2px outline around it is noise rather
           * than the "you are here" a ring is for. Every focusable thing inside
           * it still gets one.
           *
           * `min-w-0` because this is a flex child now: without it a wide table
           * inside a screen sets the column's minimum and pushes the rails off
           * the left of the display.
           */}
          <main
            id="page"
            tabIndex={-1}
            className="flex min-w-0 flex-1 focus-visible:outline-none"
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}

export default RootLayout
