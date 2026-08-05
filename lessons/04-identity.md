# 04 — Identity: the id that never moves

**After this lesson you will be able to** say what a `NodeId` is for, explain why
a node's position is computed rather than stored, name which of the four
operations mints an id, and describe what an audit loses when identity is not
stable.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md).

---

## Warm-up

Closed book, mixed across all three prior lessons. Five minutes.

1. The four operations, with their arguments. (L03)
2. Why is there no conditional node — and what would the Gate lose if there were
   one? (L02)
3. What does `baseRevision` protect against? (L03)
4. Loom trades something away to get reviewability. What, exactly? (L01)

Write something for all four before you look at anything.

---

## Predict

In writing, before reading on:

> A reviewer flags a node on a page: *"this card is misleading, look at it
> again next week."* You have to store that flag somewhere, which means writing
> down **which node**.
>
> 1. Write down the address you would store. Be concrete — actual syntax.
> 2. Overnight, someone inserts a banner at the top of the page. What does your
>    stored address point at on Monday? What *should* it point at?
> 3. Overnight, someone instead deletes that card and creates a new one that
>    looks identical in its place. Is the flag still valid? Is it the same node?
>    Say who gets to decide that.

Question 3 is the one to sit with. There is a defensible answer either way, and
the interesting part is not which one Loom picked — it is that something in the
system has to pick, or the question gets answered accidentally.

---

## The problem

Everything in Loom addresses a node. A delta says which node to move. Telemetry
says which node was changed and how often. The Gate reasons about which node the
change lands on. An audit says which node the log and the snapshot disagree
about. An open editor has a node selected while a delta is being applied
underneath it.

So the system needs a way to write down "this node" that still means the same
node later. The obvious candidate is the one every tree already gives you for
free: **where it is.**

```
root.children[1].children[0]
```

This is how you point at a DOM element with a selector, at a JSON value with a
path, and at a line of code with a line number. It costs nothing to compute and
nothing to store. It is also the wrong answer, and the reason is worth working
out before you are told it.

---

## The idea

Two sentences carry the whole lesson:

> **Identity is stored. Position is derived.**
>
> An id is minted once, when a node is inserted, and never changes again.

Everything else follows.

### A path is a fact about a moment

`nodePath` walks the tree and computes the chain from the root every time you
ask. Nothing caches it — deliberately, and the comment in
[`navigation.ts`](../src/tree/navigation.ts) says why: a cache would be a second
source of truth about a structure that changes on every accepted delta.

That is the right way round, because a path is not a property of a node. It is a
property of a node *and* a tree *and* a revision. Insert a sibling above it and
the path is different while the node is untouched. Nothing about the node
changed; the coordinate system moved.

An id has none of those dependencies. It is a field on the node, it travels with
the node, and a `move` does not touch it.

### The failure mode is silence, not error

This is the part that decides it.

Suppose deltas addressed nodes by path. A stale path does not fail — it
*resolves*. It finds a node, just not the one anybody meant. The system applies
a change to the wrong node, reports success, and records that success in a log
somebody will later trust.

A stale **id** cannot do that. There is no node with that id, so `applyDelta`
returns `node-not-found` and the delta is discarded whole (L03). Both schemes
can be wrong; only one of them is wrong out loud.

### Ordered operations require it

Lesson 03 gave you a property that looks unrelated: operations within one delta
are ordered, and each sees the previous one's effect. That is what lets a single
delta say "add a banner, then move the footer into it".

Now try to author that delta in paths. Operation 2's path has to be written
against the tree operation 1 produced — a tree the proposer never saw and cannot
render. Every operation after the first would be authored blind, against a
coordinate system that its predecessor just moved.

With ids, operation 1 mints an id and operation 2 uses it. The banner's id is
the same before and after the footer moves into it. **Stable identity is what
makes an ordered delta writable at all**, and if you did not see that connection
before, it is worth sitting with — it is the clearest case in the system of one
design decision being load-bearing for another that looks independent.

### The id tells you nothing, on purpose

Ids are opaque. `n_` is a debugging affordance and a cheap guard against passing
a `DeltaId` where a `NodeId` belongs; the branded types are the real enforcement.
The body is 20 random base36 characters in production and a counter in tests.

