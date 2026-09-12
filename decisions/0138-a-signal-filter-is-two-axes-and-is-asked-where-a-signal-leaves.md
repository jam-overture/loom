# 0138. A signal filter is two axes, and is asked where a signal leaves

**Status:** Accepted
**Date:** 2026-09-12
**Section:** §3 — Rendering, §6 — Telemetry

## Context

[0136](0136-a-published-page-broadcasts-reader-signals-when-its-host-asks.md)
gave `broadcastReaderSignals` two filters: `kinds`, which says which of the four
kinds to broadcast, and `types`, which says which primitive types to broadcast
about. `types` was one list, and it applied to all four kinds at once.

The maintainer filed the shortfall the day 0136 landed, switching
`prototypes/ski-apparel` onto the broadcaster. That page wants **time on screen**
for its sections, **activations** for the links and buttons inside them, and
**disclosures** for its questions. With one list it has to name all five types
for all four kinds, so every batch also carries `viewed` and `dwelled` for every
link and button on screen — about ten `dwelled` signals a second on that page,
almost none of them asked for. The alternative a host had was filtering after the
fact: paying to gather, batch and send signals in order to throw them away.

Building that turned up a second fault in the same seam, which is why this record
covers both. **`kinds` never applied to `viewed` and `dwelled` at all.** The
filter was asked in `record`, which only the event path goes through; the two
time-based kinds are not made where they are observed — the ledger makes
`viewed` on entry and `dwelled` at drain — so a check at the observer was never a
check on the signal. `kinds: ["viewed"]` broadcast `dwelled` too, and no test
caught it: the one test covering both filters used a `types` list that excluded
everything, so nothing reached the point where the kind would have been read.

The two faults are one fault. A filter asked in the wrong place cannot answer a
question about a signal it never sees.

## Decision

**The filter is two independent axes, and it is asked wherever a signal can
leave.**

`types` accepts either spelling. A plain list is that list for every kind, which
is what it has always meant. Keyed by kind —
`{ dwelled: ["loom.section"], activated: ["loom.link", "loom.action"] }` — it is
that list for each kind named. Both are normalised once, at the entry point, so
nothing downstream learns which spelling a host used.

**A kind not named in the keyed form is unrestricted, not off.** `kinds` is the
switch for whether a kind is broadcast; `types` is the filter for which types it
covers. Keeping them orthogonal means neither has to be read to understand the
other, and a host that wants a kind off says so in the one place that is for
saying it.

**One predicate, `allows(kind, type)`, is asked at both exits** — before a signal
is queued on the event path, and over the drained signals before a batch is
built. The observer keeps a filter of its own, but only as an optimisation: it
watches an element when *any* time-based kind would report on its type, so it
never under-observes, and correctness does not depend on it.

That is what makes `kinds` work for `viewed` and `dwelled`, and it is what makes
the keyed form sufficient on its own: the ski rail can now ask for three kinds
with three type lists and get exactly those signals.

## Consequences

`kinds` becomes load-bearing where it was decorative. A host that passed
`kinds: ["viewed"]` and quietly received `dwelled` now receives what it asked
for — a behaviour change, and the reason it is safe is that nobody could have
been relying on the old behaviour deliberately: there was no way to ask for both
and no documentation saying you got them.

Filtering at drain costs one pass over a batch that is about to be serialised and
sent. Signals that will be filtered are still accumulated in the ledger, which is
the honest trade: dwell has to be counted while it happens, and a node's time on
screen cannot be reconstructed later from a decision not to count it.

`prototypes/ski-apparel` can drop its after-the-fact filtering. That is the
prototype's own change and is not made here.

## Alternatives considered

**Let an unnamed kind mean off.** Rejected: it makes `types` a second way to
disable a kind, so two options answer one question and a reader has to hold both
to predict what a page broadcasts. `kinds` already says it, and now says it
correctly.

**Filter only at the observer, and give `viewed` and `dwelled` separate
observers.** Rejected. Two `IntersectionObserver`s over the same elements to
answer one question about visibility, and the ledger would still owe a rule about
which of the two a stretch of time belongs to. The fault was the location of the
check, not the number of observers.

**Filter in the ledger.** Rejected: the ledger is the arithmetic, deliberately
with no policy and no browser in it, and threading a host's configuration through
it would put a question about what a host wants in the one module that is only
about what is true.

**Fix `kinds` and leave `types` as one list.** Rejected — it is half the finding.
With `kinds` fixed the ski rail could drop `viewed`, but `dwelled` would still
cover every type it named for `activated`, which is the ten-a-second noise the
finding is about.
