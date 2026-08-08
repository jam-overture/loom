# 06 — Undo as computation

**After this lesson you will be able to** say why undo in Loom is a delta rather
than a saved copy, invert each of the four operations from memory, explain why
inversion has to walk the delta forwards, say which operation is expensive to
undo and what that costs the system, and give the reason the log only ever grows.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md).

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Do not look anything up
until you have written something for all five.

1. State the property that puts a field on `CompositionRuntime`, then name one
   thing the pipeline calls that fails the test. (L05)
2. A `move` sends the first of three siblings to the end of the same parent.
   What `index` does the operation carry? (L03)
3. What does `baseRevision` protect against? (L03)
4. Why is text a node rather than a prop on its parent? (L02)
5. A node was removed, and a new node was built with the same type, the same
   props and the same text. Is it the same node, and what decides? (L04)

Question 2 is the one to get exactly right rather than approximately. It is
load-bearing for everything below, and getting it *approximately* right is how
this lesson goes wrong.

---

## Predict

In writing, before reading on:

> 1. A user deletes a card with a paragraph inside it, then presses undo. What
>    is the **smallest** thing you must have kept in order to put it back? Now
>    answer the same question for a user who *inserted* that card and then
>    pressed undo. If your two answers are the same size, at least one of them is
>    wrong.
> 2. A delta has three operations, in order. You want the delta that undoes it.
>    Is it enough to invert each operation on its own and reverse the list?
>    Answer yes or no. If no, name the missing ingredient precisely — not "state"
>    but *whose* state, at *which* moment.
> 3. Every one of the four operations has an exact inverse, always, with no
>    exceptions. So why would this system ever call a change irreversible? Give
>    two reasons, and neither of them may be "a bug".

Question 1 is the one that carries the lesson, and the trap in it is that the
first half has an obvious answer and the second half has a *different* obvious
answer, and most people give the first one twice.

---

## The problem

Undo is the feature everyone has implemented and nobody thinks is interesting.
The standard answer is a stack of snapshots: before each change, copy the
document; to undo, put the copy back. It works, it is three lines, and every
editor you have used does some version of it.

Now put it inside Loom and watch what breaks.

Lesson 01's whole claim is that a change is inspectable, gateable, attributable
and reversible, and that all four are claims *about the record*. A snapshot stack
satisfies none of them:

- **It is not inspectable.** "Put this 4KB document back" is exactly the opaque
  blob lesson 01 rejected. You cannot review it; you can only run it and see.
- **It is not attributable.** The record says a document was replaced. It does
  not say what was undone, or which of the changes since then were flattened on
  the way.
- **It is not gateable.** A restore is not four operations the Gate can weigh —
  it is one operation called "restore", and the Gate has nothing to look at.
- **And it answers the wrong question.** A snapshot lets you say *yes, anything
  is undoable*, because putting back a copy always works. That is a claim about
  the document. It is not a claim about the world, and the moment a node
  configures a payment flow, the two stop agreeing.

There is a sharper problem underneath those, and it is the one that decides the
design. Loom does not want to undo a change after the fact. It wants to know,
**before it decides whether to allow the change at all**, whether the change
could be taken back. Reversibility is one of the two axes the Gate weighs — that
is lesson 08 — and an axis you cannot evaluate until afterwards is not an input
to a decision.

So the question is not "how do we implement undo". It is: *what would make
"reversible" a fact you compute rather than a promise you make?*

---

## The idea

> **The undo is the delta that undoes it, and you compute it up front.**

Not a copy of the old tree. Not a marker in the log. A `TreeDelta` — the same
four operations from lesson 03, ordinary in every respect, which happens to
return the tree to where it was. `assessReversibility` produces it *before* the
Gate decides anything, so "can this be undone" is answered by handing over the
thing that does it.

That is the whole idea, and everything else in this lesson is a consequence of
taking it literally.

### The four inverses

Each operation's inverse is forced by what the operation destroys:

- **`insert` → `remove`.** The inverse names one id and nothing else. It does not
  need to describe the node, because the id *is* the node — lesson 04's guarantee,
  cashed in.
- **`remove` → `insert`.** The inverse must carry the entire detached subtree,
  because the operation destroyed it and nothing else in the record holds it.
