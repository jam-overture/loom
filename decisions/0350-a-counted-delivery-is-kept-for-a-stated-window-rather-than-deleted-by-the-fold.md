# 0350 — A counted delivery is kept for a stated window rather than deleted by the fold, and nothing deletes what no fold has counted

**Status:** Accepted — partially supersedes [0158](0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)

**Date:** 5 November 2026

**Section:** §4c (reader signals)

0158 is marked at its own end (0193). What this overturns is set out under *What
of 0158 this overturns* below — and it overturns it **because
[0349](0349-a-projects-reader-events-are-kept-thirty-days-by-default-and-the-tallies-stay-the-durable-record.md)
does**, on the maintainer's own decision of the same day, not because this lane
reweighed 0158's argument. The shape is this lane's; the direction is not. It is
called out in the report and the pull request for exactly that reason.

## Context

[0349](0349-a-projects-reader-events-are-kept-thirty-days-by-default-and-the-tallies-stay-the-durable-record.md)
settled the policy on 5 November: **individual reader events are kept for thirty
days by default**, as per-deployment configuration, with the tallies staying the
durable record. The maintainer took it so that the portal's *Events* tab — a
paginated list of deliveries with a drawer showing the rest of one page view —
becomes buildable, and `Loom portal` filed it as a finding against this lane,
because where events are kept is the intake's to build.

Nothing in the subsystem could do it. Counting and deleting were **one
operation** by design: `collectReaderSignals` folded a ripe prefix into the
counters and then called `journal.forget` on exactly the prefix it had folded,
and `collect.ts`' own module doc gave the reason — a rollup reports *what this
window added* ([0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md)),
so a batch counted twice is counted twice for ever, with no idempotence to fall
back on and nothing afterwards that could say it happened
([0158](0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)).
The only defence that needed no durable bookkeeping was for *the set folded* and
*the set deleted* to be one set, decided once, in one place.

So the question is not whether to keep deliveries. It is **what replaces the
delete as the thing that stops the next fold counting the same window**, and
what then does the deleting.

## Decision

**One table, two lifetimes, two operations.**

1. **A delivery is marked rather than deleted when it is counted.** The journal
   gains a fourth operation, `counted({ before, at })`, which stamps the fold's
   instant on every row below a position **that carries nothing** — the Postgres
   statement is one `UPDATE … WHERE folded_at IS NULL`, and the memory store has
   the same guard. `collectReaderSignals` calls it where it called `forget`, in
   the same order and with the same failure handling: counters first, mark
   second. `ReceivedBatch.foldedAt` is the column, nullable and undefaulted.

2. **Collection reads only uncounted rows.** `ReaderSignalReadRequest.counted`
   narrows a read to counted or uncounted rows, and the fold's scan passes
   `false`. Without it the scan would read thirty days of counted rows to reach
   the handful a run is for, so the cost of collecting would grow with a setting
   that has nothing to do with collecting. Two indexes go with it: one on
   `(application_id, seq)` for the oldest end across every tree, and a partial
   one on the same columns `WHERE folded_at IS NULL` for the fold's own read.

3. **A second operation deletes**, `expireReaderEvents` in `src/signals/expire.ts`.
   It takes `keptMs`, defaulting to `DEFAULT_READER_EVENT_RETENTION_MS` — thirty
   days, 0349's number, with a floor of a minute for the units mistake — scans
   the oldest end, and calls the existing prefix `forget`. It counts nothing and
   writes no counter.

4. **Nothing is deleted that no fold has counted.** The cut is the first row that
   is not *both* past the kept window *and* stamped. A deployment whose
   collection cron has stopped therefore stops expiring rather than deleting
   uncounted deliveries, and the outcome says which of the two stopped it
   (`ExpiryStop`: `young`, `uncounted`, `end`).

