# 0051. A slot is a region the primitive places, not content inline in its children

**Status:** Accepted
**Date:** 2026-08-11
**Section:** §3 → §4b

## Context

The tree has had a `slot` node kind since [0001](0001-tree-and-delta-as-the-unit-of-change.md),
a primitive has been able to declare `slots: readonly string[]` since §4, and
[0013](0013-the-registry-is-what-the-model-is-told-it-may-build.md) puts those
names in the catalogue so a model is told which regions exist. Until now, none
of that reached the primitive. The renderer resolved a slot node to the host's
projection or to the node's own children as a fallback, and then handed the
result to the enclosing primitive **inline, inside `children`**, in tree order,
with nothing to say which slot it came from.

That made a declared slot a claim with no mechanism behind it. A primitive with
two regions — a heading area and a body, two columns, a card with a media
region and a text region — could not place them, because by the time it saw
them they were an undifferentiated list. The only way to express "the image
goes on the left" was "the image is the first child", which is a convention no
schema states, every `move` can break, and no reviewer can check.

The port made this concrete rather than theoretical. Hermes' `side-by-side`
layout is two regions, and porting it to a primitive that composes — rather
than to a page-level setting, which is what it was — needs the two regions to
be nameable.

## Decision

**An element's `slot` children are handed to its primitive as named regions, on
`loom.slots`, and they are not in `children`.**

- `LoomRenderContext` gains `slots: SlotChildren` — a name-keyed map of rendered
  content, always present, and the shared empty map when the node has none. A
  primitive reads `loom.slots.start` without first proving the map exists.
- The map has a **null prototype**, for the reason `staticPrimitiveResolver`
  already guards: slot names are lowercase identifiers, `constructor` is one,
  and an AI-authored name resolving to a function off `Object.prototype` is not
  a bug anyone debugs quickly.
- **Only direct slot children are routed.** A slot nested inside another slot's
  fallback renders where it sits. Hoisting it to the nearest element ancestor
  would move content out of the region a person put it in, and a region whose
  contents can be relocated by depth is not a region.
- **Two slot children sharing a name are both placed**, in tree order, rather
  than one winning. A render that depends on child order in a way nothing else
  here does is a render nobody can predict.
- **Host projection is unchanged and routes through the region.** `options.slots`
  still names what a host projects; it is resolved exactly as before, and the
  result is what the primitive receives under that name. A host projecting into
  a region a primitive does not place gets nothing, which is the same contract
  as the fallback.
- **A primitive that does not place a region renders nothing for it.** That is
  the cost of the decision, and it is the same failure shape as dropping
  `loom.editable` — see the open question in the day's report about probing for
  it.

## Consequences

- A declared slot now means something operationally. `slots: ["start", "end"]`
  is the primitive's promise about what it will place, the catalogue shows it,
  and a model composing into those names gets what it asked for.
- Content that used to appear inline now appears where the primitive puts it,
  which is a **behaviour change for any primitive that rendered `children` and
  relied on slots being in it**. Inside this repo that was the two test
  primitive sets, which now place what they are handed — the same way they grew
  to apply `loom.theme` when 0050 landed. Nothing outside the repo consumes it
  yet.
- The renderer allocates for this only when a node actually has a slot child.
  Every other node gets the shared frozen empty map.
- `children` is now exactly the non-slot children, so "everything the tree put
  inside this element" is two reads rather than one. That is the honest shape:
  they are placed differently and a single list said otherwise.

## Alternatives considered

**Leave slots inline and let primitives find them.** Nothing in `children`
identifies a slot once it has been rendered to React — the Fragment carries a
key, not a name — so a primitive would have to inspect element internals. It
would also make the region's identity depend on React's element shape, which is
not a contract Loom controls.

**Add `loom.slots` while keeping slot content in `children` too.** Additive and
non-breaking, and wrong: a primitive that placed a region *and* rendered
`children` would emit the content twice, with two elements carrying the same
`data-loom-node` id. The portal addresses nodes by that attribute, so a
duplicate is worse than a gap.

**Route every slot in the subtree to the nearest element ancestor.** Would let a
tree bury a slot arbitrarily deep and still have it land in the right region.
Rejected because it silently relocates content across nesting levels — the tree
would no longer describe where things are, which is the property the whole
runtime rests on.

**A `regions` prop on the primitive definition, distinct from `slots`.** A
second vocabulary for the thing `slots` already names, introduced only because
the first one had no implementation. Cheaper to give `slots` its meaning.

**Give the primitive the slot *nodes* rather than rendered content.** Would let
a primitive decide whether to render a region at all. Rejected: it hands a
primitive the renderer's job, and a primitive that could choose not to render a
subtree makes the page no longer a total projection of the tree
([0008](0008-the-renderer-is-a-total-pure-projection.md)).
