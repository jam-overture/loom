# 0096. A container query is for what cannot be interpolated; a size that varies with width is a function

**Status:** Accepted
**Date:** 2026-08-28
**Section:** §4b

## Context

Four primitives in this library now want to know how much room they were given,
and the number is going up.

- `loom.marquee` caps an item's width in `cqi` rather than `vw`.
- `loom.mosaic` measures the **viewport**, which is the bug filed against it on
  21 August: a mosaic inside a `loom.split` column lays out as though it had the
  whole page.
- `loom.offering` declares `container-type: inline-size` and flips its frame
  from a column into a row past 40rem, which is how seven Hermes blocks became
  one primitive.
- `loom.episode` sizes its artwork against the row it sits in, so the same card
  is a 88px cover beside a title on a phone and a 224px still in a full-width
  list.

The 26 August report named the pattern and said a fourth primitive would arrive
with it. It has, and building it exposed that "measure your container" is two
different techniques that had been treated as one. `loom.offering`'s answer —
declare containment, emit an inner element for the rule to reach, write an
`@container` block in the stylesheet — is the one a run reaches for by
precedent, and for `loom.episode` it would have been three extra pieces of
machinery to express a number.

The cost of getting this wrong is not correctness, it is accumulation. Every
`@container` block is a rule in a shared stylesheet, an extra element in the
markup that is not a node, a threshold somebody picked, and a comment explaining
why a `<div>` nobody can see must not be refactored away. Five of them is a
stylesheet nobody wants to change.

## Decision

**Reach for a container query only when the change cannot be interpolated. When
the thing that varies is a length, write it as a function of the container's
width and set it inline.**

- **A function** — `clamp(4rem, 24%, 8rem)`, `min()`, `max()`, a percentage
  basis. Percentages and `clamp()` resolve against the containing block, so the
  value is continuous across every width, needs no `container-type`, no extra
  element, and no rule in `stylesheet.ts`. `loom.episode`'s artwork basis is
  this.
- **A query** — `@container (min-width: …)`. For changes CSS has no way to
  interpolate: a `flex-direction` that becomes `row`, a margin that switches off,
  an element that moves from one end of its parent to the other.
  `loom.offering`'s card-to-row is this, and correctly.

The test is one question: **is there a halfway value?** A width has one. A
direction does not.

Two rules stand behind that and neither is new:

- **Never measure the viewport.** `vw`, `vh` and a bare `@media (min-width: …)`
  are the viewport, and a primitive that reads them is wrong wherever it is not
  full-bleed. That is the open finding against `loom.mosaic`, and it stays open.
- **When it is a query, nothing it varies may be set inline.** An inline style
  beats a rule in `stylesheet.ts`, and a container query reads its *ancestor*, so
  the flipping element cannot be the element that declared the containment. Both
  of these caught `loom.offering` once and both are commented in its source.

## Consequences

- **The cheap answer is now the first one tried.** A run that wants a
  size-that-varies writes one `clamp()` and is finished; the machinery is
  reserved for the case that needs it. `loom.episode` ships with no rule in
  `stylesheet.ts` for its own layout and no frame element, where copying the
  precedent would have given it both.
- **The floors and ceilings are where the design breaks, not where it looked
  nice.** A `clamp()`'s outer terms are load-bearing and should be set by
  measurement: `loom.episode`'s were raised from `4.5rem`/`7rem` to
  `5.5rem`/`9rem` because below those a centred play glyph and a corner duration
  chip overlap on a 390px screen. That was found by photographing the page and
  by nothing else, which is the honest way to pick them.
- **`prefers-reduced-motion` is unaffected.** A function is not motion; nothing
  animates because a container got wider. This does not touch 0055.
- **It does not resolve `loom.mosaic`.** That primitive changes its
  `grid-template-columns` — an arrangement, not a length — so it needs a query,
  and the finding against it is that the query it has reads the viewport. This
  record says which technique it should use; the fix is still owed.
- **A future primitive may need both.** Nothing here forbids a card that clamps
  its artwork *and* flips its direction at a threshold. The record is about not
  paying for the second when only the first is wanted.

## Alternatives considered

**Always use a container query, for consistency.** One technique to learn and
one place to look. Rejected on what it costs at the fifth occurrence: five inner
elements that are markup rather than nodes, five stylesheet blocks, and five
thresholds, to express what five inline `clamp()`s say exactly. Consistency
between two techniques that are not doing the same job is not consistency.

**Always use a function, and express arrangement changes as degenerate
lengths** — a row whose gap goes to zero, a column whose basis goes to 100%.
Rejected because it is a trick rather than a technique: it works for two of the
cases anybody has and produces unreadable CSS for the third, and a
`flex-direction` genuinely has no halfway value.

**Give the container a `columns`-style prop and let the author say which.**
Rejected on the argument `loom.offering` already made and this record inherits:
it is a value an author has to keep in step with the container's own layout, in
two places, forever, and nothing in a projection or a screenshot shows them
disagreeing.
