# Reader signals — whether the ceiling a reader is promised is one the deployment keeps

**28 October 2026 (evening)** · `Loom signals` · branch
`signals-60-the-ceiling-the-buffer-keeps` · §60 of
[`docs/signals.md`](../docs/signals.md) · record
[0321](../decisions/0321-a-sweep-judges-the-published-retention-ceiling-against-the-oldest-delivery-it-found.md)

## Before anything was built

**One open pull request, this lane's, and no maintainer comment anywhere.**

- **#706** — `0308` as `Proposed — architectural, needs review`, open since
  24 October and skipped by the merge routine for the reason it exists. Both
  comments on it are a routine's own: Vercel's preview bot and `Loom merge`'s
  explanation of why it skipped. No review has been left on it, so nothing
  outranked the queue.

**This work is a new branch rather than a second commit on #706**, which is the
reading three previous runs of this lane have taken and is worth stating once
rather than re-deriving. Step 3 of the procedure says a lane with an open pull
request pushes onto it; #706 is open only because it is *held* — a `Proposed`
architectural record is skipped by the merge routine by design — so pushing onto
it would hold tonight's unit behind a maintainer's reading of an unrelated
clause. Nothing on this branch touches a file #706 touches.

**#718 merged** this morning, so §58 and §59 are on `main` and this branch is cut
from `origin/main` at `3e6c147`. `Loom daily build` has no branch open, so there
was nothing to race on the signal path.

Nine open findings owned by this lane were read first. The newest of them was
the work: the limit §59 published and filed on the same night.

**One of the nine was not work and is closed as part of this run.** The
24 October entry *the region map is the one reading the new rung leaves a caller
to assemble* was answered by §54 and 0315 on 25 October, and the 25 October
(evening) entry says so — but the original's Status line still read `open`, so
the queue carried it for three days as something to build. That is the trap the
27 October entry was filed about — *an entry nothing links to its closure* — and
this instance is three days older than the entry naming it. Its Status names the
record now.

## What I completed

**§60 / 0321 — a sweep judges the retention ceiling its deployment publishes
against the oldest delivery it found.**

§59 gave the notice the half of retention this framework cannot promise. A
deployment states how often its sweep runs, the notice adds that to the ripeness
window, and the sentence a reader is now shown ends on a ceiling:

> that sweep runs at least every 5 minutes, so a delivery is gone within 65
> minutes of arriving — the key tying one visit together exists until then and
> nowhere else

That is a far better sentence than the one before it. It is also **a claim about
a cron outside this repository with nothing under it**: `LOOM_SIGNAL_SWEEP_MS` is
whatever an operator typed, and a deployment that states five minutes and sweeps
weekly publishes that ceiling to every reader of its privacy page. Last night's
run filed exactly this and recommended leaving it.

I built it instead, for one reason that only showed up on reading `collect.ts`:
**the evidence is free and was already in the sweep's own hands.** `scanFrom`
walks the buffer from its oldest end and stops at the horizon, so the first batch
every run reads is the oldest delivery there is, and `receivedAt` is the one
timestamp the buffer vouches for. The age of that batch at the instant of the run
is a subtraction over something every run has looked at and none of them
reported. If it is past the ceiling, a delivery existed that readers were told was
gone — and it existed for the whole of the gap, whatever the run then deletes.

### What is on the branch

- **`CollectionSummary.oldestMs`** — the age of the oldest delivery the scan
  found, in milliseconds, at the instant the run was taken. **The run does the
  subtraction and not the caller**, because the caller's clock is not the run's.
  Never absent: a summary exists only where something was ripe, and the ripe
  prefix starts at the oldest end.
- **`retentionPromiseOf(outcome, retention)`** in a new
  [`src/signals/retention.ts`](../src/signals/retention.ts), as five states —
  `unpromised`, `unread`, `unripe`, `kept`, `broken`. Three of them judge nothing
  and each says which refusal it is.
