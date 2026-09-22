import { PartName } from "@/app/(portal)/_components/part-name"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import {
  outOfVisits,
  plainShift,
  shiftOf,
  type Comparison,
  type CountingStanding,
  type ReachShift,
} from "@/app/(portal)/_lib/reading-view"

/**
 * What the last change did to the people reading the page.
 *
 * This is the one measurement that justifies Loom existing, and it is the only
 * thing on this surface that no other tool can compute at all. A page's parts
 * are addressed by id, the counters are kept per revision because the rollup
 * refuses to add revisions together, and a proposal is what moved the page from
 * one to the other — so *this part was seen by a fifth of readers before the
 * change and four fifths after it* is a sentence that exists nowhere else. An
 * analytics product measures URLs and cannot see a part; `git log` holds the
 * primitives and not the tree; the tree in the store holds the page as it is
 * now and no record of what it did to anybody.
 *
 * ## Why the numbers are beside the words rather than behind them
 *
 * *Up 60 points* on its own is the kind of figure a person acts on and should
 * not. Both counts are on the surface with it, because the two windows are
 * never the same size — a revision that has been live for an hour is being
 * compared against one that was live for a week — and a reader who cannot see
 * that is being invited to believe a rise that is four visits.
 *
 * ## Why this section can no longer disappear
 *
 * It used to. It was drawn under `shifts.length > 0`, so the card's most
 * valuable section was simply absent whenever there was nothing to list — and
 * three completely different facts arrived as that same blank: a page nobody
 * has changed yet, a change that replaced every part that had been reported
 * on, and a change too recent to have been counted. The last of those is the
 * one a reader meets most, because it is the state of every page in the first
 * hour after somebody works on it.
 *
 * The card's own rule already said this was wrong — *"a page whose sections
 * silently disappear when their number is zero leaves a reader unable to tell
 * Loom looked and there was nothing from Loom did not look"* — and the section
 * it was written for was the one breaking it. `Comparison` has no empty arm, so
 * there is always something to say and a later edit cannot quietly take the
 * section away.
 *
 * ## Why the heading changes a word
 *
 * *The last change* is a claim about the page being served. When the newest
 * counted version is not that page, the comparison is real and is about an
 * earlier pair — so the heading says **the last counted change** and the
 * sentence that qualifies it lives once, in `CountedAgainst`, beside the counts
 * it is about.
 *
 * ## The caveat, and why it is a disclosure rather than a footnote
 *
 * `Loom daily build` filed on 13 September that a broadcaster reads the
 * revision off the root once and goes on filing under it, so a page that
 * changes under a reader keeps reporting to the revision they arrived on. It
 * named this screen: *"a portal reading per-revision counters is exactly what
 * would be misled."* It is open, and it is the framework's to fix — this lane
 * consumes the runtime rather than editing it (0018).
 *
 * What a consumer can do is refuse to hide it. It is one click down rather than
 * on the surface because it is a property of how the measurement was taken
 * rather than of what it says, which is the same altitude every other technical
 * record on this screen sits at — and it is never further down than one click,
 * because a comparison whose caveat is unfindable is a comparison that lies.
 */
export const SinceTheChange = ({
  comparison,
  standing,
}: {
  readonly comparison: Comparison
  readonly standing: CountingStanding
}) => (
  <section className="flex flex-col gap-3">
    <div className="flex flex-col gap-1">
      <h3 className="text-sm tracking-tight">
        {standing.kind === "current"
          ? "What the last change did to your readers"
          : "What the last counted change did to your readers"}
      </h3>
      <Lead comparison={comparison} />
    </div>

    {comparison.kind === "shifts" && <Shifts shifts={comparison.shifts} />}

    <TechnicalDetail summary="When a comparison can be wrong about which revision it is comparing">
      <p>
        A published page decides which revision it is reporting about once, when the broadcast
        starts, and does not look again. A reader who is already on the page when it changes
        goes on filing under the revision they arrived on, so a little of what is counted under
        one revision may have happened on the next.
      </p>
      <p>
        It is a known gap in the runtime, filed on 13 September and not this portal&rsquo;s to
        close — the portal reads what it is given (0018). It matters most when a change lands
        while people are reading, and least on a revision that has been live long enough for
        everyone counted to have arrived after it.
      </p>
    </TechnicalDetail>
  </section>
)

/**
 * The sentence under the heading, which is the whole of the answer in two of
 * the three cases.
 *
 * Each says what is being compared *and* why anything absent is absent. "There
 * is nothing to compare" and "nothing moved" are opposite news, and a reader
 * given the first without its reason will read it as the second.
 */
const Lead = ({ comparison }: { readonly comparison: Comparison }) => {
  if (comparison.kind === "first")
    return (
      <p className="text-ink-muted text-xs">
        Nobody has reported on an earlier version of this page, so there is nothing to compare
        revision {comparison.counted} against yet. Your next change to this page is what gives
        this section something to say.
      </p>
    )

  if (comparison.kind === "nothing-shared")
    return (
      <p className="text-ink-muted text-xs">
        Revision {comparison.after} against revision {comparison.before}: not one part was
        reported on by both versions, so there is nothing here to compare. That is different
        from nothing having moved — the change replaced everything anybody had reported on, and
        putting a zero against each of them would show a collapse that never happened.
      </p>
    )

  return (
    <p className="text-ink-muted text-xs">
      Revision {comparison.after} against revision {comparison.before}, part by part. Only the
      parts both versions heard about are here: a part the change added, or removed, has nothing
      on the other side to be compared with, and putting a zero there would show a collapse that
      never happened.
    </p>
  )
}

/*
 * Two lines per reading, always — the reading, then what it is made of.
 * Letting the three pieces wrap as one flowing row put the counts beside the
 * name on a short row and under it on a long one, so a column of readings
 * had no column in it and the eye had to find the figure again on every
 * line. Found in the first screenshot taken of this screen.
 */
const Shifts = ({ shifts }: { readonly shifts: readonly ReachShift[] }) => (
  <ul className="flex flex-col">
    {shifts.map((shift) => (
      <li
        key={shift.nodeId}
        className="border-edge-subtle flex flex-col gap-0.5 border-t py-2 text-xs"
      >
        <span className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-ink">
            <PartName part={shift.name} />
          </span>
          <span
            className={
              shiftOf(shift) > 0
                ? "text-applied-ink"
                : shiftOf(shift) < 0
                  ? "text-rejected-ink"
                  : "text-ink-secondary"
            }
          >
            {plainShift(shift)}
          </span>
        </span>
        <span className="text-ink-muted text-2xs">
          {outOfVisits(shift.before.reached, shift.before.views)} before, then{" "}
          {outOfVisits(shift.after.reached, shift.after.views)}
        </span>
      </li>
    ))}
  </ul>
)