- **`move` → `move`,** back to the original parent at the original index.
- **`configure` → `configure`,** restoring the prior value of every key the
  operation touched, and unsetting the keys that did not exist before. Only the
  touched keys. The inverse is not a copy of the old props.

Read that list again looking only at size. Three of the four inverses are a
handful of fields. One of them is unbounded — it is as large as whatever was
deleted. That asymmetry is not an implementation detail, and it is the answer to
Predict 1: **deleting is the expensive direction, and undoing a delete is what
costs.**

It is also where `reversible` stops being free. At tree level an inverse always
exists, so if that were the only consideration every change would be reversible
and the axis would carry no information. Two things spend it:

> - undoing the tree would not undo reality — a primitive whose configuration
>   reaches a payment flow or a sent message;
> - the inverse would have to retain more content than the runtime is willing to
>   hold.

The second one is the retention budget, and it exists only because of the
asymmetry above. Both belong properly to lesson 08. What belongs here is
noticing that they are the *only* two, and that they come from opposite
directions: one is about the world, one is about the size of a delete.

### Why inversion has to walk forwards

Here is the part that is easy to get wrong, and the reason Predict 2 is in this
lesson.

**The inverse of an operation depends on the state that operation observed.** Not
the state at the start of the delta — the state at that operation's own moment,
after everything before it has been applied.

Lesson 03 told you operations are ordered and each sees the effects of the ones
before it. Warm-up 2 is the same fact wearing work clothes: a `move`'s index is
interpreted against the child list the node has *already left*. So if operation 1
removes a sibling, operation 2's coordinates are not the coordinates you would
read off the original tree.

Which means inverting a delta is not "invert each operation, reverse the list".
It is:

```
state := the tree the delta starts from
for each operation, in order:
    inverse := invert(operation, state)     ← against the state it observes
    state   := apply(operation, state)      ← then advance
    prepend inverse to the result
```

Forward through the operations, backwards into the result. `invertOperations`
is that loop, and the `unshift` is the reversal.

Exercises B and B2 are this paragraph, executed. The naive inversion and the real
one differ by exactly **one number**. Predict which, and then predict what that
one number costs — the two exercises give different answers to that, and the
difference between them is the reason both are here.

### Inverting nearly proves it applies

The loop has a property nobody designed and everybody gets: it calls `apply` on
the way past. So it fails for the reasons applying the delta would fail, which
means a successful inversion is *also* evidence that the original delta is
applicable. `invertOperations`' own comment states it as a flat guarantee:

> Fails for the same reasons applying `delta` would fail, so a successful
> inversion also proves the original delta is applicable.

Exercise D shows the easy half — hand it a delta naming a node that does not
exist and you get `node-not-found`, the same failure, in the same shape of
`Result` (lesson 05), before anything has been applied to anything.

Exercise E asks you to break the sentence. There are two deltas that invert
cleanly and do not apply, and finding them is worth more than being told: one is
an oversight of scope, and the other is a **deliberate** decision that the
comment has not caught up with. Do not read E's answer until you have run it.

### An undo is a change, not a rewind

Loom stores nothing to make undo possible. There is no inverse column, no
snapshot stack, no `undone` flag. When you ask to undo revision 3, the runtime
replays the log from a seed to revision 2, inverts revision 3's delta against
the tree that delta actually observed, and proposes the result.

*Proposes.* The operations then go through interpretation, proposal, assessment,
the Gate and apply — the same seven steps as any other change — and land as a
**new revision**. Undoing revision 3 produces revision 4. Exercise D shows this
in the smallest possible form: the round trip is exact, and it ends at revision
2.

Two consequences, both worth more than they look:

**The log only grows.** There is no operation anywhere in Loom that shortens
one. So "who undid this, when, and why" is answered by the same machinery that
answers it for every other change, and nothing has to be built to make undo
auditable. It already is, by not being special.

**An undo is undoable**, with no special case, because it is a revision like any
other.

And the reason it goes through the Gate rather than around it is worth stating
plainly, because "an undo is by definition safe" is the intuition almost everyone
has:

> Restoring a state is a change *from the current one*. An undo that re-inserts a
> `commerce.checkout` is a checkout going live, whatever it is called.

"It used to be like this" is an argument. It is not an argument the Gate should
be denied the chance to hear.

---

## In the code

