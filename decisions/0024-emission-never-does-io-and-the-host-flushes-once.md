# 0024. Emission never does IO, and the host flushes once

**Status:** Accepted
**Date:** 2026-07-31
**Section:** §6

## Context

`EventSink.emit` has carried a promise since §2: *a sink that throws or blocks
must not be able to fail a change the Gate already accepted.* Until §6 that was
free, because the only sinks were a no-op and a collector in a test.

A durable journal makes it a real constraint. `composeChange` and `commitIntent`
narrate six to ten events per change, and the sink they narrate into now has to
reach a database. Where that write happens decides three things at once: whether
telemetry can fail a change, how many round trips a request costs, and whether
the record survives on a serverless host at all.

The options differ in what they do to the write path.

**Write on emit, awaited.** `emit` becomes async and the pipeline waits for it.
Simple and immediately durable, and it breaks the promise outright — a slow or
failing journal now delays or fails an accepted change.

**Write on emit, un-awaited.** Fire the promise and move on. Keeps `emit`
synchronous, and on Vercel or any comparable serverless host it also loses the
records: work not awaited when the response is returned is cancelled. It would
work in development and silently not work in production, which is the worst
failure shape available.

**Buffer in the request, flush once.** `emit` narrows and appends to a list.
The host writes the batch at a point it chooses and can await.

## Decision

**Emission does no IO. `collectTelemetry` returns a sink that buffers and a
`flush` the host awaits once, and a journal's `record` takes a batch.**

The batch is not an optimisation detail — it is what lets an implementation make
a request's narration atomic. Half a request's events are worse than none: an
episode missing its disposition reads as a change that was proposed and never
judged, which is a fault report rather than a gap.

Two failure rules follow, and both were chosen against the instinct to be
helpful.

**A failed batch is dropped, not retained for retry.** A journal that is failing
will fail the retry too, and a queue that grows while it drains moves the outage
into the write path. The count of what was dropped is exposed; the records are
not kept.

**The buffer has a ceiling.** A host that forgets to flush would otherwise leak
memory into the write path for as long as the process lives. Past the ceiling
the collector stops buffering and counts the drops. Unbounded telemetry buffers
are a worse failure than lost telemetry.

An event the collector cannot narrow — one outside the union, which means a bug
in the host — is counted and dropped rather than thrown. That is the §2 promise
being kept literally: nothing a sink is handed can fail the change.

## Consequences

- The write path a host assembles is now per-request rather than per-process.
  The portal's `beginWrite()` returns a `WritePath` and a `finish()`; the store,
  the holds and the interpreter stay shared, and only the sink is fresh.
- A host that forgets to `finish()` loses that request's telemetry silently.
  There is no way to detect it from inside the runtime, and adding a warning
  would mean the runtime deciding when a request has ended, which it cannot know.
- Records are durable slightly after the change they describe, not at the same
  instant. A crash between the commit and the flush loses the narration but not
  the change — the right way round, since the log is the truth (0016).
- Telemetry costs one round trip per request regardless of how many stages ran.
- Reading the journal is unaffected by any of this; a reader sees whole batches
  or nothing.

## Alternatives considered

**Async `emit`.** Rejected: it inverts the dependency. Observation would become
something the composition runtime waits for, and a Gate decision would be
hostage to a database it has no reason to know about.

**Fire-and-forget writes inside `emit`.** Rejected for the serverless
cancellation problem, which is invisible in development and total in production.
It also produces one insert per event, which is six to ten round trips for a
change that needed one.

**A background flusher on a timer, owned by the runtime.** Rejected: it makes
the runtime own a scheduler and a process lifetime, neither of which is its
business, and on serverless there is no process between requests for a timer to
live in. A host that genuinely has a long-lived process can build this on top of
the collector; the runtime should not presume one.

**Retaining failed batches for the next flush.** Rejected above — an unbounded
queue inside the write path turns a telemetry outage into an application outage.

**Writing telemetry inside the store's `append` transaction.** Rejected in 0023
for the same reason it is rejected here: it could not record anything that never
reached the store, and most of what §6 is for never does.
