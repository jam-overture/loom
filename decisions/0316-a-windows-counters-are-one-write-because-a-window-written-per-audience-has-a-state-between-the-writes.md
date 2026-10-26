# 0316 — A window's counters are one write, because a window written per audience has a state between the writes

**Status:** Accepted

**Date:** 26 October 2026

**Section:** §4c (reader signals)

## Context

`collectReaderSignals` is the one operation that empties the raw buffer, and
`collect.ts` opens with the reason it is one operation rather than two:

> A rollup reports *what this window added* (0147), so a batch counted twice is
> counted twice forever: there is no idempotence to fall back on and no way to
> notice afterwards, because the wrong number looks exactly like a busy
> afternoon. The only defence that does not need durable bookkeeping is for the
> set of batches rolled up and the set forgotten to be the same set, decided
> once, in one place.

**That invariant was true of the fold and false of the write.** Since 0284 a
window is folded **once per audience** — a deployment serving two forms of a page
holds two audiences' batches interleaved, and folding them together would add two
populations into one counter. The folds were then applied one call per audience:

```ts
for (const { audience, rollup } of folded) {
  const applied = await store.apply(rollup, now, audience)
  if (!applied.ok) return { outcome: "unavailable", error: applied.error }
}
```

A store error on the second call left the first audience's counters **durable**,
the second audience's **uncounted**, and the buffer **un-forgotten** — because
forgetting is the last thing the function does. So the next run read the same
ripe prefix, folded it again, and **added the first audience's window a second
time.**

**The comment above that loop called it something it was not.** It read *"the
counters it already moved are the bounded over-count that comes with adding
distinct view counts across windows (0147)"*. 0147's over-count is a page view
whose batches straddle a window boundary being counted in both — one view, on a
distinct count, bounded by how many straddle and now measured at the door (0274).
This is not that. It is a whole window re-added, and it falls hardest on the
counters 0147 says nothing about.

**What it cost, counted the way 0314 counted its own case.** Of a tally's nine
counters, `views`, `reached` and `engaged` are distinct counts of view keys and a
repeat of the same window moves them by the straddle only; `dwellMs`,
`activations`, `opens`, `closes` and `completions` are **occurrences and double**.
Every rate this subsystem publishes divides the second kind by the first. So the
damage is the same shape as 0314's and from the opposite direction: not a sender
delivering twice, but a collector writing twice — invisible, permanent (0158),
and reading as a readership twice as interested as it was.

**And `unavailable` said the opposite was happening.** Its own documentation is
*"Read or write failed before anything became durable. Nothing was deleted."* The
first clause was false for every window of more than one audience.

Nothing had caught it because nothing had tested it. `collect.test.ts` had a
double whose `apply` always failed, over a window of **one** audience, where the
first call is the only call and `unavailable` is exactly right.

## Decision

**A window's counters are one write.** `ReaderTallyStore` gains

```ts
readonly applyWindow: (
  window: readonly AudienceCounters[],
  at: string
) => Promise<Result<void, ReaderSignalStoreError>>
```

where `AudienceCounters` is one fold plus the audience it was taken over, and
`collectReaderSignals` calls it exactly once with every audience in the window.
The Postgres store spans its existing transaction across the audiences rather
than across the statements of one; the memory store writes them in one pass and
cannot fail part-way.

**It is required, not optional.** A store that cannot be atomic over several
audiences cannot be correct here, and a caller that had to probe for the
capability would need the broken path kept alive beside the sound one — which is
the shape of a double-count bug waiting for the branch nobody tests.

**`apply` stays, and is `applyWindow` over a single entry** — implemented as
exactly that in both shipped stores, so the two cannot drift on the half that
matters. A caller composing counters by hand (a backfill, a fixture, a migration)
has one audience and no window and should not have to wrap it in a list to say
so. Its third argument and its meaning are unchanged, so every existing call site
compiles untouched.

**Two entries naming one audience are added, not refused.** The shipped stores
must agree about that, because `ON CONFLICT … DO UPDATE` refuses to affect one
row twice inside a single command while a `Map` adds — the disagreement
`counters.ts` already exists to prevent. The guarantee is kept where it was: per
command, by `foldedBy`. Two entries are two commands in one transaction, so they
add.

**The outcomes are unchanged, and `unavailable` is true again.** There is no new
state to report: a window either becomes durable or does not. The alternative —
keeping the loop and adding an outcome that *named* the audiences already counted
— is rejected below.

## Consequences

- **The invariant `collect.ts` opens with is now true of the whole function.**
  The set of batches folded, the set written and the set forgotten are one set,
  decided once.
- **A host implementing `ReaderTallyStore` gets a compile error** until it
  implements `applyWindow`, which is the right failure for a method whose absence
  is a silent permanent over-count. Both shipped stores implement it; the
  deployment story is unchanged for anyone using them.
- **One new published name** (`applyWindow`, with `AppliedCounters` and
  `AudienceCounters` for its arguments) and no removed one.
- **The contract is asserted against both stores**, and the atomicity against
  real Postgres semantics: a window whose second audience carries a `revision`
  past what an `integer` column holds raises on that insert, and the first
  audience's rows are then absent. The rollback under test is the database's, not
  a guard of ours.
- **Nothing reaches a reader.** No payload field, no browser byte, no column, no
  migration, no store *read*, no new kind. `broadcast.ts` is byte-identical.
- **Per-reader identity is no closer and no further away.** This moves a write
  boundary on the server and keeps nothing per person.

## Alternatives considered

- **Keep the loop and report the half-written state**, as a `partly-counted`
  outcome naming the audiences already durable, the one that failed and the
  buffer position still held. Honest, and the shape `counted-not-forgotten`
  already has. **Rejected** because `counted-not-forgotten` is a state an
  operator can act on — it names the position to prune below — and this one is
  not: pruning loses the uncounted audience's batches, and not pruning doubles
  the counted ones. An outcome whose every branch is damage is a bug with a
  label, and the label would have been the first thing a deployment saw of a
  fault that one transaction removes.
- **Forget the prefix anyway, and report the audiences dropped uncounted.**
  Turns the over-count into an under-count. **Rejected**: `collect.ts` is
  explicit that the order is aggregates first and the buffer second, because the
  reverse loses the batches outright and looks from the outside like a run that
  worked. An under-count is permanent too, and it biases every rate taken from
  the window rather than one deployment's figure.
- **Order the applies so a failure costs less** — smallest audience last, or a
  stable order so the doubled set is reproducible. **Rejected** as arithmetic
  dressed as a fix: it changes how much is wrong, not whether.
- **Forget up to the first batch of the failed audience.** Prefix-forgetting is
  the journal's contract and that prefix is computable. **Rejected**: the
  audiences interleave by `seq`, so the batches of a succeeded audience *after*
  the first failed-audience batch are still re-folded, and the double count
  survives in a form that is far harder to reason about.
- **Change `apply` to take a list instead of adding a method.** One write method
  rather than two. **Rejected** on two counts: its ~50 call sites include
  `src/testing/reader-signal-contract.ts`, which is another lane's file, and a
  union-typed first parameter on a published interface is the worst version of
  the capability problem — a host store that handled only the old shape would
  compile and silently drop every audience but one.
- **Serialise harder instead.** `apps/loom/scripts/signals-collect.ts` already
  takes a Postgres advisory lock, which is what keeps two *runs* apart.
  **Rejected** because this is not a race: one run, writing its own window twice
  over two scheduled runs, with nothing concurrent anywhere.
