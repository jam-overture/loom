import type { Metadata, Viewport } from "next"

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

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en">
    <body className="min-h-screen">
      <TopBar />
      <Sidebar />
      <main className="min-h-screen pt-14 pl-14">{children}</main>
    </body>
  </html>
)

export default RootLayout