| What | Where |
| --- | --- |
| The four inverses, and the forward walk | [`src/tree/inverse.ts`](../src/tree/inverse.ts) |
| Why a `move`'s index is post-detach | [`src/tree/apply.ts`](../src/tree/apply.ts) — `applyMove` |
| Reversibility as a computed property | [`src/runtime/reversibility.ts`](../src/runtime/reversibility.ts) |
| Reading the log to plan an undo | [`src/store/revert.ts`](../src/store/revert.ts) — `planRevert` |
| The undo as an ordinary change | [`src/write/revert.ts`](../src/write/revert.ts) |
| The tests, which are the specification | [`src/tree/inverse.test.ts`](../src/tree/inverse.test.ts) |

---

## Try it

Predict every output in writing before running anything. The preamble is shared
by all four exercises:

```ts
import { describe, it } from "vitest"

import { sequentialIdFactory, type NodeId } from "./ids.js"
import { sampleTree } from "./testing/fixtures.js"
import { applyDelta } from "./tree/apply.js"
import { buildText } from "./tree/builders.js"
import { configurationOf } from "./tree/configuration.js"
import type { TreeDelta, TreeOperation } from "./tree/delta.js"
import { describeTreeError } from "./tree/errors.js"
import { invertDelta, invertOperation, invertOperations } from "./tree/inverse.js"
import { findNode, walkTree } from "./tree/navigation.js"

const spare = sequentialIdFactory("x")

/** A delta against revision 0 of the fixture. */
const deltaOf = (treeId: TreeDelta["treeId"], operations: TreeOperation[]): TreeDelta => ({
  deltaId: spare.deltaId(), treeId, baseRevision: 0, operations,
})
```

**A — the asymmetry, measured.** Two deltas of one operation each. Predict both
inverses *and* the three numbers on the last line.

```ts
describe("A", () => {
  it("inverts an insert, then a remove", () => {
    const { tree, ids } = sampleTree()

    const insert = invertOperations(tree, deltaOf(tree.treeId, [
      { op: "insert", parentId: ids.main, index: 1, node: buildText(spare, "Extra") },
    ]))
    const remove = invertOperations(tree, deltaOf(tree.treeId, [
      { op: "remove", nodeId: ids.card },
    ]))

    console.log(JSON.stringify(insert.ok ? insert.value : insert.error))
    console.log(JSON.stringify(remove.ok ? remove.value : remove.error))

    const first = remove.ok ? remove.value[0] : undefined
    console.log(
      JSON.stringify(insert.ok ? insert.value : null).length,
      JSON.stringify(remove.ok ? remove.value : null).length,
      first?.op === "insert" ? Array.from(walkTree(first.node)).length : 0
    )
    // Q1: the inverse of the insert does not describe the node it removes. Say
    //     which earlier lesson's guarantee is the reason that is safe — and then
    //     say what the inverse of the *remove* would have to look like if that
    //     guarantee did not hold.
  })
})
```

**B — the same delta, inverted two ways.** This is the exercise the lesson exists
for. `naive` inverts each operation against the original tree and reverses;
`real` is what the runtime does.

```ts
describe("B", () => {
  it("inverts against the state each operation observed", () => {
    const { tree, ids } = sampleTree()

    const operations: TreeOperation[] = [
      { op: "remove", nodeId: ids.header },
      { op: "move", nodeId: ids.footer, parentId: ids.main, index: 0 },
    ]
    const delta = deltaOf(tree.treeId, operations)

    const naive = [...operations].map((op) => invertOperation(tree.root, op)).reverse()
    const real = invertOperations(tree, delta)

    const shape = (op: TreeOperation) =>
      op.op === "move" ? `move ${op.nodeId} -> ${op.parentId} @${op.index}` : `${op.op} ...`

    console.log("naive:", naive.map((r) => (r.ok ? shape(r.value) : r.error.code)).join(" | "))
    console.log("real: ", real.ok ? real.value.map(shape).join(" | ") : real.error.code)

    const applied = applyDelta(tree, delta)
    if (!applied.ok) throw new Error("fixture delta did not apply")

    const undo = (ops: readonly TreeOperation[]) =>
      applyDelta(applied.value, {
        deltaId: spare.deltaId(), treeId: tree.treeId, baseRevision: 1, operations: ops,
      })

    const undoneNaive = undo(naive.flatMap((r) => (r.ok ? [r.value] : [])))
    console.log("naive undo:", undoneNaive.ok ? "ok" : describeTreeError(undoneNaive.error))

    const undoneReal = undo(real.ok ? real.value : [])
    console.log("real undo: ", undoneReal.ok
      ? JSON.stringify(undoneReal.value.root) === JSON.stringify(tree.root)
        ? "ok, identical to the original" : "ok, but not the original"
      : describeTreeError(undoneReal.error))
    // Q2: the two inversions differ in one number. Say which, and say what each
    //     of the two numbers is counting. Then, before running B2: the naive
    //     undo here fails. Commit in writing to *why* — is it because the
    //     inversion was wrong, or because something caught it?
  })
})
```

