# 0202. The harness measures the content a clip hides, and it is not `scrollWidth`

**Status:** Accepted
**Date:** 2026-09-28
**Section:** §1 (process)

## Context

`scrollWidth` against `innerWidth`, taken on the document after every shot, is
the one check in this repository that catches a visual defect without a person
looking at a picture. `Loom primitives` filed on 27 September that it goes blind
inside a clip, and measured it: one tree, rendered twice, at 390 under `bold`.

| | document measurement |
| --- | --- |
| wrapped in a `loom.backdrop` | **390 / 390** |
| the identical content, unwrapped | **401 / 390 ← overflows** |

`loom.backdrop` sets `overflow: hidden` and has to — its paints reach the
element's edges, and one that did not clip would paint over the band beside it.
Four bands in the starter catalogue are rooted in a backdrop or carry a hero's
own paint, and a page a model proposes a backdrop onto is the product working as
designed. So the reach of the blindness is not four bands: it is *any page, at
any time, silently, with nothing red.*

The finding offered three shapes and said none of them was that lane's to
choose: measure per element for the elements that clip; re-render each page with
`overflow: visible` forced and measure that; or write the limit down in
`tools/specimen/` and leave it.

## Decision

**The harness reports, per shot, every box that clips horizontally and whose own
content reaches past it.** One line per box under the shot's own line, naming
the box, how far its content reaches and how much room it has. Two facts are
kept apart and neither is derived from the other: `overflows` is about the
document against the viewport, `clips` is about boxes against their own content.

**What is measured is the in-flow content, walked, and deliberately not
`scrollWidth`.** That is the part a future reader would otherwise undo, because
`scrollWidth` is the obvious reading, it is one property access, and it is
wrong twice over — measured, both times, on the first run of the instrument:

- **A `loom.halo` is an absolutely positioned rim at a negative inset**, drawn
  four pixels outside the box it lights, on purpose, and clipped by a backdrop
  on purpose. `scrollWidth` counts it. Two of eighteen committed specimens
  reported four pixels of clipped rim, and neither was hiding anything a reader
  wanted. Decoration that is clipped is decoration working.
- **A box that scrolls sideways inside a clipping box is wide by design** and
  says so with a scrollbar. The documentation site's quickstart reported its
  code block as hiding 905 pixels in a 348-pixel box, which is the feature.

So the walk starts at the clipping box's children and, for each one: counts its
own rectangle, then stops if it clips or scrolls on its own account, then
measures the **ink of its text** with a range, then descends. The text
measurement is not an embellishment — a heading is a block whose box is the
width it was given, and one long word painting past that edge is invisible to
every rectangle on the way down. It is the commonest shape of this defect and
`tools/specimen/a-clip-hides-an-overflow.specimen.ts` is it, committed.

**Two exclusions, both stated as constants.** A shortfall of one pixel is
ignored, because these readings are integers over a layout that is not. A box
with less than two pixels of content box in either direction is ignored, because
`position:absolute; width:1px; height:1px; overflow:hidden` is how a
visually-hidden announcement is written and it is a clipping box holding a
sentence by construction — the documentation site's skip link, found on the
first page this was pointed at, reads 24 × 17 as a client box and 1 × 1 as a
content box, and only the second number says what it is.

**A clipped box does not change the exit code.** `pnpm shoot` and `pnpm specimen`
still exit non-zero on a document wider than its viewport, and only on that.

## Consequences

- Every shot every lane takes now carries this measurement. Nothing has to be
  asked for and no shot list changes.
- A lane photographing a band inside a backdrop no longer has to know that the
  number it is reading is not about its band.
- **Measured across the whole of what this repository can photograph today, it
  is silent**: 32 shots over four surfaces at both viewports, and all 94 shots
  of every committed specimen in `src/primitives/` and `tools/specimen/`, report
  no clipping box. The one subject that reports one is the specimen written to
  be found. Taken twice — once before `Loom merge` brought 0201's changes to
  `loom.hero` and the backdrop layering into this branch, and once after — and
  unchanged across both. An instrument that fires on a healthy tree is an instrument that gets
  ignored, so this is the property that matters most and it is the one that will
  need re-checking when it next fires.
- The exit code is where this decision is most likely to be revisited, and the
  reason for leaving it is narrow rather than principled: promoting a
  measurement one day old to a merge gate for four surfaces, in the change that
  first makes it visible, is how an instrument gets switched off instead of
  fixed. One false positive class was already found and fixed within seven
  pages. When this has run for a while without one, the promotion is a one-line
  change in `shoot.ts` and `main.ts`.
- **Right-to-left is not handled**, and nothing in this repository is
  right-to-left. The walk compares against the box's right edge.
- **Text directly inside a clipping box, with no element around it, is not
  measured** — only the text of its element children is. Every tree the render
  seam produces wraps its text in a primitive, so this is a limit of the walk
  rather than of what it can see here.

## Alternatives considered

**`scrollWidth` against `clientWidth` on the clipping box.** The finding's own
first suggestion, one property access, and the first thing built. Rejected on
measurement, not on taste: see the two false positives above, both of which are
the library's own primitives working correctly.

**Render each page a second time with `overflow: visible` forced on every
clipping box.** The finding's second shape. It measures a page that does not
exist: lifting the clip on a `loom.backdrop` lets its paints into the band
beside it and re-lays out everything downstream, so the second measurement is of
a different document. It also doubles the cost of every shot.

**Write the limit down in `tools/specimen/` and leave it.** The finding's third
shape, and the honest floor. Rejected because the defect it describes is silent,
and a limit written in a README is read by the lane that goes looking — which is
not the lane that needs it.

**Fold it into the overflow verdict.** One field, one arrow, one exit code, and
no lane has to learn a second thing. Rejected: they have different remedies. A
wide document is fixed by the page; a clipped box is fixed by the band inside
it, and often by another lane. Reporting them as one fact would make a lane's
own measurement say something it did not mean.