- **It is handed the notice's retention whole**, the same `Pick` the reader's
  sentence is built from, so the ceiling judged is the ceiling published. A sweep
  deriving its own could clear a promise nobody made.
- **An unstated interval wins over everything**, including a buffer months
  behind. It is not that the buffer is fine; it is that no ceiling was published,
  so there is no claim of the deployment's to measure.
- **A run that found nothing ripe is a proof rather than a quiet answer.** A scan
  from the oldest end found every delivery younger than the ripeness window, and
  the ceiling is that window plus a sweep — so `nothing-ripe` cannot be a broken
  promise, and that is why it has a state of its own rather than a figure.
- **A delivery exactly on the ceiling keeps the promise.** The ceiling is where a
  deployment sweeping on the interval it stated actually sits, so faulting at the
  boundary would cry wolf on every healthy run.
- **The sweep prints the verdict per application and never exits on it.** The
  remedy is to sweep more often or to state the interval actually swept on, both
  an operator's, and a run that exited here would stop the sweep that is the
  remedy.

### Where it did not go, and why that is most of the record

Last night's finding proposed a `CollectionFault` member on `health.ts`, judging
the door row's `foldedAt` against the ceiling. **I did not build that, and the
two reasons are worth more than the unit.**

The evidence there is **indirect**: `foldedAt` says when a fold last touched one
page's door row, which is a fact about rollup rather than about the buffer, and a
fold that ran does not say the deliveries went. The buffer's own oldest row says
it exactly.

And a fault there is **per-revision where this fact is per-deployment**. One
false sentence on a privacy page would raise the fault on every page a window
holds, and `readersAffected` would then count the whole deployment's arrivals as
readers whose *measurement* is wrong. Nothing about the measurement is wrong. The
faults in `health.ts` are named by what they cost a reading (0271); this costs a
reading nothing and a reader's trust everything, which is a different subject.

`health.ts` was not touched.

## Decisions I took that were not specified

**Building a finding its own author recommended leaving.** Said above: the
recommendation was costed against the shape it proposed, and a different shape
made it free. The entry is closed as *not in the shape recommended*, with both
reasons, rather than as done.

**The sweep script reads this deployment's settings whole.** It read two of them
and now reads `readIntakeSettings()`, because the retention it judges against
comes off `deploymentNoticeOf` and that takes all of them. The smaller diff was
to rebuild the ceiling in the script from the window and the interval — which is
the fault 0317 closed one file earlier, in the same file, with the same two
numbers. Exporting `sweepNoticeOf` to make that convenient was considered and
dropped for the same reason.

**A test on `main` changed, and the property it asserts got stronger.** 0317
guarded the script with `expect(SWEEP).toContain("readCollectionWindow")`, which
fails on a script that reads *more* of these settings rather than fewer. It is
now `toContain("readIntakeSettings")` **and** `not.toContain("process.env[")` —
the property itself, which is that the script parses no environment at all. Filed
as its own entry, because the general shape will not recur in this file: a guard
written as *the right helper is called* fails on the change that makes it
righter, and one written as *the wrong thing is absent* survives the refactor.

**The unreachable branch parses nothing rather than substituting nought.**
`plan.ripe[0]` always exists where a summary is built. A nought would say *a
delivery that arrived this instant*, which is the strongest answer this reading
can give; a figure that is not a number makes it answer `unread`. The one failure
that would matter here is a false *all is well*.

**No closed set beside the union.** `RetentionPromise` carries figures, so a list
of bare state names could not be handed to `describeRetentionPromise`, and the
two unions nearest to it — `CollectionOutcome` and `SweepNotice` — publish none
either. The lane's `everyMemberOf` convention is for a vocabulary a surface
enumerates.

## Records

- **0321** — *A sweep judges the published retention ceiling against the oldest
  delivery it found.* `Accepted`. Nothing superseded: 0320 decided what a notice
  publishes and said nothing about checking it, and 0313's refusal to put a store
  behind a notice is the reason this is beside one. Six alternatives recorded,
  including the shape the finding asked for and why the module's own frame
  rejects it.

