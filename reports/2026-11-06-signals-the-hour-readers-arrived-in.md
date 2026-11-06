# The hour readers arrived in

**Lane:** `Loom signals` · **Date:** 6 November 2026 (morning run) ·
**Branch:** `signals-76-the-hour-readers-arrived-in` ·
**Record:** [0356](../decisions/0356-page-views-are-counted-under-the-hour-they-began-in-as-a-sixth-counter-written-at-the-door.md) ·
**Plan:** [§76](../docs/signals.md)

## What I completed

**Page views are counted under the hour they began in**, so the portal's range
picker, its *page views in the range* figure with the change on the period
before, and its bar chart of page views by hour are all one bounded read.

`Loom portal` filed for it this morning and the entry is closed. It could draw
none of the three and said exactly why: every durable counter in this subsystem
is timeless, the only rows with an instant on them are the kept deliveries, and
those page by delivery — *a bar drawn from part of an hour is a wrong number
rather than a shorter list.*

**Nothing new is collected.** A delivery already says whether it opened its page
view (0214), and two things are already derived from that marker at the door:
how many page views began on a revision, and where in the world. The hour is the
third, and it was free — the door is already stamping every counter a delivery
moves with one instant.

- **`loom_reader_arrivals`**, the sixth table here and the only one with a clock
  in its key: an application, an audience, a tree, a revision, an hour and a
  number of page views that began in it. UTC, bucketed at the hour.
- **`opened` writes both rows or neither**, in one transaction. The revision's
  total and the hour are the same arrivals under two keys, so a door that could
  move one without the other would leave a deployment whose chart does not sum
  to its own page-view count — permanently and invisibly (0158). The openings
  are the ones `openingsOf` already found, so the three counters derived from
  that one walk cannot disagree about how many readers arrived.
- **A reading has a beginning.** The counter read answers two things in a call:
  the hours in the range, and the first hour the same narrowing ever counted. A
  thirty-day chart on a deployment that has counted for a week draws a week and
  says where its data starts, rather than drawing three empty weeks.
- **`readReaderArrivals` is the call a surface makes**, because the obvious
  composition is wrong in a way that type-checks: the change is over two
  periods, so a caller who reads only the range on the screen gets an earlier
  period that is empty *because it was not read*. That draws as *every reader
  you have is new*.
- **An earlier period that predates counting has no figure, not a nought** —
  `was: null` and `unmeasured` rather than `from-nothing`, reusing `ratios.ts`
  rather than spelling a fourth copy of the rule.

## Decisions I took that were not specified

**A counter, not a read of the kept deliveries.** The portal left the choice to
the intake: *counted from the kept deliveries or kept beside the tallies as a
counter by hour.* I took the counter, and the deciding reason is not cost. The
delivery route means **grouping thirty days of rows by `view` key** and taking
each key's earliest receipt — a query *about view keys*, which is the one value
in this seam that exists so a funnel can be correlated inside one page view and
for nothing else (0146). A counter that needs no key at all is strictly safer,
and it answers for as long as the counters live rather than for as long as a
deployment keeps its rows. The other two reasons are ordinary: it is one indexed
read instead of a scan, and the delivery route is wrong at the window's lower
edge, where a page view's first delivery has been deleted and its second reads
as an arrival.

**I did not keep the opening marker on the buffered row**, which was the first
shape I costed and would have made the hour exact without any new table.
**0214 decides the opposite in terms** — *the opening marker does not reach a
raw row; it is read at the door and both journal implementations drop it* — and
overturning an accepted record to avoid a table, on a question that record's own
architecture already answers, is the wrong trade. It is also more than a counter
says: a marker on a kept row is a claim about a page view sitting beside that
page view's key for thirty days.

**The hour, and nothing configurable.** A *last 24 hours* chart needs
twenty-four bars, so a day bucket cannot draw it; a minute bucket is sixty times
the rows for a resolution nothing has asked for; and a configurable bucket makes
every figure a deployment publishes incomparable with every other deployment's
and with its own past.

**No floor on a bucket**, and the asymmetry with the region map is deliberate
and in the record. A region bucket is floored at 25 because a country with four
views in it is a household (0214). An hour names no place and no person, and the
same hour of the same page already existed at millisecond precision in a kept
delivery for thirty days — so a floor here would withhold a figure coarser than
the one the deployment is already keeping. **If you want one, say so**: it is
`regionFloorOf`'s shape over a different column, and it is a change to 0356.

**A bucket belongs to the range its own start falls in**, and `arrivalRangeOf`
builds hour-aligned ranges so that the rule is invisible. The property it buys
is the one the comparison rests on: the period before an aligned range is
aligned, so both sides hold the same number of buckets and a percentage of two
honest counts stays honest.

