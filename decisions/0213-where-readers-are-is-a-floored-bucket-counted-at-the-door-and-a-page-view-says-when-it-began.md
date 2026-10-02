# 0213. Where readers are is a floored bucket counted at the door, and a page view says when it began

**Status:** Accepted
**Date:** 2026-10-02
**Section:** §4c (reader signals)

## Context

Step 7 of [`docs/signals.md`](../docs/signals.md) is the one thing the maintainer
asked for that the browser is not allowed to help with: *where are our readers?*
A country is useful — it is the first thing anybody wants from a page's numbers,
and it is what decides whether the next thing written is in one language or
three. It is also the first fact in this subsystem that is about the reader
rather than about the page, so the plan constrains it in three sentences before
it approves it: a region lands on a counter and never on a buffered batch, a
bucket is kept only once it holds enough views to not be a person, and the
address it came from is never stored.

Nothing has to be sent for it. A platform in front of the application already
writes the country of the request into a header — on Vercel,
`x-vercel-ip-country` — so the region is free at the door and unknown everywhere
else. The question is entirely what to *count*, and the answer turned out to
depend on a number nobody had.

**A region counter has to count page views, and an intake cannot count them.**
`views` on a tally counts distinct page views because a batch carries a view key
and rollup compares them inside a window. The door cannot: a view key is the one
value in this seam that may never be written down
([0146](0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md)),
so an intake has no way to tell a reader's fortieth delivery from a fortieth
reader. The only unit it can count unaided is the delivery — and a reader who
stays ten minutes posts a hundred of them.

That is not an inaccuracy. It is the **protection inverting**: the floor exists
so that no named bucket can be one person, and a counter that moves with how long
somebody stayed lets one person clear any floor on their own. *Luxembourg: 112*
would be one reader, reported as a readership, with nothing on the screen saying
so.

## Decision

**A batch says whether it opened its page view.** `first: true`, optional, on at
most one batch of a view, refused by the parser unless the batch also names the
view it opened. The broadcaster sets it on the first batch it actually sends and
on no other; a new broadcast is a new page view and so a new opening, which is
what a client-side navigation already needs for the view key.

**Where readers are is a counter written at the door, from the request, and
nowhere else.** `loom_reader_regions` is a tree, a revision, a country and a
number of page views that began there. It is written by the intake, because the
request is the only place the region was ever knowable, and it is the only
durable counter in this subsystem that no rollup touches.

**The region never reaches a raw row.** The buffered batch is what it always was,
and the opening marker does not reach one either: it is read at the door and both
journal implementations drop it, because a buffer is for what rollup reads.

**A bucket is counted always and named only above a floor.** The floor is 25
views, it is applied when the rows are read rather than when they are written, and
a deployment may raise it and may not lower it. What is withheld is still
reported as a total that names nowhere, so the number of views a reading accounts
for is the number of views there were.

**The readers nobody could place are a bucket, never a dropped row**, and that
bucket is never withheld: it names no place, so there is nobody in it to
re-identify.

**The region is a closed set — two letters, or the word for not knowing.** A
header is written by whatever sits in front of the application, and on a
deployment whose proxy passes a caller's value through it is written by the
caller. Anything that is not a country code is unplaced, so the worst a poisoned
header can do is add to a bucket that already exists.

**Nothing derived from an address outlives the request.** The region is read from
a header, used once, and counted. The address itself is read for one purpose only
— the rate limit — and that digest is keyed by random bytes minted per process
and shared with nothing (0161).

## Consequences

- **A region view is exact, which no other view count in this subsystem is.** It
  is counted once, at the instant a page view began, so region numbers add across
  revisions, trees and months. `views` on a tally is a distinct count summed
  across rollup windows and over-counts the views that straddle a boundary
  ([0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md));
  a region bucket has no window to straddle.
- **The floor is a product property rather than a deployment's choice.** An
  operator who asks for a smaller bucket gets the runtime's number and is told
  so by the status endpoint. A deployment that could set the floor to one would be
  running a different product, and the difference would be invisible on the screen
  that showed the result.
- **A floor applied at read time means small buckets exist in the table.** A row
  saying one view came from Luxembourg is in the database and cannot be shown by
  anything that reads through a reading. The alternative — refusing to write below
  the floor — cannot work: a bucket that is never written can never reach the
  floor, so the map would stay empty for ever.
- **The browser cost is 31 bytes minified, 16 gzipped**, and 13 bytes on the wire
  on one batch per page view. Measured, not estimated; rule 4 of the plan holds.
- **A region that cannot be written never fails a delivery.** The batch is
  already kept by then, and refusing would invite a retry that counted every
  signal in it twice — which is the one mistake here that cannot be undone
  ([0158](0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)).
  The outcome says a bucket was lost; the counter simply did not move.
- **The opening marker is reusable and deliberately not yet reused.** It would
  also give a rollup the exact number of page views that *began* in a window,
  which is the straddle problem above solved rather than bounded. That is a column
  and a counter, and it is the plan's next question rather than this record's.
- **Per-reader identity gets no cheaper and no dearer.** An opening marker says a
  page view began; it does not say who, and two openings from one person are
  indistinguishable from two people. A region bucket holds no key anything could
  be joined to it by.

## Alternatives considered

**A region on the buffered row, counted by rollup like everything else.** This is
the shape the rest of the subsystem has, and it is the one the plan forbids. A raw
row would then say *this page view, this long, from this country* — a profile with
nobody's name on it, and the only thing keeping it from becoming one would be
that nobody had yet written the join. Rejected by the plan, and the plan is right:
the expiry of the raw window is a retention policy, not a guarantee about what a
row means while it exists.

**Counting deliveries instead of page views.** Free, needs no browser change, and
wrong in the specific way that matters: it inflates every bucket by how long
readers stayed, so a single visitor passes any floor and a page nobody left looks
like a crowd. A plausible number of the right shape about nothing.

**Remembering view keys at the door for long enough to deduplicate.** A map of
keys seen recently would count page views exactly, in one process, and is refused
on two counts. It stores the value 0146 exists to keep unstored, even briefly;
and on a serverless deployment the batches of one page view land on whatever
instance takes them, so the count would be wrong by a factor nobody could state.

**A sketch instead of a set — a Bloom filter or a sketch of view keys.** Still a
derived form of the value that may not be kept, with the added property that
nobody reading the code could say what it did or did not retain.

**A subdivision or a city rather than a country.** The headers are sitting next to
the one this reads. A city plus a count of two is a person with an address, and no
floor fixes that for the places where a city *is* a handful of readers. Country is
the coarsest unit that still answers the question asked.

**A floor enforced when the row is written.** Discussed above: a bucket that is
never written never reaches the floor. The weaker version — write, and delete rows
that stay small — was rejected too, because the deletion would have to run on a
schedule and the smallest buckets would be the ones most likely to survive it
between runs.

**Region counting off by default, like intake.** Considered seriously, because
every other switch in this subsystem defaults to off. Rejected: the endpoint is
already the opt-in, and what this adds to a deployment that asked to measure its
readers is a floored count of page views per country with no address kept. A
deployment with its own reason to refuse sets one variable, and the status
endpoint says which way it is set.
