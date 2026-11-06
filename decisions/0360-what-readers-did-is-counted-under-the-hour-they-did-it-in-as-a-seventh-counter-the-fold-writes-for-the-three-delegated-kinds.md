# 0360. What readers did is counted under the hour they did it in, as a seventh counter the fold writes for the three delegated kinds

**Status:** Accepted
**Date:** 2026-11-06
**Section:** §5 (reader signals), the counters

## Context

[0356](0356-page-views-are-counted-under-the-hour-they-began-in-as-a-sixth-counter-written-at-the-door.md)
put a clock on one counter: page views, by the hour they began in, written at
the door. `Loom portal` drew the range picker, *page views in the range* and
the chart of bars off it the same morning (#791) — and filed, in the same
breath, that three more things on `docs/portal-wireframes.md` *1 · Signals*
read a range and cannot:

- the figure for the primary goal over the range, with the change on the period
  before;
- on *By page*, the drawer's bar per kind of thing readers did **for the
  range**;
- each goal's trend on *By page* and *Goals*.

A goal is one kind of thing a reader does to one part
([0350](0350-a-project-sets-goals-from-signals-already-collected-and-one-of-them-is-primary.md)):
*presses* (`activated`), *sends* (`completed`), *opens* (`disclosed`). The
tallies count all three per part and keep no time (rule 5 of
[`docs/signals.md`](../docs/signals.md)); the hourly counter counts arrivals
only. The kept deliveries carry an instant and are a capped scan over a window
a deployment may set to anything — which 0356 refused for the portal's own
reason, that *a bar drawn from part of a range is a wrong number rather than a
shorter list*.

The obvious table is *the tallies, with an hour in the key*. It is the wrong
one twice over, and the two reasons are what this record is.

## Decision

1. **A seventh counter, `loom_reader_acted_hours`**: an application, an
   audience, a tree, a revision, a **part**, an hour, and what readers did to
   that part in that hour — `activations`, `opens`, `closes`, `completions`.
   The hour is UTC and the bucket is the instant it began, which is the unit
   `arrivals.ts` decides for both tables.
2. **It holds the three delegated kinds and no others.** `activated`,
   `disclosed` and `completed` are the kinds a reader aimed at something to
   cause ([0167](0167-a-delegated-signal-names-the-regions-it-happened-inside.md)),
   which is already a named set (`DELEGATED_READER_SIGNAL_KINDS`) and is exactly
   0350's three goal kinds. No new vocabulary: rule 6's five kinds are
   untouched.
3. **The distinct counters are not sliced by hour.** `views`, `reached` and
   `engaged` count distinct page views, and distinctness does not add: a page
   view that crosses an hour boundary is one view in each hour and two in their
   sum, so an hourly table of them would publish a denominator that grows with
   how finely it is cut. **The honest hourly denominator already exists** — page
   views that began in the hour, counted once, at the door (0214, 0356) — and
   the rate 0350 clause 4 defines is this counter over that one.
4. **`dwellMs` is not sliced by hour either.** A `dwelled` signal is observed
   for every addressed part that comes into view, so an hourly dwell row per
   part is as numerous as the page is large: about 6,000 rows an hour for one
   large page, 144,000 a day, per revision, in a durable table nothing sweeps.
   The three kinds kept here are **bounded by what readers did** — a reader who
   presses one button on that page writes one row — and that sentence is the
   affordability argument for the whole table. *Stays on it* is not an offered
   goal kind for the same reason (0350 clause 2), so nothing is withheld that a
   goal could have used.
5. **The fold writes it, from the same pass as the tallies, in the same
   transaction.** `rollUp` produces the hourly rows beside the tallies and
   `applyWindow` writes both or neither. Not a second walk over the window: the
   fold refuses a batch it has already folded
   ([0314](0314-a-batch-delivered-twice-is-folded-once-and-the-window-is-how-wide-that-promise-is.md)),
   that refusal is one judgement per batch, and a second pass grouping by hour
   would make it twice — so a repeat falling in two hours would be refused by
   one pass and counted by the other, and **the hours would stop summing to the
   tally they slice**, permanently and invisibly
   ([0158](0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)).
   The sum is asserted in `rollup.test.ts`, in `collect.test.ts` across two
   runs, and in the contract suite both stores are run against.
6. **The hour is `receivedAt` and never `sentAt`.** A sender's clock is a number
   a page said, and a chart drawn from it is a chart a page can move bars on
   (0355). A batch carrying no receive instant — one composed by hand, a
   fixture, a backfill — is counted into the tallies and into no hour, and the
   fold reports how many as `undated`, exactly as it reports the batches that
   carried no view key.
7. **An hour's count settles one fold after the hour ends**, which is the
   guarantee the portal asked for: once every delivery received in that hour has
   been folded, nothing moves it again. Before that the hour is still being
   filled, which is the same state the last bar of *the last 24 hours* is in and
   is published as `whole: false`.
8. **The read answers the range and the beginning, and the part narrows both.**
   `acted(request)` takes the three narrowings every counter read takes, a
   `nodeId`, and a range; it answers the rows in the range **and** the first
   hour this scope ever counted. The beginning narrows with the part, because a
   goal made this afternoon on a part nobody pressed until this afternoon has
   been measurable since this afternoon — a beginning taken over the deployment
   would draw a year of noughts behind it.
9. **The rate is taken once, over the range, and never per hour.** The
   denominator counts page views that *began* in the range and the numerator
   what readers *did* in it, so a reader who arrived at 10:59 and pressed at
   11:01 is in one hour's numerator and another's denominator. The error is at
   the two edges of a range, so it is two page views' worth of a month and the
   whole of an hour. `readReaderActedRate` therefore publishes hourly **counts**,
   which add honestly, and one quotient over the range — withheld as `null`
   where the range held no page views, which includes the case worth naming: a
   range holding presses and no arrivals, where every reader in it came in
   before it began.
10. **Nothing reaches a reader's browser, and nothing new is collected.**
    `broadcast.ts` and its import graph are untouched and the bundle measures
    6,513 bytes minified, 2,980 gzipped — the same bytes as before. No payload
    field, no new kind, no view key: the hourly rows are a slice of counters
    this subsystem already kept, filed under an instant the door was already
    stamping.

## Consequences

- `pnpm db:push`, or `ensureReaderSignalsSchema`, creates
  `loom_reader_acted_hours` with row level security on, like the six before it.
  **There is no backfill and cannot be one**: nothing but this counter ever knew
  which hour a press was in, so a deployment starts counting hours when it runs
  the migration. The reading publishes the hour counting began, so a thirty-day
  goal chart on a deployment that has counted for a week draws a week and says
  where its data starts.
- `ReaderTallyStore` gains `acted`, so every implementation and every wrapper
  forwards a fifth listing. Both shipped stores implement it and the portal's
  bounded wrapper forwards it inside the same read budget.
- A deployment that folds rarely sees an hour settle late, not wrongly: the rows
  carry the hour the door received the delivery in, whenever the fold runs.
- `CollectionSummary` gains `acted`, the number of hourly rows a run wrote. A
  window in which readers only looked writes none, however many tallies it
  wrote, which is the affordability property stated as a figure an operator can
  watch.
- The portal can now draw all three of the things it filed for, off the range
  picker it already has, through `readingsFor(application).tallies`.
- Per-reader identity stays as far away as it was (deferred, 30 September): a
  row here is a part, an hour and four numbers, with no key, no region and
  nothing per reader. Adding an opt-in identity later would add a table, not
  change this one.

## Alternatives considered

**The tallies with an hour in the key — every counter, sliced.** The shortest
thing to build and the one the portal's finding literally asked for. Rejected on
clauses 3 and 4: the distinct counters would publish a denominator that inflates
with the slicing, and the dwell rows would make the table grow with page size
rather than with reader behaviour. What the portal needs is the three kinds a
goal is made of, and those are affordable; the figure a rate divides by is the
door's and is already exact.

**Count at the door instead of in the fold.** The hour would be exact to the
request rather than to the fold, with no window lag, and the door already writes
three counters. Rejected because the door has no repeat refusal: the fold
refuses a batch it has already folded (0314) and the door cannot, so a replayed
`POST` would double every press in the hourly table while the tallies stayed
right — and the two numbers are published side by side. Writing where the
refusal already is makes the sum an invariant instead of a hope.

**A second pass over the window, in a module of its own.** Tidier to read: the
fold would stay as it is and a new function would group the same batches by
hour. Rejected because it is the one shape that can silently disagree with the
tallies — two dedup judgements over two groupings, where the batch that falls
either side of an hour boundary is the case nobody writes a test for by
accident.

**A page-grained hourly table as well, so the drawer's `viewed` and `dwelled`
bars could be drawn over a range.** One row per tree, revision and hour is
cheap, and it would answer the two kinds clause 4 excludes. Rejected for now as
a second grain with a sum rule between the two tables and no question behind it
yet: the wireframe's drawer says *what readers did*, and page views by hour
already stand in for *how many readers were there*. Filed for the portal to say
whether it wants those two bars over a range, because that is a question about
the screen rather than about the counter.

**A rate per hour, so the chart could be of the rate rather than the count.**
Rejected on clause 9: an hourly quotient publishes the arrival-boundary error
once per bucket, in the shape where *a press with no arrival* reads as an
infinite rate rather than as a reader who came in before the hour.