You have already met the consequence and may have read it as a bug. In lesson
02's fixture, the card is `n_4` and the slot containing it is `n_5` — a child
with a lower number than its parent, because the fixture builds leaves before
their parents. The ordering of ids says nothing about the ordering of the tree,
and it must not, because the moment an id encodes position it has to change when
the node moves. An id that encodes position is a path wearing a disguise.

### Only `insert` mints

Of the four operations, exactly one creates identity:

| Operation | Identity |
| --- | --- |
| `insert` | mints — the node arrives carrying an id nothing else has |
| `move` | preserves — same node, new coordinates |
| `configure` | preserves — same node, new contents |
| `remove` | retires — nothing is re-minted, and the inverse brings the id back |

Because `move` and `configure` preserve, "the same node in two different states"
is a well-defined thing. That is not a small property. It is what lets
`compareTrees` report a moved card as *one node that changed position* rather
than as a subtree that vanished and an identical subtree that appeared.

### The proposer does not get to name things

A model never mints an id. It emits a **draft**: the same four operations, but
inserted nodes carry no `id` at all. `materializeDelta` turns a validated draft
into a real delta, minting every id through the same `IdFactory` seam everything
else uses.

The reason is not distrust in the abstract — it is that id uniqueness would
otherwise become a validation problem on every single proposal. A model that
reuses an id it saw in the rendered tree would express "insert this new node"
and "collide with an existing one" *with exactly the same bytes*. There would be
no way to tell a mistake from a valid change by looking at the message. Taking
minting away from the proposer makes that class of error impossible to express
rather than expensive to catch.

Minting is also a side effect — it reads a random source — so it enters the
runtime through an injected `IdFactory` rather than being called from pure code.
Lesson 05 is about why that matters far more than it looks.

---

## In the code

| What | Where |
| --- | --- |
| The id scheme, the brands, the factory seam | [`src/ids.ts`](../src/ids.ts) |
| Deriving position on demand | [`src/tree/navigation.ts`](../src/tree/navigation.ts) — `nodePath`, `pathToNode` |
| Uniqueness as an invariant | [`src/tree/tree.ts`](../src/tree/tree.ts) — `validateTreeInvariants` |
| Uniqueness on the way in | [`src/tree/apply.ts`](../src/tree/apply.ts) — `rejectIdCollisions` |
| Who names a model's nodes | [`src/interpretation/materialize.ts`](../src/interpretation/materialize.ts) |
| Ids as a join key | [`src/tree/compare.ts`](../src/tree/compare.ts) |

---

## Try it

Predict every output in writing before you run anything.

```ts
import { describe, it } from "vitest"
import { sampleTree } from "./testing/fixtures.js"
import { sequentialIdFactory } from "./ids.js"
import { applyDelta } from "./tree/apply.js"
import { buildElement, buildText } from "./tree/builders.js"
import { childrenOf, type LoomNode } from "./tree/node.js"
import { findNode, findParent, pathToNode } from "./tree/navigation.js"

const spare = sequentialIdFactory("x")

describe("identity", () => {
  it("keeps the id and loses the path", () => {
    const { tree, ids } = sampleTree()
    console.log(pathToNode(tree.root, ids.card))

    const result = applyDelta(tree, {
      deltaId: spare.deltaId(), treeId: tree.treeId, baseRevision: 0,
      operations: [{ op: "move", nodeId: ids.card, parentId: ids.header, index: 1 }],
    })
    if (!result.ok) throw new Error(result.error.code)

    console.log(pathToNode(result.value.root, ids.card))
    console.log(findParent(result.value.root, ids.card)?.id)
    // Q1: which of these three lines changed, and which could not have?
  })
})
```

Now the one that matters. This is the address scheme Loom rejected, built by
hand, run against a change that has nothing to do with the node you are pointing
at:

```ts
const at = (root: LoomNode, indices: readonly number[]): LoomNode | undefined =>
  indices.reduce<LoomNode | undefined>(
    (node, index) => (node ? childrenOf(node)[index] : undefined), root)

it("resolves a positional address across an unrelated insert", () => {
  const { tree, ids } = sampleTree()
  const before = at(tree.root, [1, 0])
  console.log(before?.kind, before?.id)

  const banner = buildElement(spare, { type: "loom.banner" })
  const result = applyDelta(tree, {
    deltaId: spare.deltaId(), treeId: tree.treeId, baseRevision: 0,
    operations: [{ op: "insert", parentId: ids.page, index: 0, node: banner }],
  })
  if (!result.ok) throw new Error(result.error.code)

  const after = at(result.value.root, [1, 0])
  console.log(after?.kind, after?.id)
  // Q2: what did [1, 0] mean before, and what does it mean now?
  //     Note what did *not* happen: no error, no warning, no null.
})
```