**`whole: false` is the clock rather than the range.** The hour in progress is
marked where a caller hands in `now`. Without it, every bucket the range covers
whole is whole — because a range with no clock beside it is a stretch that is
over. The alternative was for the series to read a clock itself, which would let
two figures on one screen disagree about when they were taken.

**0356 is numbered 0356 and not 0355.** 0355 is the next number free on `main`
and **two** open branches claim it — my own #780 and `Loom daily build`'s #781 —
so taking it would have made `Loom merge` renumber two records instead of one.

## Records added

- **[0356](../decisions/0356-page-views-are-counted-under-the-hour-they-began-in-as-a-sixth-counter-written-at-the-door.md)**
  — Accepted. Nothing is superseded: 0214's clause about the marker not reaching
  a raw row is *kept*, and this is why the counter exists rather than a column.
  Seven alternatives recorded with the reason each was rejected, including both
  of the two the portal offered.
- `docs/signals.md` rule 5 carries the limit this found, in the shape rule 5's
  previous limit took: **an aggregate may carry a clock, and an hour outlives the
  delivery it could have been derived from.** The rule said nothing about time
  either way and every counter happened to be timeless, which is what the portal
  read it as.

## Findings

**Closed:** `Loom portal`'s entry of this morning, all three points. The second
landed better than asked — the series is a counter, so it is **not** limited to
the kept window — and the entry is closed with the three calls a screen makes
and the four things worth holding before drawing it.

**Filed:**

- For `Loom portal`, the one line this lane wrote in `app/_lib/app/bounded-store.ts`
  (below), with the observation that this is the only read in that file whose
  cost grows with what the caller asks for, because a range is a parameter.
- For this lane, that the series does **not** compose into `windowAssemblyOf`
  and probably should not — a window is a set of counters and this is a stretch
  of time — so the next run reading the second rung does not read the absence as
  a gap.

**Not addressed, and still mine:** the broadcaster takes an `Element` and
publishes no way to find one. It is now cheaper than when I last wrote this
down: `Loom daily build` shipped `addressedRootIn` on the light side of the
split (0354), so a `broadcast.ts` overload taking a `Document` is one import of
one function. It still needs a byte measurement and a published signature that
can be two things, and it was behind a screen nobody could draw.

## The one thing I changed outside my lane

**One line in `apps/loom/app/_lib/app/bounded-store.ts`**, which is the portal's:
`boundedReaderTallyStore` forwards `arrivals` within the same read budget as the
other three listings. Widening `ReaderTallyStore` makes that file not implement
the interface, so the app typecheck is red until it does — the same thing that
happened to `boundedReaderSignalJournal` yesterday, and the gate doing its job
both times. It is forwarding and a comment, it is filed for re-wording, and the
alternative was a pull request on red.

## Test numbers

Real, from this branch.

| | |
| --- | --- |
| `src/signals/arrivals.test.ts` | **39 passed**, 0 failed (new file) |
| `src/signals/arrivals.contract.ts` | **17 properties**, run against both stores |
| `src/signals/memory.contract.test.ts` | **102 passed**, 0 failed (was 85) |
| `src/signals/postgres.test.ts` | **121 passed**, 0 failed (was 101) |
| `src/signals` whole suite | **61 files, 2,091 passed**, 0 failed |
| `src/application/scoped.test.ts` | **17 passed**, 0 failed |
| the intake suite in `apps/loom` | **15 files, 195 passed**, 0 failed |
| the package suite | **262 files, 6,356 passed**, 0 failed |
| the app suite | **413 files, 6,716 passed**, 0 failed |
| `pnpm verify` | **green, exit 0** |

Nothing was skipped and no test was weakened. `pnpm verify` was red twice before
it was green, both mine and neither in the change itself:

1. **The generated API reference**, which wanted regenerating for nineteen new
   published names. The gate's own message says so and I ran it.
2. **`boundedReaderTallyStore` did not implement the interface** — the
   cross-lane line above.

A third thing the regeneration turned up and I acted on: the generator prints
every new published name, and **`precededBy` was one of them.** A door with
1,916 names is not a place for a name that means nothing on its own, so it is
`arrivalRangeBefore`, which pairs with `arrivalRangeOf` and says what it is a
range of.

**The case this would double-count.** Six, because a counter that moved with how
long somebody stayed is the fault 0214 exists to prevent and this is a second
counter over the same arrivals.

1. **A reader who stays an hour is one arrival.** The hours are derived from
   `openingsOf`, which counts the openings in a delivery and not the deliveries
   — so the ninety-ninth delivery of one page view adds nothing to any bucket.
   Asserted on the vocabulary and again in the contract.
2. **A retried opening inside one delivery is one arrival**, which is
   `openingsOf`'s own dedup by view key, inherited rather than re-implemented —
   the reason the hours are handed the openings rather than the batches.
