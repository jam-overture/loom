# 0380. The three walks outside `src/tree/` carry an explicit stack, and React was never the bound on rendering a deep page

**Status:** Accepted
**Date:** 2026-11-11
**Section:** §2 — Composition Runtime; §3 — Interpretation; §4 — Registry

## Context

[0372](0372-every-read-of-a-tree-carries-an-explicit-stack-because-a-page-s-depth-is-data.md)
took the shape bound off every **read** of a tree and
[0373](0373-an-edit-to-a-tree-descends-by-the-path-and-rebuilds-a-sibling-list-in-one-pass.md)
off every **edit**. Both are about `src/tree/`, and a reader of either could
reasonably think the claim covered the framework. It did not. `Loom daily build`
filed that gap itself on 9 November, naming three walks that still spent a call
frame per level, and filed it **rather than fixing it** — with the standing
instruction *do not open this because it is tidy*, because neither 0372 nor 0373
had been paid for by tidiness and these had no figure yet.

This record is what measuring them produced. **All three were worse than the
finding assumed, and the reason it gave for leaving the biggest one alone was
wrong.**

| | what it is | before |
| --- | --- | --- |
| `src/render/render.ts` `renderNode` / `renderChildren` | **every page render** | `RangeError` at **1,000** deep |
| `src/interpretation/materialize.ts` `materializeNode` | AI output becomes a tree | `RangeError` at **2,000** deep; **quadratic in width** |
| `src/runtime/nesting.ts` `collect` | every target this tree puts inside another | `RangeError` at **10,000** deep |

Measured on this session's container with `tsx`, default stack, one run per
size.

**The render walk was the shallowest bound in the framework** — a thousand
elements, on the path every one of the four surfaces takes — and the finding had
ranked it last of the three. Its argument was that React recurses per level
underneath, so removing Loom's recursion would buy a smaller improvement than it
looks. **That is measurably false.** React's own server renderer is not
recursive in a way that bounds depth:

| `renderToStaticMarkup`, no Loom in the tree | 10,000 deep | 50,000 deep |
| --- | --- | --- |
| plain host elements | 15 ms | **45 ms** |
| one function component per level — what Loom emits | 36 ms | **135 ms** |

So what stopped a deep page was Loom's own recursion, and nothing else.

**`materializeNode` was quadratic as well as recursive**, which no one had
measured because it needed a draft fixture rather than a tree. `collectResults`
spread its accumulator per item, the same defect 0373 found in a sibling
rebuild:

| children of one parent | 8,000 | 16,000 | 32,000 |
| --- | --- | --- | --- |
| before | 70 ms | 690 ms | **4,704 ms** |
| after | 3.7 ms | 4.2 ms | **14.2 ms** |

**How wide a reply is, and how deep, is the model's choice.** That is the whole
argument for this one: every other bound in this repository is on a shape a
person authored, and this is the one door where the shape arrives from outside.

## Decision

**A walk over a tree carries an explicit stack wherever it lives, not only in
`src/tree/`.** All three are loops.

1. **`renderSubtree` replaces `renderNode` and `renderChildren`.** It holds a
   work stack of `read`, `build` and `fill` steps and a stack of finished
   children. `renderElement` is split at the seam `renderElementBody` sat on:
   `prepareElement` does everything that does not need children and returns the
   **assembly** that finishes the element around them. `elementBodyFrom` renders
   nothing and only routes already-rendered children into `children` and named
   slots.
2. **Both orders that are observable are preserved, and each is a test.**
   Elements are prepared **on the way down**, in document order, because the
   anchor ledger claims first-in-document-order and the diagnostic list is read
   in that order. Elements are built **on the way up**, around children that are
   already `ReactNode`s. A node the renderer omits — unknown primitive, invalid
   props — is pushed as `null` and **its subtree is never read**, which is what
   keeps it from raising a diagnostic per descendant.
3. **`materializeNode` decodes props on the way down and mints ids on the way
   up.** Both are observable and neither moved: the outermost unreadable prop
   bag is the one refused and its message is the one the caller gets, and a
   node's id is in the delta the proposer gets back, so every child is minted
   before its parent in document order exactly as the recursion minted them.
