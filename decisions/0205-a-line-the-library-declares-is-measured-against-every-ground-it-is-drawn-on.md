# 0205. A line the library declares is measured against every ground it is drawn on

**Status:** Accepted
**Date:** 2026-09-29
**Section:** §4b

## Context

`src/theme/separation.ts` has existed since 23 August to answer one question a
contrast ratio cannot: *can a reader tell these two slots apart.* It declares
the pairs the library puts in front of a reader, measures each in CIE76 ΔE, and
asserts nothing falls under the published just-noticeable difference of 2.3.

A pairing may be declared `also-marked`, which means a rule or a border
separates the two as well, so the two fills are free to be equal. The type's own
docstring said what that bought:

> What is asserted for these is the weaker and still real claim — the mark itself
> has to be visible against both.

**It was not asserted.** The predicate is a disjunction:

```ts
separated:
  difference >= JUST_NOTICEABLE_DIFFERENCE ||
  (markDifference !== undefined && markDifference >= JUST_NOTICEABLE_DIFFERENCE)
```

A mark is measured only as a *defence* — something that may carry the pair when
the two colours will not. On a palette whose two fills differ, the mark is never
looked at. So a border the library declares, and a palette draws in the fill's
own colour, passes.

[0204](0204-a-rule-with-no-fill-beside-it-is-measured-in-delta-e.md) found the
half of this that is about primitives the day before, sent standalone rules to
`border-default`, and filed the palettes as `src/theme/`'s question. The finding
it left named the gap exactly:

> `PEER_PAIRINGS` in `separation.ts` declares the pairs a reader is meant to tell
> apart, and **not one of them is a border against the ground it is drawn on.**
> The instrument that would have caught all of this by itself has existed since
> 23 August; it was never told about the pair.

Told about it, the instrument reports **eight of the twenty-one starter palettes**
drawing a `border-subtle` edge within a just-noticeable difference of a fill it is
drawn on — `border-subtle` against `bg-surface-muted` unless stated:

| palette | ΔE |
| --- | --- |
| **linen** | **0.00** |
| **clay** | **0.37** |
| **editorial** | **0.90** |
| **citrus** | **1.66** |
| **graphite** | **1.75** |
| **paper** | **2.04** |
| **sage** | **2.04** |
| **dusk** (vs `bg-surface`) | **2.17** |

`linen` drew the edge of every card, badge, tier and code well in the well's own
hex. Every test in the repository was green, because every test that has ever
measured a border measured it as a defence for a pair of fills that were not in
trouble.

The count is worth stating plainly because two documents have it wrong. 0204 and
`hairline()`'s docstring both say *"four of the eight starter palettes"* and
*"three of the eight"*; `STARTER_PALETTES` has **twenty-one** members, and the
failing set is **eight**. Those two are the primitives lane's files and are filed
rather than edited here.

## Decision

**A slot the library draws as a line is a promise in its own right, and it is
measured against every ground it is drawn on.** Three parts.

**1. The declaration.** `PALETTE_MARK_GROUNDINGS` names each border tier, the
grounds the library draws it against, and where. Declared rather than derived,
for the reason `PALETTE_PEER_PAIRINGS` is: a probe can see that `.loom-card` sets
`border-color`, and nothing in the rule says the border is *meant to be seen*
rather than to be the far side of a fill.

**2. The instrument.** `auditMarkGroundings` measures every declared mark against
every one of its grounds and reports the ones under the floor. It is a separate
function from `auditSeparation` rather than a fourth bucket inside it, because
the two ask different questions of different shapes of declaration and a host may
reasonably assert one and not the other: **a palette may want two fills to be
equal, and no palette wants a line it cannot see.** A colour it cannot measure
counts as a line it cannot find, which is the direction `MeasuredPeer` already
takes for a mark it cannot read.

**3. The derivation solves the subtle tier instead of picking it.**
`derivePalette` set `border-subtle` at a fixed lightness two points from the muted
well, which is why this is systemic in the eighteen palettes that function
produced rather than a mistake somebody made once. `solveMarkLightness` searches
for the lightness **nearest** the one it was given that clears the target against
every ground — the opposite of `solveLightness`, which takes the furthest the bar
allows, and for the mirror of its reason: an ink has to be *read*, and a line only
has to be *found*, so a border dragged further than it needed is the next tier up.

