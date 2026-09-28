import Link from "next/link"

import { DOCS_HOME, HOME } from "@/app/(docs)/_lib/surfaces"

/**
 * The name in the corner, which is **two links and not one**.
 *
 * This is the surface's answer to the standing question its own header comment
 * used to ask, and the question is worth restating because the obvious answers
 * are both wrong:
 *
 * - Point the whole wordmark at `/docs`, as it did. "Back to the docs" is a
 *   real and useful thing for a corner mark to mean on a reference site, and it
 *   leaves a reader with **no way back to the front door** — the 24 September
 *   finding.
 * - Point the whole wordmark at `/`, which is the convention everywhere else.
 *   That quietly turns "back to the docs" into "leave the docs", which is the
 *   reason the migration declined to do it and left the call to this surface.
 *
 * Splitting it gives each reading its own target and costs no width, because
 * the two words were already set as two words. `Loom` is the project and goes
 * to the project's front door; `docs` is this site and goes to its first page.
 * The slash between them is the separator every breadcrumb in the world uses,
 * and is hidden from a screen reader, which hears two links.
 *
 * Both halves keep a full-height hit area rather than the height of their own
 * text — `docs` is set at `0.75rem`, and a twelve-pixel tap target in the
 * corner of a phone is a link only a mouse can use.
 */
export const Wordmark = () => (
  <div className="-my-2 flex items-baseline gap-2">
    <Link
      href={HOME.path}
      className="text-ink hover:text-ink-muted py-2 text-base font-semibold tracking-tight transition-colors"
    >
      Loom
    </Link>

    <span aria-hidden="true" className="text-ink-faint text-xs select-none">
      /
    </span>

    <Link
      href={DOCS_HOME}
      className="text-ink-faint hover:text-ink py-2 text-xs transition-colors"
    >
      docs
    </Link>
  </div>
)
