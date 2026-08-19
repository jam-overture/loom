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

const LessonsLayout = ({ children }: { readonly children: ReactNode }) => (
  <html lang="en">
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