The two numbers are deliberately different. `separation.ts` asserts **2.3**,
because that is the published threshold and a repository should not assert a
number it invented. `derive.ts` aims at **3.0** — the floor plus a margin, written
as `JUST_NOTICEABLE_DIFFERENCE + MARK_MARGIN` so moving the threshold moves the
target — because a slot solved to exactly the floor drops under it the first time
somebody nudges a background by a value. That is the same split `TARGET =
TEXT_CONTRAST_MINIMUM + MARGIN` already makes for ink.

## Consequences

- **Eight `border-subtle` literals changed**, one per failing palette, each
  solved to the nearest lightness clearing 3.0 against all three grounds:
  `editorial` `#efefe9`→`#e8e8df`, `paper` `#f1ebe4`→`#efe8e0`, `sage`
  `#e7eee7`→`#e4ece4`, `citrus` `#f2f1e3`→`#f0efde`, `graphite`
  `#ebeaea`→`#e8e6e6`, `clay` `#f1ece5`→`#ebe4db`, `linen` `#f0ede5`→`#eae6da`,
  `dusk` `#232234`→`#252437`. Nothing else in any palette moved.
- **`bold` and `harbour` were left alone**, at 2.49 and 2.69. They clear the
  floor the audit asserts and this run did not repaint a palette that works. The
  margin is what a *new* palette starts with, not a reason to move a shipped one.
- **The subtle-to-default gap narrowed on two palettes**, from about 5.9 to 2.97
  on `clay` and 2.70 on `linen`, because on those two the direction that gains
  separation from the well is toward the default tier. Both still clear the floor,
  and a test now holds the whole ramp to it. Whether the tier ought to offer
  something between `border-default` (ΔE 4 to 15 from its grounds) and
  `border-strong` (74 to 98) is the open half of the finding and is not answered
  here.
- **The `also-marked` docstring now says what the code does** and points at where
  its old promise is actually kept. A docstring stating a claim the predicate does
  not make is how this survived five weeks.
- **Every derived palette clears the floor at every hue**, in both modes, asserted
  at 24 hues rather than at the one that was noticed.
- **Eight names are added to the published surface**, so
  `reference.generated.json` is regenerated. That file is the documentation lane's
  and is a generated ledger of this package's exports; the generator is the source
  of truth and the test that failed named the command to run.

## Alternatives considered

**Add the row to `PALETTE_PEER_PAIRINGS` as a `colour-only` peer.** What the
finding literally suggested, and it is one line. Rejected because it declares
something the library does not claim: a card's edge is not something a reader is
meant to *tell apart* from the fill inside it — 0204 is explicit that the fill is
what reads as the card and the edge only has to stop it. Encoding "this line
should be findable" as "these two things mean different things" would make the
pairing list mean two things, and the first thing to go would be the rule that
nothing in it may be demoted.

**Assert it inside `auditSeparation`, as a fourth bucket.** One audit, one call,
one thing for a host to remember. Rejected because the two claims are not
co-extensive and a host has a real reason to want one without the other:
`minimal` deliberately makes `bg-surface` its `bg-canvas`, so the fills-are-equal
case is a palette exercising a choice, while a line nobody can see is never a
choice. Folding them together would also have meant a fourth field on
`PaletteSeparation` and a fifth on `PeerPairing` to carry the grounds.

**Raise `border-subtle` far enough for a standalone rule.** 0204's own rejected
alternative, rejected again for its reason: the token is correct for the two
thirds of its uses that are box edges, and raising it that far coarsens every
card in the library. What this does is a different magnitude — moving a line from
*absent* to *barely perceptible*, one to three ΔE — which is what the token
already claimed to be.

**A `rule` slot in the palette.** Name the thing directly, so a standalone
hairline has its own colour. Still the right shape if `border-default` ever turns
out to be wrong for some palette rather than for some ground, and still an
escalation: eight registered palettes and every host palette would have to answer
a schema change, for a gap the existing tiers fill. Left where 0204 left it.

**Fix the eighteen literals and leave the derivation.** The smallest diff, and it
would be green. Rejected because it leaves the trap armed: the next palette
derived from a hue lands two points off its muted well again, and the next person
to hit it has this table to rediscover. The palettes are the source of truth and
the tool is how a new one is made — a tool that reliably makes a broken one is
worth fixing even when nothing currently calls it.

**Solve `border-default` and `border-strong` too, for symmetry.** Rejected as
refinement: both measure 4 to 15 and 74 to 98 from every ground at every hue the
derivation produces, so solving them would change eighteen palettes to land on
the values they already have. The docstring on the solved slot says which
function to reach for if that stops being true.
