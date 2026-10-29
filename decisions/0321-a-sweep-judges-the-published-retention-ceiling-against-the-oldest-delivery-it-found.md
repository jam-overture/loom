# 0321 — A sweep judges the published retention ceiling against the oldest delivery it found

**Status:** Accepted

**Date:** 28 October 2026

**Section:** §4c (reader signals)

## Context

[0320](0320-a-notice-publishes-when-a-delivery-goes-and-the-deployment-states-the-sweep-that-takes-it.md)
gave a notice the half of retention the framework cannot promise. A deployment
states how often its sweep runs, the notice adds that to the ripeness window,
and the sentence a reader is shown ends on a ceiling:

> that sweep runs at least every 5 minutes, so a delivery is gone within 65
> minutes of arriving — the key tying one visit together exists until then and
> nowhere else

That is a far better sentence than the one before it, which named an age and
let it be read as a deletion. It is also **a claim about a cron outside this
repository, with nothing under it.** `LOOM_SIGNAL_SWEEP_MS` is whatever an
operator typed. A deployment that states five minutes and sweeps weekly
publishes that ceiling to every reader of its privacy page, and until today
nothing anywhere noticed — the finding filed with 0320 said so in as many
words.

It is the one direction of overstatement this module exists to prevent. The
ceiling rule lets a notice say more is *collected* than is, deliberately,
because overstating collection costs a reader nothing. An overstated
**deletion** is the claim a reader would most want to rely on, and it had the
least evidence of anything the subsystem publishes.

**The evidence turned out to be free, and in the sweep's own hands.**
`collectReaderSignals` scans the buffer from its oldest end — `scanFrom` walks
forward from the oldest page and stops at the horizon — so the first batch it
reads is the oldest delivery there is, and `receivedAt` is the one timestamp the
buffer vouches for. The age of that batch at the instant of the run is a
subtraction over something every run already looked at and none of them
reported. If it is past the ceiling, a delivery existed that readers were told
was gone, and it existed for the whole of the gap, whatever this run then
deletes.

The finding proposed a different shape: a `CollectionFault` member on
`health.ts`, judging the door row's `foldedAt` against the ceiling. That was
the wrong place on two counts, and finding out why is most of this record.

## Decision

**A collection run reports how old the oldest delivery it found was, and a
reading judges that age against the retention the deployment's own notice
publishes. The judgement is beside the notice, never inside it, and it is
handed the notice's ceiling rather than deriving a second one.**

1. **`CollectionSummary` carries `oldestMs`** — the age, in milliseconds, of the
   oldest delivery the scan read, at the instant the run was taken. The run does
   the subtraction, because the caller's clock is not the run's. It is a fact
   about the buffer and about no reader, like every other figure on a summary,
   and it is never absent: a summary exists only where something was ripe, and
   the ripe prefix starts at the oldest end.

2. **`retentionPromiseOf(outcome, retention)` is the judgement**, in
   `src/signals/retention.ts`, as five states:

   - `unpromised` — nothing was stated, so no ceiling was published and there is
     none to keep. It wins over every other state, including a buffer months
     behind.
   - `unread` — the run never reached the buffer, or the age arrived unusable.
   - `unripe` — the run found nothing old enough to count, which is a *proof*
     that nothing is past the ceiling rather than a quiet answer: a scan from
     the oldest end found every delivery younger than the ripeness window, and
     the ceiling is that window plus a sweep.
   - `kept` — the oldest delivery is within the ceiling, with both figures, so a
     surface prints the comparison rather than a verdict.
   - `broken` — it is past the ceiling, with how far past.

3. **It takes the retention whole** — the same `Pick` of the notice that builds
   the reader's sentence (0320) — so the ceiling judged is the ceiling
   published, by construction. A sweep that computed its own could clear a
   promise nobody made.

4. **A delivery exactly on the ceiling keeps the promise.** The ceiling is the
   ripeness window plus one sweep, which is where a deployment sweeping on the
   interval it stated actually sits, so faulting at the boundary would cry wolf
   on every healthy run. One millisecond past is `broken`.

