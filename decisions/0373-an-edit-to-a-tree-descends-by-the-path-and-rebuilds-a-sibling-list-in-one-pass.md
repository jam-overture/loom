# 0373. An edit to a tree descends by the path and rebuilds a sibling list in one pass

**Status:** Accepted
**Date:** 2026-11-09
**Section:** §2 — Composition Runtime, the tree

## Context

[0372](0372-every-read-of-a-tree-carries-an-explicit-stack-because-a-page-s-depth-is-data.md)
removed the depth bound from every **read** of a tree and recorded that the
write path was now the shallower bound. `replaceNode` was left as filed, with
numbers, because a rebuild is a different shape of change from a read.

Measuring it to fix it found a second defect that the filing had missed, and it
is the larger of the two: **the rebuild is quadratic in a page's width, not only
in its depth.** Depth is a bound no real page approaches. Width is one a page
can reach.

`replaceNode` did two things per level. It called `containsNode(node, nodeId)`
to decide whether to descend, which is a walk of the subtree at every level. And
it grew each rebuilt sibling list through `reduceResult` with
`[...accumulated, next]`, which copies the siblings accumulated so far **once
per sibling**. The first costs `O(n·d)`. The second costs `O(w²)` in the width
of whichever node on the path has the most children — and it is paid whether or
not that node's subtree is the one being edited.

Measured on this run's container, `tsx`, default stack, one run per size:

| chain depth | before | after |
| --- | --- | --- |
| 500 | 25.4 ms | 3.1 ms |
| 1,000 | 43.7 ms | 2.0 ms |
| 2,000 | `RangeError` | 5.1 ms |
| 4,000 | `RangeError` | 4.4 ms |
| 100,000 | `RangeError` | 46.8 ms |
| 500,000 | `RangeError` | 182.0 ms |

| siblings of the edited node | before | after |
| --- | --- | --- |
| 6,000 | 54.1 ms | 1.1 ms |
| 60,000 | 15,731.4 ms | 11.4 ms |
| 600,000 | not measured — tens of minutes at the rate above | 124.8 ms |

Fifteen and a half seconds to swap one node among sixty thousand siblings is the
figure that moved this from *filed* to *fixed*. Rule 4 of the runtime is written
against a 6,000-node page, and at 6,000 siblings the cost is already 54 ms of
copying to change one of them. `applyInsert`, `applyMove` and `applyConfigure`
all go through `replaceNode`, and `insertChild` and `detachNode` call it, so
this is the cost of **every accepted delta**.

## Decision

**An edit to a tree descends by the path, not by a search, and rebuilds each
sibling list in one pass.**

1. `replaceNode` asks `nodePath` for the chain from the root to the addressed
   node — one walk, linear in nodes, iterative since 0372 — and folds back up
   it. There is no `containsNode` per level and no call frame per level.
2. Each ancestor is rebuilt with `container.children.map(child => child ===
   previous ? next : child)`: **one pass over the siblings, matching by
   reference.** The accumulate-with-a-spread idiom is what made this quadratic
   and it does not come back.
3. The fold carries a `Result`, so a failing `NodeTransform` still
   short-circuits and the error still surfaces unchanged.
4. **Where a tree holds the same id twice, the edit lands on the first in tree
   order** — the one `nodePath` addresses. The search this replaced edited every
   copy. No valid tree holds an id twice; `duplicateNodeIds` exists to find one
   that does. This is stated here and asserted in `mutation.test.ts` because it
   is a change to what a published function does, however unreachable the input.
5. The bound is the heap. A chain of **500,000** is edited in 182 ms; a node
   with **600,000** siblings has one of them swapped in 125 ms.
6. **The guard is `src/tree/shape.test.ts`**, which 0372 created as
   `depth.test.ts` and which is renamed here because width has joined depth as
   its subject. Five new cases: three edits to a chain of ten thousand, which
   throw `RangeError` against the implementation this replaces, and two edits
   among sixty thousand siblings, of which the swap takes 14.7 seconds against
   it — three times the suite's five-second limit — and 34 ms with it.

What is unchanged: every output. All fourteen of `mutation.test.ts`'s cases pass
untouched, including the two that pin the published promises — that the
addressed node is swapped and its ancestors rebuilt, and that subtrees off the
edited path keep their identity so a renderer can skip them by reference.

## Consequences

**The delta path is linear in a page, in both of its dimensions.** `applyDelta`,
`insertChild` and `detachNode` inherit it with no change of their own. An insert
beside a node 500,000 deep takes 251 ms where it threw at 2,000 before.

**`insertChild` and `detachNode` each still walk the tree more than once** —
`findNode` or `findParent` to validate, then `replaceNode` to edit. Each walk is
linear and iterative, so the cost is a constant factor, not a bound. Collapsing
them onto one descent is a legible further change and is deliberately not made
here: it would mean `replaceNode` publishing the path it took, and nothing needs
that yet.

**The module docblock says why, as `navigation.ts`'s does.** Both halves of the
reason are written down — no frame per level, and no copy per sibling — because
both spellings that produce them are the ones a reasonable engineer reaches for.

**A reader of `0372` is sent here.** Its consequence naming `replaceNode` as the
remaining bound now says this record fixed it.

**The remaining recursive tree walks in this lane are untouched and filed.**
`src/runtime/nesting.ts`'s `collect` throws `RangeError` at 10,000 deep;
`src/interpretation/materialize.ts` and `src/render/render.ts` recurse per level
as well. None of them is on the delta path, none has a quadratic factor found,
and the render path has React's own recursion under it, so a fix there is a
different argument. Filed with the one measurement taken.

**No cap on depth or width is written here either.** 0372 declined to turn an
engine's stack size into a number in Loom's schema and that still holds; this
record removes an accidental answer and does not write a deliberate one.

## Alternatives considered

**Fix only the `containsNode` per level, keeping the recursion.** Rejected. It
removes the `O(n·d)` factor and leaves both the stack bound and the whole of the
`O(w²)` one, which is the half that a real page can reach. It would also have
left the better-looking number — depth — fixed and the worse one standing.

**Fix only the spread, keeping the search.** Rejected for the mirror reason, and
because the two are one change: once the descent is a path, there is nothing
left to accumulate.

**Carry the child's index down instead of matching by reference.** Rejected as
machinery for nothing. Locating the child with `indexOf` or an index threaded
out of `nodePath` costs the same pass over the siblings that the rebuild already
pays, so `map` with a reference comparison is the same order and one expression.
Reference equality is also the stricter test: two siblings with the same id —
which no valid tree has — are still two different nodes to it.

**Have `nodePath` publish the indices alongside the chain.** Rejected for now.
It is the shape that would let `insertChild` and `detachNode` collapse onto one
descent, and it widens a published module's surface for an edit that is already
linear. When something needs the indices, that is the change to make.

**Keep the recursion and bless the depth bound in a doc.** Rejected on the same
grounds 0372 rejected it, and more easily: the width figure is not a bound that
can be documented away. Fifteen seconds to configure one node of a 60,000-node
page is a defect at any stated limit.

**Also fix `nesting.ts`, `materialize.ts` and `render.ts` in this unit.**
Rejected. None is on the delta path, the render one sits under React's own
per-level recursion so removing Loom's does not remove the bound, and a unit
that touched the render path to fix a depth nothing reaches would be a large
diff defended by a small number.
