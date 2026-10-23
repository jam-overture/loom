# 0306 — A ratio names the state it has no quotient in, and the rule is published once

**Status:** Accepted

**Date:** 23 October 2026

**Section:** §4c (reader signals)

## Context

Three comparisons of two windows publish ratios, and each of them spelled the
same helper itself:

```ts
// src/signals/action-change.ts
const ratioOf = (was: number | undefined, now: number | undefined): number | null =>
  was === undefined || now === undefined || was === 0 ? null : now / was

// src/signals/pace-change.ts, src/signals/funnel-change.ts
const ratioOf = (was: number | null, now: number | null): number | null =>
  was === null || now === null || was === 0 ? null : now / was
```

Six published fields come out of them: `ActionChange`'s `shareRatio` and
`usesRatio`, `PaceChange`'s `paceRatio`, `timeRatio` and `needRatio`, and
`FunnelChange`'s `rateRatio`, `entryRatio` and `conversionRatio` — eight, in
fact, which is part of the point: nobody counting them from memory got the
number right.

**Two faults, and they are the same fault at two scales.**

**One `null` for two states.** It means *neither side measured this* — a leaf, a
part with no row, a part nobody reached, a passage with no words, a window with
no page views — and it means *the earlier side measured nought*, which is a
measurement and the state a rise from nothing is read off. *Nobody acted in this
band and four in ten do now* and *nothing here can be compared* arrive at a
surface as one value. No wrong sentence is published today; what is published is
a sentence a screen cannot tell from another one, which is the failure mode that
costs most once a screen exists.

**One rule in three copies.** They agree today. Two spellings of one rule that
agree today is the fault this subsystem has been bitten by twice
([0218](0218-what-a-counter-means-is-published-and-the-browser-pays-for-the-number-and-not-its-name.md),
[0235](0235-how-much-of-a-page-gets-read-is-a-share-of-words-that-partition-it-and-the-typical-reader-is-a-ceiling.md)),
and a fourth comparison would have picked whichever copy it read last.

[0304](0304-an-unwalked-window-has-no-share-and-nothing-untouched-to-give-and-the-rule-belongs-to-the-reading.md)
narrowed this and did not resolve it. An unwalked window used to reach the
helper with a nought, so `shareRatio` carried a *third* meaning and — because
the clause is `was === 0` and not `now === 0` — the nought escaped as a **`0`**
in the other direction. Moving that rule into the reading removed the third
cause. The original pair is what is left.

**The finding that filed it named the wrong third module.** It said
`action-change.ts`, `pace-change.ts` and `copy-change.ts`. `copy-change.ts`
publishes a *difference* and not a quotient — `ComparedPassage.gain` is
`words × (now.reach − was.reach)`, whose `null` means *one side is not a
measurement* and nothing else
([0282](0282-a-word-nothing-can-be-said-about-is-in-no-mass-and-a-page-that-reports-no-reach-has-no-mean.md)).
The third copy was in `funnel-change.ts`, where the commercial figure is.
Counted from the files rather than from the entry.

**And one field's absence was already backwards.** `PartAction.usesPerReader` is
withheld at `uses` of nought on purpose, because a nought there is the ordinary
state of every heading on a page and `uses` beside it already says so
([0242](0242-what-readers-did-is-a-share-off-one-row-and-a-leaf-has-no-inside.md)).
That is right for one window and wrong as a term: handed an absence, the helper
called *readers used this twice each and do not touch it now* unmeasured, and
called a button nobody pressed before and half the readers press now unmeasured
as well. Both are measurements on both sides.

## Decision

**A ratio is a pair: the quotient, or the reason there is not one.** Published
from one new module, [`src/signals/ratios.ts`](../src/signals/ratios.ts), and
imported by the three comparisons that divide.

```ts
export type RatioAbsence = "unmeasured" | "from-nothing"

export type Ratio = {
  readonly ratio: number | null
  readonly absent: RatioAbsence | null
}
```

1. **Exactly one of the two fields is non-null**, in every value the module
   produces. That is the property that makes a surface reading one of them safe
   to write, and it is asserted over every branch rather than described.
2. **`unmeasured` is either side having no such figure**, with `undefined` and
   `null` both meaning that. The readings this serves spell a withheld figure
   both ways — `undefined` on a part of a reading, `null` on a side of a
   comparison — and a helper that made its callers normalise first would be a
   fourth thing to get wrong.
