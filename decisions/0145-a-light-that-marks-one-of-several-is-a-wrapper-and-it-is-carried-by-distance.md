# 0145. A light that marks one of several is a wrapper, and it is carried by distance rather than by colour

**Status:** Accepted
**Date:** 2026-09-13
**Section:** §4b

> **Why this number.** The highest record on `main` is `0139`, and `0140`–`0144`
> are left free deliberately, which
> [0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)
> permits in as many words. Several lanes have branches open that can each claim
> the next free number without seeing the others; a clash is fatal to every
> lane's `pnpm verify` and a hole costs one line in the index. This is the same
> reasoning [0130](0130-atmosphere-is-a-wrapper-and-the-paints-are-one-vocabulary.md)
> recorded for its own gap.
>
> **Why `Accepted`.** It decides where a thing that did not exist lives, what it
> is called, and which existing records govern it. It refines no `Accepted`
> record, changes no schema, and touches neither the tree nor the delta model —
> it is [0110](0110-an-entrance-the-reader-drives-is-a-wrapper-not-a-prop-on-every-band.md)
> and 0130 applied to their third member, which 0130's consequences ask for by
> name.

## Context

The maintainer's standing brief for this library is a breadth mandate and a
quality mandate, and the quality half is one sentence: *"when we demo this it
really needs to pop."*

Ninety-one primitives in, **nothing could make one card matter more than the
card beside it.** A pricing band draws three tiers that are typographically
identical. `loom.card`'s `tone` offers `surface`, `outline`, `accent` and
`plain`, every one of which says *this is a card* rather than *this is the one*.
A page could put "Most popular" in a `loom.badge`, and the words were the whole
of it — no glow, no lit border, no ring on the featured tier.

This is the second half of the gap 0130 opened and named. That record gave a
*band* weather and stated in its consequences that its category now had *"two
members and a shape... the third member — something that pins, parallaxes or
holds — argues against this record and 0110 together."* The 12 September report
for this lane named the missing member precisely and left it for the next run.

Two things about that gap are worth stating, because they are what made it
invisible rather than merely unbuilt:

- **It is not a content model**, so `docs/hermes-port-map.md` could never show
  it — the same blind spot 0130 documented, arriving a second time.
- **It is a property of a set rather than of a node.** Every other treatment in
  this library is something one primitive is; *being the one among several* is
  a relationship, and nothing in the library expressed relationships at all.

## Decision

**A light that marks one item among several is a wrapper primitive**,
`loom.halo`, which takes a light and children, draws around them, and renders no
content of its own. **The lights are a closed set of three** — `ring`, `trace`,
`glow` — held to 0130's membership test. **The rims are carried by distance
rather than by colour.**

Four things are part of the decision rather than consequences of it.

**It is 0110's and 0130's argument, and both asked for this.** The alternative
was `featured: true` on `loom.tier`, `loom.card`, `loom.feature`,
`loom.offering`, `loom.product`, `loom.person` and everything else that can be
one of several — a prop on dozens of schemas to say one thing, the cost
[0014](0014-the-reply-schema-must-fit-a-grammar-budget.md) keeps naming, and
still unreachable for the card nobody thought to give it to, **including every
primitive a host registers itself**.

**The geometry is the opposite of a backdrop's, and that is why it is not a
sixth paint.** 0130 states that a backdrop cannot bleed past its own box,
because it clips. A halo's entire job is the other side of that edge: `glow`
paints outside the box and the rims stand off it. `loom.halo` therefore sets no
`overflow: hidden`, which is the one line `loom.backdrop` could never drop. It
also inverts that file's second documented trap — *"a field hangs inside its
band, not off the corner"* — for the same reason read backwards: with no clip,
negative insets are correct rather than ruinous.