**B2 — the same mistake, one child later.** Identical delta, identical naive
inversion, on a page with a fourth child. Predict the outcome before running it,
and predict it from your answer to Q2 rather than by re-deriving it.

```ts
describe("B2", () => {
  it("runs the same mistake against a page with one more child", () => {
    const { tree, ids } = sampleTree()

    const widened = applyDelta(tree, {
      deltaId: spare.deltaId(), treeId: tree.treeId, baseRevision: 0,
      operations: [{ op: "insert", parentId: ids.page, index: 3,
        node: buildElement(spare, { type: "loom.footer" }) }],
    })
    if (!widened.ok) throw new Error("setup failed")
    const wide = widened.value

    const operations: TreeOperation[] = [
      { op: "remove", nodeId: ids.header },
      { op: "move", nodeId: ids.footer, parentId: ids.main, index: 0 },
    ]
    const delta: TreeDelta = {
      deltaId: spare.deltaId(), treeId: wide.treeId,
      baseRevision: wide.revision, operations,
    }

    const naive = [...operations].map((op) => invertOperation(wide.root, op)).reverse()
    const applied = applyDelta(wide, delta)
    if (!applied.ok) throw new Error("delta failed")

    const undone = applyDelta(applied.value, {
      deltaId: spare.deltaId(), treeId: wide.treeId,
      baseRevision: applied.value.revision,
      operations: naive.flatMap((r) => (r.ok ? [r.value] : [])),
    })

    console.log("naive undo:", undone.ok ? "applied" : describeTreeError(undone.error))
    if (undone.ok) {
      console.log("  got:      ", childrenOf(undone.value.root).map((c) => c.id).join(","))
      console.log("  original: ", childrenOf(wide.root).map((c) => c.id).join(","))
    }
    // Q2b: same broken inversion, different outcome. Say what changed, and then
    //      say which of B and B2 is the one to be frightened of.
  })
})
```

`buildElement` and `childrenOf` come from `./tree/builders.js` and
`./tree/node.js`.

**C — configure, which is the one people get wrong.** The card's props are
`{ variant: "outlined", elevation: 1 }`. Write the inverse out in full before
running this — all three fields.

```ts
describe("C", () => {
  it("inverts a configure", () => {
    const { tree, ids } = sampleTree()
    const card = findNode(tree.root, ids.card)

    const inverse = invertOperations(tree, deltaOf(tree.treeId, [
      { op: "configure", nodeId: ids.card,
        set: { variant: "filled", tone: "warm" }, unset: ["elevation"] },
    ]))

    console.log("before: ", JSON.stringify(card === undefined ? null : configurationOf(card)))
    console.log("inverse:", JSON.stringify(inverse.ok ? inverse.value : inverse.error))
    // Q3: one key moved from `set` to `unset` and one moved the other way.
    //     Say which and why. Then: the page node has a `title` prop this
    //     operation never touched. Is it in the inverse? Should it be?
  })
})
```

**D — the round trip, and what inversion refuses.**

