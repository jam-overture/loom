# 03 — Change as data: the delta

**After this lesson you will be able to** write a `TreeDelta` by hand, predict
what it does, explain why there are exactly four operations, and say why a
half-applied delta is worse than a rejected one.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md).

---

## The problem

You have a tree. Something wants to change it. What is the smallest honest
description of "a change"?

Too coarse — "here is the new tree" — and you have thrown away what changed.
Too fine — a stream of character edits — and you have a diff again. Too rich —
twenty specialised operations — and every consumer of a delta has twenty cases
to handle, forever.

The vocabulary you pick decides two things at once: what AI is able to propose,
and how hard it is for a human to review a proposal. Those pull in opposite
directions.

---

## The idea

Four operations. That is the whole vocabulary.

```ts
{ op: "insert",    parentId, index, node }
{ op: "remove",    nodeId }
{ op: "move",      nodeId, parentId, index }
{ op: "configure", nodeId, set, unset }
```

A `TreeDelta` bundles them:

```ts
{
  deltaId,
  treeId,
  baseRevision,          // the revision this was authored against
  operations: [ ... ]    // ordered, at least one
}
```

Three properties do the heavy lifting.

### Ordered, and each sees the last one's effect

Operations apply in sequence. Operation 2 can target a node operation 1
inserted. This is what lets one delta express a coherent multi-step change —
"add a banner, then move the footer into it" — rather than forcing the model to
propose three separate changes that are individually meaningless.

### Atomic

If any operation fails, **the whole delta is discarded** and the tree is
untouched. Never half-applied.

This is not defensive coding; it is a correctness requirement. A half-applied
delta produces a tree that *no proposal ever described*. Nobody approved it,
telemetry cannot attribute it, and the inverse delta computed for the whole
change no longer matches reality. You would have a tree in a state with no
provenance and no undo. Rejecting is always better.

### Authored against a named revision

`baseRevision` says which version of the tree the proposer was looking at. Apply
it to a tree at a different revision and it is refused with `revision-mismatch`.

This matters because interpretation is slow. A model takes seconds; a tree can
move in that time. Without this check, a stale proposal would apply against a
tree it never saw, and `index: 2` would silently mean something different from
what the proposer meant.

### Why `configure` covers all three node kinds

An element has props. A text node has a value. A slot has a name. Three
different things to set — which looks like it needs three operations.

Instead each node kind exposes a **settable surface** as a plain record:

| Kind | Surface |
| --- | --- |
| element | its props — open key space, the primitive owns their meaning |
| text | `{ value }` |
| slot | `{ name }` |

So one `configure` handles all three. Text and slot have exactly one required
key, so unsetting it is refused rather than producing a malformed node. This is
the trick that holds the count at four instead of growing one operation per kind.

---

## In the code

| What | Where |
| --- | --- |
| The operations | [`src/tree/delta.ts`](../src/tree/delta.ts) |
| Applying them | [`src/tree/apply.ts`](../src/tree/apply.ts) |
| The settable surface | [`src/tree/configuration.ts`](../src/tree/configuration.ts) |
| Structural edits | [`src/tree/mutation.ts`](../src/tree/mutation.ts) |

`applyDelta` returns `Result<LoomTree, TreeError>` — it does not throw. Lesson 05
is about why.

---

## Try it

```ts
import { describe, expect, it } from "vitest"
import { sampleTree } from "./testing/fixtures.js"
import { applyDelta } from "./tree/apply.js"
import { buildElement } from "./tree/builders.js"
import { sequentialIdFactory } from "./ids.js"
import { childrenOf } from "./tree/node.js"
import { findNode } from "./tree/navigation.js"

const spare = sequentialIdFactory("x")

describe("deltas", () => {
  it("applies operations in order", () => {
    const { tree, ids } = sampleTree()
    const banner = buildElement(spare, { type: "loom.banner" })

    const result = applyDelta(tree, {
      deltaId: spare.deltaId(),
      treeId: tree.treeId,
      baseRevision: 0,
      operations: [
        { op: "insert", parentId: ids.page, index: 0, node: banner },
        { op: "configure", nodeId: banner.id, set: { tone: "loud" }, unset: [] },
      ],
    })

    if (!result.ok) throw new Error(result.error.code)
    console.log(childrenOf(result.value.root).map((c) => c.id))
    console.log(result.value.revision)
    // Q1: what is the revision now? What was the original tree's revision?
  })

  it("is atomic", () => {
    const { tree, ids } = sampleTree()
    const banner = buildElement(spare, { type: "loom.banner" })

    const result = applyDelta(tree, {
      deltaId: spare.deltaId(),
      treeId: tree.treeId,
      baseRevision: 0,
      operations: [
        { op: "insert", parentId: ids.page, index: 0, node: banner },
        { op: "remove", nodeId: spare.nodeId() }, // a node that does not exist
      ],
    })

    console.log(result.ok)
    console.log(findNode(tree.root, banner.id))
    // Q2: did the banner land? Why not?
  })
})
```

