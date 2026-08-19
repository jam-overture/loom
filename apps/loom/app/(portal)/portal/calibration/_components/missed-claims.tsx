import type { ContradictedBand, MissGroup } from "@/app/(portal)/_lib/calibration-misses"
import { formatRange, formatRate, MISS_CAUSE_LABELS, MISS_CAUSE_NOTES } from "@/app/(portal)/_lib/calibration-view"
import { toneClasses } from "@/app/(portal)/_lib/outcome"

import { MissedClaimRow } from "./missed-claim"

/**
 * The claims the table above counted and could not show.
 *
 * Grouped by what caught them, worst group first, because the useful sentence is
 * never "the model is overconfident" — it is "the model is overconfident about
 * changes it cannot undo, six times, at a mean claim of 0.91". The first is a
 * number to look at. The second names a class of change and points at the rule
 * that keeps catching it.
 */
export const MissedClaims = ({
  groups,
  contradicted,
  total,
}: {
  readonly groups: readonly MissGroup[]
  readonly contradicted: readonly ContradictedBand[]
  readonly total: number
}) => (
  <section className="flex flex-col gap-4">
    <div className="flex flex-col gap-1">
      <h2 className="text-sm tracking-tight">where the grade was wrong</h2>
      <p className="text-ink-muted text-xs">
        {total} {total === 1 ? "claim" : "claims"} in this window landed on the wrong side of the
        model&apos;s own estimate — refused after claiming it was likely, or accepted after
        claiming it was not. The table above counts these; it cannot say which they were.
      </p>
    </div>

    {/*
      * The one reading on this page that contradicts the table beside it, so it
      * goes above the groups rather than as a footnote. A band whose gap is
      * within tolerance says "on the mark" in the row above, and it is telling
      * the truth: a rate is an average, and a well-calibrated average is exactly
      * what a mid-confidence band looks like when some of its claims went one way
      * and some the other. The row is right about the band and says nothing about
      * the claims inside it, which is the distinction nobody makes when reading a
      * calibration table.
      */}
    {contradicted.length > 0 && (
      <div className={"flex flex-col gap-1 rounded-sm px-3 py-2 " + toneClasses("awaiting")}>
        <span className="text-sm">a band reads as on the mark and is not</span>
        <span className="text-2xs opacity-80">
          {contradicted.map((band, index) => (
            <span key={band.bucket.lower}>
              {index > 0 && "; "}
              {formatRange(band.bucket.lower, band.bucket.upper, band.bucket.upper === 1)} holds{" "}
              {band.claims.length} missed {band.claims.length === 1 ? "claim" : "claims"} while its
              rate matches its mean
            </span>
          ))}
          . The rate is correct — it is an average, and an average can sit where the model said it
          would while individual claims underneath it went the way their own confidence said they
          would not. A row cannot tell you that; these can.
        </span>
      </div>
    )}

    {groups.map((group) => (
      <div key={group.cause} className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h3 className="text-ink text-xs">{MISS_CAUSE_LABELS[group.cause]}</h3>
          <span className="text-ink-muted font-mono text-2xs">
            {group.claims.length}× · mean claim {formatRate(group.meanConfidence)}
          </span>
        </div>
        <p className="text-ink-muted text-2xs">{MISS_CAUSE_NOTES[group.cause]}</p>

        <ul className="flex flex-col">
          {group.claims.map((claim) => (
            <MissedClaimRow key={claim.proposalId} claim={claim} />
          ))}
        </ul>
      </div>
    ))}
  </section>
)
