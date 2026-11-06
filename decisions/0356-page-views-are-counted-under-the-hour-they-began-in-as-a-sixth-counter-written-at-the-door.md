# 0356. Page views are counted under the hour they began in, as a sixth counter written at the door

**Status:** Accepted
**Date:** 2026-11-06
**Section:** §4c (reader signals)

> **Numbered 0356 rather than 0355**, which is the next number free on `main`
> and is claimed by **two** open branches —
> `signals-75-the-events-a-screen-can-list` (#780) and
> `framework-85-a-page-per-audience` (#781). Taken deliberately so that
> `Loom merge` renumbers one record rather than two, under the rule that a
> clash is renumbered when the pull request is merged (0097).

## Context

`Loom portal` filed it on 6 November, against `docs/portal-wireframes.md`
*1 · Signals*, which puts three things over the whole screen: a range picker
(last 24 hours, 7 days, 30 days), a figure for *page views in the range* with
the change on the period before, and **a bar chart of page views by hour**.

**Nothing in this subsystem could answer any of the three.** Every durable
counter here is timeless by design — a tally, a funnel answer, a region bucket
and a page-view total all say *so far* and nothing about when, because rule 5
of [`docs/signals.md`](../docs/signals.md) makes aggregates the durable artefact
and an aggregate was never asked to carry a clock. The only rows with an instant
on them are the kept deliveries
([0351](0351-a-counted-delivery-is-kept-for-a-stated-window-rather-than-deleted-by-the-fold.md)),
and they are paged by delivery, 2,000 at most a call, and live only as long as
the window a deployment keeps them for. The portal said plainly why it would not
draw a chart from that: the *Events* tab can cap itself at 2,000 deliveries and
say how far back it looked, and **a bar drawn from part of an hour is a wrong
number rather than a shorter list.**

So the question was what to count, and the answer was already arriving.

**A delivery says whether it opened its page view** — `first: true`, on at most
one batch of a view, refused by the parser unless the batch names the view it
opened
([0214](0214-where-readers-are-is-a-floored-bucket-counted-at-the-door-and-a-page-view-says-when-it-began.md)).
Two things are already derived from that one marker at the door: how many page
views began on a revision (`page-views.ts`) and where in the world they began
(`region.ts`). The hour a page view began in is the third, and it is free: the
door is already stamping every counter this delivery moves with one instant.

## Decision

**Page views are counted a second time, under the hour they began in.**
`loom_reader_arrivals` is an application, an audience, a tree, a revision, an
hour and a number of page views that began in it. It is the sixth table in this
subsystem and the only one with a clock in its key.

**The hour is UTC, and the bucket is the instant it began.** Finer is not
available and coarser would not serve the screen that asked: a *last 24 hours*
chart needs twenty-four bars, so a day bucket cannot draw it, and a minute
bucket is sixty times the rows for a resolution nothing has asked for. A surface
wanting days sums hours, which is addition over counts that were each counted
once. A deployment drawing local time shifts the labels — a decision about a
reader's screen, not about a counter.

**It is written by the door, in the same call and the same transaction as the
page-view total it slices.** `ReaderOpeningCounter.opened` writes both rows or
neither. One call rather than two because the two numbers are the same arrivals
under two keys: a door that could move one without the other would leave a
deployment whose hourly chart does not sum to its own page-view count, for ever
(0158), with nothing to say which of the two was wrong. The openings are the
ones `openingsOf` already found, so the three counters derived from one walk
cannot disagree about how many readers arrived.

**A reading of it is a bounded read with a beginning.** The counter read answers
two things in one call — the hours in the range, and **the first hour the same
narrowing has ever counted** — so a chart over thirty days on a deployment that
has counted for a week draws a week and says where its data starts, rather than
drawing three empty weeks. The range's figure and the change on the period
before come off the same read, through one call that derives the read from the
range, because the obvious composition reads only the range on the screen and
then reports an earlier period that is empty *because it was not read*.

**An earlier period that predates counting has no figure, not a nought.**
`was` is `null` and the quotient is `unmeasured` (`ratios.ts`); nought is
reserved for a period that was counted and held nobody, which is `from-nothing`
and the rise a surface most wants to draw.

**Nothing reaches a reader's browser and nothing is added to the wire.** No
payload field, no new kind, no export on the broadcast entry point. The
broadcaster is byte-identical: 6,513 bytes minified, 2,993 gzipped.

## Consequences

- **The portal can draw the range picker, the chart and both figures**, over the
  deployment or over one page, from one read per range. *By page*'s bars for a
  range come off the same counter with a `treeId` on the request.
- **An hour outlives the delivery it could have been derived from.** This is the
  one consequence worth stating rather than leaving to be noticed. Until now,
  *how many readers arrived between two and three on 3 November* was answerable
  for as long as a deployment kept its deliveries — thirty days by default — and
  then stopped being answerable. It is now answerable for as long as the
  counters live, which is for ever. What the row says is a count of page views
  of one revision, which is the figure `page-views.ts` already calls *nowhere
  and nobody*: no reader, no place, no page view, no key, nothing that could be
  joined to a person. But it is a count against a clock, and that is new.
- **There is no floor on a bucket, and the asymmetry with regions is
  deliberate.** A region bucket is floored at 25 views because a country with
  four views in it is a household or an office (0214). An hour names no place and
  no person, and the same hour of the same page already existed at millisecond
  precision in a kept delivery for thirty days, so a floor here would withhold a
  coarser figure than the one the deployment is already keeping. If the
  maintainer wants one, it is `regionFloorOf`'s shape over a different column
  and it is a change to this record.
- **No backfill, and a deployment that upgrades starts counting hours today.**
  Nothing ever knew which hour an arrival was in, so there is nothing to backfill
  from; the reading publishes the hour counting began, which is what makes the
  absence a sentence rather than a gap.
- **One more upsert on the request path**, inside a transaction that was one
  statement. It is one row per revision per hour per audience, so two deliveries
  in the same hour contend on the same row — the same contention the page-view
  total has already had since 0214, one table wider.
- **The table grows with hours rather than with readers**, which is the cheap
  direction: a deployment with fifty pages serving one audience writes at most
  1,200 rows a day however many readers arrive, and the rows are never updated
  again once the hour is over.
- **`ReaderTallyStore` has a fourth listing**, so the portal's bounded wrapper
  forwards one more method. Fifth time a widened store interface has asked that
  of `bounded-store.ts`, and the gate is what catches it.
- **It does not compose into `windowAssemblyOf`.** A window is a set of counters
  and this is a stretch of time, so the second rung publishes nothing about it
  and a caller reads it directly. Filed, with the recommendation that it stay
  that way until a reading wants both.

## Alternatives considered

**Count the hour on the kept deliveries instead, by grouping on the `view`
key.** The route that needs no new table: every delivery carries its receipt
instant and its view key, so a page view's hour is the earliest kept delivery of
its key. Rejected on three grounds, the first of which is the one that settles
it. It is **a query about view keys** — the one value in this seam that exists
so that a funnel can be correlated inside one page view and for nothing else
(0146) — and a `GROUP BY view` over thirty days is the shape that rule was
written to keep out, however anonymous each group is. It is a scan of the whole
kept window on every render, which is the cost the portal filed about. And it is
wrong at the window's lower edge, where a page view's first delivery has already
been deleted and its second reads as an arrival.

**Keep the opening marker on the buffered row and count hours off it.** A
boolean column on the delivery, which would make the hour exact without the view
key. Rejected because **0214 decides the opposite in terms**: *the opening
marker does not reach a raw row — it is read at the door and both journal
implementations drop it.* Overturning an accepted record to avoid a table on a
question the record's own architecture already answers would be the wrong trade,
and the marker on a kept row is a claim about a page view sitting beside that
page view's key for thirty days, which is strictly more than a counter says.

**Count deliveries per hour rather than page views.** Needs no marker at all and
is one `date_trunc` over the buffer. Rejected: a reader who stays ten minutes
posts a hundred deliveries, so the chart would be a picture of how long people
stayed drawn as how many people came. 0214 refused this shape for the region map
and the argument has not changed.

**Add `hour` to `loom_reader_page_views`' key.** No sixth table, and the total
and the hours would be one row shape. Rejected: it multiplies that table's rows
by every hour and changes what every existing reading of it means — `opened` is
read as *page views of this revision, ever* by the arrival standing, the stall
check, every rate's denominator and the straddle subtraction. A key rebuild
under all of those, to avoid a table, is the expensive way to buy nothing.

**A rollup writes it, from the window it folds.** Where every other counter here
is written. Rejected because it cannot be: by the time a window is folded,
nothing in it knows which of its page views were already underway (0214), and
the fold's own instant is when it ran rather than when anybody arrived.

**A second interval of configuration for how long hours are kept.** The shape
retention takes for deliveries. Rejected: counters are the durable artefact
(rule 5) and a third retention window is a third number an operator has to keep
in step with a promise published to readers (0320). If an hourly series ever
needs an age, it is a decision of its own with a notice attached.

**Minute buckets, or a configurable bucket.** Rejected: sixty times the rows for
a resolution no reading has asked for, and a configurable bucket makes every
figure a deployment publishes incomparable with every other deployment's and
with its own past.
