# 0037. The journal may forget, and only a whole episode at a time

**Status:** Accepted
**Date:** 2026-08-04
**Section:** §6

## Context

The telemetry journal has only ever grown. Every intent, proposal, assessment,
disposition and outcome since day 20 is still in `loom_telemetry`, and nothing
anywhere deletes from it. "No retention policy" has been an open item in every
report since the journal was built, deferred each time on the grounds that
inventing one before anyone had read a record would be guessing.

Records have been read since. `/activity` folds them into episodes, and
`calibrationOf` scores confidence against outcomes over them. That is enough to
know what a retention rule has to protect, and the deferral has run out: a table
that grows without bound is a cost that arrives on a schedule nobody chose, and
holding every utterance a person ever typed forever is a decision as much as
deleting them would be.

Two prior records make this answerable rather than fraught.

0016 made the revision log the truth and the snapshot a view. 0023 made telemetry
a **narrowing of an event stream the log already carries** — it never copies the
log, and nothing downstream may reconstruct a tree from it. Together they mean
forgetting telemetry loses the *account* of what was proposed and judged, and
cannot lose a tree, a revision, a held proposal, or anything a user would call
their work. Retention is therefore a question about `src/telemetry/` and must
never become one about `src/store/`.

## Decision

**A journal may be told to forget its oldest records, in whole episodes, by a
host that decides when.** Three parts, each with a different owner.

- **The journal knows only how to drop a prefix.** `forget({ before })` deletes
  every record below a position and touches nothing else. It is not told about
  ages, policies, episodes, or trees. Both implementations of it are four lines
  and cannot disagree about anything more interesting than that.

- **`retention.ts` decides what may go, as a pure function.** `retentionPlanOf`
  takes records and an instant and returns a position. The whole rule is testable
  against a list of records with no journal, no clock, and no paging in the way,
  which is the same seam `auditSnapshot` uses to make replay checkable.

- **A host decides when it runs.** Nothing schedules it. `applyRetention` is
  exported and `pnpm --filter @loom/portal telemetry:prune` runs it; a cron that
  calls that script is the host's to write.

Four rules bind the decision itself.

**Forgetting is a prefix, never a hole.** A journal drops its oldest records or
none. `seq` is an opaque increasing position rather than a count, and a hole in
the middle would make "is this window complete" unanswerable for every reader.

**An episode is never cut in half.** A window that kept a commit but forgot the
proposal it committed reads as a change nobody proposed. `episodesOf` already
reports records it cannot attribute — a journal that manufactured the exact fault
its own fold exists to detect would be indefensible. So the cut lands at the
first record of the oldest episode the fold resolves as `awaiting-answer` or
`open`, and everything behind that stays, however old. **A proposal still waiting
on someone's answer is never forgotten.**

**Age is measured against arrival, not against `occurredAt`.** `RecordedTelemetry`
now carries `recordedAt`, stamped by the journal on the way in. `occurredAt` is
what the host said happened, and a host that sets it wrongly — a skewed serverless
clock, a replayed batch — is describing its own timeline. An age a writer can
choose is an age a writer can dodge, in both directions: a record dated 1970 would
evaporate on the next run and one dated 3000 would be immortal.

**A policy below one hour is refused.** `MIN_RETENTION_MS` is a floor, not a
default. The most likely way to write a policy of zero is a units mistake, and
its cost is an empty journal on the next run.

The operation is **incremental and idempotent**: it scans a bounded number of
records per run (`DEFAULT_RETENTION_SCAN`, 5000), so a journal far past its
horizon is caught up over several runs rather than in one long transaction, and
running it twice forgets nothing the first run did not.

`RetentionOutcome` reports what happened in the shape of `SnapshotAudit` — an
outcome a host can log, show, or ignore, never an exception. It names what it
kept and why: `keptUnsettled` is records held for their own unfinished episode,
`keptBehind` is settled records stranded behind one. A host watching `keptBehind`
stay large has learned that something very old is still waiting on a person.

## Consequences

`TelemetryJournal` gains a third operation, and it is the only destructive
operation anywhere in Loom's storage. That it is on the journal and not on the
store is the whole point, and it is why this record leans on 0016 and 0023 rather
than restating them: they are what make a delete safe to add at all.

`RecordedTelemetry` gains a required field. Every reader already ignores unknown
fields and no consumer breaks, but a hand-built record in a test needs one — the
contract suite now asserts that a journal stamps it and that a writer cannot
supply it.

Calibration is measured over a window that can now shrink. It already handles
this honestly: `CalibrationReport.unattributed` carries records the fold could not
place, precisely so a rate is never computed over a denominator that changed
without saying so. Retention is built so that number does not move — the prefix
rule and the episode rule exist to keep the surviving window whole.

A settled episode that gains a record after it settled would be orphaned by a
prune. The only long-lived reopening is a hold answered later, and a held episode
resolves as `awaiting-answer` and is kept. A repair (0006) happens within the same
request. So the residual case is narrow, and where it occurs the record becomes
`unattributed`, which is reported rather than hidden. Accepted, and named here so
it is a known edge rather than a surprise.

Nothing runs this yet on the deployment. That is deliberate — see below — and it
means the journal keeps growing until someone schedules the script.

## Alternatives considered

**Delete by age in SQL, one statement.** `DELETE FROM loom_telemetry WHERE
recorded_at < $horizon`. Rejected: it splits episodes, and it puts the rule in the
database where the memory journal cannot share it and the contract suite cannot
check it. The two implementations would then differ in the one behaviour that
destroys data.

**Put the episode rule in SQL as a subquery on the JSON payload.** Rejected for
the reason `schema.ts` gives about not promoting fields to columns: it would be a
second implementation of "which episode is this record about", in a language the
first one is not written in, and the two would eventually disagree. `intentIdOf`
and `proposalIdOf` already exist and are already tested; retention uses them.

**A `TelemetryRetentionPolicy` on `GatePolicy`.** Rejected. The Gate judges
changes; how long a journal keeps rows is not a property of a change and nothing
in the Gate should be able to read it. Coupling them would also make retention a
per-change decision, which it is not.

**Retention per tree, so a tree's journal ages on its own schedule.** Rejected: a
per-tree horizon leaves one tree's records interleaved with another's below the
same cut, which is a hole by another name. A position in the journal is
journal-wide, and there is a test that says so.

**Compact rather than delete — fold old episodes into a summary row and keep
that.** Rejected for now, and it is the most interesting alternative. It would
preserve calibration's denominator indefinitely at a fraction of the size. But a
summary is a second representation of the same facts, which 0016 and the episode
fold both refuse on the grounds that two copies eventually disagree, and it wants
a schema of its own. Worth revisiting once someone has actually lost a number they
wanted; not worth inventing before that.

**Schedule it in the runtime — a background timer, or a check on write.**
Rejected on the same grounds as DDL on boot (0036): on a serverless host every
instance would run it, and a framework that deleted a host's history on a timer it
chose would be making an operational decision that is not its to make. The runtime
supplies the rule; the host supplies the moment.

**Have `applyRetention` scan the whole journal rather than a bounded window.**
Rejected: an unbounded scan to fix an unbounded table is the problem restated. The
bound makes the cost of a run predictable, which is what makes it safe to put on a
cron without knowing how far behind it is.
