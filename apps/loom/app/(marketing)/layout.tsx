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

/**
 * Geist, under the name the theme asks for.
 *
 * `minimal-sans` names `Geist` first and falls through to the platform
 * grotesques, because Loom does not fetch fonts — a font loader inside a pure
 * render function would be a network dependency in a projection. Supplying the
 * face is therefore surface work, and this surface is the case where it matters
 * most: every pixel of it is a tree, chrome included, so every character on it
 * is drawn by a primitive reading `--loom-body-family` — the pack's *literal*
 * stack, in a registered theme this lane may not edit.
 *
 * That rules out the bundled routes. `next/font` mints `__Geist_1a2b3c` and the
 * `geist` package mints `GeistSans`; neither is `Geist` or `Geist Sans`, so the
 * file downloads and the stack that asked for it never matches — the page
 * renders `ui-sans-serif` and looks entirely deliberate while doing it. A
 * stylesheet link serves the face under its real name, which is the one the
 * theme names.
 *
 * Two weights, because the pack uses exactly two: 700 for headings, 400 for
 * body. Nothing renders wrong if the request fails — the fallback is a
 * near-neighbour by design, which is the property that makes the failure quiet
 * and is why it is worth a comment.
 */
const GEIST = "https://fonts.googleapis.com/css2?family=Geist:wght@400;700&display=swap"

const RootLayout = ({ children }: { readonly children: ReactNode }) => (
  <html lang="en">
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={GEIST} />
    </head>
    <body>{children}</body>
  </html>
)

export default RootLayout
