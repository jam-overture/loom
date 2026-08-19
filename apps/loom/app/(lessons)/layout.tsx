import type { Metadata } from "next"
import type { ReactNode } from "react"

/**
 * The lessons course, as a room with nothing in it yet.
 *
 * 0067 gives each of the four surfaces a route group and each route group an
 * owner. This one is scaffolding: it exists so that `Loom lessons` has a lane to
 * write into rather than a migration to negotiate first, and it deliberately
 * contains no design. The document and a title are all a shell can honestly be —
 * chrome invented here would be chrome its owner has to undo.
 */

export const metadata: Metadata = {
  title: { default: "Loom Lessons", template: "%s — Loom Lessons" },
  description: "The Loom course: what the runtime is, taught in the order it is built.",
}

const LessonsLayout = ({ children }: { readonly children: ReactNode }) => (
  <html lang="en">
    <body>{children}</body>
  </html>
)

export default LessonsLayout