Then: who is allowed to name a node?

```ts
it("refuses a node named by the wrong authority", () => {
  const { tree, ids } = sampleTree()
  const fresh = sequentialIdFactory()               // note: no namespace
  const banner = buildElement(fresh, { type: "loom.banner" })
  console.log(banner.id)

  const result = applyDelta(tree, {
    deltaId: spare.deltaId(), treeId: tree.treeId, baseRevision: 0,
    operations: [{ op: "insert", parentId: ids.page, index: 0, node: banner }],
  })
  console.log(result.ok, result.ok ? null : result.error)
  // Q3: why does this fail — and what does that tell you about the `"x"`
  //     namespace that lesson 03 passed to `sequentialIdFactory` without
  //     ever explaining?
})
```

Now compare two trees. First a move, then a delete-and-recreate that produces a
tree a person would call identical:

```ts
import { compareTrees } from "./tree/compare.js"

it("compares a move", () => {
  const { tree, ids } = sampleTree()
  const result = applyDelta(tree, {
    deltaId: spare.deltaId(), treeId: tree.treeId, baseRevision: 0,
    operations: [{ op: "move", nodeId: ids.card, parentId: ids.header, index: 1 }],
  })
  if (!result.ok) throw new Error(result.error.code)
  console.log(JSON.stringify(compareTrees(tree, result.value)))
})

it("compares a rebuild", () => {
  const { tree, ids } = sampleTree()
  const rebuild = sequentialIdFactory("y")
  const body = buildText(rebuild, "Body copy")
  const replacement = buildElement(rebuild, {
    type: "loom.card",
    props: { variant: "outlined", elevation: 1 },
    children: [body],
  })

  const result = applyDelta(tree, {
    deltaId: spare.deltaId(), treeId: tree.treeId, baseRevision: 0,
    operations: [
      { op: "remove", nodeId: ids.card },
      { op: "insert", parentId: ids.main, index: 0, node: replacement },
    ],
  })
  if (!result.ok) throw new Error(result.error.code)
  console.log(JSON.stringify(compareTrees(tree, result.value)))
  // Q4: the second tree renders exactly like the first did before the move.
  //     How many differences does each comparison report, and which report
  //     would you rather be handed at 3am?
})
```

Finally, one that is not in any decision record. Predict it, then run it, and
then decide whether you think the result is correct:

```ts
it("reuses the id of a node removed in the same delta", () => {
  const { tree, ids } = sampleTree()
  const recycler = sequentialIdFactory()
  let impostor = buildText(recycler, "not the card")
  for (let i = 0; i < 3; i += 1) impostor = buildText(recycler, "not the card")
  console.log(impostor.id, ids.card)

  const result = applyDelta(tree, {
    deltaId: spare.deltaId(), treeId: tree.treeId, baseRevision: 0,
    operations: [
      { op: "remove", nodeId: ids.card },
      { op: "insert", parentId: ids.main, index: 0, node: impostor },
    ],
  })
  console.log(result.ok)
  console.log(JSON.stringify(result.ok && findNode(result.value.root, ids.card)))
  // Q5: does this succeed? Should it? Say what you would have to know about
  //     the id factory to be comfortable with the answer.
})
```

---

## It could have been otherwise

**Positional paths as the addressing scheme.** The rejected default, and record
0001 states the cost in one line: a path changes when a sibling is inserted, so
every stored reference — telemetry, provenance, an open editor — silently rots.
"Silently" is the whole objection.

**The model emits complete nodes, ids included.** One schema instead of two, and
the reply is already a `TreeDelta`. Rejected: it hands the addressing scheme to
the least accountable component in the system, and makes uniqueness a validation
problem on every proposal rather than an impossibility.

**The model emits placeholder handles — `$0`, `$1` — that the runtime resolves.**
Rejected as the flat-IR shape arriving through a side door: correlating handles
across operations is a second addressing scheme that only the interpreter
understands. Two addressing schemes is the thing this lesson exists to prevent.

**Accept model-supplied ids, then rewrite them before applying.** Rejected as the
worst of the three: the recorded proposal implies the model chose identity while
the runtime quietly overruled it, so a person reading the record afterwards
cannot tell which ids were ever real.

