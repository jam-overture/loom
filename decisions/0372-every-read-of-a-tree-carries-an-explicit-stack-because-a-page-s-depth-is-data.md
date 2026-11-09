# 0372. Every read of a tree carries an explicit stack, because a page's depth is data

**Status:** Accepted
**Date:** 2026-11-08
**Section:** §2 — Composition Runtime, the tree

## Context

Every read of a tree in this repository was a recursive generator. `walkTree`
yielded its root and delegated to itself per child with `yield*`; `walkOutline`
did the same carrying a depth, a parent and an index; `nodePath` recursed and
rebuilt the chain at every level with a spread; `isDescendantOf` recursed and
called `findNode` on the way down.

Three costs, and only the first of them is visible in a reading of the code.

**A delegated yield is paid once per delegating frame.** `yield*` passes each
value back up through every frame between the generator that produced it and the
consumer, so a node at depth *d* costs *d*, and a walk costs the **sum of the
depths** rather than the number of nodes. On a chain, measured on this branch's
container before the change:

| depth | `outlineTree` | `collectNodeIds` | `nodePath` |
| --- | --- | --- | --- |
| 1,000 | 20.0 ms | 16.8 ms | 12.1 ms |
| 2,000 | 62.2 ms | 48.4 ms | 28.7 ms |
| 4,000 | `RangeError` | 225.9 ms | 101.0 ms |
| 8,000 | `RangeError` | `RangeError` | `RangeError` |

Per-node cost doubles when the depth doubles, which is the signature of the sum.

**Past a few thousand deep the read does not return at all.** `RangeError:
Maximum call stack size exceeded`, which is not a slow answer but no answer, and
the depth it arrives at is a property of the engine and its stack rather than of
anything Loom states.

**A path copied down costs the square of the depth.** `[root, ...childPath]` at
every level allocates the whole chain again per level.

Nothing on any surface was near this. A real page is wide and shallow — the
6,000-node page rule 4 is written against is a few tens deep — and
`Loom signals` filed it with the numbers rather than as a defect, because what
it bounded was a **claim**: `pageReadingOf` and `insideReadingOf` are each
documented as linear in the parts of a page, and both begin by calling
`outlineTree`.

That is the reason this is worth a record rather than a line in a report. A
depth bound nobody wrote down is a bound every caller inherits and none of them
can see, and the shape that produces it — a recursive generator — is the shape a
reasonable engineer reaches for and the tidier of the two to read.

## Decision

**A read of a tree carries an explicit stack. It does not recurse, and it does
not delegate a yield.**

1. `walkTree` and `walkOutline` push their root onto an array, pop, yield, and
   push the popped node's children in reverse so that the pre-order and the
   sibling order are unchanged. One frame yields; no frame delegates.
2. `nodePath` walks the same way over a `Descent` — a node and the step it was
   reached from — and reads the chain back off those links when it finds its
   node. A link per node replaces a chain per level.
3. `isDescendantOf` asks `walkTree` for the subtree under the ancestor and skips
   the first node it yields, which is the ancestor. Nothing recurses and nothing
   re-searches the tree per level.
4. The bound is the heap rather than the stack. A chain of **500,000** outlines
   in 195 ms, walks in 42 ms and gives a path in 58 ms.
5. **The guard is a test at a depth no page meets.** `src/tree/depth.test.ts`
   reads a chain of ten thousand six ways. All four of its cases throw
   `RangeError` against the implementation this record replaces, which is how it
   is known to be a guard and not a decoration.

What is unchanged: every output. The existing suites for both modules pass
untouched — pre-order, sibling order, `depth`, `parentId`, `index`, the path's
direction, and `isDescendantOf`'s answer for a node asked about itself.

## Consequences

**The two readings that were linear only up to this are now linear.**
`pageReadingOf` and `insideReadingOf` in `src/signals/` inherit the bound
through `outlineTree` and need no change of their own; the finding that asked
for this is closed by that.

**A reader of these modules is told why.** Both module docblocks now say that
the walk carries a stack and what a delegated yield costs, because the recursive
spelling is shorter and a later run would otherwise restore it as a
simplification.

**The write path is now the shallower bound, and it is worse.** `replaceNode`
rebuilds a tree recursively and calls `containsNode` at every level, so it is
`O(n·d)` and it throws at **2,000** deep — against 23.6 ms at 1,000 and 7.2 ms
at 500. Every accepted delta goes through it. That is filed rather than fixed
here: this record is about reads, a rebuild is a different shape of change, and
one unit that changes both is one nobody can review.

**Zod's `loomNodeSchema` recursion is untouched**, so `parseTree` keeps whatever
depth bound the parser has. Nothing here claims otherwise.

**A new test file costs 81 ms** of the suite, building four chains of ten
thousand. That is the price of the guard and it is cheap at the depth chosen.

## Alternatives considered

**Leave it, and write the bound down instead.** Rejected, and it was the honest
candidate — nothing is red, no page is near it, and the finding itself says *if
it is ever worth fixing*. What decided it the other way is that two modules in
another lane publish a linearity claim that this made false, and the remedy is
smaller than the paragraph that would have to explain the exception.

**A depth cap, refused above a stated limit.** Rejected. It would turn an
engine's stack size into a number in Loom's schema, and the schema says nothing
about depth today. A cap is also a migration: trees already stored would have to
be checked against it.

**Keep the recursion and raise the stack with `--stack-size`.** Rejected. It is
a flag on every process that reads a tree — a server, a build, a test runner, a
reader's `next start` — and it moves the bound rather than removing it. It would
also be invisible to the one person who runs the suite by hand.

**An iterator stack rather than a node stack**, pushing `children().entries()`
per level and resuming the top one. Rejected as the harder of two linear
spellings: it holds an iterator per level where this holds a node per pending
child, and the sibling order falls out of the reversal plainly enough that the
extra machinery buys only the avoided reversal.

**Make `walkTree` return an array rather than a generator.** Rejected. `findNode`
and `textOf` stop at the node they want, and a page of 6,000 nodes materialised
on every `containsNode` is a real cost paid to remove a bound that only a chain
reaches.

**Fix `outlineTree` alone, as the finding names it.** Rejected. `walkTree` has
the identical defect and six readers — `collectNodeIds`, `findNode`,
`containsNode`, `findParent`, `textOf`, `duplicateNodeIds` — so a branch that
fixed the outline and left the walk would have published a bound that reads as
removed, and the test file asserting a depth of ten thousand would have had to
name which reads were excused.