```ts
describe("D", () => {
  it("round-trips, and refuses what would not apply", () => {
    const { tree, ids } = sampleTree()

    const delta = deltaOf(tree.treeId, [
      { op: "remove", nodeId: ids.body },
      { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: [] },
      { op: "move", nodeId: ids.footer, parentId: ids.header, index: 0 },
    ])

    const inverse = invertDelta(tree, delta, spare.deltaId())
    console.log("inverse:", JSON.stringify(inverse.ok ? inverse.value.operations.map((o) => o.op) : null),
      "baseRevision", inverse.ok ? inverse.value.baseRevision : null)

    const applied = applyDelta(tree, delta)
    const back = applied.ok && inverse.ok ? applyDelta(applied.value, inverse.value) : undefined

    console.log("round trip:",
      back?.ok === true && JSON.stringify(back.value.root) === JSON.stringify(tree.root)
        ? "identical" : "not identical",
      "at revision", back?.ok === true ? back.value.revision : null)

    const missing = "n_nowhere" as NodeId
    const bad = deltaOf(tree.treeId, [{ op: "remove", nodeId: missing }])
    const badInverse = invertOperations(tree, bad)

    console.log("invert:", JSON.stringify(badInverse.ok ? badInverse.value : badInverse.error))
    console.log("apply: ", JSON.stringify(applyDelta(tree, bad).ok))
    // Q4: the tree came back identical and the revision number did not. Say why
    //     that is the design rather than a shortcoming. Then: the last two lines
    //     never applied anything, and one of them failed anyway. What does that
    //     tell you that you get for free from `assessReversibility`?
  })
})
```

**E — break the guarantee.** `invertOperations` claims it fails for the same
reasons applying would. Before running this, write down what you think each pair
of lines prints, and — the part that matters — write down which of the two you
think is a bug.

```ts
describe("E", () => {
  it("finds two deltas that invert and do not apply", () => {
    const { tree, ids } = sampleTree()

    const impostor: ElementNode = {
      ...buildElement(spare, { type: "loom.card" }), id: ids.card,
    }
    const recycling = deltaOf(tree.treeId, [
      { op: "remove", nodeId: ids.card },
      { op: "insert", parentId: ids.main, index: 0, node: impostor },
    ])

    console.log("invert:", invertOperations(tree, recycling).ok ? "ok" : "failed")
    const first = applyDelta(tree, recycling)
    console.log("apply: ", first.ok ? "ok" : JSON.stringify(first.error))

    const stale: TreeDelta = {
      deltaId: spare.deltaId(), treeId: tree.treeId,
      baseRevision: 7, operations: [{ op: "remove", nodeId: ids.footer }],
    }

    console.log("invert:", invertOperations(tree, stale).ok ? "ok" : "failed")
    const second = applyDelta(tree, stale)
    console.log("apply: ", second.ok ? "ok" : JSON.stringify(second.error))
    // Q5: two counterexamples to one sentence. For each, say whether the right
    //     repair is to make inversion stricter or to make the sentence
    //     narrower — and for the first one, read `applyOperation`'s comment in
    //     `apply.ts` before you answer, because it argues against you.
  })
})
```

`ElementNode` is a type import from `./tree/node.js`.

---

## It could have been otherwise

**A snapshot per revision.** The obvious design, and it makes undo a single read
instead of a replay. Rejected for the reasons in *The problem*: it is opaque to
review, silent about what it discards, and — the one that decides it — it answers
"is this reversible?" with an unconditional yes, which is false the moment a node
reaches something outside the tree.

**Store the inverse delta on the revision.** More subtle, because the inverse
*already exists* at assessment time and is then thrown away, so writing it down
looks free. Rejected because it puts a derived value in the log beside the value
it derives from, where the two can disagree and nothing is checking. Note that
this is the exact trade 0016 accepts for the snapshot — and it is a good trade
there, because a snapshot is read on every render. An inverse is read rarely, so
the same trade buys much less and costs the same: double the log, permanently.

**Rewind the log.** Delete revisions back to the target and reset. Rejected
outright, and the sentence is worth memorising:

> Every claim Loom makes about AI-authored change — inspectable, gateable,
> attributable, reversible — is a claim about the record, and an operation that
> edits the record is not a feature, it is the hole through which all four leak.

**Apply the inverse straight to the store, skipping the Gate.** Covered above:
restoring a state is a change from the current one.

**A fifth `revert` operation in the delta model,** naming a revision. Rejected
because it would make deltas non-self-contained — an operation whose meaning
depends on a log outside itself — and lesson 03's entire argument for four
discrete operations is that each one is individually reviewable. It would also
force the renderer and the portal to have a store in order to understand a
delta.

---

## Explain it back

Closed book.

1. Explain to somebody who has built three undo stacks why Loom does not have
   one. Do it **without using the word "audit"**, and get to a concrete question
   their stack cannot answer.

