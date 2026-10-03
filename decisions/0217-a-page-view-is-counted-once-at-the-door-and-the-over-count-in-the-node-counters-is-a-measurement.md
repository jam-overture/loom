# 0217 — A page view is counted once at the door, and the over-count in the node counters is a measurement

**Status:** Accepted
**Date:** 2026-10-03
**Section:** §4c (reader signals)

## Context

Every number the portal will show about readers is a rate: how many of the page
views that reached the pricing band pressed the button, how much of the page the
average reader got through, whether a change moved either. A rate needs a
denominator, and this subsystem did not have one.

What it had was `views` on a tally — *distinct page views that produced a signal
about this node*, counted inside one rollup window and **added** to the next
window's. Distinctness does not survive addition, so a reader whose visit
straddles a boundary is one view in each window and two after the sum.
[0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md)
accepted that, named the error as always an over-count, and bounded it with
arithmetic a deployment cannot evaluate from its own rows: *views per window ×
page-view duration ÷ window length*. So a portal could say a figure was slightly
generous and never how generous, and the control it had — lengthening the window
— could not be checked against anything afterwards.

[0214](0214-where-readers-are-is-a-floored-bucket-counted-at-the-door-and-a-page-view-says-when-it-began.md)
added the one fact that changes this. A batch may carry `first: true`, meaning
*this delivery opened its page view* — the thing only a sender knows, because the
server's alternative is to remember view keys, which is the single value 0146
forbids keeping. It was added so that a region bucket could count readers rather
than deliveries, and 0214 closed by saying the marker was reusable and
deliberately not yet reused: *it would also give an exact number of page views
that began, which is the straddle problem solved rather than bounded. That is a
column and a counter.* This is that column and that counter.

## Decision

**A page view is counted once, at the door, into a counter of its own.**
`loom_reader_page_views` is a tree, a revision and two numbers. `opened` is
incremented by the intake from the opening markers in a delivery, deduplicated by
view key within it, exactly as the region buckets are — one row per revision, no
view key, no region, nothing per arrival.

**The same page views are counted a second time by every rollup, into the column
beside it.** `appearances` is the window's distinct page views per revision: the
quantity 0147 calls approximate. A rollup already produced it; what is new is
that it is kept.

**The difference between the two columns is the over-count, per revision, in the
rows.** For an honest sender the only way they can differ is a page view whose
batches landed in more than one window, so `appearances − opened` is the straddle
— and `drift ÷ opened` is how generous every distinct count stored against that
revision is. 0147's bound stays true and stops being the only thing a deployment
has.

**A reading never shows a negative drift.** Taken between a delivery and the next
collection, the openings are durable and their window is still in the buffer;
that is `pending`, the other sign of the same subtraction, and it is what a
stalled collection looks like instead of counters that appear exact.

**The marker still goes no further than the door.** Both journals drop it, the
contract suite says so, and a rollup is not told which of its views were already
underway. One thing decides how many readers arrived.

**There is no floor and no switch.** 0214 floors a region bucket because a
country with four views in it is a person. A count of page views of a revision
names nowhere and nobody, so there is nothing in it to withhold, and nothing for
an operator to have to turn off before the rest of the subsystem is usable.

**The counter lives on `ReaderTallyStore`, and the door is handed one method of
it.** `ReaderOpeningCounter` is `opened` and nothing else: a public write
endpoint that could read a deployment's tallies would be one query from serving
them.

## Consequences

- **The denominator is exact and adds.** A region view already was (0214) and
  nothing else here is. Page views of a revision add across windows, trees and
  months, so *before versus after a change* is a comparison of two exact numbers
  rather than of two approximations with different error terms.
- **A rate can now be shown with its own error beside it.** `inflation` is the
  number a screen says out loud: *these figures are 4% generous, because four of
  these hundred readers were counted in two windows.* That is a better sentence
  than any amount of exactness in a footnote, and the portal gets it from one
  row.