**Ids that encode the hierarchy** — `n_7.1.0`, or a path-derived hash. Never
seriously on the table, and the reason is a good test of whether the lesson
landed: such an id has to change when the node moves, which means it is not an
identity. It is a cached path with a friendlier name.

**Content-addressed ids** — hash the node's contents. Also not on the table, and
it fails in both directions at once: two text nodes both reading "Welcome" would
share one identity, and editing a headline would change its identity — so
"this headline was rewritten four times" becomes four unrelated nodes that each
existed once. The most-edited content in the system would be the least
trackable.

---

## Explain it back

Closed book.

1. Explain to someone who knows the DOM why Loom addresses nodes by id rather
   than by anything resembling a selector or a path. Do not say "because paths
   change" — say what a person *observes* when a path-addressed change goes
   wrong, and why that observation is the problem.

2. **Connect it back:** lesson 03 told you operations in a delta are ordered and
   each sees the previous one's effect. Derive stable identity from that
   property alone — that is, show that the ordering guarantee is unwritable
   without it. If this feels like two separate facts about deltas, that is the
   section to go back to.

3. Surrogate keys versus natural keys is the same argument in a database. Find a
   case from your own experience where a natural key changed. What broke, and
   how long did it take anyone to notice? The lag is the point.

---

## Self-check

Write your answer, rate your confidence 1–5, **then** reveal. The confidence
number is not decoration — the answers you are confident and wrong about are the
ones that quietly break your model later.

1. Which of the four operations mints an id, and why is it exactly that set?

2. A stored reference to a node has gone stale. Describe what you observe in the
   id scheme and what you observe in the path scheme. Which is more expensive to
   debug, and why is it the one that looks cheaper?

3. Give the reason a model may not name the nodes it inserts *without* using the
   words "trust" or "safety".

4. `compareTrees` reports a moved card as one changed node. What would it report
   if a move re-minted the id, and why does that difference matter to whoever is
   reading an audit report?

---

## Reflect

- Predict Q1: did you write a path, an index, or an id? If you wrote a path, you
  wrote what almost everyone writes — what made it feel sufficient?
- Predict Q2: did your address point at the flagged card on Monday, or at
  whatever had slid into its coordinates?
- Predict Q3 asked whether a deleted-and-recreated card is the same node. Loom
  answers no, and the "compares a rebuild" exercise shows you what that answer
  buys and what it costs. Do you still agree with the answer you wrote?
- Lesson 02 told you an id says nothing about position and deferred the reason
  to this lesson. Was the reason the one you had guessed?

---

## Come back to this

- **In 2 days:** Self-check 1 and 3, closed book.
- **In 1 week:** Explain it back Q2 — derive stable identity from lesson 03's
  ordering guarantee, out loud, with no notes.
- **In 1 month:** Redo the "resolves a positional address" exercise from memory:
  write the two outputs before running it.
- See [`review-schedule.md`](review-schedule.md).

---

## Deeper

- [`decisions/0001`](../decisions/0001-tree-and-delta-as-the-unit-of-change.md) — identity is stable, paths are derived
- [`decisions/0003`](../decisions/0003-ai-drafts-the-runtime-names.md) — the runtime names what AI creates
- [`decisions/0028`](../decisions/0028-a-tree-is-auditable-only-if-its-host-can-reproduce-the-seed.md) — where the join key earns its keep
- [`src/tree/navigation.test.ts`](../src/tree/navigation.test.ts) — the tests are the specification
- Next: 05 — Purity at the seams *(not yet written)*

---

## Answers

**Q1** The path changed and the id could not.

```
[ 'n_7', 'n_5', 'n_4' ]     before — page → main → card
[ 'n_7', 'n_2', 'n_4' ]     after  — page → header → card
n_2                          the new parent
```

Note the card's own id is the last element of both paths. The path is the list of
ids from the root, so the *address* of the card is unchanged while its *position*
is entirely different. Its child, the body text, is still `n_3` and still under
`n_4` — the whole subtree moved without a single id being touched.

**Q2** Before the insert, `[1, 0]` was `element n_4` — the card, inside the
`main` slot. After it, `[1, 0]` is `text n_1` — the word "Welcome", inside the
header. Not a nearby node, not the same kind of node: a text leaf where an
element used to be.