2. **Derive it from lesson 03.** Lesson 03 gave you one property of a delta:
   operations are ordered, and each sees the effects of the ones before it. Show
   that the forward walk in `invertOperations` is *forced* by that property —
   that a correct inversion could not have been written any other way. Then say
   what would have to be true of the four operations for naive inversion to be
   correct, and whether you would accept those operations.

3. **Derive it from lesson 04.** The inverse of an `insert` is `{ op: "remove",
   nodeId }` and nothing more. Name the lesson 04 guarantee that makes those two
   fields sufficient, and describe what the inverse would have to contain in a
   system that addressed nodes by path instead.

4. Think of a system you have used where "undo" quietly discarded somebody
   else's work. What would that system have had to know in order to warn you? Now
   look at what `planRevert` returns — it is that, and it is not a verdict.

---

## Self-check

Write your answer, rate your confidence 1–5, **then** reveal. The number is not
decoration: the answers you are confident and wrong about are the ones that
quietly break your model later.

1. Give the inverse of each of the four operations, from memory, with the fields
   each one carries. Then say which is unbounded in size and what that costs the
   system elsewhere.

2. State precisely what `invertOperations` inverts each operation *against*, and
   give the one-sentence reason it cannot be the tree the delta started from.

3. Undoing revision 3 produces revision 4, not a log that ends at 2. Give the
   argument for that, then give the strongest argument you can *against* it and
   say why it loses.

4. An inversion succeeded. Name something you now know about the original delta,
   other than that it can be undone, and say which line of code gives you it.
   Then name two things you still do not know, one of which inversion skips on
   purpose.

---

## Reflect

- Predict Q1: did your two answers differ in size? If both were "keep the
  subtree", you were describing a snapshot with extra steps. If both were "keep
  the id", exercise A's third number is the correction.
- Predict Q2: if you answered "yes, invert and reverse" — good. That is the
  answer the design has to defeat, and exercise B is what defeating it looks
  like. Go back and write down which fact from lesson 03 you had, but did not
  reach for.
- Predict Q3: you were asked for two reasons a change might be irreversible when
  every operation inverts. One is about the world and one is about size. Did you
  find the second, and did you find it *before* exercise A made it visible?
- B and B2 ran the same broken inversion and one of them was refused. If you
  predicted B correctly and B2 wrongly, write down what you had actually
  concluded from B — most people conclude "the system catches this", and that is
  the belief B2 exists to remove.
- Exercise E: before running it, did you believe the comment? It is a comment in
  the source, written by someone who knew the code, and it is slightly wrong. Note
  what you would have had to do to catch that without running anything — and then
  note that lessons 01–03 shipped with two claimed outputs that were wrong for
  the same reason.
- Lesson 05 said `applyDelta` is a pure function of its arguments and needs no
  seam. `invertDelta` is on the same list. Say why that is not a coincidence, and
  what it means for the question "was this change correctly judged reversible
  last Tuesday?"

---

## Come back to this

- **In 2 days:** Self-check 1 and 2, closed book.
- **In 1 week:** From memory, write the fixture's page node, a two-operation
  delta whose second operation's coordinates depend on the first, and its
  inverse. Then explain out loud why the log only grows.
- **In 1 month:** Redo exercises B and B2 from memory, predicting both index
  numbers and both outcomes before you run them.
- See [`review-schedule.md`](review-schedule.md).

---

## Deeper

- [`decisions/0032`](../decisions/0032-an-undo-is-a-proposal-not-a-rewind.md) — the decision, including the alternatives above in full
- [`decisions/0035`](../decisions/0035-discarded-work-is-a-stake-and-only-the-runtime-declares-it.md) — what happens when an undo would write over later work
- [`decisions/0028`](../decisions/0028-a-tree-is-auditable-only-if-its-host-can-reproduce-the-seed.md) — why a revert needs a seed
- [`decisions/0038`](../decisions/0038-an-id-names-one-node-and-a-return-is-not-a-reuse.md) — the recycling rule exercise E runs into, and why undo is its motivating case
- Next: [07 — Measuring a change](07-measuring-a-change.md)

---

## Answers

**Q1** The two inverses, and then three numbers:

