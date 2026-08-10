# 0042. A sink observes, and the runtime contains it

**Status:** Accepted
**Date:** 2026-08-07
**Section:** §2

## Context

`EventSink` has carried one sentence since §2: *a sink that throws or blocks
must not be able to fail a change the Gate already accepted.* 0024 leant on it
directly — it is the reason `collectTelemetry` buffers instead of writing, and
the reason an event the collector cannot narrow is counted and dropped rather
than thrown.

The sentence was not true. It described what every sink in the repo *did*, not
what the runtime *enforced*. `emitter` in `pipeline.ts` and `narrator` in
`commit.ts` — two copies of the same three lines — called `emit` bare, so the
guarantee was an obligation on whoever implemented a public interface. Loom's own
sinks honoured it; the first host sink to log to a service that returns 503 would
not.

Both halves were executed against the real pipeline before this record was
written, and they fail in opposite directions:

| Sink throws on | What happens |
| --- | --- |
| `change-applied` | `composeChange` throws, and the tree `applyDelta` returned is lost past the `return`. Inside `commitIntent` this lands *before* `store.append`, so the change is abandoned between the Gate accepting it and the log receiving it — and no `commit-failed` is emitted, because the thing that would emit it is the thing that threw. |
| `change-committed` | The inverse, and worse. The store ends at revision 1 with the change durably in it while `commitIntent` throws. A host reports failure to a user for a change that happened. |

The second is the one that decides this. Past `store.append` the log is the
truth (0016), and a runtime whose observer can make it lie about the truth is
not honest about what changed — which is the property the whole project is for.

There are two ways to make the sentence true, and they are not close.

**Stop promising.** Reword the two comments so the guarantee reads as an
obligation on the sink. Costs nothing, and gives up the property: every host
that writes a sink now has to get it right, and the failure when they do not is
a durable change reported as an error.

**Provide it.** Contain the throw at the point of emission. Costs the ability to
see that a sink is broken, since the only channel for reporting it is the thing
that just failed.

## Decision

**A sink observes; it does not get a vote. Every runtime event leaves through
one `narrator`, in `src/runtime/narration.ts`, which contains whatever `emit`
throws.**

Three things follow from putting it there rather than at each call site.

**It is structural, not remembered.** The two duplicate emitter factories are
gone; there is one door, and a future call site cannot forget to use it because
constructing an envelope by hand is now the odd thing to do.

**Containment covers rejection as well as throwing.** `emit` is declared
`() => void`, which does not stop a host writing an `async` one — TypeScript
assigns `() => Promise<void>` to `() => void` without complaint. Such a sink
rejects rather than throws, and an unhandled rejection is a process-level
failure on exactly the serverless hosts 0024 was written for. A guard that
caught only the synchronous shape would be the same false promise in a smaller
font. The returned value is checked for a `then` and given a no-op handler —
attached, never awaited, because awaiting is what 0024 forbids.

**The clock is deliberately outside it.** A sink that fails is a broken observer
and the change is still true. A clock that fails means the runtime cannot say
when anything happened, and the same clock stamps `appliedAt` on the commit — so
containing it would put a wrong time in the log rather than lose an event. It
propagates, and there is a test that says so.

**Containment reports nothing.** The event is lost and the runtime does not
count it. This is the accepted cost, not an oversight: see below.

## Consequences

- `EventSink`'s promise is now a guarantee the runtime provides rather than a
  rule its implementers are asked to follow. A host sink may throw freely; it
  cannot be load-bearing.
- **A throwing sink loses events silently.** There is nowhere for the runtime to
  report it — the sink is the reporting channel, and it just failed. Any counter
  would have to live on a `CompositionRuntime`, which is a value, not a stateful
  object, and making it stateful to hold a number nobody reads is a worse trade.
  Hosts that want the count keep it themselves: `collectTelemetry` still counts
  everything it cannot hold or cannot write, which is why it still buffers rather
  than relying on containment.
- `narrator` is now the only place a `RuntimeEventEnvelope` is constructed, so
  the envelope's shape has one author.
- `collectTelemetry`'s no-throw discipline is no longer load-bearing for
  correctness. It stays, because it is what keeps drops *countable* — the
  comment saying so was corrected to stop claiming it is what keeps them safe.
- A sink can still block: containment covers throwing and rejecting, not a sink
  that spends a second inside a synchronous `emit`. Nothing can fix that from the
  outside without making emission async, which 0024 rejected.

## Alternatives considered

**Reword the comments and keep calling `emit` bare.** The cheap half of the
lesson's own recommendation, and rejected. It resolves the contradiction by
lowering the contract to match the code, on a seam where the failure mode is a
committed change reported as an error. A framework whose claim is that change is
inspectable cannot make its inspection load-bearing on the write path.

**A `guardedSink(sink)` decorator the host wraps its sink in.** Rejected: it is
the same obligation on the host, one level further out, and a host that forgets
to wrap gets the old behaviour with no sign that anything is missing. A
guarantee a caller can opt out of by omission is not one.

**Count contained failures on the runtime.** Rejected above — it makes
`CompositionRuntime` stateful for a number with no reader. If a reader ever
appears, the honest shape is a second seam (`onEmitError`), not a mutable field,
and it should be added then rather than in anticipation.

**Contain the clock too.** Rejected: an envelope with a fabricated `occurredAt`
is worse than no envelope, and the clock's other caller writes to the log.

**Make `emit` return a `Result` instead of throwing.** Rejected. It would put
the guarantee in the type, which is genuinely better, and it would break every
sink anyone has written for a failure the runtime discards anyway — the caller's
only possible response to `err` here is to ignore it. The type would be honest
about a decision the runtime has already made for it.
