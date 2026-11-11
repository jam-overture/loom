import Link from "next/link"
import type { ReactNode } from "react"

import { GoalChip } from "@/app/(portal)/_components/goal-chip"
import { OutcomeChip } from "@/app/(portal)/_components/outcome-chip"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { Outcome } from "@/app/(portal)/_lib/page-history"

/**
 * One version of a page on its *History* tab: what changed, where it came
 * from, and what it did to the goal. A Loom change carries the goal it served
 * and links to its timeline from *Accept*; one not live yet is dashed. A Loom
 * change offers *Compare*, the page before it and after it, and one still on
 * the page offers *Propose reverting*.
 */
export const VersionCard = ({
  heading,
  lines,
  origin,
  goal,
  outcome,
  timeline,
  compare,
  dashed,
  revert,
}: {
  readonly heading: string
  readonly lines: readonly string[]
  readonly origin: string
  /** The goal chip, for a Loom change whose goal was recorded; absent for the site's own edit. */
  readonly goal?: string | null
  readonly outcome: Outcome
  readonly timeline?: string
  /** Where *Compare* opens the drawer on this version, every other choice on the screen kept. */
  readonly compare?: string
  readonly dashed: boolean
  /** *Propose reverting*, for a Loom change on the live page and a person who may raise it. */
  readonly revert?: ReactNode
}) => (
  <li
    className={`bg-surface-base flex flex-col gap-2 rounded-lg border p-4 ${
      dashed ? "border-edge border-dashed" : "border-edge-subtle"
    }`}
  >
    <div className="flex flex-wrap items-center gap-2">
      <OutcomeChip outcome={outcome} />
      {goal === undefined ? null : <GoalChip goal={goal} />}
    </div>
    <h3 className="m-0 text-sm font-medium tracking-tight">{heading}</h3>
    {lines.map((line) => (
      <p key={line} className="text-ink-secondary m-0 text-xs">
        {line}
      </p>
    ))}
    <p className="text-ink-muted m-0 text-xs">{origin}</p>
    {outcome.lines.map((line) => (
      <p key={line} className="text-ink-secondary m-0 max-w-prose text-xs">
        {line}
      </p>
    ))}
    {outcome.detail === undefined ? null : (
      <TechnicalDetail summary="How the verdict was reached">
        {outcome.detail.map((line) => (
          <p key={line} className="m-0">
            {line}
          </p>
        ))}
      </TechnicalDetail>
    )}
    {timeline === undefined && compare === undefined ? null : (
      <div className="flex gap-4 text-xs">
        {compare === undefined ? null : (
          <Link href={compare} className="text-ink" scroll={false}>
            Compare
          </Link>
        )}
        {timeline === undefined ? null : (
          <Link href={timeline} className="text-ink">
            Follow it from Accept
          </Link>
        )}
      </div>
    )}
    {revert}
  </li>
)
