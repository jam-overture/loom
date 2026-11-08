import Link from "next/link"
import type { ReactNode } from "react"

import { GoalChip } from "@/app/(portal)/_components/goal-chip"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { Outcome } from "@/app/(portal)/_lib/page-history"

const TONE: Readonly<Record<Outcome["tone"], string>> = {
  good: "bg-applied text-applied-ink border-applied-ink/20",
  bad: "bg-refuse text-refuse-ink border-refuse-ink/20",
  plain: "border-edge-subtle text-ink-secondary",
}

/**
 * One version of a page on its *History* tab: what changed, where it came
 * from, and what it did to the goal. A Loom change carries the goal it served
 * and links to its timeline from *Accept*; one not live yet is dashed. A Loom
 * change still on the page offers *Propose reverting*.
 */
export const VersionCard = ({
  heading,
  lines,
  origin,
  goal,
  outcome,
  timeline,
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
      <span
        className={`inline-block rounded border px-1.5 py-px text-[11px] font-medium ${TONE[outcome.tone]}`}
      >
        {outcome.label}
      </span>
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
    {timeline === undefined ? null : (
      <Link href={timeline} className="text-ink self-start text-xs">
        Follow it from Accept
      </Link>
    )}
    {revert}
  </li>
)
