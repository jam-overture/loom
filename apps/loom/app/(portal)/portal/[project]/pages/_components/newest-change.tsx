import Link from "next/link"

import { OutcomeChip } from "@/app/(portal)/_components/outcome-chip"
import type { Outcome } from "@/app/(portal)/_lib/page-history"

/** A page's newest version in the list's words: how it did, and what it was. */
export type Newest = {
  readonly outcome: Pick<Outcome, "label" | "tone">
  /** The change as its card on *Page history* heads it, or where the site's own version came from. */
  readonly what: string
}

/**
 * The *Newest change* cell on the list of pages: the verdict, or what stands
 * in for one, over what the version was, both linking to the page's history,
 * where every version is. A page nothing has happened to says so plainly.
 */
export const NewestChange = ({
  newest,
  history,
}: {
  readonly newest: Newest | undefined
  /** The page's *Page history*. */
  readonly history: string
}) =>
  newest === undefined ? (
    <span className="text-ink-muted">No change yet</span>
  ) : (
    <Link href={history} className="text-ink flex flex-col items-start gap-1">
      <OutcomeChip outcome={newest.outcome} />
      <span>{newest.what}</span>
    </Link>
  )
