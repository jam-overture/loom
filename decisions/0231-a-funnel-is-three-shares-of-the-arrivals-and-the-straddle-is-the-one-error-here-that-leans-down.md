# 0231 — A funnel is three shares of the arrivals, and the straddle is the one error here that leans down

**Status:** Accepted
**Date:** 2026-10-05
**Section:** §4c (reader signals)

## Context

A `FunnelAnswer` is two counts off one window: the page views that satisfied one
end of a pair a deployment named, and the ones that satisfied both
([0146](0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md)).
Divided into each other they give a rate, and that rate has been the one figure
in this subsystem that never needed a denominator handed to it: two counts off
the same rows, which is
[0221](0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md)'s
cancellation.

It is also not the number anybody quotes. A deployment asking *what is our
conversion rate* means *of the readers who arrived*, and `reached` on a pair is
the page views that got to the first end — so a pair whose `from` sits at the
bottom of a long page can post a magnificent rate while converting four people.
The exact count of arrivals has been in `loom_reader_page_views` since
[0219](0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md),
and [0229](0229-a-share-of-readers-is-estimated-against-the-appearances-and-bounded-against-the-openings.md)
joined it to the node counters. Nothing joined it to the funnels, which left the
funnel as the last counter here with no honest share of its own.

Building that join turned up a second thing, which is the reason this record is
not simply 0229 applied again.
[0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md)
records, in its consequences, that **a conversion rate is honest and a view
count is slightly generous**, on the ground that a funnel answer is computed
inside one rollup run where distinctness is exact. That is true of one answer.
It is not true of the stored row: `addFunnelAnswers` adds every window's answer
into it, exactly as the tallies are added, and a page view whose reader met the
first end in one window and converted in the next contributes
`reached 1, converted 0` to the first window and nothing to the second. The
conversion is not double-counted. It is **lost**.

So the straddle 0147 names as an over-count is, on this one counter, an
under-count — and it is an under-count of the numerator of the figure somebody
acts on.

## Decision

**`funnelReachOf(where, funnels, rows)` reads a revision's funnels against the
readers that revision had.** It is handed the revision rather than inferring it,
filters both sets of rows to it, and reports what it dropped. Pure; nothing was
added to a payload, a browser, a column, a store or the vocabulary.

**The unit of the answer is three shares of the arrivals, and they partition
them.** `lostBefore` never reached the first end, `lostBetween` reached it and
did not convert, and `conversion.share` did both; the three sum to 1 wherever
all three can be given. The reason to report all three rather than the rate is
that **the two losses have opposite remedies** — a page nobody scrolls to the
pricing band is a different problem from a pricing band nobody buys from — and
`rate` cannot tell them apart, because the first loss is entirely inside its
denominator. `worse` names the stage that costs more readers, by headcount
rather than by share, which is 0221's ranking rule at its two-element case.

**Each count is put as a share with 0229's quartet, unchanged.** The estimate is
taken of the appearances, where the straddle is in the numerator and the
denominator and very nearly cancels; the ceiling is taken of the openings, which
are exact; the headcount is one division of two whole numbers and is withheld
while any opening is pending. `ReachSilence` is reused rather than restated: the
three reasons there is no denominator are states of the deployment, not of the
question, so a funnel reading and a part reading go silent for the same three and
a surface handles them once.

**`rate` is published as a floor, and the straddle's bias is bounded rather than
mentioned.** `rateAtMost` applies both of the straddle's worst cases at once —
every conversion it could have split and lost recovered into the numerator, every
duplicate it could have made taken out of the denominator — as
`min(1, (converted + drift) ÷ max(1, reached − drift))`. It closes onto `rate`
where nobody's visit spanned two windows, and it opens wide where a deployment's
rollup window is short relative to how long readers stay. It is withheld under a
silence, where there is no measured drift to bound anything with.

**No ranking across pairs, and no page-level total of readers converted.** Two
pairs are two questions about different nodes and different kinds, and the pair
that loses the most readers is reliably whichever `from` is deepest in the page;
ranking them would put a true number at the top of a screen as the answer to a
question nobody asked. A total is refused for 0167's reason: one page view can
satisfy several pairs.

**The row-pairing rule is published once, as `pageViewsFor` and
`inflationFor`.** Picking the page-view row that belongs to a reading is now one
function, used by `pageReachOf` and `funnelReachOf` alike, because the matching
is the part of every join here that fails quietly when it is got wrong: the
aggregate `inflation` published beside the rows is the obvious thing to reach
for, and handing a busy page's straddle rate to a quiet one is an invented
correction with three decimal places on it.

## Consequences

- **A deployment can state a conversion rate and say which half is broken.**
  Three shares and a stage, off counters it already has.
- **0147's consequence is wrong about the stored row, and this record is where
  that is written down.** 0147 is not superseded: every word of its decision
  stands, and what is corrected is one sentence of its consequences, which was
  true of the answer it was describing and not of the sum the store keeps.
- **`rate` is the only figure in this subsystem biased downward.** Everything
  else taken off a distinct count leans generous (0147). That is the safe
  direction for *readers convert* and the unsafe one for *this funnel is
  broken*, which is why the bound exists rather than a caveat.
- **The one control a deployment has over this error is now readable off a
  funnel.** The gap between `rate` and `rateAtMost` is the rollup window's
  length, in the figure it damages — which is the second time 0219's drift has
  turned an argument into a number.
- **A consumer of the pace reading no longer writes the matching itself.**
  `inflationFor` closes the portal lane's finding of 5 October with its first
  shape.
- **`rateAtMost` has no cap of its own on the recovery, deliberately.** The
  honest-looking clause — a recovery no larger than the conversions still
  missing — cannot change the result, because the two spellings differ only
  where both numerators exceed the denominator and both are therefore capped at
  1. A clause nothing can falsify is not a safeguard.

## Alternatives considered

**Report the rate and nothing else, and let the portal divide by the
arrivals.** What exists today, and the reason this record is not needed if the
answer is yes. Rejected on the pairing: every consumer would write the same
match on `treeId` and `revision`, and the one that got it wrong would produce a
figure nothing downstream could catch — which is precisely the finding filed
against this lane the morning this was built.

**Correct `converted` for the split conversions rather than bounding it.**
Tempting, and it would make a single rate honest instead of an interval. It
needs to know which views straddled, which means knowing which view keys
appeared in two windows, which means keeping view keys past the window they were
minted for — 0146's one refusal, and the one 0147 already declined to reopen for
the same reason.

**Make the funnel exact by rolling up only page views that have certainly
ended.** 0147 rejected this for the distinct counts and the rejection carries:
nothing tells a server a page view has ended, so *certainly ended* is a timeout
and the counters would lag it.

**Rank the pairs, with a headline figure like §9's.** Rejected above. The
ranking §9 does is of siblings of one page, which are comparable by
construction; funnel pairs are not, and the ranking would be dominated by how
deep each `from` sits. A screen that wants a headline should rank by the stage
breakdown of one pair it already cares about.

**A third stage, for arrivals that reached the second end without the first.**
Unreachable rather than refused: `converted` counts views in the `from` set that
are also in the `to` set, so there is no such population to report, and a pair
whose `to` fires without its `from` is simply two independent counters a
deployment can read off the tallies.

**One closed set of silences per module.** Rejected. Three identical members
with three identical meanings, restated, is a second place for the deployment
diagnosis `unopened` carries to drift from the first.
