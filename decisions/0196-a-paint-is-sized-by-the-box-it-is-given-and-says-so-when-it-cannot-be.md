# 0196. A paint is sized by the box it is given, and says so when it cannot be

**Status:** Accepted
**Date:** 2026-09-27
**Section:** §4b

## Context

[0130](0130-atmosphere-is-a-wrapper-and-the-paints-are-one-vocabulary.md) made
atmosphere a wrapper and gave it five paints. `backdrop.ts` then wrote down the
rule those five are built on, and the rule is right:

> **A paint is brightest at the middle of its band and reaches nothing at every
> edge**, because a backdrop cannot know whether its band is the top of a page
> or the fifth thing down it.

That rule is about **where** a paint is bright. It says nothing about **how big**
the bright part is, and three of the five answered that second question with a
number that was not the box's.

On 20 September this lane filed *a paint needs area: every `loom.backdrop` paint
is unusable in a short band*, measured by putting each paint behind the four
figures of `metricsBand` — a 170-pixel strip — and photographing it. Its table
is five rows of prose and it named three possible answers, in order: size the
masks by the longer side; stop the ruled paints fading with the box; or accept
that **atmosphere requires area** and have the vocabulary say so. It said the
third was cheapest and might be right.

Read as one question it has no good answer. Read as five, it has three
different ones, and this record is that split.

## What was measured

An instrument rather than an opinion: the same page rendered twice — once with
the paint, once with the identical `loom.backdrop` wrapper painting nothing —
so a pixel diff is the paint and nothing else. Ink per unit area is the
coverage times the mean per-channel delta, which is comparable across paints in
a way that coverage alone is not.

Under `editorial`, at 1280 wide, a 468-pixel band against a 135-pixel strip of
the same content:

| paint | with room | in a strip | kept |
| --- | --- | --- | --- |
| `aurora` | 6.0 | 1.8 | 30% |
| `spotlight` | 6.7 | 5.9 | 88% |
| `rays` | 2.0 | 1.9 | 93% |
| `dots` | 0.35 | 0.57 | — |
| `grid` | 0.25 | 0.43 | — |

Two things in that table are not what the 20 September entry expected.

**`spotlight` barely moves.** Its pool is written as percentages of the box —
`ellipse 62% 78% at 50% 50%` — so it is already the answer, and nothing about
it needed to change. A paint written in the box's units adapts for free.

**`grid` and `dots` are an order of magnitude quieter than everything else at
both heights and under both palettes.** They were not failing because the band
was short. They were failing everywhere, and the strip is merely where a band
has nothing else on it to look at. That is a different defect wearing the same
photograph.

## Decision

**A paint is sized by the box it is given.** Where a paint's geometry can be
written in the box's own units, it must be, and a paint that is instead written
against one side of the box or against a fraction of one dimension is a defect
whether or not anyone has photographed the aspect that reveals it.

**Where it genuinely cannot be, the vocabulary says so in the primitive's
description**, which is the surface a model reads, rather than in a refusal.

Three consequences, one per paint that needed one:

- **`aurora`** masks its fields with `ellipse closest-side` rather than
  `circle closest-side`. The original comment argued for the circle on the
  grounds that *an ellipse becomes the box* — true of the **default** ellipse,
  which is `farthest-corner`, and not of `closest-side`, which is an ellipse
  inscribed in the field and transparent well before either corner. The third
  option was never tried. It is inert where the field is square, which is a hero
  at any usual width, so the case the paint was designed for is unchanged.

- **`rays`** puts the apex of its fan at `-10rem` rather than at `-20%`. A
  percentage in a conic gradient's position resolves against the element, so the
  apex sat 160 pixels above a hero and 34 above a strip — and an apex that close
  to a band 1280 wide fans its beams out almost horizontally, which is the
  *"grey starburst that reads as an artifact"* the finding named and which read
  as a fault under `bold` too, where there is chroma to spare. `10rem` **is the
  hero's own value**: `-20%` of the 800-pixel band these beams were drawn in.
  The designed case is unchanged to the pixel and every shorter band now gets
  the hero's fan.

- **`grid` and `dots` keep their geometry and the limit is stated.** A stride is
  a length; a band 170 pixels tall holds two rules of a five-rem grid, and two
  rules are not a blueprint however much contrast they are given. Sizing the
  stride to the band would make the blueprint a different blueprint at every
  height, which is the one thing a ruled ground may not be — what it is *for* is
  a stride a reader can count. So `loom.backdrop`'s description now ends *"the
  grid and dots need a band a few hundred pixels tall to read as a ground; the
  other three work at any height"*, and a model picking a paint is told.

**`spotlight` is unchanged**, and that it needed nothing is the evidence for the
rule rather than an exception to it.

## The separate defect the same measurement found

`grid` drew its lines in `border-subtle`, which on `editorial` is `#efefe9`
against a `#fafaf7` canvas — eleven values of one channel. It takes
`border-default` now, which is the 26 September audit's rule arriving at its
first case: **a border beside a fill may be subtle; a border that is the whole
mark takes `border-default`.** A ruled ground is nothing but its lines.
`border-strong` is the wrong end of the same ramp — near-black on `editorial` —
which is why the lattice takes it and the blueprint does not: a point covers a
fraction of the area a line does, and the `dots` comment had already said so
about itself sixteen days earlier without anyone reading it back onto its
neighbour.

The ruled mask also grew a **core**: it was `black 0%, transparent <reach>`,
fully opaque at the centre pixel and nowhere else, so the strongest line a
blueprint ever drew was three quarters of its own colour. A core holds the mask
open over the middle and fades on the same reach — still brightest at the
middle, still nothing at every edge. Measured over a text-free region of a
468-pixel band under `editorial`, the grid's strongest line went from 11 values
of a channel to 21, which is its token's full contrast and the most a mask can
honestly give it. The lattice takes no core, because its points are already at
88 and the same change would take a texture that is *"legible but noisy"* over
a band of figures and make it noisier.

## Consequences

**No sixth paint, and that is a result rather than a deferral.** The 20
September entry's third option — *leave a short band to the treatments that do
not need area* — implied a member designed for a strip. Three of the five work
in one now, so a sixth would have had to be told apart at a glance from
`aurora`, `spotlight` and `rays` in exactly the band where all three are
legible. That is 0130's membership test failing before anything is written.

**The instrument is the contribution.** `atmosphere-needs-area.specimen.ts`
photographs every paint in a band with room and in a strip with none, under both
starter palettes, adjacent and at the same width. The blank-wrapper control that
makes the numbers above possible is not committed — it is three lines and a
rebuild — and the method is written down here so the next run measures rather
than adjudicates between two adjectives.

**This does not touch the tree, the delta model or any accepted record.** No
prop is added, removed or changed; no node changes; every stored tree renders
with the same markup and a different stylesheet. `loom.hero` reads the same
vocabulary and gets the same fixes for free.

## Alternatives considered

**Query the band's height and switch geometry.** A backdrop cannot:
`container-type: size` requires a definite block size and a band's height comes
from its content, so declaring it would collapse the element it is meant to
measure. `inline-size` gives no `cqh`. This is a real wall and it is why the
answer had to be *write it in units the box already supplies*, which resolve
against the box with nothing declared.

**Raise `AURORA_OPACITY` instead.** It would have made two small smudges into
two darker small smudges. The defect was never the amount of colour; it was that
a circle in a wide short field is a circle with the field empty either side of
it, so the light was not even where its anchor said.

**Give the ruled paints a stride that scales with the band.** Rejected above: it
makes a blueprint that is a different blueprint at every height, and the stride
is the thing the paint is recognised by.
