import type { Metadata, Viewport } from "next"
import Link from "next/link"
import type { ReactNode } from "react"

import { COURSE_THEME_STYLE } from "./_lib/loom"
import * as style from "./_components/style"

/**
 * The course, as a place.
 *
 * The theme is mounted once, here, and everything below reads it: the primitives
 * a lesson's prose is composed from, and the machinery around them alike. That
 * is the only styling decision this file makes — there is no palette in it, no
 * font stack and no colour, because the surface is not permitted a design system
 * of its own (0067) and does not need one.
 */

export const metadata: Metadata = {
  title: { default: "Loom Lessons", template: "%s — Loom Lessons" },
  description: "The Loom course: what the runtime is, taught in the order it is built.",
}

export const viewport: Viewport = { width: "device-width", initialScale: 1 }

/**
 * Geist, linked rather than bundled, and named rather than hashed.
 *
 * `minimal-sans` names `Geist` first and falls through to the platform
 * grotesques, because Loom does not fetch fonts — a font loader inside a pure
 * render function is a network dependency in a projection. Supplying the face is
 * therefore surface work, and it has to supply one *called* `Geist`: the font
 * pack is a literal family stack in a registered theme this lane may not edit,
 * so `next/font`, which mints a hashed family name like `__Geist_1a2b3c`, would
 * load the file and never be matched by it. A stylesheet link defines the real
 * name, which is the one the theme asks for.
 *
 * Two weights, because the pack uses exactly two: 700 for headings, 400 for
 * body. Nothing here renders wrong if the request fails — the fallback stack is
 * a near-neighbour, and the page still looks like this theme.
 */
const GEIST = "https://fonts.googleapis.com/css2?family=Geist:wght@400;700&display=swap"

const LessonsLayout = ({ children }: { readonly children: ReactNode }) => (
  <html lang="en">
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={GEIST} />
    </head>
    <body style={{ ...COURSE_THEME_STYLE, margin: 0, background: "var(--loom-bg-canvas)" }}>
      <div
        style={{
          maxWidth: "44rem",
          margin: "0 auto",
          padding: "var(--loom-spacing-6) var(--loom-spacing-4)",
          ...style.column(6),
        }}
      >
        <nav style={{ ...style.row(4), fontFamily: style.bodyFamily }}>
          <Link href="/lessons" style={{ color: style.ink, textDecoration: "none" }}>
            Loom lessons
          </Link>
          <Link href="/lessons/review" style={{ color: style.inkMuted, textDecoration: "none" }}>
            Review queue
          </Link>
        </nav>

        {children}
      </div>
    </body>
  </html>
)

export default LessonsLayout
