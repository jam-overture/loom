# 0052. A repeated item is a node; a fixed field is a prop

**Status:** Accepted
**Date:** 2026-08-11
**Section:** §4b

## Context

Hermes' 70 blocks are **flat leaves**. A block sits in a `warp.blocks` list, and
everything it contains is in its own fields: `faq` holds an `items` array of
question/answer shapes, `stats` holds an array of value/label shapes,
`pricing-tiers` holds an array of tiers. Nothing nests, because nothing in
Hermes needed to — the renderer walked a list and each block drew itself.

Loom composes. So the port has to answer, for all 70, a question Hermes never
posed: **which of a block's contents become child nodes, and which stay props?**

The lazy answer is "all of it stays props" — every block ports as a leaf with
its arrays intact, and the port is a mechanical translation of `FieldDef[]` into
Zod. It renders identically. It is also wrong in a way that only shows up in the
part of Loom that is not the renderer.

Consider adding one question to an FAQ that has eight.

- **As an array prop:** the change is a `configure` on the FAQ node whose new
  value is the entire nine-item array. `analysis.ts` reports that one node's
  props changed; it cannot say that eight items are untouched.
  `stakes.ts` weighs a props change over a large value. The inverse restores all
  nine. `attribution.ts` walks the log to say who placed each *node* — and there
  is no node, so nobody placed the question. Reviewing it in the portal means
  reading two nine-item JSON blobs side by side.
- **As child nodes:** the change is one `insert`. The analysis names it, the
  Gate weighs one insertion, the inverse is one `remove`, the question is
  attributed to whoever proposed it, and the portal shows one added row.

Everything §1 and §2 built operates on nodes. Content held in an array prop is
outside all of it.

## Decision

**Repeated content becomes child nodes. Fixed fields stay props.**

The rule, stated so the remaining sixty can be ported against it:

- A field that holds **a list of things a person would add, remove, or reorder**
  becomes a container primitive plus a child primitive — `loom.stat-grid` over
  `loom.stat`, and by the same shape `faq` over `faq-item`, `pricing-tiers` over
  `pricing-tier`.
- A field that holds **one value of which there is exactly one** stays a prop.
  A stat's `value` and `label`, a divider's ornament, an image's `alt`. There is
  one of it, changing it is exactly a `configure`, and making it a node would
  mean a stat whose label had been deleted was still a valid tree.
- A field that holds **the block's own prose** becomes `text` child nodes, per
  [0001](0001-tree-and-delta-as-the-unit-of-change.md)'s reason for making text a
  node at all: a sentence should be addressable, movable and re-authorable the
  way a card is. `loom.heading` and `loom.prose` take their copy as children.
- **A prop that changes what is rendered is still a prop**, as long as the
  alternatives are a closed set the schema names. `loom.divider`'s three
  ornaments are three different renderings selected by one enum, not three
  primitives: a model turning a rule into a dot row should emit one `configure`
  the Gate weighs as the small reversible change it is, rather than a `remove`
  and an `insert` that reads as structural and loses the node's identity.

**Composition is `children`; a named region is a `slot`
([0051](0051-a-slot-is-a-region-the-primitive-places.md)).** Hermes' flat blocks
do not earn slots merely by having contents — a stat grid holds a list, not two
regions. A slot is for a place the primitive treats *differently* from the rest,
which is why `loom.section` has one for its heading and `loom.stat-grid` has
none.

## Consequences

- Trees get deeper and node counts get larger. An eight-item FAQ is nine nodes
  rather than one. That is the cost, and it buys every §1–§2 property on each
  item.
- The catalogue a model sees grows: two entries per list block rather than one.
  That is also the point — the model can now be told that a stat grid holds
  stats.
- A container cannot enforce what its children are, and does not try. Rendering
  is total ([0008](0008-the-renderer-is-a-total-pure-projection.md)), so a grid
  with something unexpected in one cell renders the unexpected thing rather than
  blanking the band.
- The remaining port is mechanical against this rule, which is what step 2 of
  §4b was for.

## Alternatives considered

**Port every block as a leaf with array props.** The mechanical translation,
and the fastest path to 70. Rejected for the reason above: it would put most of
a real page's content outside the delta model, and the runtime's central claim —
that every change is inspectable, gateable, attributable and reversible — would
hold only for the scaffolding between the content.

**Decompose everything, including fixed fields.** A stat as a node with two text
children, no props at all. Rejected: it makes structurally invalid states
expressible — a stat with no label, three labels, or a label where the value
goes — and moves constraints out of the one place ([0011](0011-a-primitive-declares-its-props-and-the-seam-enforces-them.md))
that enforces them on AI-authored input.

**Let each ported block decide case by case.** What the first ten would have
done without a rule. Rejected because sixty ports by sixty judgements is sixty
chances to be inconsistent, and the inconsistency would surface as a model that
cannot predict whether content is a prop or a child.

**A `list` node kind, between `element` and its items.** Would make "these are
the repeated items" explicit in the schema. Rejected: it is a fourth node kind
in every traversal, every delta operation and every analysis, to express
something an element with children already expresses — and it would be a tree
schema change, which is an escalation rather than a port decision.