5. **The reader-facing notice states both ages**, which is 0349's clause 5 and
   the part that makes this change honest. `CollectionNotice.keptMs` joins
   `bufferMs`; `describeBuffer` says a delivery is counted at the first age, then
   kept for the second *so that the deployment can look at the deliveries its
   totals were made from*, and deleted by its own sweep; and
   `SweepNotice.goneWithinMs` becomes `max(bufferMs, keptMs) + everyMs`.
   `DeliveryRetention` widens to all three.

6. **`retentionPromiseOf` is handed the expiry run's outcome** rather than the
   fold's. The ceiling a reader is promised is about deletion, so it is judged by
   the run that deletes; the fold's `oldestMs` goes on answering the question it
   still owns, which is how far behind counting is. The `broken` state gains
   `uncounted`, because the one case where the remedy is not the expiry sweep's
   is a fold that has stopped.

7. **The deployment states the window**, `LOOM_SIGNAL_KEPT_MS`, read beside the
   other intake settings (0317) with a state for a value that cannot be used. An
   unreadable value stops the deletion and nothing else: expiry writes no
   counter, so the worst it does is keep deliveries while the notice publishes
   the default, and the run must go on counting in the meantime.

## What of 0158 this overturns, and what of it stands

0158 is *Counting a window of reader signals and forgetting it are one
operation*, and it is the record this one has to answer to rather than quietly
walk past. It considered **mark batches as counted rather than deleting them**
and rejected it, in these words: *it is the watermark with write amplification
over every row, and it keeps view keys alive in a table whose whole retention
argument is that they do not survive it.*

**Both halves of that rejection were right in September and one of them is no
longer a cost.** 0349 keeps the rows for thirty days whatever marks them, so
*keeping view keys alive in that table* is now the maintainer's decision rather
than a consequence of this shape — there is no variant of 0349 that avoids it,
including the copy-to-a-second-table one, which keeps the same keys in a second
place. And the write amplification is one `UPDATE` per run over the ripe prefix,
which is the same number of statements the `DELETE` it replaces was: it touches
each row once in its life either way.

**Overturned:**

- *Counting and forgetting are one operation.* They are now counting and
  **marking**, and forgetting is a second operation on a second window.
- *There is no exported retention function beside it.* There is:
  `expireReaderEvents`. 0158's reason for refusing one was that a signal buffer
  is read exactly once by an operation that is not idempotent, so a function that
  can forget without counting is a loaded gun in a host's hand. The gun is
  unloaded by the predicate rather than by the absence of the function: this one
  **cannot** delete a delivery no fold has counted, which is the property 0158
  was protecting and is now stated where it can be read and tested.
- *No schema change and no new table — which batches have been counted is not a
  fact that needs to outlive a run.* It is now, and it is a column.
- *`windowMs` is one number for three facts.* It is one number for two. How long
  a view key lives is the kept window.

**Standing, and restated rather than inherited:**

- *The set a run counts and the set it marks are one set, decided once, in one
  place.* That is still `collect.ts` and it is still the invariant.
- *Aggregates first, the mark second, and the failure between them has its own
  name.* `counted-not-recorded`, which is `counted-not-forgotten` renamed for
  what it now means.
- *The buffer forgets a prefix or nothing.* Both sweeps cut a prefix, and the
  expiry plan stops at the first row it may not take.
- *Nothing schedules it.* Two operations, both called by the host.
- *A rollup can never be re-run.* The kept rows are not a second chance at a
  fold — nothing re-reads them into counters, and `rollUp` is never handed a row
  that carries `foldedAt`.

## Consequences

- **The view key's life is the kept window, not the collection window.** 0146's
  argument for an opaque per-page-view key rested partly on how briefly it
  lived — an hour — and it now lives for as long as a deployment keeps events,
  thirty days by default. What the key *is* has not changed: random per page
  view, derived from nothing about the reader, never returned to a browser, and
  correlating nothing across two page views, so a row thirty days old identifies
  nobody. What has changed is the window in which one page view's signals can be
  read together, and 0349 decided it knowing that. It is written down in
  `DEFAULT_READER_EVENT_RETENTION_MS`' own doc comment rather than left in a
  record nobody reads at the call site.
