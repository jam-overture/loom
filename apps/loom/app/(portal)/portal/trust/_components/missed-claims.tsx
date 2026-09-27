import type { ContradictedBand, MissGroup } from "@/app/(portal)/_lib/calibration-misses"
import { formatRange, formatRate, MISS_CAUSE_LABELS, MISS_CAUSE_NOTES } from "@/app/(portal)/_lib/calibration-view"
import { toneClasses } from "@/app/(portal)/_lib/outcome"
import { nameFrom, type PageName } from "@/app/(portal)/_lib/page-name"

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
  names,
}: {
  readonly groups: readonly MissGroup[]
  readonly contradicted: readonly ContradictedBand[]
  readonly total: number
  /**
   * The pages these claims were made against, named — or absent when the screen
   * is scoped to one page and every row would name the same one.
   *
   * Read once by the screen and handed down, the rule every list in this portal
   * follows: a row that read a store would turn one listing into one read per
   * claim, and a group of six claims on one page would read that page six times.
   */
  readonly names?: ReadonlyMap<string, PageName>
}) => (
  <section className="flex flex-col gap-4">
    <div className="flex flex-col gap-1">
      <h2 className="text-base tracking-tight">Where it was wrong about itself</h2>
      <p className="text-ink-muted text-xs">
        {total} {total === 1 ? "change" : "changes"} went the opposite way to what the AI
        predicted — turned down after it said it was likely, or applied after it said it was
        not. This is the part of the page worth acting on: the verdict above is a number, and
        these name what kind of change keeps catching it out.
      </p>
    </div>

    {/*
      * The one reading on this page that contradicts the table it summarises, so
      * it goes above the groups rather than as a footnote. A band whose gap is
      * within tolerance says "on the mark" in the band table, and it is telling
      * the truth: a rate is an average, and a well-calibrated average is exactly
      * what a mid-confidence band looks like when some of its claims went one way
      * and some the other. The row is right about the band and says nothing about
      * the claims inside it, which is the distinction nobody makes when reading a
      * calibration table — so the warning is on the surface and the band it is
      * about is one disclosure down.
      */}
    {contradicted.length > 0 && (
      <div className={"flex flex-col gap-1 rounded-sm px-3 py-2 " + toneClasses("awaiting")}>
        <span className="text-sm">The table below looks better than this is</span>
        <span className="text-2xs opacity-80">
          {contradicted.map((band, index) => (
            <span key={band.bucket.lower}>
              {index > 0 && "; "}
              the {formatRange(band.bucket.lower, band.bucket.upper, band.bucket.upper === 1)}{" "}
              band holds {band.claims.length} wrong{" "}
              {band.claims.length === 1 ? "change" : "changes"} while reading as on the mark
            </span>
          ))}
          . Both are true. An average can land exactly where the AI said it would while the
          individual changes underneath it went the way their own confidence said they would
          not. A row cannot tell you that; these can.
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
            <MissedClaimRow
              key={claim.proposalId}
              claim={claim}
              {...(names === undefined ? {} : { page: nameFrom(names, claim.treeId) })}
            />
          ))}
        </ul>
      </div>
    ))}
  </section>
)
