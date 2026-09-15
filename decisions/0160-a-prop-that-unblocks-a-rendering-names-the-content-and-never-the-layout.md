# 0160. Where a rendering depends on a fact about the content that no rule can observe, the tree declares the fact and never the layout

**Status:** Accepted
**Date:** 2026-09-15
**Section:** §4b

> **Why this number.** The highest record on `main` is `0157`, and an open
> branch of `Loom daily build` already carries `0158`. `0159` is left free
> deliberately, which
> [0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)
> permits in as many words: four lanes have branches open that can each claim
> the next free number without seeing the others, a clash is fatal to every
> lane's `pnpm verify`, and a hole costs one line in the index. This is the same
> gap [0155](0155-a-container-may-only-add-to-its-children-what-they-left-unspoken.md)
> left for the same reason a day earlier.
>
> **Why `Accepted`.** It refines no `Accepted` record, changes no schema, and
> touches neither the tree nor the delta model. It names a class of prop the
> library had already shipped one of, and says which of two ways of writing the
> second one is right.

## Context

`loom.table` renders a table of figures and a table of sentences with the same
rules, and on a phone one of those is fine and the other is not. Measured at
390px, in Chromium, on one page:

| | width | tallest row |
| --- | --- | --- |
| four columns of figures | 350px, fits | 41px |
| three columns of sentences | 348px, fits | **360px** |

The second is 43% of a phone screen for a single row, and it does not even
scroll to earn it — it fits, and pays for fitting in height. Giving its body
cells a readable measure fixes it: the row becomes 193px and the band scrolls
instead.

**The rule cannot be written unconditionally**, because the same measure takes
the table of figures from 350px to 744px and makes the one that was already
right start scrolling. And it cannot be written conditionally, because CSS
cannot tell the two apart:

- `min-inline-size: fit-content(12rem)` is precisely the conditional form —
  `min(max-content, max(min-content, 12rem))`, which leaves a cell holding
  "1,204" at its own 40 pixels and lifts a cell holding a sentence to twelve rem.
  It is valid CSS Sizing 3. **Chromium ignores it.**
- Nothing else in CSS measures how much text a box contains.
- The primitive cannot infer it either. Its children arrive as a rendered
  `ReactNode`; a primitive that walked its own output to guess at prose would be
  parsing what it had just produced, and would be wrong the first time a cell
  held a `loom.code-span`.

So something has to say which kind of table this is, and the only thing that can
is the tree. The question this record answers is **what it should say**.

## Decision

Where a rendering depends on a fact about the content that no rule can observe
and no primitive can infer, **the tree declares that fact — as a prop describing
the content — and never declares the layout that the library derives from it.**

`loom.table` therefore takes `prose: boolean`, meaning *these cells hold
sentences*, and does not take `narrow: "stack" | "scroll"` or
`layout: "measured"`, meaning *do this to them*.

Three conditions bound it, and a prop that fails any of them is not this:

1. **The fact must be genuinely unobservable**, demonstrated by having tried.
   The alternatives above were measured rather than assumed, and the numbers are
   in `FINDINGS.md` so the next run does not re-derive them.
2. **It must change no node.** This is the granularity rule unchanged
   ([0052](0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md),
   `docs/primitive-granularity.md`): ask whether changing the prop changes the
   set of nodes, and if it does, it is `insert`/`remove` in a prop bag.
3. **Getting it wrong must degrade rather than break.** A table wrongly
   declaring `prose` is wider than it needed to be. A table wrongly not
   declaring it is what shipped for three weeks. Neither is a broken page, which
   is what makes this safe to leave to an author.

## Why the content and not the layout

Both props would fix the phone today. They differ in what happens next, which is
the same axis `docs/primitive-granularity.md` uses to decide everything else.

**A prop that names the layout freezes it.** `narrow: "stack"` is a tree saying
*put these in blocks below 48rem*. The moment the library learns to do something
better — and there is an open finding saying what would have to change for
stacking to be possible at all — every tree that said `"stack"` is pinned to the
answer that was available in September. The library cannot improve the rendering
of a page that specified the rendering.

**A prop that names the content does not.** `prose: true` is a tree saying *these
cells are sentences*, which is true in September and still true afterwards. What
the library does about it is the library's, revisable in one file, under the
bargain [0013](0013-the-registry-is-what-the-model-is-told-it-may-build.md)
already strikes: the tree carries content and intent, and the registered
component is what a human approved to render it.

It is also the difference between a prop a model can set correctly and one it
cannot. A model reading a table knows whether the cells are sentences. Whether
this deployment's phone breakpoint wants a stack or a scroll is not a fact about
the page at all.

**The library had already made this call once, without writing it down.**
`loom.table-cell` takes `numeric`, meaning *the figures in this cell are
tabular*, and its own comment says the thing this record generalises: *"It is
typography rather than content: nothing here parses the cell or changes what it
says."* `numeric` names what the cell holds. It does not name `font-variant-
numeric`, which is what it causes.

## Alternatives considered

**A layout prop — `narrow: "stack" | "scroll"`.** Rejected above, and it is the
option that would have been taken by anyone not asking what happens next: it
reads more honestly at the call site, because it says exactly what the page will
do. That is also its defect. It pins every tree that sets it to the rendering
the library had on the day it was written, and the rendering is the half of this
the library is supposed to own.

**No prop, and live with it.** Defensible for three weeks and it was — both
findings say plainly that nothing is blocked and the pages are shipped. It stops
being defensible once the cost is measured, because 43% of a phone screen for
one row of a table is not a rendering anyone would choose, and the marketing
lane had already worked around it twice by writing the table's argument out in
prose underneath it.

**Wait for `fit-content()`.** The correct fix needs no prop and no decision
record, and it is one browser bug away. Rejected on timing rather than on
merit: there is no date on it, the demo is this month, and the prop becomes a
default and then a no-op the day the declaration starts working. The entry in
`FINDINGS.md` is the note that says so.

**Infer it from the markup.** A primitive could count characters in its
rendered children. Rejected because it would be a primitive parsing its own
output — wrong the first time a cell holds a node rather than a string, and a
render that is no longer a pure function of the tree in any way a reader could
predict.

**Put it on the cell rather than the table.** `loom.table-cell` is where
`numeric` lives, and per-cell is the more precise placement. Rejected because
prose-ness is not per-cell in practice: a table of sentences is sentences all
the way down, so this would be one decision stored nine times with nothing
keeping the copies in step — which is
[0084](0084-in-a-two-dimensional-band-rows-are-nodes-and-columns-are-positions.md)'s
argument for sending a column-scoped decision to the container, applied to a
table-scoped one.

## Consequences

- **The prop is not called `cells`.** `library.test.ts` asserts that no schema in
  the table family carries a prop of that name, because `cells: Cell[]` is
  `insert` and `remove` wearing a prop's name, and a prop that reads like the
  one the guard forbids is a guard nobody trusts.
- **A default of "off" is load-bearing.** The unobservable fact is the unusual
  case; a library whose narrow rendering changed for every table that had not
  opted out would be the unconditional rule, arrived at by a different route.
- **Two of these is a pattern and three is a smell.** Each one is a fact the
  author now has to know to set, and a schema that accumulates them has stopped
  describing content and started describing a rendering pipeline one flag at a
  time. The bar is the first condition above: it is only this if somebody
  measured the alternatives and wrote down what they measured.
- **It does not license a layout prop elsewhere.** Where a rendering *can* be
  derived — from a container query, from the content's own intrinsic size, from
  a position among siblings — it still must be, and `0155` is what makes those
  reachable.
