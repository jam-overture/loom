import type { ReactNode } from "react"

/**
 * A link that leaves this site for a file in the repository.
 *
 * The Architecture section now has two kinds of link in it and they behave
 * differently: a lesson is a page here, and a ruling is a markdown file on
 * GitHub. On *How it fits together* the two sit side by side under one idea,
 * and until this existed nothing told a reader which of the two doors was about
 * to take them out of the documentation and into a repository.
 *
 * **The mark is a glyph and the words are in the prose above it.** A
 * visually-hidden "opens on GitHub" inside every link reads well in a pair and
 * badly in a table with one row per decision record, where a screen reader would
 * say it once per row for as long as it takes. Nothing here opens a new window — the back
 * button works, which is the case the standing advice about announcing a link's
 * destination is really about — so what is owed is a signal, said once in prose
 * and marked at each link, rather than a sentence repeated per row.
 */

export const OFF_SITE_MARK = "↗"

export const OffSiteLink = ({
  href,
  className,
  children,
}: {
  readonly href: string
  readonly className?: string
  readonly children: ReactNode
}) => (
  <a href={href} className={className}>
    {children}
    <span aria-hidden="true" className="text-ink-faint ml-1 text-xs font-normal select-none">
      {OFF_SITE_MARK}
    </span>
  </a>
)
