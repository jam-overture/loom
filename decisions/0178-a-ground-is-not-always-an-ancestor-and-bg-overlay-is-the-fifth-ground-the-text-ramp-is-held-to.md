# 0178 — A ground is not always an ancestor, and `bg-overlay` is the fifth ground the text ramp is held to

**Status:** Accepted
**Date:** 2026-09-21
**Section:** §4b — the palette contrast bar and the derivation behind it

## Context

Two findings from `Loom primitives`, four days apart, say the same thing about
one palette slot and were both owned by this lane:

- **4 September.** *`bg-overlay` is a slot every palette must declare and
  nothing paints, so the first primitive that floats cannot use it.* `loom.pin`
  wanted the slot, could not have it because `PALETTE_TEXT_PAIRINGS` carries no
  row for it, and shipped on `bg-surface` instead. The finding's sharper half:
  **a slot every palette must declare and no primitive reads is a slot whose
  contrast nobody checks and whose value nobody can be wrong about.** Two ways
  out were offered — add the row, or retire the slot — with no preference.
- **8 September.** A second would-be consumer. `loom.listing`'s flags sit over
  a photograph with nothing behind them but the badge's own tone, which is
  transparent for one of its three.

A third arrived on 20 September, from this lane's own previous run: a dialog's
scrim is a third consumer, and two was the threshold the second entry named for
acting.

**All three of those are wrong about the premise, and were from 15 September.**
`loom.overlay` shipped that day and paints `bg-overlay` on the scrim behind
every headline it sets over a photograph. Nothing noticed, because the one
instrument that would have — `registryPairings`, which derives what the library
paints and fails the build when the declared list falls behind it — cannot see
that particular shape.

### Why the derivation could not see it

`collectPaint` walked the tree carrying **one** value down: the ground in
effect. It recorded a pairing at the element that set `color`, against the
nearest background painted above it. That reads an ancestor chain, and CSS is
two walks rather than one:

- `color` **inherits down**, so the ink over a ground may have been declared
  several levels above it;
- a background is painted on **the box behind the glyphs**, which is an
  ancestor only when nothing is stacked in between.

`loom.overlay` breaks both halves at once. The ink is `fg-default` on the root,
which paints no ground and was therefore recorded as *floating*. The ground is
`bg-overlay`, painted by a scrim in grid cell `1 / 1` at `zIndex: 1`. The words
sit in the same cell at `zIndex: 2` and declare no colour of their own. Every
one of them renders in `fg-default` on `bg-overlay`; read as an ancestor chain
the two ends never meet.

So the slot appeared in no pairing, no child ground and no `groundsOutsideTheRamp`
entry. `auditPalette` answered `failures: []` for a surface the library writes
on — and an empty `failures` is exactly what a clean palette answers with.

## Decision

**Two values travel down the tree: the ground in effect and the ink in effect.**
A pairing is recorded wherever either arrives under the other, so an ink
declared above a ground painted below it is now seen. An element that changes
neither repeats its parent's pairing and is not recorded again.

**Siblings that declare the same `gridArea` are one stack, ordered by
`zIndex`, and an element's ground is the nearest member below it that paints
one.** Nearest rather than bottom-most: a scrim over a photograph over a card is
three layers and the words sit on the scrim.

**A ground answers for an *inherited* ink only where something can be written on
it.** An element with no children is a shape, not a surface. `loom.frame` draws
its camera notch as an empty `span` filled with `fg-default` and `loom.message`
its typing dots with `fg-muted`; counting those produced `fg-muted` on
`fg-muted` — 1.00:1 in every palette that will ever be written, for a pair no
reader can meet, which is precisely the row the declared list refuses to carry.
An ink a component *declares* is recorded either way, because the component
said it.

**Stacking is read from `gridArea` and from nothing else.** An absolutely
positioned sibling also lies under its neighbours, and whether it lies under
*all* of them is a question about an arbitrary length expression —
`inset: calc(-1 * 4px)` is `loom.halo`'s — which no reading of the string
answers. A grid area is a name two elements either share or do not. Neither
`loom.halo` nor `loom.backdrop` paints a palette slot under its content today,
so the narrow rule costs nothing real and the wide one would have been a guess.

**`bg-overlay` joins `PALETTE_TEXT_GROUNDS`, which now holds five.** It is a
ground a primitive places arbitrary children on, the way `bg-surface` is, and
not one where the primitive has answered the ink itself the way `loom.action`
answers `accent`. Holding the ramp to it costs no palette anything measurable
and is the only thing that makes the slot mean something.

**Of the two ways out the 4 September finding offered, this takes the first —
add the row — and the reason is no longer a preference.** The slot is painted,
by a primitive that shipped six days after the finding was written. Retiring it
would now mean deleting a surface the library renders.

## Consequences

- `PALETTE_TEXT_PAIRINGS` gains five rows: one `painted` —
  `fg-default` on `bg-overlay`, at `loom.overlay content over its scrim` — and
  four `composed`, which is every floating ink on the new ground.
- **A host palette that reads *overlay* as a dark wash now fails the painted
  bar.** It is the intuitive misreading for anyone who has written a modal, it
  renders dark ink on a dark veil under a light page, and `paletteSchema` sees
  nothing but a valid colour. Pinned as a test.
- **The bar is vacuous on Loom's own palettes and that is recorded rather than
  glossed.** All twenty-one starter palettes set `bg-overlay` to the same value
  as `bg-surface`, so every new row measures what its `bg-surface` twin already
  measured. The point is the host's palette, not ours. Filed as an open
  question for whoever decides whether `derivePalette` should give the slot a
  value of its own.
- `loom.pin` can take the token it wanted since 4 September, and a listing's
  flags have a measured ground to sit on. Both are `Loom primitives`' to make.
- One existing row grows: `loom.credential` paints a `bg-surface-muted` mark
  box under an inherited `fg-default`, which the ancestor-only walk missed for
  the same reason at one level less depth.
- A primitive that stacks a palette-slot ground under its content now brings
  the pairing with it, which is the promise the derivation was written to make
  and was quietly not keeping.

## Alternatives considered

**Retire the slot.** The 4 September finding's second option, and defensible on
the day it was written: seventeen slots a host must supply, one of which changed
no pixel. It is no longer available without deleting `loom.overlay`'s scrim.

**Add the row by hand and leave the derivation alone.** One line, and it would
have passed every test in the repository. It also re-creates by hand exactly the
drift the derivation exists to prevent — a list a person maintains beside a
library — and it would have left the *next* stacked ground as invisible as this
one was. The finding that a hand-kept list goes nine pairings stale is the
reason `registryPairings` exists at all.

**Infer a stack from absolute positioning as well.** More of the truth, and the
part of it that cannot be read without guessing. An inset is an expression; a
grid area is a name. Rejected for the reason `contrastRatio` declines a colour
it would have to parse, and stated as a limit in the module rather than left to
be rediscovered.

**Treat `bg-overlay` like `accent` — a filled ground whose primitive answers its
own ink.** True of the overlay's own first line, which is `fg-default` by
declaration, and false of everything a model puts inside it. A card sets
`fg-default` too and is still a ground the ramp is held to, for the same reason:
the children are not the primitive's to colour.

**Record a pairing for every ground under an inherited ink, empty boxes
included.** Simpler, one condition shorter, and it fails every palette on
`fg-muted` on `fg-muted` — a bar chosen by an accident of how a dot is drawn.