```
[{"op":"remove","nodeId":"n_x1"}]
[{"op":"insert","parentId":"n_5","index":0,"node":{"kind":"element","id":"n_4","type":"loom.card","props":{"variant":"outlined","elevation":1},"children":[{"kind":"text","id":"n_3","value":"Body copy"}]}}]
33 205 2
```

Thirty-three bytes against two hundred and five, for deltas of one operation
each. The ratio is not the point — the *shape* of the difference is. The first
number is fixed no matter what you inserted; the second grows with whatever you
deleted, and the third says why: the inverse is carrying two whole nodes, the
card and its text child, because nothing else in the record holds them.

The insert's inverse gets away with two fields because of lesson 04: an id names
exactly one node for the life of the tree, so `n_x1` is a complete description of
what to take out. Under paths it would not be — you would need the address, and
the address is only valid until the next sibling insert, so the inverse would
have to be recomputed against the tree it is going to be applied to. Which is
another way of saying it would not be a delta.

**Q2** One number:

```
naive: move n_6 -> n_7 @2 | insert ...
real:  move n_6 -> n_7 @1 | insert ...
naive undo: Index 2 is outside 0..1 for parent n_7.
real undo:  ok, identical to the original
```

The footer's index in the page's child list. Naive inversion reads it off the
original page — `[header, main, footer]`, so index 2. The real one reads it off
the tree the `move` actually observed, which is *after* the header was removed —
`[main, footer]`, so index 1. The `insert` half of the two inversions is byte-for-byte identical; the entire disagreement is that one digit.

It failed, and it is worth being precise about what failed. Not the inversion —
the inversion produced an operation quite happily, and no error came out of
`invertOperation` at all. What failed was *applying* it: at that moment the page
had one child, and index 2 into a one-element list is `index-out-of-range` from
`insertChild`'s bounds check. The wrong answer was caught by an unrelated
guardrail, downstream, by luck of arithmetic.

**Q2b** Which B2 is the demonstration of:

```
naive undo: applied
  got:       n_2,n_5,n_x2,n_6
  original:  n_2,n_5,n_6,n_x2
```

Same delta, same broken inversion, one more child on the page — and now index 2
is *in range*. Nothing is refused. You get a tree that is structurally valid,
passes every check the system has, contains exactly the right nodes, and has the
footer and the extra child the wrong way round. It is called an undo and it is
not one.

B is the reassuring case and B2 is the true one. The bounds check is not what
protects you from a bad inversion; it happened to notice in B and it is
constitutionally incapable of noticing in B2, because there is nothing wrong with
the *tree*. The forward walk is the only thing standing between those two
outputs.

There is a general form of this worth carrying out of the lesson: a bug that is
caught by a check aimed at something else has not been caught. It has been
postponed until the day the arithmetic works out.

**Q3** The card's props, then the inverse:

```
before:  {"variant":"outlined","elevation":1}
inverse: [{"op":"configure","nodeId":"n_4","set":{"variant":"outlined","elevation":1},"unset":["tone"]}]
```

`elevation` moved from the operation's `unset` into the inverse's `set`, because
it existed and held `1`; putting it back means setting it. `tone` moved the other
way, from `set` into `unset`, because it did not exist before, and the way to
restore "did not exist" is to unset it. `variant` stays in `set` with its old
value.

The page's `title` is not in the inverse and should not be. The inverse touches
exactly the keys the operation touched — the union of `set`'s keys and `unset`.
An inverse that restored the whole prop bag would be a snapshot of one node, and
it would do something worse than waste bytes: it would overwrite keys that some
*other* operation legitimately changed in between. The narrow inverse composes;
the wide one does not.

**Q4** The round trip, then two lines that never applied anything:

```
inverse: ["move","configure","insert"] baseRevision 1
round trip: identical at revision 2
invert: {"code":"node-not-found","nodeId":"n_nowhere"}
apply:  false
```

Note the operation order. The delta was `remove, configure, move`; the inverse is
`move, configure, insert`. Reversed, and each one inverted against a different
moment.

The tree came back identical and the revision did not, and that is the design.
The tree is a value — two equal values are equal, and there is nothing to
distinguish "never changed" from "changed and changed back". The revision is a
position in a record, and those two histories are emphatically not the same
thing: one of them has somebody who made a change and somebody who took it back,
both attributable, both with a reason. Collapsing them would be the log editing
itself.

