# 0130. Atmosphere is a wrapper primitive, and the paints are one shared vocabulary

**Status:** Accepted
**Date:** 2026-09-11
**Section:** §4b

> **Why this number.** `0126` through `0129` are skipped deliberately, which
> [0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)
> permits in as many words. The highest record on `main` is `0102`; this branch
> already carries `0106`, `0110`, `0115`, `0120` and `0125`, and thirty-odd pull
> requests have been open since 1 September, every one able to claim the next
> free number without seeing the others. A clash is fatal to every lane's
> `pnpm verify`; a hole costs one line in the index.
>
> **Why `Accepted`.** It decides where a thing that did not exist lives, what it
> is called, and which of two existing records governs it. It refines no
> `Accepted` record, changes no schema, and touches neither the tree nor the
> delta model — it is
> [0110](0110-an-entrance-the-reader-drives-is-a-wrapper-not-a-prop-on-every-band.md)
> applied to its second member, which that record asked for by name.

## Context

The maintainer's standing brief for this library is a breadth mandate and a
quality mandate, and the quality half is one sentence: *"when we demo this it
really needs to pop."*

Eighty-nine primitives in, **exactly one of them could paint anything behind its
content.** `loom.hero` has carried a `backdrop` prop since the first week —
`aurora`, two drifting colour fields, and `grid`, a ruled ground that fades
before it reaches the copy — written inline in `loom.hero.ts` where nothing else
could reach it. Every other band on a Loom page had `loom.section`'s `tone`:
three flat washes, `bg-canvas`, `bg-surface`, `accent-subtle`.

So a Loom page's first screen looked like a product and the eight bands beneath
it looked like a document.

**This gap was invisible from the ledger that was being used to measure
breadth.** `docs/hermes-port-map.md` counts Hermes blocks, Hermes was a
creator-profile toolkit, and atmosphere is not a content model — there is no
block to port, so there is no row to be missing. The ledger closed on
8 September with every "to build" table empty, and three consecutive runs read
the remaining mandate as *find a ninetieth content model*, each went looking,
and each came back with a definition list. The range that was actually missing
was a **surface**, not a shape. The same blind spot hid a second absence of the
same kind: across eighty-nine primitives nothing could put a word on top of a
picture — `loom.card` puts media above, `loom.split` beside, `loom.media`'s
caption below, and `loom.frame` and `loom.orbit` each superimpose only over a
thing they own.

## Decision

**Atmosphere is a wrapper primitive, not a prop on every band.** `loom.backdrop`
takes a paint and children, paints behind them, and draws nothing of its own.
**Superimposition is a second wrapper**, `loom.overlay`, whose ground is a slot
and whose children are what sits over it. **The paints are one vocabulary in one
module**, `src/primitives/backdrop.ts`, read by both `loom.backdrop` and
`loom.hero`.

Four things are part of the decision rather than consequences of it.

**It is 0110's argument, and 0110 asked for this.** That record's consequences
say the library gained its first primitive that renders no content, that this is
a category, and that *"the next member of it should be argued against this record
rather than invented beside it."* The argument transfers unchanged: the
alternative was a `backdrop` prop on `loom.section`, `loom.split`, `loom.mosaic`,
`loom.tier-table` and everything else a band can be — a prop on seventy schemas
to say one thing, which is the cost
[0014](0014-the-reply-schema-must-fit-a-grammar-budget.md) keeps naming — and it
would still be unreachable for the band nobody thought to give it to, **including
every primitive a host registers itself.** It adds one reason 0110 did not have:
a page rarely wants atmosphere around exactly one band, and a wrapper can hold
three sections so the light runs behind all of them, which no prop on a band can
express.

**`loom.hero` keeps its own prop, and that is not compatibility.** A hero's paint
sits inside the hero's padding and is clipped by the hero's own edges; a wrapper
is outside both. Two primitives legitimately want the same five paints applied
differently, which is precisely the case for extracting the paints rather than
choosing between the two callers.

