import type { Metadata } from "next"
import type { ReactNode } from "react"

import { CountReaders } from "@/app/(marketing)/_components/count-readers"
import { readersCountedHere } from "@/app/(marketing)/_lib/readers/counting"
import { HOME, siteOrigin } from "@/app/(marketing)/_lib/site"

import "./globals.css"

/**
 * The document, and nothing else.
 *
 * There is no header here and no footer: both are nodes in the page's tree
 * (`lib/chrome.ts`). A layout that wrapped the render in its own chrome would
 * make "the whole page is data" true of the middle and false at the edges,
 * which is the one claim this site cannot afford to fudge.
 */

/**
 * The document's defaults. Every page replaces the title, the description and
 * everything a shared link unfurls as, in its own `generateMetadata`.
 *
 * `metadataBase` is here because it is the one thing that is true of the whole
 * surface rather than of a page: it is where this deployment is answering from,
 * which on a preview build is not the production domain and on a laptop is
 * neither. Without it a relative address in any page's metadata would resolve
 * against nothing.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
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
 * near-neighbor by design, which is the property that makes the failure quiet
 * and is why it is worth a comment.
 */
const GEIST = "https://fonts.googleapis.com/css2?family=Geist:wght@400;700&display=swap"

/**
 * The one thing this layout mounts, and the only code of this site that runs in
 * a browser.
 *
 * It is here rather than on a page because a broadcaster's subject is *a
 * visit*, not a page: it is started once against the tree the document
 * contains, and every one of the ten pages is counted on the same terms or none
 * of them is. It draws nothing, so the claim the comment above makes — the
 * chrome is in the tree, not wrapped around it — is untouched.
 *
 * **Absent unless this deployment collects.** `readersCountedHere` is the same
 * answer `render.ts` uses to decide whether the markup carries the addresses a
 * signal names, so a broadcaster is never started on a page that cannot be
 * measured, and a page is never addressed with nothing listening. Off — which
 * is the default, and what this deployment is until somebody sets
 * `LOOM_SIGNAL_INTAKE` — nothing is rendered here, nothing is downloaded, and
 * no batch is sent anywhere.
 */
const RootLayout = ({ children }: { readonly children: ReactNode }) => (
  <html lang="en">
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={GEIST} />
    </head>
    <body>
      {children}
      {readersCountedHere() ? <CountReaders /> : null}
    </body>
  </html>
)

export default RootLayout