## Findings

**Closed:** the 28 October (morning) entry *a deployment states how often it
sweeps, and nothing in this repository can check that it does* — **not in the
shape it recommended**, with both reasons on the entry.

**Filed:**

1. **A stated ceiling is now checked and nothing checks that it is tight.** A
   deployment that sweeps every five minutes and states a day publishes *gone
   within 25 hours*, keeps it with a day of room, and reads `kept` every run.
   Correct by the ceiling rule and worth knowing: the verdict proves the promise
   is kept, never that it is tight. Recommendation: leave it — the honest fix is
   an operator stating their real interval, and the cheap shape if it is ever
   wanted is a figure rather than a verdict.
2. **The verdict reaches an operator's log and no screen.** The intake status is
   a pure read of settings and cannot carry a reading that needs a run;
   `health.ts` is the wrong home for the reason above. What would close it is the
   thing twelve runs have filed — something that draws any of this.
3. **A guard that names a helper fails on the change that makes it righter.**
   Closed on filing; written down because the next instance will be in another
   file.

**Also closed:** the 24 October entry *the region map is the one reading the new
rung leaves a caller to assemble*, whose Status had been left `open` after §54
answered it. No code changed for it.

## Test numbers

`pnpm install && pnpm verify` **green, EXIT=0**, read from `verify.exit` which
the gate wrote as a separate command, per
[`docs/routines.md`](../docs/routines.md).

| | |
| --- | --- |
| Root suite | 241 files, **5,830 tests**, all passing |
| App suite | 372 files, **6,747 tests**, all passing |
| `src/signals/` | 50 files, **1,699 tests** (was 49 files, 1,685) |
| `src/signals/retention.test.ts` | new, **13 tests** |
| `apps/loom/app/_lib/reader-signals/` | 14 files, **180 tests** (was 179) |
| New cases | **15** — 14 in the package, 1 in the app |
| Findings ledger | 1,347 entries, 0 malformed |

**Nothing failed and nothing was skipped.** One test on `main` changed and is
named above; its property is strictly stronger. Two hand-built
`CollectionSummary` fixtures gained the new required field, both in tests.

**One red verify, fixed before the pull request was opened.** The generated API
reference went stale: `retention.ts` publishes three names, the reference is read
from `dist/*.d.ts`, and `extract.test.ts` and `offered.test.ts` both fail on the
drift. `pnpm --filter @loom/app docs:api` is the regenerator `docs/routines.md`
names and it is a second commit on this branch, so the generated file is a
merge-gate artefact rather than an edit inside `(docs)`. Both tests pass on the
regenerated file.

### Mutation testing

Run after the first commit, per the 27 October finding that mutation testing
before a commit is how a run loses the work it is testing. **Twenty planted,
nineteen dead, one equivalent — and one of the nineteen escaped first and found
a real hole in a test written tonight.**

| planted | what died |
| --- | --- |
| the unstated guard is inverted | 12 cases |
| an unstated interval is judged `kept` rather than no claim | 2 cases |
| the boundary faults a sweep that ran on time (`>=`) | 1 case |
| the comparison is inverted | 7 cases |
| the gap is subtracted the other way | 4 cases |
| a run that found nothing ripe says nothing instead of proving it | 2 cases |
| a run that never read the buffer is read as nothing ripe | 1 case |
| an age that is not a number is kept rather than refused | 1 case |
| the sentence prints the age where the ceiling goes | 1 case |
| the broken sentence drops the gap | 1 case |
| the kept and broken sentences are swapped | 1 case |
| the age is taken off the newest ripe batch, not the oldest | 1 case |
| the subtraction runs the other way | 1 case |
| the age is measured against the horizon rather than the run | 1 case |
| the figure never reaches the summary | 1 case |
| the verdict is never printed | 1 case |
| the sweep exits on a promise it is breaking | 1 case |
| the script parses the environment itself again | 1 case |
| the ceiling is rebuilt in the script rather than taken off the notice | **escaped, then 1 case** |
| a missing delivery becomes an age of nought | **nothing — equivalent** |

