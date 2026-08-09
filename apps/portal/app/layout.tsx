import type { Metadata, Viewport } from "next"

import { currentActor } from "@/lib/auth/identity"

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
 * to be served to whoever asks next. `/primitives` shipped in exactly that
 * state: a signed-in reviewer who clicked it was answered from the build with
 * `307 → /sign-in`, having already been let through by the proxy.
 *
 * The pages that escaped it escaped by accident — reading `searchParams` is a
 * dynamic API and `/activity`, `/audit` and `/calibration` all happen to take a
 * tree. A page whose correctness depends on which query parameters it happens to
 * accept is a page that breaks the day it stops accepting one, so the property
 * is declared here for the whole segment instead.
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
    <html lang="en">
      <body className="min-h-screen">
        <TopBar />
        {signedIn && <Sidebar />}
        <main className={`min-h-screen pt-14 ${signedIn ? "pl-14" : ""}`}>{children}</main>
      </body>
    </html>
  )
}

export default RootLayout