The last two lines are the free property. `invertOperations` applies each
operation as it walks past, so it fails on this delta for the reason applying it
would — `node-not-found`, the same code `applyDelta` gives, produced without
touching anything. Which means `assessReversibility`, whose job is to answer "can
this be undone", has *also* done most of the work of establishing that the delta
applies at all, before the Gate has looked at it. Nobody set out to build that
check. It falls out of inverting by walking forwards.

"Most of" is doing real work in that sentence, and exercise E is where you find
out how much.

**Q5** Two deltas that invert cleanly and do not apply:

```
invert: ok
apply:  {"code":"recycled-node-id","nodeId":"n_4"}
invert: ok
apply:  {"code":"revision-mismatch","expected":7,"actual":0}
```

**The second is scope.** `invertOperations` takes a tree and operations; the
`treeId` and `baseRevision` checks belong to `applyDelta`'s envelope and were
never inversion's to make. Nothing is wrong here except the word "same" in a
comment.

**The first is deliberate, and it is the interesting one.** That delta removes
the card and inserts a *different* node onto the same id — the recycling lesson
04 covers — and `applyDelta` refuses it. Inversion does not, and the reason is
written down in `applyOperation`:

> An operation applied on its own has retired nothing, so the recycling rule
> cannot fire here — it is a rule about what a *delta* may do to an id it
> removed. `invertOperations` walks operations this way, and inverting a delta
> must never be stricter than applying one.

Follow that through. The undo of a `remove` is an `insert` that puts back the
node that left — an id coming back, on purpose. If inversion enforced the
recycling rule it would refuse to compute the undo of a deletion, which is the
single most important undo there is. So inversion is deliberately looser, and it
has to be.

Which means the right repair is to narrow the sentence, not to tighten the code.
"Fails for the same reasons applying `delta` would fail" is a comment that has
not caught up with 0038; the accurate version is that inversion is a *structural*
check and skips the envelope and the recycling rule. Worth knowing before you
lean on it, and it is flagged for the build routine rather than fixed here — a
lessons change that also changes behaviour is one nobody can review.

**1** `insert` → `remove { nodeId }`. `remove` → `insert { parentId, index, node
}`, carrying the whole detached subtree. `move` → `move { nodeId, parentId, index
}` back to the original parent and index. `configure` → `configure` restoring the
prior value of each touched key and unsetting the keys that did not exist.

The `insert` is unbounded, because it carries content rather than references. It
costs the system a retention budget: a change that removes more nodes than the
policy is willing to hold in an inverse is judged irreversible, and the Gate
weighs it accordingly.

**2** Against the tree as it stood at that operation's own position in the
delta — the start tree with every preceding operation applied.

It cannot be the tree the delta started from because operations observe each
other. A `move`'s index is interpreted against the child list after the node is
detached, and an operation whose sibling was removed two operations earlier is
addressing a different list than the one you would read off the original. Invert
against the original and you get coordinates for a tree that no longer exists.

**3** Because Loom's claim is about the record, and every question worth asking
about an undo — who asked for it, when, why, who allowed it, what it wrote over —
is a question about a revision. Making an undo a revision means all of those are
answered by machinery that already exists, and it means an undo is itself
undoable with no special case anywhere.

The strongest argument against: a log that grows on every undo is a log where a
mistake and its correction both cost storage forever, and a user who undoes and
redoes ten times has added twenty entries recording nothing anyone will ever read.
The replay cost is real too — planning a revert is O(log length).

It loses because the alternative is one operation, in the entire system, that
changes a tree without being judged and leaves the record shorter than it was.
The storage argument is a cost argument against a correctness property, and the
replay cost has a mitigation that already exists: a checkpoint seed.

**4** That every operation in it is structurally applicable, in order, against
that tree. `invertOperations` calls `applyOperation` on each operation as it
walks forwards — the `const advanced = applyOperation(state, operation)` line —
so a delta naming a node that is not there, or moving a node into its own
descendant, fails at inversion, before anything has been applied.

If you answered "that it applies", take the half mark and read exercise E's
answer again. Two things inversion does not check: the delta's `treeId` and
`baseRevision`, which are `applyDelta`'s envelope and never were inversion's
business, and the recycling rule from 0038, which inversion skips on purpose —
because undoing a `remove` is an id deliberately coming back, and an inversion
that enforced the rule could not compute the undo of a deletion.
