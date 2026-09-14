# 0147 — A rollup is added to what is stored, and a distinct-view count is therefore approximate

**Status:** Accepted
**Date:** 2026-09-14
**Section:** §4c (reader signals), §6 (telemetry)

## Context

[0146](0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md)
settled what a reader signal may carry and how a funnel is correlated: an
opaque `view` key, minted per page view, read by rollup and by nothing else,
dropped when the raw window expires. It also settled that **aggregates are the
durable artefact** and raw batches are a short-lived buffer. `docs/signals.md`
made ingestion, storage and rollup step 3 of the approved plan.

Building it forced a question 0146 does not answer. Rollup runs over a *window*
of the buffer — the batches that have arrived since the last run — and it runs
again over the next window. So what it produces is *what this window added*,
not *what is true so far*, and the store has to combine the two.

For time on screen, activations and disclosures that is simple: they are
occurrences, they sum, and summing them across windows is exact.

`views` and `reached` are not occurrences. They count **distinct page views**,
and distinctness does not survive addition. A reader whose page view spans a
window boundary is one view in the first window and one view in the second, and
two after the sum. The number a rate is taken of is the one that cannot be
added up correctly.

Making it exact requires knowing, in the second window, which views the first
window already counted. That means keeping view keys in durable storage past
the raw window — which is the single thing 0146 refuses, and the refusal that
makes the whole subsystem free of consent machinery.

## Decision

**Applying a rollup adds to the counters already stored.** `ReaderTallyStore.apply`
is additive for every counter, implemented in Postgres as
`ON CONFLICT … DO UPDATE SET x = table.x + excluded.x` so that two rollups
running at once — a scheduled one and a manual one, which is the ordinary way
it happens — cannot lose each other.

**A distinct-view count is accepted as approximate, and the error is named.**
`views` and `reached` over-count by the number of page views that straddle a
window boundary. The error is always an over-count, never an under-count, and
it is bounded by *(views per window) × (page-view duration ÷ window length)*.

**The view key is not stored durably to fix it.** A tally carries no trace of
it; it lives only in the buffer rows, and forgetting the raw window is the
mechanism by which it expires.

**The window is configuration, not a constant**, following 0146's retention
rule — which is also the control a deployment has over the error: a rollup
window long relative to a page view makes the over-count small.

## Consequences

- **A conversion rate is honest and a view count is slightly generous.** The
  funnel numbers a deployment reads are computed inside one rollup run, where
  distinctness is exact, so `reached` and `converted` in a funnel answer agree
  with each other. It is the summed `views` on a tally, across many runs, that
  drifts upward.
- **The drift is bounded and shrinkable without a migration.** Lengthening the
  rollup window reduces it; nothing about the stored shape changes.
- **`uncorrelated` exists for the same reason.** Batches with no view key
  contribute occurrences and no views, and rollup reports how many there were,
  so a portal can say a rate was computed over fewer views than the totals
  rather than showing a rate that is quietly wrong.
- **A store that replaced rather than added would look correct.** It would show
  plausible counters describing only the last window. This record is most of
  why the contract suite asserts the additive property against both
  implementations.
- **Exactness remains reachable, at a price this records as refused.** A future
  record could keep view keys durably, or keep a per-window sketch of them, and
  make the count exact. Either reopens 0146.

## Alternatives considered

**Keep view keys in durable storage so distinctness is exact.** The obvious
fix, and the one every analytics product makes. Rejected: it is 0146's refusal
verbatim. A key that outlives the window it was minted for is a key that can be
joined across windows, and the argument that it identifies nobody rests
entirely on how briefly it exists.

**A probabilistic sketch — HyperLogLog or similar — stored per node.** Exact
enough in practice, small, and it does not store the keys themselves. Rejected
for now on two grounds: a sketch of view keys is still a structure derived from
them and kept indefinitely, which needs its own argument rather than an
inherited one; and it is a real amount of machinery for an error a deployment
can already shrink by setting one number. Worth revisiting if a deployment's
window has to be short for an unrelated reason.

**Roll up only page views that have certainly ended.** Waiting a grace period
past the last batch of a view before counting it would make straddling
impossible. Rejected: nothing tells the server a page view has ended — a reader
who closes a tab sends no farewell — so "certainly ended" is a timeout, and the
counters would lag it. Trading freshness for a bounded over-count is the wrong
way round for a screen someone opens to watch a change land.

**Replace rather than add, and roll up the whole buffer every time.** Exact,
and trivially correct. Rejected: it makes the cost of a rollup grow with the
buffer, and it makes the retention window and the correctness of the counters
the same setting — forgetting a batch would silently subtract it from the
totals, which is the one thing aggregates exist not to do.
