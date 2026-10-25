# 0307 — A distance between a mix and nothing is withheld, and the invariant both rolls rest on is asserted

**Status:** Accepted

**Date:** 23 October 2026

**Section:** §4c (reader signals)

## Context

Two library rolls publish how far the weights behind a weighted mean moved —
`KindReachChange.weightMoved` and `ReaderWords.weightMoved` — and both take it
from one exported helper, `weightMovedOver` in
[`library-reach-change.ts`](../src/signals/library-reach-change.ts). It is the
arithmetic a comparison of two readerships uses
([0247](0247-a-readership-comparison-is-built-from-two-floored-maps-and-the-mix-is-the-only-figure-with-no-window.md)),
over places rather than regions: half the sum of the absolute movements in each
place's share of its side's total weight.

It opened with

```ts
if (totals.was === 0 || totals.now === 0) return 0
```

and its own documentation called that state *accounted for by a silence*. Two
things are wrong with it, and they are the two halves of the finding this lane
filed on 22 October while taking
[0306](0306-a-ratio-names-the-state-it-has-no-quotient-in-and-the-rule-is-published-once.md).

**A nought is the one value a surface reads as *the weights did not move*.** A
side with no weight at all has no distance to report — there is no distance
between a mix and nothing — so the branch returns the opposite of what it means.
This is
[0304](0304-an-unwalked-window-has-no-share-and-nothing-untouched-to-give-and-the-rule-belongs-to-the-reading.md)
one level down, and the sibling reading already settles it the other way:
`readershipChangeOf` **withholds** `moved` where either window has no views,
rather than publishing a nought.

**Neither roll can reach it.** Both compute the figure only where their silence
is `null`, a door that can scale a page has counted at least one page view at it
([`door.ts`](../src/signals/door.ts) returns `unopened` or `uncounted`
otherwise), and a measured row has at least one comparable place whose two doors
both spoke. The word roll's `figuresOf` already states the invariant in prose —
*a spoken passage with no door reason has a weight behind it* — and nothing
checked it. So the clause was both wrong and unfalsifiable, which is its own
fault ([0231](0231-a-funnel-is-three-shares-of-the-arrivals-and-the-straddle-is-the-one-error-here-that-leans-down.md)),
and neither roll's suite had a case that reached it.

## Decision

**`weightMovedOver` returns `number | null`, and `null` is *there is no
distance here*.** Either side with no weight at all withholds the figure. The
clause stays rather than being deleted, because the helper is exported from
`@jam-overture/loom/signals` and a caller outside the two rolls would otherwise
divide by nought and publish `NaN`.

**No published field changes shape.** Both `weightMoved` fields are already
`number | null`, withheld with the rest of their row, so the two rolls pass the
helper's answer through unaltered and every surface sees what it saw.

**The invariant is asserted rather than described.** A test over real readings
walks every row of a roll and asserts `weightMoved === null` exactly where
`silence !== null` — so if a later change lets a measured row through with no
weight on a side, the suite says so and the withheld value stops being
unreachable.

**The helper gets a suite of its own**, which it did not have: the two states
the arithmetic exists for (weighted alike, and no weight in common), the halving,
and the three ways a side can have no weight.

## Consequences

- **A surface reading the helper directly cannot be told *the weights did not
  move* about a comparison that has no distance.** Nothing reads it directly
  today, which is why this is cheap now and would not be later.
- **One exported signature moves**, from `number` to `number | null`. It is in
  the generated API reference and nothing in the repository calls it but the two
  rolls.
- **The prose invariant in `library-word-reach-change.ts` is now a test.** It
  was the load-bearing sentence under four quotients and had no case behind it.
- **Nothing reaches a reader.** No payload field, no browser code, no column, no
  store, no new kind, and `broadcast.ts` is untouched.
- **Per-reader identity is no cheaper or dearer to add later.** Every weight
  here is a count of page views at a door.

## Alternatives considered

- **Delete the clause.** The honest reading of *unreachable* and the first thing
  tried. Rejected because the helper is exported: a caller outside the two rolls
  would divide by nought and get `NaN`, which is a worse value than either a
  nought or a `null` and is the one that survives arithmetic silently.
- **Keep the nought and document it.** This is what was there, and the
  documentation was already written — *accounted for by a silence*. A sentence
  beside a figure is not what a card prints, and 0304 was written about exactly
  that gap.
- **Throw on a side with no weight.** Against the grain of every join in this
  subsystem: a row that cannot be built cannot be drawn, and a reading is not
  worth failing over.
- **A tagged absence, as 0306 gave the three comparisons' ratios.** There is one
  reason this figure is absent and the row's own silence already names it, so a
  tag would be a second spelling of something published beside it. 0306's
  argument was that a surface could not derive the reason from the two sides;
  here it can, off `silence`.
- **Fold it into 0306.** It was found while taking that record and deliberately
  left: that is a quotient of two figures in three comparisons, and this is a sum
  of absolute differences in two other modules.
