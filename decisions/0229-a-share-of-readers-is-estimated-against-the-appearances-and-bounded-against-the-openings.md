# 0229 — A share of readers is estimated against the appearances and bounded against the openings

**Status:** Accepted
**Date:** 2026-10-04
**Section:** §4c (reader signals)

> **Renumbered on 2026-10-05**, from 0226, when the branch that carried it
> (#516) was merged. `main` had meanwhile accepted a different 0226 — *a
> primitive declares where its control rests, and the control publishes nothing
> until the reader moves it* (#515) — and two records sharing a number is fatal
> ([0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)).
> This record was written on 4 October and nothing in it changed but its number;
> the references to it were updated with it.

## Context

Every figure a reader screen shows is a rate, and this subsystem has carried the
two halves of every rate in two places that never met.

The numerator is a part's `reached`: distinct page views that saw it, counted
inside a rollup window and **added** to the next window's. Distinctness does not
survive addition, so a visit that spans a boundary is one view in each window and
two after the sum
([0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md)).

The denominator was *whatever the rows could be made to say*. A page reading
takes the largest `views` any one row reports and calls it a floor
([0212](0212-what-a-reader-signal-means-is-joined-to-the-tree-when-it-is-read.md)),
which it is: a view that produced no signal about any part is in no row at all.
Meanwhile
[0219](0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md)
counts page views once at the door, exactly, addable across windows, revisions
and months — and publishes `appearances` beside it, which is the same page views
as the rollups saw them, so that `appearances − opened` is the straddle
over-count measured rather than bounded. **Nothing used either.** The exact
count sat one row away from every rate in the subsystem and no function took
both.

So a portal could draw a count nobody could qualify, or a share of a floor, and
the lane that owns the screen reported the consequence from the other side on
2026-10-04: the exact counts are the misleading figures and a rounded share is
the honest one, which is backwards from how every other number on a card reads.

## Decision

**A part's reach is reported as a share of the readers there were, estimated
against one denominator and bounded against the other.** `pageReachOf(reading,
rows)` in `src/signals/reach.ts` takes a page reading and the page-view rows, and
answers per part, in reading order.

**The estimate is `reached ÷ appearances`.** Both counts are summed distinct
counts off the same windows, so the straddle over-count is in the numerator and
the denominator and very nearly divides out. That is the argument a fall between
two siblings is built on
([0221](0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md)),
one level up: a part against its page rather than a part against its neighbour.
It is an estimate and not a bound, and the direction it leans is written where it
is published — a reader who spans two windows is counted twice on both sides and
is likelier to have got deep into the page, so for a part near the bottom it
reads a little generous.

**The ceiling is `reached ÷ opened`, never above 1.** A part's `reached` is at
least the number of readers who really reached it, and the openings cannot be
inflated by a window boundary, so the true share is at or below this. For a part
nearly everybody reaches the ceiling is 1 and says nothing, which is the ordinary
state and not a fault.

**The headcount is `reached × opened ÷ appearances`** — the estimate at the exact
arrival count, which is the number a sentence says out loud. One division of two
whole numbers rather than the share multiplied back up: seven in a hundred, times
a hundred, is seven and a quadrillionth in a float, which is above the most
readers who could have got there and would make the figure break its own ceiling.

**The headcount is withheld in three states and the share is not.** Under a
silence; while any opening is pending, because projecting the folded rate onto
page views no rollup has reached answers a question about readers nobody
measured; and where the two counters cannot be reconciled, because a count of
people above the number of people who arrived is the one figure a screen must
never show.

**Three silences, because they are three different sentences.** `unmeasured` is
no row for the pair. `unopened` is a row whose openings are nought — which is
either a revision nobody has read or, where appearances have been counted,
**senders that are not marking their openings**, a diagnosis nothing else here
offers. `uncounted` is arrivals with no window folded yet.

**`reached` above the appearances is named and is not the ordinary straddle.** A
view that reached a part in a window is a view that appeared in it, so rows
written by the same rollups cannot produce it; node counters older than the
page-view column can, and so can a caller who concatenated two reads. It is
reported per part and listed for the page, and it is the state where a surface
should show `reached` and say it cannot yet be put as a share.

**The gap between the estimate and the ceiling is the straddle, and `exact` says
when there is none.** Where the appearances equal the openings nobody's visit
spanned two windows, the two figures are the same number, and the shares are
exact.

**Nothing is collected for this.** No payload, no browser byte, no column, no
store method and no kind. It is the fifth thing taken out of the server-side join
(0212, 0214, 0219, 0221 and 0224 being the others).

## Consequences

- **A rate can be stated at last, with its own error beside it.** *About two
  hundred of the three hundred and twenty readers who arrived got as far as the
  pricing band*, with the inflation 0219 measures published on the same object.
- **A deployment's one control over this error becomes checkable.** Lengthening
  the rollup window reduces straddles; `exact` and the gap between the two
  figures are what say whether it worked. 0147 named a control nothing could
  evaluate afterwards.
- **The floor is superseded for any caller that holds the rows, and is still
  published.** `countedViews` carries the number a reading gave on its own, so a
  deployment sees the difference the join made rather than being told the old
  figure was wrong.
- **A stop is still two `reached` counts and is not a share of the openings.**
  0221 refused the exact denominator for a fall deliberately, because that ratio
  can honestly exceed 1. Nothing here changes that: the ceiling is where the
  openings belong, and this record extends 0221's cancellation argument rather
  than replacing its unit.
- **No page-level total of readers, and the absence is asserted.** One reader who
  reached four bands is in four rows; adding them reports four people. The same
  distinctness trap 0147 and
  [0167](0167-a-delegated-signal-names-the-regions-it-happened-inside.md) name,
  in the place a sum would look most like a headline.
- **A new diagnosis for an upgraded deployment.** The first reading after this
  ships, on a deployment whose counters predate the page-view column, reports
  every busy part as unreconciled and says why. It clears itself as the old
  windows expire.
- **Per-reader identity gets no cheaper and no dearer.** Every figure is a ratio
  between two aggregates of one revision, computed at read time, written nowhere.
  What an identity feature would want instead is distinct consenting readers as
  the denominator, and nothing here forecloses it: the function takes a reading
  and two integers and does not know where they came from.

## Alternatives considered

**Divide by `opened` and publish one number.** It is the exact count, so it looks
like the right denominator. It is not: the numerator carries a straddle
over-count the denominator does not, so the quotient can exceed 1 for any part
most readers reach — which is every band near the top of a page — and a screen
drawing a bar longer than its track is worse than a screen drawing an estimate.
Kept as the ceiling, where being an over-estimate is the property that makes it
useful.

**Divide by `appearances` and publish one number.** Honest about the rate and
unable to say how many people that is, which is the sentence a deployment
actually wants. The pair costs one more field and says both.

**A confidence interval around the estimate.** Refused for the reason 0224
refused it: the error here is systematic rather than sampling, so an interval
computed as though the counts were independent draws would be narrower than the
truth and more authoritative than any other figure on the screen. The gap
between the estimate and the ceiling is a weaker claim that is actually true.

**A provable floor on the share as well as a ceiling.** Attempted and dropped,
and it is worth recording why, because it looks available. Subtracting the drift
from the reach is a floor only if every page view that opened also appears in
some window, and a view that opened and produced no signal a rollup folded does
not — so the arithmetic quietly assumes the thing it is trying to bound. Knowing
how many *distinct* views signalled at all is the one quantity that cannot be
added across windows, which is 0147 again. So: an estimate and a ceiling, and no
floor claimed.

**Stamping the share onto the stored rows at rollup time.** The same mistake 0212
refused for declarations, with a sharper edge: the openings keep arriving after a
window closes, so a share written at rollup time is a ratio to a denominator that
was still growing.

**Making a part's reach reconcile by clamping it to the openings.** It would make
every bar fit its track and would hide an upgraded deployment's stale counters,
a caller's concatenated reads, and a sender that marks only some openings. The
flag is the useful half of the defect.
