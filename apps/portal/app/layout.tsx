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