3. **Two openings of one revision handed over in a single call are added, not
   refused.** In the contract, against both stores: Postgres refuses to affect
   one row twice in one command and a `Map` would keep the last, which is
   exactly the disagreement `counters.ts` exists to prevent.
4. **An arrival is in exactly one hour**, whichever side of a boundary it lands
   on — 02:59 and 03:00 are two buckets and one arrival each.
5. **Every arrival is in both counters.** The contract asserts that the hours of
   a revision sum to its `opened` total, over several deliveries in several
   hours, against both stores. This is the invariant the single transaction is
   for.
6. **Reading changes nothing.** The series over the same rows twice is the same
   figure, and the store read is a read — asserted at both levels, because the
   one thing that would make this subsystem's newest number untrustworthy is a
   figure that grows when a screen is refreshed.

And the one it would double-*write*: a delivery whose instant cannot be parsed
writes **neither** counter. Asserted on the vocabulary, in the contract against
both stores, and in Postgres by breaking the arrivals table and checking the
page-view total rolled back with it.

## Browser cost

**Nothing reaches a reader's browser.** `broadcast.ts` has no diff and nothing
changed is in its import graph. Measured on this branch with esbuild, bundled
and minified for the browser: **6,513 bytes**, byte-identical to §71, §72, §73
and §74. Gzipped with `gzip -9`: **2,993 bytes**.

No payload field, no new kind, no export added to the broadcast entry point. The
nineteen new published names are all in `arrivals.ts`, which the broadcaster does
not import, and `browser-weight.test.ts` holds that by walking the graph.

## Per-reader identity

Nothing in this unit touches it and nothing in it makes adding it later more
expensive. One thing in it is worth saying plainly anyway, because it is the
first time this subsystem has written a clock into a durable counter:

**An hour outlives the delivery it could have been derived from.** Until today,
*how many readers arrived between two and three on 3 November* was answerable for
as long as a deployment kept its deliveries — thirty days by default — and then
stopped being answerable. It is answerable now for as long as the counters live.
What the row says is a count of page views of one revision, which is the figure
`page-views.ts` already calls *nowhere and nobody*: no reader, no place, no page
view, no key, nothing joinable to a person, and coarser than the row it replaces.
But it is a count against a clock, and that is new, so it is in the record's
consequences and in rule 5 rather than left to be noticed.

It does not open the parked door and it does not narrow it. A reader id would
still be a new column, a new consent obligation and a new record.

## Open questions

Four, each with a recommendation. None is blocking and none needs a revert.

1. **Whether an hourly bucket should have a floor.** It has none, for the
   reasons above: an hour names nowhere and nobody, and the same arrival existed
   at millisecond precision in a kept delivery for thirty days.
   **Recommendation: no floor.** A floor on a figure coarser than the one the
   deployment is already keeping withholds nothing and makes every chart a
   deployment's first month cannot draw. If you want one anyway, it is one
   function over one column and a change to 0356.
2. **Whether the hourly series should ever be deleted.** It is a counter, so
   today the answer is never (rule 5), and it grows with hours rather than with
   readers — at most 1,200 rows a day for a deployment with fifty pages,
   whatever its traffic. **Recommendation: leave it durable.** A third retention
   window is a third number an operator has to keep in step with a promise
   published to readers (0320), and the thing a deployment would be paying to
   keep is already the cheap half.
3. **Whether the portal should be able to cap the range.** The bounded wrapper
   bounds how long a screen waits and not how much work it asks for, and this is
   the first read here whose cost is a parameter. **Recommendation: cap it in
   the portal if anywhere.** The store answers what it is asked; what a screen
   may spend is the screen's lane, and it is filed there.
4. **What order the two remaining findings go in** — the broadcaster's root
   selector, which unblocks a marketing panel and four hard-coded copies of an
   attribute name, against whatever the portal files after drawing this.
   **Recommendation: the broadcaster next.** It has waited two days, 0354 made
   it one import smaller, and it is the only open finding addressed to this lane
   that a reader's browser can feel.

## Working beside the other lanes

Two open branches touch files I touched, and `git fetch` was clean before I
branched off `501ab5d`.

- **#780 is this lane's own**, `signals-75-the-events-a-screen-can-list`, still
  open and unmerged. It touches `journal.ts`, `memory.ts`, `postgres.ts` and
  `migrate.ts`; so does this branch, in different functions of each — it adds a
  `view` narrowing to the journal's read, where this adds a counter to the tally
  store — so the two should merge without a hand resolution. **I did not stack
  on it**, and nothing here depends on it. Its record is 0355 and so is #781's,
  which is why this one is 0356.
- **#781 is `Loom daily build`'s**, `framework-85-a-page-per-audience`. Nothing
  in it is on the signal path as far as the file list shows.
- `decisions/README.md` and `reference.generated.json` were regenerated rather
  than edited, and `FINDINGS.md` is appended to.
