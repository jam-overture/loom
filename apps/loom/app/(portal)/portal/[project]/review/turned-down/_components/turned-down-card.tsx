import Link from "next/link"

import { GoalChip } from "@/app/(portal)/_components/goal-chip"
import type { TurnedDownRow } from "@/app/(portal)/_lib/turned-down-list"
import { plainMoment } from "@/app/(portal)/_lib/when"

/**
 * One change a person turned down (0341), led by the goal it served where that
 * is known, as every list of changes is (0352): its page and when, the change as it
 * was proposed with the figure Loom gave for it, and why it was turned down in
 * the words of whoever did. Loom weighs that reason the next time it proposes
 * for the page, so the card says so where none was given.
 */
export const TurnedDownCard = ({
  row,
  projectId,
}: {
  readonly row: TurnedDownRow
  readonly projectId: string
}) => {
  const at = new Date(row.at).toISOString()

  return (
    <section className="border-edge-subtle bg-surface-base flex flex-col gap-1.5 rounded-lg border p-4">
      {row.goal.kind === "recorded" && <GoalChip goal={row.goal.goal} />}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link
          href={`/portal/${projectId}/pages/${row.pageId}`}
          className="text-ink text-xs no-underline hover:underline"
        >
          {row.pageName ?? row.pageId}
        </Link>
        <time dateTime={at} className="text-ink-muted text-xs">
          Turned down {plainMoment(at)}
          {row.by === null ? null : ` by ${row.by}`}
        </time>
      </div>
      <p className="text-ink m-0 text-sm">&ldquo;{row.change}&rdquo;</p>
      {row.why === null ? null : <p className="text-ink-muted m-0 text-xs">Why: {row.why}</p>}
      <p className="text-ink-secondary m-0 text-xs">
        {row.reason === null
          ? "No reason was given. Loom still weighs it the next time it proposes for this page."
          : `Reason: ${row.reason}`}
      </p>
    </section>
  )
}