**The paints are a closed set whose membership test is perceptual.** Five:
drifting colour fields, a ruled blueprint, a lattice of points, beams from above,
one pool of light. The test each had to pass is *a reader tells it apart from the
other four at a glance* — not *it is a different number*. A sixth that was an
existing paint at a lower opacity would be
[0052](0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)'s
shades-of-one mistake in the one part of this library with room for it. There is
no `none`: a backdrop painting nothing is a node that draws nothing, and `remove`
says that better than `configure`.

**The scrim uses the palette slot it is honestly allowed to use.** Text on a
photograph wants a dark wash and light type, and **this theme model cannot say
"dark"**: `bg-overlay` is a *surface*, `#ffffff` under the light palettes and
`#1a1a1a` under the dark ones. So the scrim is `bg-overlay` used as what it is —
the page's own overlay surface at less than full opacity — and the content takes
`fg-default`, the foreground that slot is guaranteed to pair with. A hard-coded
black would render one page correctly and break
[0049](0049-a-theme-is-three-ids-in-the-tree.md) for every other palette.

## Consequences

- **0110's category now has two members and a shape.** A primitive that renders
  no content of its own, wraps anything, and adds one treatment. The third
  member — something that pins, parallaxes or holds — argues against this record
  and 0110 together.
- **Two nodes that draw nothing** are the cost, the same one 0110 accepted, and
  here it buys atmosphere that is reachable on any band including a host's own.
- **A page can say the same thing two ways.** `loom.hero` with `backdrop:
  "aurora"` and a `loom.backdrop` wrapped round a `loom.section` produce the same
  light by different routes, and nothing stops both on one page. That is the real
  cost of a wrapper over a prop — a prop could have been made exclusive — and it
  is accepted for the reason above.
- **A backdrop cannot bleed past its own box**, so the full-width glow behind a
  narrow section is a backdrop around that section's *parent*. Nothing in a
  render reads a viewport or a page width
  ([0008](0008-the-renderer-is-a-total-pure-projection.md)), so there is no
  honest way to express "wider than me" from inside.
- **A genuinely dark cinematic scrim under a light palette is not expressible**,
  and that wants a palette slot meaning "dark whatever the palette is". Filed as
  a finding rather than faked with a literal.
- **The breadth mandate had a blind spot, and it was the measuring instrument.**
  A port ledger counts what the source product had. Reading it as a measure of
  the library is what made three runs conclude the range was finished while a
  page still had no weather and no word on a picture. The gaps that have mattered
  most in the last six runs have all been outside that ledger, which the document
  itself already says in its own words.

## Alternatives considered

**A `backdrop` prop on every band.** The obvious reading of the gap, since
`loom.hero` already had one. Rejected because it puts the same enum on dozens of
schemas and makes every band that grows atmosphere grow it independently — the
condition that left the paints written inline in `loom.hero.ts` where nothing
else could reach them. A wrapper is one primitive a page composes rather than a
prop every primitive has to carry.

**More `tone` values on `loom.section`.** The smallest change, and it answers the
wrong question. `tone` picks a flat wash from the palette; atmosphere is a
rendering with its own geometry and motion. Widening an enum of washes until it
covers drifting colour fields would make one prop mean two unrelated things.

**A ninetieth content model.** What three consecutive runs in this lane actually
did, each reading the breadth mandate off `docs/hermes-port-map.md` and each
returning with a definition list. Rejected because the ledger cannot show this
gap: it counts Hermes blocks, Hermes was a creator-profile toolkit, and
atmosphere is a surface rather than a shape — there is no block to port, so
there is no row to be missing.

**One wrapper for both jobs.** Painting behind content and putting words over a
picture are close enough to look like one primitive. They are kept apart because
their grounds differ in kind: a backdrop's ground is a paint this library
defines, and an overlay's is a slot the page fills with anything at all.