3. **`from-nothing` is both sides measured and the earlier one nought.** A
   division by nought and not an absence of measurement. It covers the earlier
   side being nought with the later side above it *and* both of them being
   nought, because the comparison publishes both sides and the movement between
   them: which of the two it is, is a fact the surface already holds, and the
   absence says only that there is no quotient to take.
4. **Two members and a `describeRatioAbsence` line each**, as a closed set, so a
   surface accounting for every absent figure can walk them.
5. **The nought a reading withholds on purpose is restored for the ratio and
   only for the ratio.** `ComparedAction.usesRatio` divides occurrences per
   reader with a side that reached readers and was used by none of them counted
   as a nought; `PartAction.usesPerReader` itself is published unaltered,
   because a card drawing one window has `uses` next to it and the quotient does
   not. `unmeasured` there is now exactly *a side with no readers to divide by*.
6. **A bound on a tagged figure is not tagged.** `rateRatioAtLeast` and
   `rateRatioAtMost` stay `number | null`: a bracket around a quotient that does
   not exist has nothing to say that the quotient has not said, and a bracket
   absent where the quotient is present is the door's drift and nothing else.
7. **The reason is published rather than left to be derived.** A surface holds
   both sides and could in principle work it out. It would have to know, per
   field, which pair of figures the quotient was taken over and what each side
   withholds and why — and point 5 is the proof that the obvious derivation gets
   a field backwards. The knowledge is the reading's, the reading has it in hand
   at the division, and a rule derived a second time somewhere else is the fault
   above with a longer fuse.

## Consequences

- **Eight published fields change shape**, on three types. Nothing in the
  repository reads one of them yet — no screen, no route, no other module — so
  this is the cheapest moment it will ever be, and that is the argument for
  doing it before the portal draws any of them rather than after.
- **A fourth comparison has one helper to import**, and the absence it must
  account for is a closed set with a line per member.
- **`ComparedAction.usesRatio` answers where it used to be silent.** *Readers
  have stopped using this part* is a quotient of nought; *nobody used it and
  they do now* is `from-nothing`. The suite that pinned the old silence now pins
  both.
- **`pageActionOf` and `pacedPartOf` are untouched.** The rule a window applies
  to its own figures stays that reading's, which is the direction
  [0282](0282-a-word-nothing-can-be-said-about-is-in-no-mass-and-a-page-that-reports-no-reach-has-no-mean.md)
  and 0304 both send a rule in.
- **Nothing was added to a payload, a browser, a column, a store or the
  vocabulary of kinds.** `broadcast.ts` was not touched and is byte-identical;
  the new module reaches no package, so a comparison importing it stays outside
  the broadcaster's import graph. This is the thirty-seventh thing taken out of
  what the subsystem already knows rather than collected.
- **Per-reader identity is no nearer and no further.** Every term here is a
  distinct-view count or a word count; an opt-in identified window would be
  divided by the same function unchanged.

## Alternatives considered

- **A sibling field per ratio — `shareRatioAbsence` beside `shareRatio`.**
  Rejected: it leaves `shareRatio === null` readable without its reason, which
  is the state this record exists to end, and it adds eight fields to three
  types to avoid changing eight that nothing reads.
- **Leave the derivation to the surface.** Rejected for point 7. The derivation
  is not one rule; it is one rule per field, and one of them is inverted.
- **A third member for a nought on both sides.** Rejected: the two sides and the
  movement are published beside every ratio, so *it was nothing and it is
  nothing* is already answerable, and a member for it would be a second way to
  say what `now` says.
- **Tag the bracket as well.** Rejected for point 6, and because a bracket whose
  own absence named *the quotient it brackets is absent* would be a second copy
  of a fact one field away.
- **Publish the helper from `audiences.ts`**, where the pair rules went
  ([0303](0303-what-two-forms-readers-do-is-the-same-pair-at-a-different-counter-and-the-page-has-one-honest-figure.md)).
  Rejected: that module is about which two readings may be held against each
  other, and arithmetic over two figures is not that. A figures module is new
  and is the smaller thing to explain.
- **Change `PartAction.usesPerReader` to publish the nought instead.** Rejected:
  the one-window argument for withholding it is still right, and a reading that
  publishes a nought per heading on every page is the noise 0242 chose against.
  The comparison restoring it for a quotient is the narrower change and the one
  that leaves both callers honest.
- **Keep the three copies and only add the tag.** Rejected: three copies of a
  rule that now has more structure is three places for the next member to be
  missing from, and the copies were already not identical — two spellings of the
  absent side and a different name in the module that does not divide at all.
