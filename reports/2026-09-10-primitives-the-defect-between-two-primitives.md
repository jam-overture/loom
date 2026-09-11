# The defect between two primitives

**Routine:** `Loom primitives` · **Date:** 2026-09-10 · **Branch:**
`primitives-26-five-units-one-tree` (pushed onto, per #216) · **Section:** §4b

## What this run did

**Nine shipped primitives were overflowing their parents, and nothing in the
repository could see it.** Eleven offenders, found by widening one existing
assertion, fixed at source, and held by an invariant that covers the whole class
rather than the instance that was noticed.

| | before | after |
| --- | --- | --- |
| elements overflowing their parent, 1280px | **18** | **0** |
| elements overflowing their parent, 390px | **6** | **0** |
| worst single overflow | **66px** | **0px** |

Measured in Chromium against the rendered page, both palettes, at 1280px and a
true 390px. `scrollWidth === innerWidth` throughout — before as well as after,
which is precisely why this had gone unnoticed for a month.

The before/after pictures are the thing to look at:
`reports/2026-09-10-primitives-the-defect-between-two-primitives-{before,after}-{editorial,bold}-{wide,phone}.png`.
In the `before` shots the featured pricing tier hangs 66px below its two
siblings and collides with the eyebrow of the band underneath it; the feature
quote does the same; the credential and listing cards in each row end on three
different lines. In the `after` shots every row shares one bottom edge.

## Why this rather than breadth

**No maintainer comments were outstanding** on #248 or on any of the five pull
requests it consolidates. The only comments on all six are this lane's own and
Vercel's. So the plan was the top of the stack, and the top of the plan was a
finding this lane filed against itself yesterday and explicitly deferred:

> **Worth a sweep**: any primitive that combines a percentage size with padding
> has the same latent defect, and nothing checks for it. That sweep is this
> lane's and is not in this run.

It was right to defer it and wrong to leave it. `loom.feature`'s version of this
defect drew a two-row grid's second row **through** its first. Nine more
primitives had the same line missing, and every one of them is a card that a
demo page puts three of in a row.

The honest cost is stated in full under *What I did not do* below: **this is the
third consecutive run in this lane that adds no primitive**, against a brief
whose first sentence is a breadth mandate. That is filed for the maintainer
rather than decided here.

## The sweep

The defect: an inline style carries no reset, so `box-sizing` is `content-box`.
An element that states a **percentage size** on one axis and then pads or
borders itself on that same axis is larger than its parent by exactly that
padding and border.

| Primitive | Axis | What it was |
| --- | --- | --- |
| `loom.tier` (plain, featured) | block | `height:100%` + `padding` + `border` |
| `loom.quote` (card, feature) | block | `height:100%` + `padding` / `padding-block` |
| `loom.credential` | block | `height:100%` + `padding` + `border` |
| `loom.article` | block | `height:100%` + `border` |
| `loom.product` | block | `height:100%` + `border` |
| `loom.listing` | block | `height:100%` + `border` |
| `loom.table` | inline | `width:100%` + `border` on the panel |
| `loom.comparison-table` | inline | `width:100%` + `border` on the panel |
| `loom.embed` | inline | `width:100%` + `border`, under an `aspect-ratio` |

Nine of eleven are the block axis, which is the half that had never been looked
at. The two inline ones are two pixels each and would never have been found by
eye — a bordered table panel two pixels wider than the band holding it.

`boxSizing: "border-box"` at the point each size is declared, with the one-line
reason in place, matching how `loom.section` and `loom.feature` already write it.

## The invariant, and why the old one missed nine primitives

The assertion that existed was *"never pads a full-width band past the parent it
sits in"*. It was too narrow in **three separate ways at once**, and each one
alone would have been enough to hide all of this:

1. **One axis.** It looked at `width`. Nine of the eleven offenders are `height`.
2. **One spelling.** It matched `padding-inline`. Every actual offender used the
   `padding` shorthand, and three used only a `border`.
3. **Twelve fixtures of twenty.** The eight it skipped are where `product`,
   `listing`, `credential` and `book` live.

The replacement states the property once, for both axes, for **any** percentage
rather than `100%`, over **all twenty fixtures plus a new page holding all nine
starting compositions** — and renders in edit mode so a failure reads
`loom.tier overflows on the block axis: …` rather than quoting an anonymous
style string. [0125](../decisions/0125-a-geometric-property-is-asserted-over-the-page-not-the-primitive.md)
records the rule.

The new fixture is the load-bearing part. The reason this survived a month is
that **no fixture in this repository had ever put six tiles in a three-column
grid** — the library was tested against the arrangements its authors happened to
write. The nine-band page is denser than anything hand-written here, and it is
now in the invariant's input.

## Two invariants I tried to write and did not

Both are more useful as negative results than the code would have been.

**A `max-width` box with no auto inline margin sits flush left.** This is the
9 September finding's class — *a band narrower than the page against its left
edge* — and I wanted to close it the same way. It is **not decidable from
markup**. Over the nine-band page the rule finds six elements and all six are
correct, because centring in this library is usually the **parent's** job:
`loom.page` caps its column at `1120px` with no margin of its own and is centred
by `align-items: center` on the root above it. A test would have been six false
accusations. Filed as needing a browser; it is one line against
`getBoundingClientRect()` and it wants #250's harness.

**A sideways scroller needs `min-width: 0` to be allowed to shrink.** I wrote
this one, ran it, and it found `loom.code` — then I checked the spec rather than
the source. A flex or grid item's automatic minimum size is content-based **only
while its overflow in that axis is `visible`**, and `overflow-x: auto` is exactly
what these elements carry. The assertion states nothing true that isn't already
guaranteed, and satisfying it would have meant adding a no-op declaration to
`loom.code` to make a test I invented pass. Deleted.

## Which Hermes fields became nodes, and which stayed props

**None, either way.** This run ported no Hermes block and added no primitive, so
0052's granularity question was not asked of anything new. The port stands where
8 September left it: **68 of 70 blocks settled** — 55 ported, 13 needing no
primitive, and 2 (`tabs`, `feed`) wanting a state seam and a binding rather than
a primitive.

Nothing in the sweep touches a prop or a node. `boxSizing` is not reachable from
the tree and should not be: it is not a choice, it is what the declaration two
lines above it already meant.

## What I did not do, and the thing that needs deciding

**No new primitive. Third consecutive run.** I went looking and came back with a
definition list, which is the same thing the 9 September run came back with. The
named gaps are filled by primitives that already exist and absorbed them
deliberately: `loom.milestone` is the process-steps/changelog/roadmap collapse,
`loom.mosaic` is the bento grid, `loom.code` is the terminal, `loom.carousel` is
the gallery, `loom.spec` is the specs strip.

The premise that changed is that **breadth had a measurable end and the library
reached it** on 8 September. The brief has not been updated to say what replaces
it, and three runs have now each made that call alone. It is filed for the
maintainer with the two genuine gaps named — a tab strip needs a `select` member
in the behaviour vocabulary, and a feed needs the binding seam; both are the
framework lane's.

## Records

**One.** [0125](../decisions/0125-a-geometric-property-is-asserted-over-the-page-not-the-primitive.md),
`Accepted` rather than an escalation on 0120's precedent: it decides how this
lane tests a class of property it was not testing, refines no `Accepted` record,
and touches neither the tree nor the delta model. Numbered 0125 with 0121–0124
left as holes, per 0097 and for the reason 0120 gives — thirty branches open,
each able to claim the next free number without seeing the others.

Index regenerated with `pnpm decisions:index`.

## Findings

**Filed — four:**

1. **The sweep**, closed, with the eleven offenders and the three ways the old
   invariant was too narrow.
2. **The flush-edge class needs a browser**, open, with both rejected rules and
   the reason each fails.
3. **A full-page screenshot of a tall dark page ghosts content between slices**
   — this run's `bold` shot has table text from the bottom of the page drawn
   faintly across the top of it, and it reads exactly like a stacking defect. It
   is not in the page; a viewport-sized shot finds one element near the top and
   it is the first eyebrow. Fourth variant of *the picture lied*, and the first
   in the dangerous direction: the other three cost a cycle, this one would have
   cost a fix to a primitive that is correct.
4. **Three runs, no primitive, and a mandate nobody withdrew** — owned by the
   maintainer, not by a routine.

## The cross-lane line

**None this run.** `facts.test.ts` passes with 0125 added, so the sixteen-times
`FACTS.decisions` line does not bite here — the count is no longer hand-typed
against this branch's base. First run in this lane since 1 September that did not
have to touch the marketing lane's file.

**21st.dev is blocked for the fourteenth time**, seventh lane. `docs/routines.md`
lists it under `permissions.allow`; `WebFetch` returns `EGRESS_BLOCKED`. The
visual bar the brief names has still never been consulted by the routine told to
consult it.

## Test numbers

`pnpm verify` **green**, exit 0.

| Suite | Files | Tests | Skipped |
| --- | --- | --- | --- |
| Runtime | 120 | 1,946 | 0 |
| Application | 158 | 2,497 | 0 |

`src/primitives` is 299 tests across three files. **Nothing was weakened.** One
test changed and it was strengthened: the box-sizing invariant went from one
axis, one padding spelling and twelve fixtures to both axes, every padding and
border spelling, and twenty fixtures plus the nine bands. One test I had written
this run was **deleted** rather than satisfied, for the reason above.

## What the library still cannot express

- **A tab strip.** Client-side selection. `disclose` proved the shape of a
  behaviour member; `select` is the framework lane's and needs a record.
- **A feed.** Wants the binding seam (0058) and a live source, not a primitive.
- **A flush-edge check.** Real, not decidable from markup, waiting on a harness.
- **A shadow slot in the palette.** Unchanged since #188.
- **A container query on the nav.** Unchanged; the collapse is a media query at
  `48rem`, so a nav in a narrow column collapses late.