Now **reorder within one parent** — this is the one that catches people:

```ts
it("moves in post-detach coordinates", () => {
  const { tree, ids } = sampleTree()
  // page has three children: header(n_2), main(n_5), footer(n_6)
  // Goal: move the header to the END.
  const result = applyDelta(tree, {
    deltaId: spare.deltaId(), treeId: tree.treeId, baseRevision: 0,
    operations: [{ op: "move", nodeId: ids.header, parentId: ids.page, index: 2 }],
  })
  console.log(result.ok && childrenOf(result.value.root).map((c) => c.id))
  // Q3: why index 2 and not 3? Try 3 and see what happens.
})
```

Finally, try to violate the rules. Predict each before running:

```ts
// Q4: which of these fail, and with which error code?
{ op: "remove", nodeId: ids.page }                                    // the root
{ op: "move", nodeId: ids.main, parentId: ids.card, index: 0 }        // into its own child
{ op: "insert", parentId: ids.headline, index: 0, node: banner }      // into a text node
{ op: "configure", nodeId: ids.body, set: {}, unset: ["value"] }      // unset a text value
```

---

## It could have been otherwise

**A fifth operation: replace the whole tree.** Rejected deliberately — it
collapses a reviewable change into an opaque one, undoing lesson 01.

**Separate `setText` and `renameSlot` operations.** Rejected: the uniform
settable surface already covers them, and each extra operation is a permanent
tax on apply, invert, analyse, and the Gate's mental model.

**Apply what succeeds, skip what fails.** Rejected: produces trees no proposal
described. Covered above — this is the one worth internalising.

**`move` index in pre-detach coordinates.** Genuinely ambiguous, and the
opposite convention is equally defensible. Loom defines `move` as detach-then-
insert, so the index is read against the child list the node has *already left*.
It is documented and tested precisely because a silent disagreement here
produces off-by-one bugs in every editor built on top.

---

## Check yourself

1. Why does a delta name `baseRevision` rather than just applying to whatever
   tree it is handed?

2. You want to swap two sibling nodes. How many operations, and what are they?

3. Why is refusing a delta better than applying the 3 of 4 operations that
   worked?

4. `configure` on a text node with `set: { colour: "red" }` is refused. Why —
   and where would that colour actually live?

---

## Deeper

- [`decisions/0001`](../decisions/0001-tree-and-delta-as-the-unit-of-change.md)
- [`src/tree/delta.test.ts`](../src/tree/delta.test.ts) and [`apply.test.ts`](../src/tree/apply.test.ts) — the tests are the specification
- Next: 04 — Identity: the id that never moves *(not yet written)*

---

## Answers

**Q1** Revision 1; the fixture starts at 0. Every accepted delta increments it by
exactly one, regardless of how many operations it contained. A delta is one
change.

**Q2** No. `result.ok` is `false` with `node-not-found`, and the original tree is
untouched — `findNode` returns `null` because `tree` is immutable and was never
modified. Atomicity here is not a rollback; there was nothing to roll back,
because applying builds a *new* tree and the failure means it was discarded.

**Q3** Because `move` detaches first. Once the header leaves, `page` has two
children — so the valid indices are 0, 1, 2, and 2 means "at the end". Index 3
fails with `index-out-of-range`.

**Q4** In order: `root-not-detachable`, `move-into-descendant`,
`not-a-container`, `invalid-configuration` (`value` is required and cannot be
unset).

**1** Because interpretation takes seconds and the tree can move underneath it.
Without the check, a proposal authored against an older tree would apply anyway,
and every positional index in it would mean something the proposer never
intended. It converts a silent wrong-target into a loud refusal.

**2** One `move` is enough. To swap `[A, B]`, move `A` to index 1 — after
detaching `A` the list is `[B]`, so index 1 puts it after `B`. Two moves also
work but say less about intent; prefer the one that reads as what happened.

**3** Because the resulting tree would be one nobody proposed, nobody approved,
and nothing can attribute. The inverse delta computed for the full change would
no longer match reality, so it would not even be undoable. A refusal leaves you
in a known state; a partial application leaves you in an unaccountable one.

**4** Text nodes have exactly one settable key, `value` — so `colour` is refused
with `unconfigurable-key`. Presentation is not text's business: the colour
belongs in the props of the *element* that contains the text, and that element's
registered primitive decides what `colour` means. This keeps content and
presentation on separate nodes, which is also why "rewrite this sentence" and
"restyle this card" are different operations on different targets.
