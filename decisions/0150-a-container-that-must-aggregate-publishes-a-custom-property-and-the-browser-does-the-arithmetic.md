# 0150. A container that must aggregate over its children publishes a custom property, and the browser does the arithmetic

**Status:** Accepted
**Date:** 2026-09-13
**Section:** §4b

> **Why this number.** `0141`–`0149` are left free deliberately, which
> [0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)
> permits in as many words. Several lanes have branches open that can each claim
> the next free number without seeing the others; a clash is fatal to every
> lane's `pnpm verify` and a hole costs one line in the index.
>
> **Why `Accepted`.** It names a pattern for a constraint an `Accepted` record
> already imposes, and refines nothing. It changes no schema and touches neither
> the tree nor the delta model.

## Context

`docs/primitive-gap-inventory.md` measured the library on 13 September against a
maintainer target of 250 primitives, and found that the single largest hole in
ninety-two was that **nothing plotted a series**. `loom.stat` prints one figure,
`loom.meter` draws one proportion, `loom.spec` sets one measured fact inline.
Every number in this library stood alone, so a page could say *"99.9% uptime"*
and could not say *"here is uptime over six months"* — which is what a metrics
band on a product page does.

Building it hit a wall that is not about charts.

**A chart needs to know its largest value, and a container cannot ask its
children.** A render is a total pure projection of one node
([0008](0008-the-renderer-is-a-total-pure-projection.md)): a primitive receives
its own props and its already-rendered children, and there is no point at which
`loom.stat-chart` can read the `magnitude` of the six `loom.stat` nodes inside
it. This is the first primitive in the library that wanted a fact computed
*across* its children rather than about itself, and it will not be the last —
a progress group that scales to its longest bar, a column that sizes to its
widest cell, anything normalised.

Three ways round it were available and each is worse than the constraint:

- **React context.** A provider on the container, a consumer in the child. It
  works, and it makes a child's rendering depend on an ancestor — so a node no
  longer renders correctly on its own, which the portal does when it previews
  one, and which 0008 exists to guarantee.
- **Repeat the maximum on every child.** One number written *n* times, wrong the
  moment one copy is edited, and a `configure` on the container that cannot
  actually change the scale.
- **Compute it in a seam above the renderer.** Moves tree-shaped knowledge out of
  the tree and gives one primitive a private channel, which is the parallel
  channel [0052](0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)'s
  neighbours keep refusing.

## Decision

**A container that needs a value shared across its children declares it as a CSS
custom property on its own element; each child resolves its own geometry against
that property in a rule. The cross-child arithmetic happens in the browser.**

```
loom.stat-chart   style="--loom-chart-max: 120"      ← the ceiling, published
loom.stat         style="--loom-stat-magnitude: 79"  ← this node's own number
.loom-stat-chart > .loom-stat-plotted::before {
  height: calc(var(--loom-chart-plot) * min(1, max(0, var(--loom-stat-magnitude, 0) / var(--loom-chart-max, 100))));
}
```

Custom properties inherit, so the child reads the parent's value without either
render function reading the other's node. Three things are part of the decision.

**It is the bargain 0079 already struck, one axis across.**
[0079](0079-a-layout-css-alone-can-express-belongs-in-the-stylesheet.md) put
`loom.mosaic`'s rhythm in the stylesheet, and `loom.heading` caps its top two
steps with a container-query unit so that *"the browser rather than the render
function is what reads the width."* Both are the same move: the renderer stays a
pure projection of one node, and the layout engine — which is allowed to look at
more than one box — does what the renderer may not. This record names the move so
the next primitive that needs it does not rediscover it or reach for context.

**The aggregate is authored, not derived.** Because nothing can compute the
maximum, `max` is a prop with a default. That is not a shortfall dressed up: where
a chart's axis stops is what decides whether a rise looks steep or gentle, and a
chart that picked its own ceiling would be making the author's argument for them.
A primitive using this pattern states the shared value; it does not discover it.

**Out-of-range is clamped in the rule, never overflowed.** `min(1, max(0, …))` is
part of the pattern rather than a detail of this chart. A bar drawn out through
the band above it is a broken page; a bar at full height beside a printed value
larger than the axis is a chart that is merely scaled wrong, and only the second
is recoverable by looking at it.

## Consequences

- **`loom.stat-chart` exists** as a second container over `loom.stat`, by
  [0054](0054-a-container-is-its-childs-name-plus-the-arrangement.md) — the same
  call `loom.milestone-row` made over `loom.milestone`. A grid and a chart take
  the *same* children, so re-plotting a metrics band is one `configure` on the
  container and no change to the numbers; `library.test.ts` asserts that both
  containers accept the same child with no diagnostics.
- **`loom.stat` moved its type into the stylesheet**, because the stylesheet's
  first mechanic is that an inline style beats a rule, and a chart needs the
  figure at a column's size rather than a headline's. This is `loom.milestone`'s
  lesson a second time: *a child that lays itself out inline cannot be rearranged
  by the container it is in.* Every declaration moved verbatim and a stat outside
  a chart renders as it did.
- **`magnitude` is a second numeric field beside `value`, and is not a
  duplicate.** `value` is the string a reader sees (`"$1.2M"`); `magnitude` is
  where it sits on the scale (`1.2`). A bar cannot be drawn from a formatted
  string, and no single field can be both without the primitive parsing prose.
  It is optional, so a stat without it grows no bar rather than a zero-height
  stub, and every stat in every stored tree is untouched.
- **A fixture that had no stylesheet now has one.** `loom.stat` emits the shared
  sheet, so `samplePage` gained a hoisted `<style>` at the front of its markup
  and three re-theme tests that read the root's opening tag from the first byte
  had to reach past it. The sheet is byte-identical under every theme, which is
  [0049](0049-a-theme-is-three-ids-in-the-tree.md)'s guarantee holding rather
  than bending, and the tests now assert that too.
- **The pattern has a ceiling.** It carries scalars that inherit. It cannot carry
  a value that depends on *which* child is asking (a rank, an index, a running
  total), because every child inherits the same one. A primitive needing that is
  back at this record's Context with none of its options improved, and should say
  so rather than reach for context.

## Alternatives considered

**React context from container to child.** The obvious engineering answer and
the one that quietly breaks the property this system is built on: a node that
renders correctly only inside a particular parent is no longer a total pure
projection of itself, and the portal previews single nodes. Rejected on 0008.

**A `values` array prop on the container, with no child nodes.** Would make the
maximum computable in one render function. It is also exactly the shape 0052
forbids — repeated content as a prop, unaddressable, with no author and no
history per point, and `insert`/`remove` unable to reach a single reading.

**A numeric `value` on `loom.stat` instead of a second field.** Would avoid the
extra prop by making the printed string derived. Rejected because the formatting
is the author's: `"$1.2M"`, `"2.4×"` and `"99.9%"` are editorial choices a
formatter would take away, and the alternative is a `format` prop that is a small
programming language.