The point is what is missing from that output. No error. No null. No warning. The
address resolved successfully to something, and any code holding it would carry
on and be wrong. Meanwhile `findNode(root, ids.card)` still returns `n_4`,
because the insert had nothing to do with the card and the id knows that.

**Q3** It fails with `duplicate-node-id`, `nodeId: n_1`. A fresh
`sequentialIdFactory()` starts its counter at zero, so the first node it mints is
`n_1` — which the fixture already used for the headline. `rejectIdCollisions`
checks the incoming subtree against every id in the tree and refuses.

That is what lesson 03's `sequentialIdFactory("x")` was for. The namespace makes
a second factory mint `n_x1, n_x2 …` so it cannot collide with a tree built by
the first. In production the question does not arise: ids are 20 random base36
characters and there is one factory. In tests and replay, where ids are counters
so that assertions can name them, keeping factories apart is manual — which is
precisely why the collision check stays in `applyDelta` even though 0003 makes
model-caused collisions impossible. It now guards against runtime bugs rather
than against the proposer.

**Q4** One difference against four.

```
move:    [{"code":"changed","nodeId":"n_4","label":"loom.card",
          "facets":["parent","position"]}]

rebuild: [{"code":"missing","nodeId":"n_4","label":"loom.card"},
          {"code":"missing","nodeId":"n_3","label":"text"},
          {"code":"extra","nodeId":"n_y2","label":"loom.card"},
          {"code":"extra","nodeId":"n_y1","label":"text"}]
```

The move report names one node and the two facets that differ. The rebuild
report names four, because a removed subtree and an added subtree are reported
node by node — the deeper the subtree, the more rows. Both trees render
identically to a user.

At 3am you want the first. And notice the second report is not *wrong*: those
genuinely are different nodes, and telling you so is the correct answer to the
question that was asked. The rebuild really did destroy identity — that is the
cost of expressing a move as a remove plus an insert, and it is why `move` is one
of the four operations instead of sugar over the other two.

**Q5** It succeeds. `n_4` was a `loom.card` at revision 0 and is
`{"kind":"text","id":"n_4","value":"not the card"}` at revision 1 — same id,
different node, no complaint.

`rejectIdCollisions` compares the incoming subtree against the ids in the tree
*as it stands at that moment*, and by the time the insert runs, the remove has
already taken `n_4` out. So uniqueness is enforced over the live tree, not over
the tree's history. Two revisions can use one id for two different nodes.

Whether that should worry you depends entirely on the id factory. With
`randomIdFactory` — 20 random base36 characters — recycling is not something
that happens by accident; you would have to construct it, as this exercise did.
With a sequential factory it is a few lines away. So the guarantee "the same id
means the same node" is airtight *within* a revision, and rests on the minting
strategy *across* revisions. That is worth knowing before you rely on ids as a
join key over a long log, which is exactly what an audit does.

**1** Only `insert`. `move` and `configure` preserve identity because they act on
a node that already exists — re-minting would make them indistinguishable from a
remove plus an insert, and would break every reference held anywhere else in the
system. `remove` retires an id without replacing it, and its inverse re-inserts
the original node with its original id, which is what makes undo restore a node
rather than a look-alike.

**2** With ids: `node-not-found`, the delta is discarded whole, nothing changed.
With paths: the address resolves to whatever now occupies those coordinates, the
operation succeeds, and a wrong change is recorded as a correct one.

The path scheme looks cheaper because it costs nothing to compute and nothing to
store. Its real cost is paid later, by someone reading a log that records a
successful change to a node nobody intended to touch — and there is nothing in
that log to indicate anything went wrong. A failure you can see is cheap. A
failure that leaves correct-looking evidence is not.

**3** Because "insert a new node" and "collide with an existing node" would be
the same message. If a model supplies ids, a proposal that reuses an id it read
in the rendered tree is byte-identical to a legitimate insert, and nothing
reading that message can tell them apart — so uniqueness becomes a check that
must run on every proposal and can only reject after the fact. Minting in the
runtime makes the bad message unsayable: a draft has nowhere to put an id.

**4** It would report a `missing` and an `extra` — the card and every node
beneath it, twice over. A reader would see a subtree destroyed and a subtree
created, which is a much larger and more alarming claim than "one card moved",
and would have to reconstruct the move by eye from two lists. The audit exists
to turn "these two trees disagree" into something someone can act on; a report
that describes every move as a deletion and a creation has given back most of
what it was for.
