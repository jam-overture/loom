# 0207. A primitive that arranges only glyphs inherits its alignment

**Status:** Accepted
**Date:** 2026-09-30
**Section:** §4b

> **Renumbered on 2026-09-30**, from 0205, when this branch (#454) was merged.
> `main` had meanwhile accepted a different 0205 — *a line the library declares
> is measured against every ground it is drawn on* (#451) — and two records
> sharing a number is fatal ([0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)).
> `0206` was taken by the same run that filed the clash, so this record takes
> `0207`. Nothing in it changed but its number; references on the branch were
> updated with it.

## Context

`Loom marketing` filed two findings on 29 September, both owned by this lane,
both about a band that says it is centred and is not.

The first says `loom.hero`'s `align: "center"` *"centres the boxes and not the
words"*, and quotes the primitive spending the prop on `alignItems` alone. The
second says `loom.section` has no `align` at all, so a band with an eyebrow —
a fixed field the primitive renders itself, not a node a composition can give a
prop to — must be ranged left whatever the rest of the band is doing.

**The first finding's diagnosis is wrong, and the way it is wrong is the whole
decision.** `loom.hero` has emitted `textAlign: centred ? "center" : "start"` on
its text column since #403 on 26 September, three days before the finding. The
remedy the finding asks for — *"`align: "center"` also emitting `textAlign:
"center"` on the band, so the enum means what its name says and children inherit
unless they override"* — was already shipped, and the headline was still ranged
left on a production build. The finding measured the page correctly and read the
wrong line of the file.

What it missed is that the children **do not** inherit unless they override.
They override unconditionally. `loom.heading` and `loom.prose` both read

```ts
textAlign: given.align ?? "start"
```

and an inline `start` is not a default — it is an override of every ancestor that
had an opinion. Rendering a centred hero holding a `loom.heading` that sets no
`align` prints the contradiction in one column:

```html
<div style="…align-items:center;text-align:center;…">
  <span style="…text-transform:uppercase;color:var(--loom-accent)">EYEBROW</span>
  <h1 style="…color:var(--loom-fg-default);text-align:start">The headline</h1>
```

The eyebrow is centred and the headline is not, in the same column, under the
same declaration. The difference between them is that the eyebrow is a string
this primitive renders itself and therefore states no alignment, while the
headline arrived as a node carrying a hardcoded one. **A band cannot be
contradicted by a node it was handed and still mean what its prop says.**

Three primitives carried the defect — `loom.heading`, `loom.prose` and
`loom.stat-grid` — and auditing the rest of the library for it found a fourth
shape: `loom.banner` spends `align` on `justifyContent` and states no text
alignment at all, so its centred message's words range left inside a centred box.

Nothing in 3,254 tests could see any of it. No assertion in the repository
pinned a `text-align` on a heading or a paragraph, and none could have usefully:
both values are valid, both render, both validate, and neither overflows. This is
the third consecutive finding of that shape, and `Loom marketing` already wrote
down the generalisation — *when a camera finds an unset prop, the deliverable is
the invariant, not the prop.*

## Decision

**A primitive states a text alignment exactly when it arranged boxes on the
inline axis. Otherwise it states none and inherits.**

| | states `text-align` | why |
| --- | --- | --- |
| `loom.hero`, `loom.empty-state`, `loom.person`, `loom.overlay`, `loom.banner` | **both branches, always** | they set `align-items` or `justify-content`, which do not inherit. A centred box holding ranged-left words is the same defect from the other side, so whoever arranges the boxes owns the words in them |
| `loom.heading`, `loom.prose`, `loom.stat-grid`, `loom.section` | **only when given** | they arrange no boxes on the inline axis — a heading is glyphs, a section's regions stay `stretch`, a stat grid fits columns with `auto-fit` — so they have nothing for an alignment to agree with, and absent a prop they have no opinion |

The mechanism for the second row is one spread rather than a `??`:

```ts
...(given.align === undefined ? {} : { textAlign: given.align })
```

Two consequences are the point rather than side effects. `loom.section` gains an
`align` that governs its **words and not its boxes**, so one prop reaches the
eyebrow, the heading region and the children together by inheritance, without
shrink-wrapping a grid or a table to its content. And a leaf keeps its own
`align`, so an author who wants one paragraph ranged left in a centred band still
says so on the paragraph — inheritance adds a default, it removes no reach.

### Where the line is drawn, and why the generic arrangers are on the other side of it

`loom.stack`, `loom.grid` and `loom.split` also have an `align`, they also set
`align-items`, and they are deliberately **not** changed.

Their `align` is named for and documented as the CSS box-alignment property, and
its value set includes `stretch`, which is not a text alignment at all. For a
`row` stack it governs the block axis, where `text-align` means nothing. These
are the general arrangers — `loom.stack`'s own description says *"prefer a named
band where one fits"* — and their contract is boxes.

The test that settles it is the granularity doc's, which is reachability rather
than taste: with the leaves inheriting, a composition that wants a stack's words
centred sets `align` on the heading and the paragraph in it, and that works
today. Nothing is unreachable through a stack. What was unreachable was a
section's eyebrow, and that is what gained a prop.

## Consequences

- A centred band centres the words in it, on every page in the repository and
  every page nobody has written yet. This moves pixels wherever a band declared
  `center` and its children did not, which in this repository is the arrangement
  that was already wrong.
- A `loom.prose` inside a container that states `text-align` now follows it —
  `loom.comparison`'s answer cells (`center`), `loom.table-cell` (its own
  `align`), `loom.message`'s `system` speaker (`center`). Each of those
  containers set that alignment on purpose and was being ignored.
- `align` on `loom.section` is a new optional prop, so no existing tree changes
  meaning. It is the fifth band to carry the `["start", "center"]` vocabulary and
  spells it the same way.
- The invariant is asserted as a sweep over the registry rather than as a case
  per primitive, so a hundredth primitive that hardcodes `text-align: start`
  fails a test naming the rule instead of shipping.

## Alternatives considered

**Rename `align` to say only the axis it governs**, which the finding offers as
its second remedy. Rejected: the prop's name is not the problem — the prop was
already doing what its name says, and the leaf was overruling it. Renaming would
have left the contradiction in place under a longer name, and broken every tree
that sets it.

**Give `loom.section` an `align` that also sets `align-items: center`**, matching
`loom.hero`. Rejected on the render: a section's children are full-width regions,
and shrink-wrapping a `loom.comparison-table` or a `loom.feature-grid` to its
content is a worse bug than the one being fixed. The hero centres boxes because
its content *is* a text column; a section's is not.

**Put `text-align: start` in the library stylesheet on `loom.page` and let
everything inherit from there.** Rejected: it makes the root the only place the
default is visible and re-introduces the same override one level up, where a
centred band would have to fight a sheet rule with an inline style rather than
simply being inherited from.