**The rims stand four pixels off the edge they light, and this is load-bearing
rather than styling.** Drawn flush, a rim is a 2px gradient laid exactly over
the card's own 1px border. Under `bold` that is yellow-to-red on black and it is
the brightest thing on the page. Under `editorial` — whose two accent slots are
both a muted slate, and whose cards already carry a dark border — it is a
slightly thicker dark line, correct by every assertion and **not
distinguishable from the unlit tiers beside it**, which is the one thing the
primitive exists to do. Colour cannot fix that, because the palette is the thing
with no chroma to give and
[0131](0131-what-a-palette-cannot-say-about-itself-is-measured-from-it.md)'s
subject is exactly that a primitive cannot know. Distance can: pulled out, the
rim is separated from the card's edge by a strip of the page's ground, so a
reader sees *two boundaries* rather than one heavier one — which reads in
greyscale, in print, and under the quietest palette anybody registers.

**No label prop.** "Most popular" is content, content is a node
([0052](0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)), and
`loom.badge` already draws it. A halo draws the eye; a badge says why.

## Consequences

- **0110's category has three members and the shape holds.** A primitive that
  renders no content, wraps anything, and adds one treatment. A fourth argues
  against all three records together.
- **A page can now say which one it means**, on any band including a host's own,
  and take it back with a `remove` rather than by hunting for the prop that
  turns it off.
- **Two nodes that draw nothing** are the cost — 0110's and 0130's, accepted
  again for the same reason.
- **`trace` is the closest call in the set**, and it passes because the
  difference a reader sees is *movement* rather than brightness, which is a
  difference in kind. The cheap alternative — a boolean `animate` beside `ring`
  — is the prop
  [0055](0055-motion-is-a-static-stylesheet-the-primitive-emits.md) exists to
  refuse. Under reduced motion it is a lit rim that does not travel, never an
  unlit one.
- **`glow` dropped the crisp rim it was first written with.** With a hard line
  at its own edge it was `ring` with a blur behind it rather than a third
  thing — 0052's shades-of-one mistake — so the bloom carries it alone.
- **A wrapper has to be transparent to stretching**, and this one was not until
  a photograph said so: a halo between a stretched grid cell and a card absorbed
  the stretch, so the rim hugged the cell and the card ended short of it. The
  root takes `height: 100%` and passes it on with `grid`. Any future member of
  this category inherits the same obligation.
- **Only `glow` is still carried by chroma alone**, and it is allowed to be
  quiet on a quiet palette, because a bloom has no job on a page where nothing
  else is bright either.
- **A halo cannot know it is one of several.** Nothing in a render reads a
  node's siblings ([0008](0008-the-renderer-is-a-total-pure-projection.md)), so
  a page that lights all three tiers gets three lit tiers and no complaint. The
  relationship is the author's claim, and this primitive is only the means to
  state it.

## Alternatives considered

**A sixth `loom.backdrop` paint.** The cheapest change, and it cannot express
the thing: every paint is clipped to its own box by the `overflow: hidden` a
backdrop needs, so neither a bloom outside the edge nor a rim standing off it
survives. Rejected on geometry rather than on taste.

**`featured: true` on every band that has items.** The obvious reading of the
gap. Rejected for 0110's and 0130's reason, with one this case adds: *which* of
several is featured is a fact about the set, and a boolean on each item lets a
page mark all of them, which is the same failure the wrapper has but without the
wrapper's honesty about being an authored claim.

**A `strength` or `intensity` number.** Would have made the `editorial` problem
look solved by letting a page turn the rim up. Rejected because it is the "tune
it a bit" prop that turns a reviewable choice into a value nobody reads in a
proposal, and because it answers the wrong question: the rim was not too faint,
it was in the wrong place.

**Lighting the card from inside `loom.card` with a new `tone`.** One prop on one
primitive, and it would have covered the pricing case. Rejected because the tier
that wants marking is a `loom.tier` or a `loom.offering` or a `loom.person` as
often as it is a card, and a `tone` on each is the prop-on-every-schema cost
again, one primitive at a time.