- **Row-level security carries more weight than it did.** `migrate.ts` already
  said the policy did not depend on the buffer expiring within hours. It now
  does not get to.
- **Storage grows with traffic for the kept window** rather than for one
  collection interval, which 0349 accepted and made configurable.
- **Two published calls changed shape**: `CollectionOutcome` loses `removed` for
  `recorded` and renames `counted-not-forgotten` to `counted-not-recorded`, and
  `retentionPromiseOf` takes an `ExpiryOutcome`. Pre-production alpha, no caller
  outside this repository.
- **The *Events* tab is still not buildable**, because the portal needs a scoped
  reading handle over the kept rows and this unit did not build one. That is one
  module and is filed.
- **Per-reader identity is neither nearer nor cheaper in design**, but it is
  cheaper in *data*: raw deliveries now sit in a table for thirty days where they
  used to sit for an hour. Nothing in them identifies anybody — there is no
  column that could, which is rule 1 as a schema — so the door that is parked
  stays shut by the same thing that shut it. It is worth saying out loud because
  the one argument that could be made for identity from here is *we are already
  keeping the rows*, and the rows are the half of that sentence that was never
  the objection.

## Alternatives considered

**Copy the ripe rows into a second table at the fold, and keep deleting from the
buffer.** The buffer stays a buffer, rule 5 reads exactly as written, and the
kept table is append-only. Rejected because it makes two copies of every
delivery for the overlap and adds a write that can fail between the counters
becoming durable and the buffer being emptied — a third failure state, in the
one operation whose whole design is that it has as few as possible. It also
leaves `retentionPromiseOf` with no evidence: the buffer's oldest row would
measure the fold's lag and nothing would measure the kept window.

**Keep the buffer as it is and build *Events* from it.** 0349 rejected this and
the reason stands: the list would show the last few minutes on a busy site and
nothing an hour later on a quiet one.

**Doing nothing until the maintainer confirms 0158 may be partially
superseded.** The governance rule is that a change contradicting an accepted
record is written `Proposed` and the dependent work is left out. It was weighed
and not taken, because what 0158 is contradicted by is **0349**, which is
Accepted, is the maintainer's own, is dated the same day, and names this lane as
the one to build it in its fourth clause. Writing this `Proposed` and building
nothing would have left the lane with no unit at all and the finding open on a
decision that had already been made. What is done instead is louder than a
status field: the supersession is written at both ends, this section says exactly
what it overturns, and the report and the pull request both lead on it so the
maintainer can say no in one comment.

**A durable watermark row instead of a column.** One row per application saying
*counted up to here*, which is smaller than a column on every delivery.
Rejected because the column is what the *reading* needs, not just the fold: the
expiry plan has to know, row by row, whether the row in front of it has been
counted, and against a watermark that is a second read and a comparison that can
disagree with the rows it is about. The column also carries the fold's instant,
which a position cannot.

**Delete by age alone and accept the loss on a stalled deployment.** Simpler, and
the window is thirty days, so a deployment would have to be broken for a month
for it to bite. Rejected because the loss is permanent, silent and in the durable
record: a day of readers missing from the counters looks exactly like a quiet
day. The guard is one clause in a predicate and the stalled deployment is a state
the subsystem already reports on (0274, 0326).

**Two stated intervals, one per sweep.** A deployment that ran collection hourly
and expiry nightly could state both and get a tighter ceiling. Rejected as
unearned precision: the two run from one place — the cron route calls them in
order — and a second interval is a second number to keep in step with a reader's
promise, which is the fault 0320 exists to prevent.

**A fifth `ExpiryStop`, or folding the hold into the retention promise's closed
set.** The hold reason is a fact about one run's scan, and the promise is a
judgement about a published ceiling; keeping them apart is what lets the promise
stay a closed set of five while the sweep's own line explains itself. The
`uncounted` flag on `broken` is the join, and it names a remedy rather than
softening a gap.
