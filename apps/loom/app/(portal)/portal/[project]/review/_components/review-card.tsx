import Link from "next/link"

import { GoalChip } from "@/app/(portal)/_components/goal-chip"
import type { QueueRow } from "@/app/(portal)/_lib/queue"

import { AnswerControls } from "./answer-controls"

/**
 * One change waiting for review (0329), as the project's *For review* tab and
 * a page's own draw it: its goal (0352) where which goal it serves was read,
 * its page and how long it has waited, the change, its standing against the
 * site's newer version (0340), who proposed it, why the Gate stopped, the
 * stake, and *Accept* and *Turn down*, or the role that can answer it. The
 * change itself opens its drawer on *For review* (`open`).
 */
export const ReviewCard = ({
  row,
  projectId,
  goalsRead,
  open,
}: {
  readonly row: QueueRow
  readonly projectId: string
  readonly goalsRead: boolean
  /** The address of the drawer for this change. */
  readonly open: string
}) => (
  <section className="border-edge-subtle bg-surface-base flex flex-col gap-2 rounded-lg border p-4">
    {goalsRead && <GoalChip goal={row.goal} />}
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <Link
        href={`/portal/${projectId}/pages/${row.pageId}`}
        className="text-ink text-xs no-underline hover:underline"
      >
        {row.page}
      </Link>
      <span className="text-ink-muted text-xs">{row.since}</span>
    </div>
    <Link href={open} className="text-ink m-0 text-sm no-underline hover:underline">
      &ldquo;{row.asked}&rdquo;
    </Link>
    {row.standingSentence === null ? null : (
      <p
        className={`m-0 text-xs ${row.standing === "conflicts" ? "text-refuse-ink" : "text-ink-secondary"}`}
      >
        {row.standingSentence}
      </p>
    )}
    {row.askedBy === null ? null : (
      <p className="text-ink-muted m-0 text-xs">Proposed by {row.askedBy}</p>
    )}
    <p className="text-ink-secondary m-0 text-xs">{row.why}</p>
    <p className="text-ink-muted m-0 text-xs">
      {row.stakes.label}. {row.stakes.meaning}
    </p>
    {row.waitsOn === null ? (
      <AnswerControls
        projectId={projectId}
        proposalId={row.proposalId}
        acceptable={row.standing !== "conflicts"}
      />
    ) : (
      <p className="text-ink-muted m-0 text-xs">Waiting on an {row.waitsOn}.</p>
    )}
  </section>
)

/**
 * What a list of changes for review could not read, said above it: the
 * changes it could not read, counted rather than skipped, and the goals the
 * changes serve where those could not be read.
 */
export const ReviewGaps = ({
  unreadable,
  goalsRead,
}: {
  readonly unreadable: number
  readonly goalsRead: boolean
}) => (
  <>
    {unreadable === 0 ? null : (
      <p className="text-refuse-ink text-xs">
        {unreadable === 1
          ? "1 change for review could not be read, so it is not shown."
          : `${unreadable} changes for review could not be read, so they are not shown.`}
      </p>
    )}
    {goalsRead ? null : (
      <p className="text-ink-muted text-xs">
        Which goal each change serves cannot be read here. If goals are new to this deployment,
        whoever runs it has to run <code>pnpm db:push</code> once; otherwise try again in a moment.
      </p>
    )}
  </>
)