- **The two counters at the door cannot disagree.** The openings are walked once
  and a region is a stamp on them, so a map's views always add up to the page
  views there were. With regions on, summing the buckets of a revision and
  reading `opened` give the same number — and when a region write is lost, which
  0214 allows without failing a delivery, `opened` is the one that is still
  right.
- **One more write, once per page view.** Not per delivery: the ninety-nine
  deliveries after the opening one write nothing. It is the same statement shape
  the region counter already runs on the same request.
- **One row, two writers, one column each.** The upserts add to the column they
  own and leave the other where it was, so a rollup applying a window while a
  reader arrives cannot overwrite either number with the nought it inserted.
  Asserted against Postgres rather than reasoned about.
- **A sender is still what says a page view began.** A page that lies inflates
  this exactly as it could already inflate a region bucket; the rate limiter is
  what bounds that, and the marker says nothing about *who* — two openings from
  one person are indistinguishable from two people. A retried opening that
  arrives as its own delivery is counted twice, which is the same bound the
  region buckets have and the same one 0158 makes permanent.
- **Nothing is added to the wire and nothing to the browser.** The marker already
  ships for 0214, measured there at 31 bytes minified and 13 on the wire once per
  page view. This is the second thing derived from it rather than a second thing
  sent, which is the asymmetry the plan exists to exploit.
- **Per-reader identity gets no cheaper and no dearer.** The row holds two
  integers about a revision. There is no key in it, nothing to join, and nothing
  that would have to be unwound if the parked question ever returns.
- **The contract suite earned its keep again.** It caught a divergence nobody was
  looking for: `ON CONFLICT … DO UPDATE` refuses to touch one row twice in a
  single statement, so two counts of one revision in a call would have had the
  whole write refused in Postgres while the memory store added them. The
  addition now happens in front of the driver, in one place, and both stores
  answer the same.

## Alternatives considered

**Put the opening marker in the buffer and let a rollup count arrivals.** The
shape the rest of the subsystem has, and the first thing to try. Rejected on
0214's ground and one of its own: a raw row saying *this page view began at this
moment* is a step toward a profile, and the expiry of the raw window is a
retention policy rather than a guarantee about what a row means while it exists.
The second reason is that it would give two things the authority to decide how
many readers there were — the door, for the region buckets, and a rollup, for
this — and the day they disagree there is no third number to arbitrate with.

**Sum the region buckets instead of keeping a counter.** Free: regions already
count openings, so the sum of a revision's buckets *is* this number. Rejected,
and the reason is worth keeping. `LOOM_SIGNAL_REGION=off` is a supported choice
an operator may make for its own reasons, and it must not take the denominator of
every other figure with it. A region write may also be lost without failing a
delivery (0214), so the sum is allowed to be short — which is tolerable for a map
and not for the number everything is divided by.

**A table and a store of its own, like the regions'.** Tidier on paper and
rejected on wiring. The rollup half would have to be threaded through
`collectReaderSignals` and into `apps/loom/scripts/signals-collect.ts`, which
belongs to another lane — so the column that makes the subtraction possible would
have shipped with nothing writing it, which is the failure three findings
already named about this subsystem once. The counters store is already applied in
the one place a rollup is.

**Make the distinct counts exact rather than measuring them.** Keep view keys
durably, or keep a sketch of them. 0147 refused both and nothing here reopens the
argument: a key that outlives its window is a key that can be joined across
windows, and the claim that it identifies nobody rests entirely on how briefly it
exists.

**A floor, as the region buckets have.** Rejected: there is nobody in *four page
views of revision 3* to re-identify, and a floor would withhold the small numbers
of exactly the deployments that most need to see them.

**One drift figure for the deployment.** Rejected twice over. It cannot answer
*before versus after a change*, which is the question this product exists for;
and a revision mid-collection would cancel another revision's straddles, so a
page could claim counters more exact than any revision on it. A reading totals
each row's drift rather than subtracting the two sums.