5. **The sweep script prints the verdict per application and never exits on
   it.** A ceiling that is not being kept is fixed by sweeping more often or by
   stating the interval actually swept on — both an operator's — and a run that
   exited here would stop the sweep that is the remedy. The script now reads
   this deployment's settings whole and builds the notice from them, because the
   notice is where the ceiling comes from.

## Consequences

- **A false retention promise is now visible to the one person who can fix it**,
  on the output of the job they scheduled, next to the line saying what the run
  counted.
- **A deployment chooses between a tight promise and a quiet log**, and the
  choice is the honest one: state the interval you sweep on and the ceiling is
  true and short; state a generous one and it is true and weaker. Nothing
  faults a deployment for a generous ceiling, because a notice may always
  promise a reader less than the deployment knows.
- **`CollectionSummary` gained a required field**, so every hand-built summary
  fixture names it. There were two in the repository, both tests.
- **Nothing reaches a reader's browser.** `broadcast.ts` is byte-identical. No
  payload field, no column, no migration, no store method, no new kind, and no
  new read: the figure is a subtraction over a batch the scan already held.
- **The notice stays a pure function of configuration.** Nothing was added to
  it, and the reader's sentence is unchanged.
- **A deployment with an unstated interval gets one more line of output** saying
  its readers were promised no ceiling — the second place that now says so,
  after the schedule's own line, and the first that says it once per
  application.

## Alternatives considered

**A `CollectionFault` member on `health.ts`, judging `foldedAt` against the
ceiling** — the shape the finding itself proposed, and rejected for two
reasons that only became clear from inside the module. First, **the evidence is
indirect**: `foldedAt` says when a fold last touched one page's door row, which
is a fact about rollup rather than about the buffer, and a fold that ran does
not say the deliveries went. The buffer's own oldest row says it exactly.
Second, **a fault there is per-revision and this fact is per-deployment**: one
false sentence on a privacy page would raise the fault on every page a window
holds, and `readersAffected` would then count the whole deployment's arrivals
as readers whose *measurement* is wrong. Nothing about the measurement is wrong.
The faults in `health.ts` are named by what they cost a reading
([0271](0271-a-fault-in-a-deployments-collection-is-named-by-what-it-costs-and-a-pages-readers-are-counted-once.md)),
and this costs a reading nothing and a reader's trust everything, which is a
different subject.

**Inside the notice.** Rejected for the reason 0320 gave for not doing it then
and
[0313](0313-what-a-page-collects-is-published-to-the-reader-it-collects-about.md)
gives for the notice existing: a privacy page with a store and a clock behind it
cannot render while the database is down, which is worse for the reader than a
stated ceiling. The notice publishes what the deployment claims; this checks the
claim where the evidence already is.

**A figure with no verdict** — report `oldestMs` and let a surface compare it.
Rejected because the comparison is the whole of it and there is exactly one
right way to do it: against the published ceiling, at the boundary, with an
unstated interval judged as no claim at all. Three rules a caller would get
wrong once each.

**A nought for the unreachable missing delivery.** `plan.ripe[0]` always exists
where a summary is built, and the unreachable branch parses nothing rather than
substituting nought on purpose: nought says *a delivery that arrived this
instant*, which is the strongest answer this reading can give, and a figure that
is not a number makes it answer `unread` instead. The one failure that would
matter here is a false *all is well*.

**Failing the sweep on a broken promise.** Rejected: the remedy is to sweep, and
the job is the sweep. It is also not the sweep's judgement to make — a
deployment may have just changed its cron, or be catching up a buffer after an
outage, which is the case `more: true` exists to report.

**A second ceiling in the script**, derived from the window and the interval
rather than from the notice. Rejected as the same fault 0317 closed one file
earlier: two spellings of one number, where the one with the reasoning attached
is not the one anybody runs on. Exporting `sweepNoticeOf` to make that
convenient was considered and dropped for the same reason.
