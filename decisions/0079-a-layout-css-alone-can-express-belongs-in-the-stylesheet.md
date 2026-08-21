# 0079. A layout only CSS can express belongs in the stylesheet, width query and all

**Status:** Accepted
**Date:** 2026-08-21
**Section:** §4b

## Context

Every container in this library is responsive without ever asking how wide the
page is. `loom.grid` and its named cousins wrap by `auto-fit` over a minimum
column width; `loom.split` and `loom.stack` wrap by `flex-basis`. Both are
*intrinsic*: the browser decides from the content and the space, and the
markup is the same at every width. That is not an accident of taste. It is what
lets [0008](0008-the-renderer-is-a-total-pure-projection.md) hold — a render is
a pure function of one node, so a primitive that branched on a viewport would
have to be handed one, and then the same tree would not be the same page.

`loom.mosaic` is the first primitive here that intrinsic layout cannot express.
Its whole purpose is cells of *deliberately unequal* width — the band a page
uses when a grid of identical rectangles would read as a table, and the gap the
marketing lane filed against `loom.feature-grid` on 20 August after building one
against a reference whose equivalent band mixes three sizes. Unequal spans need
a column *count* to be spans of, and a fixed six-column grid on a phone is six
columns of four characters. There is no `auto-fit` for "four across here, one
across there, and the fourth cell twice as wide as the second": `auto-fit`
distributes one minimum evenly, which is the thing this band exists not to do.

So the question is where the width may be read, given that the render function
must not read it.

## Decision

**A width media query is allowed in the library's static stylesheet, and only
there.** `loom.mosaic` sets one column at any width and six from `48rem`, with
its span cycles inside the query.

The properties that make it safe are the same three
[0055](0055-motion-is-a-static-stylesheet-the-primitive-emits.md) relies on for
keyframes, and they are the whole of the argument:

- **The markup does not change.** One tree renders one string of HTML at every
  width; the browser applies different rules to it. The render is as pure as it
  was, and `renderToStaticMarkup` produces byte-identical output either side of
  the breakpoint — which is what a test can assert and does.
- **Nothing is interpolated.** The stylesheet is static text with no prop, no
  theme value and no palette in it, so a proposal cannot reach the breakpoint
  any more than it can reach the aurora's period. The tree says *mosaic, showcase
  rhythm*; where that rhythm switches off is implementation the registry vouched
  for once.
- **`prefers-reduced-motion` was already a media query in this file.** The line
  being drawn is not "no media queries" — it never was — it is *no viewport in
  the render function*, and a rule in a stylesheet is not in the render function.

**One breakpoint, named once, and a primitive earns it by not being expressible
any other way.** `48rem` is the only width in the library and the bar for a
second is the bar this one cleared: an arrangement with no intrinsic form, not
an arrangement that would look a little better with a query. Every existing
container stays intrinsic and none is revisited.

**Below the breakpoint the rhythm switches off entirely** rather than
degrading. A mosaic on a phone is a single column of full-width cells, which is
the same thing every other band in this library becomes there, so a page does
not acquire a second layout personality at small sizes.

## Consequences

- `loom.mosaic` can exist, and with it the first band here that reads as
  composed rather than tabulated. That was the point.
- The library now has a width in it, and a width is the kind of constant that
  attracts company. The mitigation is that it is in one file, in one query, with
  the bar for a second stated above — and that a run adding a second should say
  so in its report rather than adding it quietly.
- A host embedding a mosaic inside a narrow column wider than `48rem` gets six
  columns in a space that cannot hold them, because a media query asks about the
  *viewport* and not about the element. Container queries are the honest
  mechanism and are not used here: support is good but not universal, and the
  failure mode of an unsupported container query is the fallback rule applying
  at every width, which is a band that never composes rather than one that
  composes early. Worth revisiting, and filed rather than assumed.
- Nothing in `src/` outside `src/primitives/stylesheet.ts` is affected, and no
  other lane has to know.

## Alternatives considered

**A `span` prop on the child.** The obvious shape, and the one the finding
itself flagged as probably wrong. It makes a child responsible for how its
parent arranges it — the coupling `loom.split` avoids by keeping `ratio` on the
arranger — and it puts a number in the tree that means nothing until you know
the parent's column count. It also does not solve this problem at all: a `span:
4` still has to become `span: 6` on a phone, and the child has no more access to
a viewport than the parent does.

**Container queries instead of a width query.** Correct in principle and the
thing to revisit. Rejected for now on the failure mode: where they are not
supported, the un-queried rules are what apply, so a mosaic would render its
narrow layout forever on those clients rather than its wide one — silently, and
on exactly the browsers nobody testing this would be using.

**Give up and let a mosaic be a grid.** The status quo, which is what the
library has done for forty-five primitives. It is why the marketing site's
feature band is eight equal rectangles, and the finding that says so is the
reason this record exists.

**Read a width in the render and emit different markup.** Would need a viewport
handed to the renderer, which makes the same tree two pages and ends 0008. Not
seriously considered; recorded because it is what "just make it responsive"
means if nobody says otherwise.
