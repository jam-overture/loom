# 0158 — Counting a window of reader signals and forgetting it are one operation

**Status:** Accepted
**Date:** 2026-09-14
**Section:** §4c (reader signals)

## Context

[0146](0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md)
made aggregates the durable artefact and raw batches a short-lived buffer, and
made the length of that buffer per-deployment configuration with a short
default. [0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md)
made applying a rollup additive, and named the price: `views` and `reached`
over-count by the page views that straddle a rollup boundary, bounded by
*(page-view duration ÷ window length)*.

Step 3 of `docs/signals.md` built the pieces — ingestion, the buffer, rollup,
the counters — and stopped short of the thing that runs them.
`ReaderSignalJournal.forget` existed and nothing called it. The gap was left
deliberately and filed, because forgetting raw batches before the counters they
feed are durable destroys data outright, and the reverse order is a bug that
looks like a feature working.

Closing it turned out to be one question rather than two. **Retention cannot be
written on its own**, because a rollup reports *what this window added*: a batch
counted twice is counted twice forever, there is no idempotence to fall back on,
and the wrong number looks exactly like a busy afternoon. So the set of batches
a run counts and the set it forgets have to be the same set. Either one
operation decides it once, or something durable remembers how far counting has
got and retention reads it.

## Decision

**One operation: `collectReaderSignals(journal, store, request)`.** It reads the
oldest end of the buffer, takes the batches older than the horizon, rolls them
up, applies the rollup, and forgets exactly those. There is no exported
retention function beside it — a function that can forget without counting is
the data-loss bug, and one that can count without forgetting is the
double-count bug.

**`windowMs` is one number for one trade, and it is 0147's number.** A batch is
counted once it has been held for a window, so the window is simultaneously how
long a page view is given to finish, how long a view key lives, and how far the
counters lag behind the buffer. Longer is more accurate and less anonymous;
shorter is fresher and coarser. A deployment sets one number knowing all three.
Default one hour, floor one minute — below a minute every page view straddles a
boundary and `views` stops counting readers and starts counting network flushes.

**The order is aggregates first, the buffer second, and the failure between them
has its own name.** A run whose counters took the window and whose buffer would
not drop it returns `counted-not-forgotten`, carrying the position an operator
prunes below by hand. It is the one state that gets worse when ignored, and
collapsing it into a general failure would hide the only case where a second run
double-counts.

**The buffer forgets a prefix or nothing**, as both journals do. The cut is the
first batch young enough to keep, not every old one.

**Nothing schedules it.** A host calls it from a cron route, a deploy hook or by
hand, for the reason nothing schedules telemetry retention or `auditSnapshot`:
when a deployment forgets is an operational choice.

## Consequences

- **The buffer now empties**, which is what 0146 said it did and what nothing
  made true. A view key's lifetime is finally bounded by the number that claims
  to bound it.
- **Counters lag the buffer by up to a window plus the gap between runs.** This
  is the real cost and it is visible on the portal's screens. A deployment that
  wants fresher numbers shortens the window and accepts 0147's larger
  over-count; the two move together on purpose, so there is no second knob to
  set wrongly.
- **A funnel pair added later answers windows collected after it and never the
  ones already folded**, because the batches are gone. That follows from
  aggregates being durable and is worth knowing before a deployment waits a day
  for a number it will not get.
- **A rollup can never be re-run**, so there is no recovery from a bad pair
  definition or a rollup defect except going forward. The buffer is the only
  copy and it is short-lived by design.
- **No schema change and no new table.** Which batches have been counted is not
  recorded anywhere, because under this decision it is not a fact that needs to
  outlive a run.
- **The scan is incremental and reports `more`**, so a first run against a
  buffer nothing has ever drained does bounded work and says another run has
  work now.

## Alternatives considered

**A durable watermark: record how far rollup has got, count promptly, forget on
the window.** The design that removes the lag — counting would happen at the
next run rather than a window later, and `windowMs` would govern only
forgetting. Rejected for now, and it is the door to open if the portal finds the
lag unacceptable. It costs a fourth table whose write has to be inside
`apply`'s transaction (a watermark that can be written separately from the
counters it describes is the double-count bug with extra steps); and every run
would re-read the counted-but-not-yet-forgotten prefix, because resuming a read
at a remembered position means either synthesising a cursor — which the paging
rules make opaque precisely so that nobody does — or scanning past it. It buys
one window of freshness for durable bookkeeping, and the number it makes
independent is one 0147 already asks deployments to tune.

**Retention as its own exported function, mirroring `src/telemetry/retention.ts`.**
The shape the finding that asked for this proposed, and the shape the sibling
subsystem has. Rejected once it was clear the two subsystems differ in the way
that matters: a telemetry journal is read by folds that are pure over whatever
they are given, so forgetting is independent of reading. A signal buffer is read
exactly once, by an operation that is not idempotent, so a retention function
that can be called on its own is a loaded gun — and a host is the one holding
it, following whichever example it found first.

**Forget first, then count.** Makes double-counting impossible and loses the
window on any failure after the delete. Rejected outright: a run that deletes
data and then fails to count it leaves nothing to notice and nothing to recover
from, which is the reverse of `counted-not-forgotten`, where everything is still
there and an operator can see it.

**Mark batches as counted rather than deleting them on the same schedule.**
A column on the buffer, set by rollup, read by retention. Rejected: it is the
watermark with write amplification over every row, and it keeps view keys
alive in a table whose whole retention argument is that they do not survive it.

**Roll up everything scanned, regardless of age, and forget only the old part.**
The shape that first suggests itself, and it double-counts on the next run —
every young batch counted now is counted again when it ripens. Recorded because
it is the plausible-looking version, and because the test that catches it is the
one this file is most for.
