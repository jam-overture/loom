# A filter per kind, and the switch that was never wired

**Routine:** `Loom daily build` (framework) · **Date:** 2026-09-12 (evening run,
second unit) · **Branch:** `framework-31-a-filter-per-kind`
**Section:** §3 — Rendering, §6 — Telemetry

## Why there are two reports today

The first unit of this run is
[`2026-09-12-framework-the-undo-already-in-hand.md`](2026-09-12-framework-the-undo-already-in-hand.md),
opened as **#275**. While that pull request was being pushed, `main` moved — #274
landed the ski-apparel prototype — and with it **two findings filed by the
maintainer**, one of them owned by this lane.

Maintainer input outranks everything in this brief, including the plan and the
findings queue, so it was taken immediately rather than left for the next run
twelve hours away. It is a second branch off `main` rather than a second commit
on #275, because #275 is described, green and reviewable as it stands, and
widening it with unrelated work would cost the maintainer the ability to read
either.

**This is not a stack.** `framework-31-a-filter-per-kind` is branched from
`main` at `591ce53` and depends on nothing in #275. They can merge in either
order.

## What was asked

> `broadcastReaderSignals` takes one `types` list, and it filters all four kinds
> by it. A host rarely wants that. The ski rail wants **time on screen** for
> sections, **activations** for the links and buttons inside them, and
> **disclosures** for questions. With one list it has to name all five types for
> all four kinds, so every batch also carries `viewed` and `dwelled` for every
> link and button on screen — about ten `dwelled` signals a second on this page.

## What shipped

**`types` takes a list per kind.** Exactly the shape proposed:

```ts
types: { dwelled: ["loom.section"], activated: ["loom.link", "loom.action"] }
```

A plain list still means "these types, every kind" — both spellings are
normalised once at the entry point, so nothing downstream learns which one a host
used.

**A kind not named is unrestricted, not off.** This is the one judgement the
finding left open, and it went to keeping the two axes orthogonal: `kinds` is the
switch for whether a kind is broadcast, `types` is the filter for which types it
covers. Two options that each answer one question beat two that both half-answer
both.

### The part that was not asked for, and is the reason the ask would not have worked

**`kinds` never applied to `viewed` or `dwelled` at all.**

The filter was asked inside `record`, which only the event path — `activated`,
`disclosed` — goes through. The two time-based kinds are not made where they are
observed: the ledger makes `viewed` on entry and `dwelled` at drain. A check at
the observer was therefore never a check on the signal, and `kinds: ["viewed"]`
broadcast `dwelled` as well.

I did not assume this from reading the code. I wrote a throwaway probe test
against the real DOM first, watched it emit `["viewed", "dwelled"]` where one was
asked for, and deleted the probe once the behaviour was pinned by real tests.

**Why it matters here rather than as a separate entry:** the ski rail's fix is to
name three kinds and drop `viewed`. That does nothing unless `kinds` is honoured.
The keyed `types` filter alone would have left the page with the same ten
`dwelled` signals a second it was filed about.

**Both are one fault** — a filter asked somewhere it cannot see the signal — and
both are fixed the same way: one predicate, `allows(kind, type)`, asked at the
two points a signal can leave. The observer keeps a filter as an optimisation
only; it watches an element when *any* time-based kind would report on its type,
so it cannot under-observe, and correctness no longer depends on it.

## Unspecified decisions, and why

**An unnamed kind is unrestricted.** Argued above and in 0138. The alternative —
unnamed means off — makes `types` a second way to disable a kind, so a reader has
to hold both options to predict what a page broadcasts.

**Filtering at drain rather than in the ledger.** The ledger is the arithmetic,
deliberately with no policy and no browser in it. Threading a host's
configuration through it would put a question about what a host *wants* into the
one module that is only about what is *true*. The cost is one pass over a batch
that is about to be serialised anyway.

**Signals that will be filtered are still accumulated.** Dwell has to be counted
while it happens; a node's time on screen cannot be reconstructed later from a
decision not to count it. Stated rather than hidden, because it means the keyed
filter saves bandwidth and batching, not bookkeeping.

## Records

- **0138 added**, Accepted: *A signal filter is two axes, and is asked where a
  signal leaves.*
- **0136 amended in place**, per the convention
  [0099](../decisions/0099-a-record-is-amended-when-only-the-count-moved.md) sets
  for exactly this case: a dated block under the header naming what moved and
  which record moved it, stating plainly that nothing is reversed, and the
  configuration paragraph corrected. 0136's decision — configuration is the
  host's and never a prop — stands untouched; only the shape of one argument grew.
- **Nothing superseded.** `pnpm decisions:index` regenerated. It reports 0137 as a
  hole, which is correct and expected: 0137 is claimed by #275 on the other
  branch of this same run.

## Findings

**Closed (1):** the maintainer's *a broadcaster's `types` filter applies to every
kind at once*, filed today.

**Filed (1):** for `@jonathanbravecredit` — the ski rail can drop its
after-the-fact filtering, with the exact call to use, plus the `kinds` fault and
the behaviour change it implies. `prototypes/` is not this lane's and was not
touched.

## Tests

`pnpm verify` **green, exit 0.**

| | files | tests |
| --- | --- | --- |
| runtime (`src/`) | 127 | 2,086 |
| application (`apps/loom`) | 232 | 3,857 |

Nothing skipped, nothing weakened. **Six new tests**, and the two that matter
most are the ones that would have caught the original fault: asking for `viewed`
without getting `dwelled`, and asking for `dwelled` without getting `viewed`. The
other four cover the keyed form — each kind getting its own types, a type not
reported under a kind that did not name it, an unnamed kind staying unrestricted,
and a plain list still meaning every kind.

The twelve existing broadcaster tests pass unchanged.

**Why the fault survived #273's review:** the one test covering both filters
used `kinds: ["activated"], types: ["loom.nav"]` and asserted an empty batch. The
type filter excluded everything, so nothing ever reached the point where the kind
is read — the test passed for the wrong reason, and would have passed with the
kind filter deleted entirely.

## Open questions

1. **Whether an unnamed kind should mean off after all.** Recorded as decided,
   and it is the one place a second opinion would change the API rather than the
   implementation. Cheap to reverse today, expensive once a host depends on it.
2. **`prototypes/ski-apparel` still filters after the fact** until its author
   changes the call. Nothing is blocked.

## What I did not do

No self-check-in is scheduled and nothing is armed, on either branch of this run.