**The escape was mine and it was the sharpest thing this run produced.** The new
assertion read `expect(SWEEP).toContain("deploymentNoticeOf")`, and a script that
*imports* the notice assembly and then builds its own ceiling out of the window
and the interval passes it. That is precisely the fault 0321 exists to prevent —
two ceilings, one published and one judged against — and the guard against it was
satisfied by an import line. It is `toContain("deploymentNoticeOf(")` now, with
the paren, which the import line does not have; the mutant dies. **Three findings
this month have been one shape of this and tonight is the fourth**: a guard
written as *the right name appears* is not a guard that the right thing happens.

**The survivor is not a hole.** `plan.ripe[0]` exists wherever a summary is
built, because `plan.before` is a position taken off the last ripe batch — so a
plan carrying one has a first. Substituting `now` for the missing instant cannot
be observed, because nothing reaches that branch; it is there because the type
checker asks for it, and the value it carries is a parse of nothing rather than a
nought so that *if* it ever were reachable the reading would refuse rather than
publish the strongest answer it has.

**The double-count case, per this lane's standing rule.** The figure this unit
adds is an age and the verdict is a difference of two sums, so the way either
would be wrong is a term counted twice or an end taken wrongly. The fixtures use
three deliberately different lengths — fifteen minutes to ripen, a five-minute
cron, fifty minutes in the buffer — because the ceiling is twenty and the gap
thirty, while doubling the window gives fifteen, doubling the interval
twenty-five, doubling the ceiling ten and dropping the window forty-five: five
plausible minute figures, no two equal. `collect.ts`'s own case receives at two
hours and at ninety minutes over a one-hour window, so the oldest end
(7,200,000), the newest end (5,400,000), the horizon (3,600,000) and the window
counted twice (10,800,000) are four distinct numbers.

**Browser cost: nothing.** `broadcast.ts` is byte-identical to `main` — `git
diff origin/main` on that file is empty — and the bundle measures **6,513 bytes**
minified, **2,993 gzipped**, the same number as the last six runs.
`browser-weight.test.ts` still reports no package in the broadcaster's import
graph. `retention.ts` is server-side and reaches no browser. **No payload field,
no column, no migration, no store method, no new kind and no new read.**

## Open questions

**Nothing blocking.** Four, and three are not new.

1. **`LOOM_SIGNAL_SWEEP_MS` is unset on this deployment**, so its notice
   publishes the weaker sentence and tonight's verdict reads `unpromised` on
   every run. Recommendation: set it to the cron's real interval when the cron is
   scheduled — it is one environment variable, and the same number is what the
   stall check wants and what this verdict is judged against.
2. **`0308` on #706**, unchanged and five days old: one reading of one clause,
   one member on two unions and one line in a switch. Recommendation: read it and
   say yes or no.
3. **Still nothing draws any of this**, thirteen runs running. Thirty-eight
   readings, nine comparisons, a publishable disclosure and now a verdict on that
   disclosure are reachable in a few lines, and not one of them is on a screen.
   `Loom portal` is paused, so this is the maintainer's rather than a lane's.
4. **Whether a verdict like this wants a home beside `health.ts`** rather than in
   a cron's output. 0321 says why it is not *in* `health.ts`; it does not settle
   whether the operator's reading should eventually have a deployment-wide
   section that a fact like this belongs to. Recommendation: leave it until a
   second deployment-wide fact appears, which is this lane's rule for a pattern.

## On keeping the parked door cheap to open

**Nothing here makes per-reader identity more expensive to add later, and nothing
was built toward it.** The age of the oldest row in a buffer is a fact about a
buffer; the rows in it are anonymous and node-shaped, and this reading never
looks inside one. If identity ever returns as an opt-in, the thing it needs is a
recorded decision per reader — and a deployment that can already be caught
breaking a retention promise is in a better position to make one about consent
than one whose only claim was a number nobody checked.
