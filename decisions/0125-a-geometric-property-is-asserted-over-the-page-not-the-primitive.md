# 0125. A geometric property is asserted over the page, not the primitive

**Status:** Accepted
**Date:** 2026-09-10
**Section:** §4b

> **Why this number.** `0121` through `0124` are skipped deliberately, which
> [0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)
> permits in as many words. The highest record on `main` is `0102`; this branch
> already carries `0106`, `0110`, `0115` and `0120`; and roughly thirty pull
> requests have been open since 1 September, every one of them able to claim
> the next free number without seeing the others. A clash is fatal to every
> lane's `pnpm verify`; a hole costs one line in the index.
>
> **Why `Accepted`.** It decides how this lane tests a class of property it was
> not testing at all. It refines no `Accepted` record, changes no schema, and
> touches neither the tree nor the delta model.

## Context

Every test in `src/primitives/library.test.ts` renders a primitive and asserts
about that primitive. That is the right shape for almost everything the library
promises — a prop is honoured, a slot is placed, a colour comes from the
palette, a declared name travels with the type — and it has caught a great deal.

It cannot catch a geometric defect, because **a geometric defect is a property
of a box and its parent**, and the parent belongs to a different primitive.
`loom.feature` was correct read on its own: a card that fills its track and pads
its contents. `loom.feature-grid` was correct read on its own: a grid of rows
with a declared gap. The defect existed only in the pair, and it was severe —
every tile overflowed its own row by 66px, so a one-row band hung over the band
below it and a **two-row band drew its second row through its first**.

It survived a month for a reason worth stating plainly: no fixture in this
repository had ever put six tiles in a three-column grid. The library was tested
against arrangements its authors happened to write, and the defect needed a
denser arrangement than any of them.

Eight consecutive runs in this lane have reported the same sentence in different
words — *a defect a picture found and no assertion could*. The two answers on
offer are "take more pictures" and "assert the property". Pictures are necessary
and are not sufficient: they need a human to look, they need the arrangement to
have been drawn in the first place, and a full-page screenshot of a tall dark
page will ghost content between slices and invent a defect that is not there.

## Decision

**A property that is about the relationship between a box and its parent is
asserted over the rendered markup of every fixture at once, not inside the test
for any one primitive.**

Concretely, in `library.test.ts`:

- the assertion runs over **all twenty page fixtures plus a page of all nine
  starting compositions**, rather than over the handful whose author thought of
  it;
- it renders in **edit mode**, so every node carries `data-loom-type` and the
  failure message names the primitive to open rather than quoting an anonymous
  style string;
- it is stated for **both axes** and for **any percentage**, not for the one
  case that was found.

The first invariant written this way is the box-sizing one: an element that
states a percentage size on an axis and then pads or borders itself on that same
axis is larger than its parent by exactly that padding and border, because an
inline style carries no reset and `box-sizing` is therefore `content-box`.

## Consequences

**A defect class is closed by the assertion that covers all of it, or it is not
closed.** The invariant that existed before this one checked `width` against
`padding-inline` over twelve fixtures. It was three separate kinds of too
narrow — one axis, one spelling of padding where every actual offender used the
shorthand, and twelve fixtures of twenty — and it passed for a month while nine
primitives were in breach. Widening it found **eleven offenders across nine
primitives**: `article`, `comparison-table`, `credential`, `embed`, `listing`,
`product`, `quote`, `table`, `tier`.

**A candidate invariant that is not a necessary property is not written.** Two
were tried in the same run and rejected, and the reasons are the useful part:

- *A `max-width` box with no auto inline margin sits flush left.* Not
  decidable from markup. Centring is usually the **parent's** job — `loom.page`
  centres its measure column with `align-items: center` on the root above it —
  so the six candidates this found were all correct and a test would have been
  six false accusations. This class genuinely needs a browser, and it is filed
  as needing one rather than faked here.
- *A sideways scroller needs `min-width: 0` to be allowed to shrink.* True of a
  flex or grid item in general, and already guaranteed here: a flex or grid
  item's automatic minimum size is the content-based minimum **only while its
  overflow in that axis is `visible`**, and `overflow-x: auto` is what these
  elements have. The assertion would have been redundant, and satisfying it
  would have meant adding no-op declarations to source to make a test pass.

**This does not retire the screenshot.** It retires one class of thing the
screenshot was being asked to find. The picture is still what proves a specimen
reads as a product, and it is still the only thing that catches a marker
rendering as a text underline on a laptop and a full-width rule on a phone.
