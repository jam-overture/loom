import type { Metadata } from "next"
import type { ReactNode } from "react"

import { HOME } from "@/app/(marketing)/_lib/site"

import "./globals.css"

/**
 * The document, and nothing else.
 *
 * There is no header here and no footer: both are nodes in the page's tree
 * (`lib/chrome.ts`). A layout that wrapped the render in its own chrome would
 * make "the whole page is data" true of the middle and false at the edges,
 * which is the one claim this site cannot afford to fudge.
 */

export const metadata: Metadata = {
  title: HOME.title,
  description: HOME.description,
}

const RootLayout = ({ children }: { readonly children: ReactNode }) => (
  <html lang="en">
    <body>{children}</body>
  </html>
)

export default RootLayout
