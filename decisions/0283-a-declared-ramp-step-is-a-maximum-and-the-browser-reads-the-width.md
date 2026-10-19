# 0283. A declared ramp step is a maximum, and the browser is what reads the width

**Status:** Accepted
**Date:** 2026-10-15
**Section:** §4b (the theme)

## Context

`Loom marketing` filed it on 13 October, measured with a camera because no other
instrument in this repository can see it: **the one surface built entirely in
Loom is the one that does not fit a phone.** At 390px the front door's headline
is given a 254-pixel column — 35% of the screen is gutter — and set at the font
pack's top step, which is 72px under two packs and 88px under a third. Three
characters a line. Neither button in the hero is on the first screen under any
palette. The same page at 1280 is correct, and every overflow measurement
passes.

The comparison in that entry is what makes it a framework finding rather than
one lane's composition. Same build, same browser, same 390 pixels:

| page at 390 | how its chrome is built | the `h1` |
| --- | --- | --- |
| `/docs`, `/lessons` | hand-written React | x 20, **350 wide**, 48–49 tall |
| `/`, `/how-it-works` | composed primitives | x 68, **254 wide**, 148–247 tall |

Every surface written by hand gives a phone a 20-pixel gutter and a headline
sized for the screen. Every page composed out of registered primitives gives it
a 64–68 pixel gutter and a desktop headline.

**Nothing in a tree can reach it, and that is correct rather than a gap.**
`--loom-scale-1…8` and `--loom-spacing-1…8` were emitted as pixels from the
pack's `scaleRamp` and the preset's `spacingScale`, and a `LoomTree` has no
viewport: there is no prop, no theme and no node that means *smaller on a
phone*. There must not be one — a render is a pure function of one node
([0008](0008-the-renderer-is-a-total-pure-projection.md)), so a primitive handed
a width would make the same tree a different page. The surface's own stylesheet
cannot do it either: `(marketing)/globals.css` is forbidden from declaring type,
spacing or any `--loom-*`, with a test holding the rule, because a second source
of truth is what the re-theme guarantee
([0049](0049-a-theme-is-three-ids-in-the-tree.md)) cannot have. That rule is
right and this record does not weaken it.

So the question is only ever **where the width may be read**, and this
repository has already answered it once.

## Decision

**A number a pack declares is a maximum. It is reached at `48rem` and held
above it; below that the step is compressed toward the largest value its
quantity can hold on a phone.** `themeVariables` emits, per step, either the
plain pixel length it always did or

```
clamp(<floor>px, <coefficient>cqi, <declared>px)
```

[0079](0079-a-layout-css-alone-can-express-belongs-in-the-stylesheet.md) drew
this line for `loom.mosaic` and drew it in the right place: *no viewport in the
render function*, and a rule in CSS is not in the render function. A `clamp()`
is the same bargain one step earlier, and it keeps the three properties 0079
rests on. The markup does not change — one tree renders one string of HTML at
every width. Nothing is interpolated — a proposal cannot reach the floor any
more than it can reach the mosaic's breakpoint. And `themeVariables` is as pure
as it was: the same theme yields the same strings, so two requests for one
revision still cannot disagree about what the page looks like.

It is **not** a second breakpoint, which 0079 set a deliberately high bar for. A
`clamp()` has no breakpoint in it; `48rem` is named because it is the width the
library already switches `loom.mosaic` on, and reusing it is the whole reason to
prefer that number to a better-looking one.

Three constants, each derived from something already in the repository rather
than chosen:

- **The width, 768px.** 0079's `48rem`, above.
- **The compression, 0.46.** `loom.heading` caps its top two steps at `11cqi`
  and `9cqi`, numbers `Loom primitives` reached on 20 August by photographing
  which words lost their last letter on a 390px screen. `0.46` is the ratio that
  **reproduces that cap from the pack's own number** — a 72px step floors at
  42.84px where `11cqi` is 42.90px. A figure one lane found by measuring one
  pack is now derived for every step of every pack, including the ones nothing
  has photographed.
- **The holds, 18px for type and 8px for space.** Type holds at 18 because step
  3 is body copy in every registered pack and step 4 is 17–20: a ramp that
  shrank those would trade a headline that does not fit for paragraphs nobody
  can read. Space holds at 8 because whitespace has no legibility floor, only a
  floor at which a gap stops reading as one.

