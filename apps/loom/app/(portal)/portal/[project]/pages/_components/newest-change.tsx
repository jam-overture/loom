import Link from "next/link"

import { GoalChip } from "@/app/(portal)/_components/goal-chip"
import { OutcomeChip } from "@/app/(portal)/_components/outcome-chip"
import type { Outcome } from "@/app/(portal)/_lib/page-history"

/** A page's newest version in the list's words: how it did, and what it was. */
export type Newest = {
  readonly outcome: Pick<Outcome, "label" | "tone">
  /** The change as its card on *Page history* heads it, or where the site's own version came from. */
  readonly what: string
  /**
   * The goal the change served, as its card on *Page history* names it: for a
   * Loom change whose goal was recorded (`null` for one raised before
   * proposals named their goal), absent for the site's own edit and where
   * Loom has no record of it.
   */
  readonly goal?: string | null
}

/**
 * The *Newest change* cell on the list of pages: the verdict, or what stands
 * in for one, with the goal it was measured on beside it (*The goal chip*,
 * `docs/portal-wireframes.md`), over what the version was, all linking to the
 * page's history, where every version is. A page nothing has happened to says
 * so plainly.
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
      <span className="flex flex-wrap items-center gap-1.5">
        <OutcomeChip outcome={newest.outcome} />
        {newest.goal === undefined ? null : <GoalChip goal={newest.goal} />}
      </span>
      <span>{newest.what}</span>
    </Link>
  )
