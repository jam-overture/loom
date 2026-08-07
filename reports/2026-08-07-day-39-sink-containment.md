# 2026-08-07 (day 39) — a sink observes, and stops getting a vote

**Build order section:** §2 — Composition Runtime. A defect in the pipeline's
event seam, found by the lessons routine on #52 and left unfixed there.

**Branch:** `day-39-sink-containment`, off `day-38-node-attribution`.
**PR:** against `day-38-node-attribution`, so the diff is this unit alone.

---

## Where this run started

No maintainer feedback outstanding. Every comment on #49–#53 since 4 August is
one of mine or Vercel's; the one live human question in the recent history —
*"tell me more about item number 2"* on #45 — was answered in full on 4 August
and the fork it opened is still yours.

Five PRs are open and stacked (#49, #50 → #51 → #53, #52). Nothing merged since
#48, so the build order was read from the branch tip rather than from `main`.

Day 38 finished §1's last open item (node attribution) and its report pointed at
§5 next. **I did not go to §5**, because §2 has an open gap and the build order
says take the earliest section with one. The gap is the one the lessons routine
found while writing lesson 05 and explicitly handed to this routine:
`EventSink`'s central promise was not enforced anywhere.

## What was built

### The defect, stated exactly

`EventSink` has said since §2 that *a sink that throws or blocks must not be able
to fail a change the Gate already accepted*. 0024 leant on that sentence
directly — it is why `collectTelemetry` buffers rather than writes, and why an
event it cannot narrow is counted and dropped rather than thrown.

The sentence described what every sink in the repo *did*. Nothing enforced it.
`emitter` in `pipeline.ts` and `narrator` in `commit.ts` — two copies of the same
three lines — called `emit` bare. So the guarantee was an obligation on whoever
implemented a public interface, and Loom's own sinks happening to honour it is
not the same as the runtime providing it.

I ran both halves against the real pipeline before deciding anything. They fail
in opposite directions:

| Sink throws on | What happens |
| --- | --- |
| `change-applied` | `composeChange` throws and the tree `applyDelta` returned is lost past the `return`. In `commitIntent` this lands **before** `store.append`, so the change is abandoned between the Gate accepting it and the log receiving it — and no `commit-failed` is emitted, because the thing that would emit it is the thing that threw. |
| `change-committed` | The inverse, and worse. The store ends at **revision 1 with the change durably in it** while `commitIntent` throws. A host reports failure to a user for a change that happened. |

The second decides it. Past `store.append` the log is the truth (0016), and a
runtime whose observer can make it lie about the truth is not honest about what
changed — which is the property the project exists for.

### The fix: one door, and it contains what comes back through it

`src/runtime/narration.ts` is new and small. It exports one `narrator(events,
clock, treeId)` and is now the only place a `RuntimeEventEnvelope` is built. Both
duplicate emitter factories are gone; `pipeline.ts` and `commit.ts` call it.

Containment is structural rather than remembered: a future call site cannot
forget the guard, because constructing an envelope by hand is now the odd thing
to do.

**It covers rejection as well as throwing.** `emit` is declared `() => void`,
which does not stop a host writing an `async` one — TypeScript assigns
`() => Promise<void>` to `() => void` without complaint. Such a sink rejects
rather than throws, and an unhandled rejection is a process-level failure on
exactly the serverless hosts 0024 was written for. A guard catching only the
synchronous shape would be the same false promise in a smaller font. The
returned value is checked for a `then` and given a no-op handler — attached,
never awaited, because awaiting is what 0024 forbids.

**The clock is deliberately outside it.** A sink that fails is a broken observer
and the change is still true. A clock that fails means the runtime cannot say
when anything happened, and the same clock stamps `appliedAt` on the commit — so
containing it would put a wrong time in the log rather than lose an event. It
propagates, and a test says so.

### What this costs, said plainly

**A throwing sink now loses its event silently, and nothing counts it.** That is
the accepted price, not an oversight. There is nowhere for the runtime to report
it: the sink *is* the reporting channel and it just failed. A counter would have
to live on `CompositionRuntime`, which is a value rather than a stateful object,
and making it stateful to hold a number with no reader is the worse trade.

`collectTelemetry` still counts everything it cannot hold or cannot write, so
the shipped path stays observable. Its comment used to say buffering is what
keeps a sink from failing a change; that is now containment's job, so the comment
was corrected to say what buffering actually buys — that drops stay *countable*.

### The lesson's second item

`src/testing/doubles.ts` opened with "the runtime's three impure seams". The
runtime has five. Rewritten to describe the seams this file doubles and to name
where the other two are doubled (`sequentialIdFactory` in `ids.ts`,
`fixedPolicy` in `policy-source.ts`), rather than to state a count that will rot
again.

## Decisions I made that were not specified

**I took the expensive half of the lesson's recommendation.** It offered a cheap
alternative — reword the two comments so the guarantee reads as an obligation on
the sink — and said it would teach whichever was picked. That resolves the
contradiction by lowering the contract to match the code, on the one seam where
the failure is a committed change reported as an error. Rejected in 0042.

**Containment lives at the call site, not in a decorator the host applies.** A
`guardedSink(sink)` wrapper is the same obligation one level further out, and a
host that forgets to wrap gets the old behaviour with no sign anything is
missing. A guarantee you can opt out of by omission is not one.

**`emit` keeps returning `void` rather than a `Result`.** Putting the guarantee
in the type is genuinely better and I did not do it: it breaks every sink anyone
has written, for a failure the runtime discards anyway. The caller's only
possible response to an `err` here is to ignore it, so the type would be honest
about a decision the runtime has already made.

**A failing sink double, not a mock.** `failingEventSink(failOn, mode)` in
`doubles.ts` fails on named event types and collects the rest, so one test can
assert both halves at once: the change survived, *and* narration carried on past
the failure. The second half is the one that would otherwise rot — a guard that
swallows the exception but stops the loop would pass a naive test.

## Decision records

Added **0042 — A sink observes, and the runtime contains it** (§2). Nothing
superseded. It does not contradict a standing record: 0024 asserted this promise
and relied on it, and 0042 is what makes the assertion true. 0024 stands
unchanged.

## Test coverage and status

`pnpm verify` green end to end: build, typecheck, both suites, portal build.

- **Runtime: 954 tests / 77 files**, all passing, **nothing skipped** — up from
  938 / 76. Sixteen new tests, one new file (`runtime/narration.test.ts`).
- **Portal: 286 tests / 27 files**, unchanged — this unit is below the portal.
- **Both live API tests ran and passed** against `claude-opus-5`. No model id
  changed, and nothing in this unit calls a model. (Day 35 saw 529s from the
  provider; there were none this session, so nothing skipped on that path.)

What they hold down:

- **The envelope:** the tree and the instant are stamped onto the event; the
  clock is read once per event rather than once per narrator.
- **The containment:** a throw does not propagate; a rejection does not
  propagate; **narration continues after a refused event** rather than stopping
  at it; a sink returning a pending promise is not awaited.
- **The limit:** a clock that throws still fails the change, and emits nothing.
- **The pipeline:** a change whose `change-applied` the sink refused still
  applies; a rejection whose `disposition-decided` was refused is still a
  rejection; every stage after the refused one is still narrated, in order; the
  rejecting shape is contained as well as the throwing one.
- **The write path, the case that matters most:** a commit whose
  `change-committed` the sink refused is reported as **committed**, with the
  store at revision 1 — the exact inversion above, now asserted; a change whose
  `change-applied` was refused still reaches the log with the right content; a
  refused `proposal-held` still leaves the proposal in custody; a refused
  `hold-confirmed` still commits **and still records `answeredBy`**, because the
  approval reaches the log by a different route than the event (0027, 0029); a
  refused `hold-discarded` still releases the hold.

**Nothing weakened. Nothing skipped.**

## Open questions and blockers for the next session

1. **A contained failure is invisible, by design.** If you want it visible, the
   honest shape is a second seam — an `onEmitError` on `CompositionRuntime` —
   not a mutable counter. **Recommendation: leave it** until a host actually
   asks. 0042's Consequences records the reasoning so the next reader does not
   have to re-derive it.
2. **A sink can still block.** Containment covers throwing and rejecting, not a
   sink that spends a second inside a synchronous `emit`. Nothing fixes that
   from outside without making emission async, which 0024 rejected on purpose.
   **Recommendation: leave it**, and it is now stated in the record rather than
   implied.
3. **Attribution is on the tree page but not on `/history`** (day 38). The credit
   already carries the revision number so it can become a link.
   **Recommendation: yes, next §5 unit** — and with §2's gap now closed, that is
   what I will pick up next run unless you say otherwise.
4. **Still nothing scheduled** — the telemetry prune (day 34) and the snapshot
   audit (day 28). **Recommendation: one nightly Vercel cron covering both**,
   once you are happy with the 90-day default. Longest-carried item, unanswered
   across five runs.
5. **Five PRs are open and stacked** (#49, #50 → #51 → #53 → this one, #52).
   Each is one unit and each is green, but the stack is deep enough that a late
   change near the bottom would be awkward to rebase. **Recommendation: land
   #49 and #50 when you get a chance**; they are independent of the rest.
6. **Carried, still yours — sign-in lockout history** (option B, #45/#50).
   **Recommendation: not yet**; it is a governance call about retaining failed
   attempts against a public form, not an engineering one.
7. **ARCHITECTURAL, from day 35, still yours: should a tree carry the ids it has
   retired?** Unchanged. **Recommendation: not yet.**
8. **Carried, unchanged:** telemetry written before day 37 keeps
   `interpreter-unavailable` on failures that were really rejections (leave it);
   RLS fails closed for a non-owner role (day 34, by design); the portal has no
   component test harness (day 26); a missed `db:push` is still a sign-in outage
   (day 32); `policyId` is a name rather than a fingerprint (day 31); calibration
   does not segment by policy (day 31); and the reply schema sits near its
   3500-byte guard.

**§7 — Marketplace — remains the only section I will not start without you saying
so.** Sections 1–6 are functional end to end; what is left in each is the list
above.