**The unit is `cqi` rather than `vw`**, following `loom.heading` for the reason
it recorded: with no ancestor declaring containment `cqi` resolves against the
small viewport, so a step on the open page behaves exactly as it did, while a
step inside a `loom.card` or one half of a `loom.split` is held to the column it
is actually in, because those declare the containment for it to read.

**A medium with no cascade gets the declared numbers.** `themeVariables` takes
`{ ramp: "fixed" }`, and a render asked for `themeValues: "literals"` passes it
— for the root's declarations as well as for the values substituted beneath
them, so the two cannot disagree. An image renderer and an email body resolve a
container unit exactly as poorly as they resolve a `var()`
([0050](0050-the-runtimes-props-are-namespaced-and-the-root-mounts-the-theme.md)),
so a `clamp()` there is strictly worse than the pixel it replaced, and silently
so.

## Consequences

- **Nothing changes at or above 768px.** A reader on a laptop sees the ramp the
  pack declared, to the pixel, which is what makes this reviewable: the only
  pictures that move are the narrow ones.
- **Every surface gets it at once, and no tree changes.** No primitive is
  touched, no pack is retuned, no registered id moves.
- **A pack's declared numbers now describe its widest rendering**, not its only
  one. `font-packs.ts` describes ramps as *dramatic*, *editorial* and
  *functional* by their top step; those descriptions are still true, and are now
  true of a wide screen specifically.
- **`loom.heading`'s `CAP_FOR_STEP` is redundant**, and harmlessly so — its
  `min(var(--loom-scale-8), 11cqi)` now wraps a clamp that is already at or
  below the cap at every width, which is the case that file's own comment
  predicted when it wrote *"a pack whose step 8 is already a clamp is simply a
  ramp that wins here at every width."* Removing it is `Loom primitives`' and is
  filed, not taken.
- **It does not close the finding on its own.** The hero needs to lose about 290
  pixels to put its first button above an 844-pixel fold; this gives back the
  column and most of the headline, and what remains is the hero's own inset,
  which is `Loom primitives`'. The entry stays open with its measurements
  updated.
- **A step is now two numbers and a unit rather than one number**, so anything
  parsing a mounted variable back into a length has a case it did not have. One
  thing does — `inline-variables.ts` — and it is handed the fixed ramp instead.

## Alternatives considered

**A second ramp per pack, declared for a narrow viewport, emitted behind a media
query.** More honest about what a pack is choosing, and the shape to reach for
if a designer ever wants a phone to read differently rather than smaller.
Rejected for now because it is four starter packs and seventeen additional ones
to retune by hand, it is a schema change to `fontPackSchema` that every
registered pack depends on, and it buys nothing this does until somebody has an
opinion a proportional shrink cannot express. Available later: a pack declaring
one ramp is then a pack whose two ramps agree.

**Shrinking the inline padding only, in `loom.page` and `loom.hero`.** The
cheapest of the three shapes the finding named, and the one that is not this
lane's. Rejected as the primary fix because it buys the 48 pixels of column and
leaves the headline at 72px, so it does not fix the fold — and because doing it
per primitive puts the same arithmetic in every container that insets anything,
where this puts it once.

**A fluid ramp keyed on the step's index** — steps 7 and 8 fluid, the rest
fixed. Simpler to write and wrong across the library: a functional pack tops out
at 42px and a dramatic one at 104, so an index rule over-shrinks the pack that
already fits and under-shrinks the one that does not. The hold makes the rule
key on **what a step is** rather than where it sits, which is why a 42px top
step compresses to 29 and a 104px one to 57.

**Leaving the per-step caps in `loom.heading` as the whole answer.** They are
what shipped on 20 August and they are why this is a finding about a column
rather than about clipped words. Rejected as sufficient: they cover two steps of
one primitive, they cannot see spacing at all, and a lane reading them has no
way to learn that the ramp beneath is still fixed. The caps were the right small
fix and this is the one they named.

**Emitting `clamp()` for every step, including body copy.** One rule, no hold,
no constants to justify. Rejected on arithmetic: with the ramp reaching full
size at 768, a 16px body step resolves to 8.1px at 390. The hold is not a
refinement of this option, it is the thing that makes a proportional rule safe.
