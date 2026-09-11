# 0106. A band asks its own container for a width, not the window

**Status:** Proposed — **ARCHITECTURAL, needs review.** It reverses a named
alternative in [0079](0079-a-layout-css-alone-can-express-belongs-in-the-stylesheet.md),
which is `Accepted`. Nothing here supersedes it; 0079 stands as written until
someone decides.
**Date:** 2026-09-03
**Section:** §4b

## Context

[0079](0079-a-layout-css-alone-can-express-belongs-in-the-stylesheet.md) settled
where a width may be read: in the library's static stylesheet and nowhere else,
because a render is a pure function of one node
([0008](0008-the-renderer-is-a-total-pure-projection.md)) and a primitive handed
a viewport would make one tree two pages. That half is not in question here and
this record does not touch it.

What 0079 also decided is *which* width. It chose a **viewport** media query,
and it considered container queries explicitly and rejected them:

> Correct in principle and the thing to revisit. Rejected for now on the failure
> mode: where they are not supported, the un-queried rules are what apply, so a
> mosaic would render its narrow layout forever on those clients rather than its
> wide one.

and, in its own consequences:

> A host embedding a mosaic inside a narrow column wider than `48rem` gets six
> columns in a space that cannot hold them, because a media query asks about the
> *viewport* and not about the element. […] **Worth revisiting, and filed rather
> than assumed.**

Both halves of that have since happened.

**The cost is measured, not predicted.** A `loom.mosaic` in one half of a
`loom.split` at a 1280px window is a 524px band. Under the viewport query its
four cells came out **343 / 161 / 161 / 343** — a composed rhythm at the size of
a sentence fragment. Under the container query the same band is one column, four
cells of 524px. `loom.milestone`'s marker column is the same shape of error with
a different symptom: 5.5rem reserved at every width, which is 22% of a phone, and
88px of a 188px row on the front door's own see-it-happen panel.

**And the premise the rejection rested on is stale.** Three primitives shipped
after 0079 already use container queries — `loom.marquee`'s `cqi` item cap on
24 August, `loom.offering`'s row-or-card flip, `loom.orbit`'s inner radius — so
the support argument was answered in practice by three runs without anyone
writing it down. `:has()` is in the stylesheet too. The library's browser floor
has moved and 0079 has not.

## Decision

**Where a primitive's layout depends on a width, the width is the element's own
container, and a viewport query is the exception that has to argue for itself.**

Three things follow, and the third is the one that makes it safe:

1. **A container that arranges children declares its own inline-size
   containment** where a child could reasonably want to measure it.
   `loom.split`'s two columns and `loom.card` do so as of this record, which is
   what makes a level-1 heading in half a page render at the size of half a page.
2. **A leaf that caps itself against a width uses `cqi`, never `vw`.**
   `loom.heading`'s ramp cap is the case. With no ancestor declaring
   containment, `cqi` resolves against the small viewport, so this is a strictly
   safer swap and not a behaviour change on the open page — measured at 390px,
   `min(72px, 11cqi)` and `min(72px, 11vw)` both compute to 42.9px.
3. **The rule is written so the *unqueried* form is the narrow one.** This is
   the whole of 0079's objection and it is answerable in the CSS rather than in
   the argument. `grid-template-columns` lives on the mosaic itself and a
   container query reads an ancestor, so the six tracks are unconditional and
   the **cells** are switched: full-width in the base rule, cut into the
   rhythm's spans only inside the query. A client that does not understand
   `@container` therefore gets one cell per row — the same fallback 0079 chose,
   reached by the mechanism 0079 rejected.

**A second breakpoint is allowed and named once.** 0079 held the library to one
width, `48rem`, and set the bar for a second at *an arrangement with no
intrinsic form*. `26rem` is the second, and it clears that bar: a rail's marker
column and its title cannot be laid out intrinsically side by side, because the
marker is `nowrap` free text and the title is a heading, so there is no content
size the browser can trade off between them. It is also the width `loom.orbit`
already uses, so the library gains a breakpoint it was already carrying.

## Consequences

- Four primitives change what they measure: `loom.mosaic`, `loom.milestone`
  through `loom.milestone-list`, `loom.heading`, and the two that declare the
  containment the heading reads.
- **Headings inside a card or a split column get smaller on wide screens**, and
  that is a visible change to pages this lane does not own. A level-1 heading in
  a 524px column goes from 72px to 58px. It is the change the cap was always
  for; it had simply never been able to fire anywhere but a phone.
- The library now declares containment in five places rather than three. Each is
  `contain: inline-size layout style`, so each becomes a containing block for
  absolutely positioned descendants. Every absolutely positioned element in the
  library already sits inside its own `position: relative` ancestor, so nothing
  moves — but a future primitive that hangs something off a distant ancestor now
  has one more thing to know.
- A `loom.grid` cell is still not a container. A grid styles its children rather
  than wrapping them, so there is no element to declare it on without emitting
  one per cell. In practice a grid cell is a card. Noted rather than fixed.
- A `loom.nav` still collapses on a viewport media query, unchanged and
  deliberately: containment on a `position: sticky` element is unmeasured, and
  that is the exception this record's first sentence leaves room for.

## Alternatives considered

**Leave 0079 alone and file the finding a fourth time.** The procedurally
cleanest option and the reason this record is `Proposed` rather than written as
settled. Rejected as the recommendation because 0079 does not forbid the change
— it asks for it, in the words *worth revisiting* — and because the thing being
protected is a measured defect on the deployed front door rather than a
preference.

**A `markers` prop on `loom.milestone-list`, and a `columns` prop on
`loom.mosaic`.** Both would let the tree say what the browser can see. Both spend
grammar ([0014](0014-the-reply-schema-must-fit-a-grammar-budget.md)) on a
question nobody should have to answer twice, and `markers` would additionally let
a list disagree with what its own children hold. `:has()` asks the same question
of the truth.

**A wrapper element on `loom.mosaic`, so the grid could be queried directly.**
The obvious way to get `grid-template-columns` inside a query, and what
`loom.offering` does with its frame. Rejected here because switching the cells
instead costs no element *and* produces the safer fallback; the wrapper form
would put six columns in the base rule.

**Declare containment on every container in the library.** Tempting and wrong to
do in one run. Containment changes what an absolutely positioned descendant is
positioned against, and the honest version of that change is one primitive at a
time with a picture of each. Two are done here because two are what the
heading's cap needed.