4. **`collectResults` appends to one array** instead of spreading the
   accumulated values per item. It still stops at the first failure, in order.
5. **`nestedTargetsIn` carries the nearest enclosing target on its stack**, one
   entry per pending node, and pushes children in reverse so the fault list
   keeps document order.
6. **The bound is the heap rather than the stack, at the figure 0372
   published.** All three answer at **500,000**: `nestedTargetsIn` in 17 ms,
   `materializeDelta` in 393 ms, `renderLoomTree` in 1,829 ms. The framework now
   has one depth answer rather than one per directory.
7. **The guards are tests at a depth and a width no page meets**, in
   `src/render/shape.test.ts`, `src/interpretation/shape.test.ts` and
   `src/runtime/shape.test.ts`, using `src/tree/shape.test.ts`' own 10,000 and
   60,000 so the repository holds one pair of figures. Seven of the eleven new
   assertions fail against the implementations this replaces — five with
   `RangeError`, two by taking **21 seconds each**.

**What is unchanged is every output.** The 1,225 existing tests across
`src/render/`, `src/runtime/` and `src/interpretation/` pass untouched: slot
routing, two slots sharing a name, a slot nested in a slot's fallback,
decorative copies, themes, literals, diagnostics, anchors, and the id sequence a
draft materializes to.

## Consequences

- **A deep page renders.** The surface this most affects is whichever one first
  composes a page a thousand elements deep; none does today, and the point of a
  bound this far out is that no page meets it by accident.
- **The interpretation door no longer has a shape its caller cannot see.** A
  model that replies with 32,000 operations is answered in 14 ms rather than
  4.7 seconds, and one that replies 10,000 deep is answered at all.
- **`renderElement` is two functions where it was one**, and the second is a
  closure over the first's locals. That is the price of the split and it is
  visible in the diff; a reviewer should read `prepareElement`'s return and
  `renderSubtree`'s `build` step together.
- **One closure per element is live per level of depth**, not per node: the work
  stack holds an assembly only between an element's preparation and its build.
- **A finding this closes was right to be filed and wrong in its ranking.** The
  lane's own rule — *do not open this because it is tidy* — worked: the run that
  measured it found a defect the run that filed it had argued itself out of.
- **React's cold render drops elements, and that is now filed.**
  `renderToStaticMarkup` on a chain of ~1,000 function components returns 994 of
  them on the **first** call in a fresh process and all 999 on the second, with
  no Loom in the tree. It is React's and not ours, it is only reachable at
  depths that threw before today, and it is why the new render guards count
  Loom's own element tree rather than the markup.

## Alternatives considered

**Leave all three, as the finding recommended.** Rejected by its own closing
condition: it asked for a measurement first and said to treat whichever a number
justified. The numbers justified all three, and the one it ranked last turned
out to be the shallowest bound in the framework on the most-travelled path.

**Fix `materializeNode` only.** It is the cleanest argument — the shape arrives
from outside — and it was the finding's own pick. Rejected because it would
leave the render path bounded at 1,000 while publishing a record saying the
depth bound is gone, which is the exact misreading 0372 and 0373 produced and
this record exists to end.

**Give `renderNode` a trampoline rather than restructuring `renderElement`.** It
would have kept the diff to one function. Rejected: a trampoline over a function
that must interleave per-node work with its children's results needs the same
pre/post split to be correct, and hides it. The split is the change; the loop is
what the split makes possible.

**Keep `collectResults` on `reduceResult` and accept the quadratic cost.** It is
the smaller diff and `reduceResult` is the house combinator. Rejected: the cost
is the square of a number this repository does not choose. `reduceResult` is
still right wherever the accumulator is not a growing list.

**Count the markup in the render guard, and retry past React's cold render.**
Rejected: a test that renders twice to get a stable answer encodes somebody
else's defect as this repository's expectation. Counting Loom's own output
measures the thing under test, and the React behaviour is filed where a reader
will meet it.

**Treat the render change as `ARCHITECTURAL`.** Considered because every surface
renders. Rejected: it touches neither the tree schema nor the delta model,
requires no migration of built code, and contradicts no Accepted record — it
extends 0372 and 0373 to the directories they left out, which is what both said
they had not covered.
