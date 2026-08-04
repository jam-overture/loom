# 02 — UI as data: the tree

**After this lesson you will be able to** read any Loom tree, say why it has
exactly three node kinds, and explain why there is no `if` in the AST.

**Prerequisites:** [01](01-why-a-runtime.md).

---

## The problem

Lesson 01 said "the UI is a tree". Fine — but React trees have dozens of node
types, and every UI framework that models a document ends up with a sprawling
set: elements, text, fragments, portals, comments, conditionals, loops.

Loom has three. That is not minimalism for its own sake. Every node kind is paid
for **on every traversal, forever**: apply, invert, analyse, render, validate,
and every future tool. A kind that earns its place must be used constantly; a
kind that is used occasionally is a permanent tax.

So the question this lesson answers is: which three, and why those?

---

## The idea

```
element  — an instance of a registered primitive. Props + ordered children.
           The only kind that composes.

text     — a leaf string.

slot     — a named region something else projects into.
           Its children are the fallback shown when nothing is projected.
```

A tree of these, plus a revision number, is a `LoomTree`. Here is the fixture
used throughout the test suite:

```
element loom.page          n_7   props { title: "Home" }
├── element loom.header    n_2
│   └── text "Welcome"     n_1
├── slot main              n_5
│   └── element loom.card  n_4   props { variant: "outlined", elevation: 1 }
│       └── text "Body"    n_3
└── element loom.footer    n_6
```

Two things about this are worth slowing down on.

### Text is a node, not a prop

The tempting design is `{ kind: "element", type: "heading", props: { text: "Welcome" } }`.
Loom instead makes `"Welcome"` its own node with its own id.

Why? Because **the most common thing anyone asks AI to change is the words.**
"Make the headline punchier" is the bread-and-butter request. If text lives in a
prop, then rewriting a sentence is a `configure` on its parent, and the sentence
itself has no identity — you cannot address it, move it, or attribute a change to
it. Telemetry cannot tell you "this headline has been rewritten four times".

Making text a node means "rewrite this headline" and "move this section" are the
same *class* of operation on the same *kind* of address. One uniform scheme.

### There is no conditional node

No `if`. No `map`. This is the load-bearing absence in the whole AST.

Suppose there were. A delta inserts `<If condition={user.isPro}>` around the
pricing table. Now ask the Gate: *does this change hide the pricing table?*

It cannot answer. The effect depends on runtime state the Gate cannot see. The
Gate would be approving a **possibility** rather than a change — and once that is
true, the guarantee from lesson 01 is gone. "We reviewed this change" would mean
"we reviewed one of its branches".

So adaptation in Loom happens the other way around: when the condition changes,
something proposes a delta, and that delta goes through the Gate like everything
else. Branching lives in the world, not in the tree.

---

## In the code

[`src/tree/node.ts`](../src/tree/node.ts) — the whole AST, and it is short.

```ts
export type ElementNode = {
  readonly kind: "element"
  readonly id: NodeId
  readonly type: PrimitiveType
  readonly props: JsonObject
  readonly children: readonly LoomNode[]
}

export type TextNode = {
  readonly kind: "text"
  readonly id: NodeId
  readonly value: string
}

export type SlotNode = {
  readonly kind: "slot"
  readonly id: NodeId
  readonly name: SlotName
  readonly children: readonly LoomNode[]
}

export type LoomNode = ElementNode | TextNode | SlotNode
```

Three details to notice:

**`readonly` everywhere.** Nodes are never mutated. An "edit" produces a new
tree that shares every untouched subtree by reference — which is what lets the
renderer skip branches nothing touched.

**`props: JsonObject`, not `Record<string, unknown>`.** Props are restricted to
the JSON value space — no functions, no `Date`, no class instances, no `NaN`.
See [`src/json.ts`](../src/json.ts). This is what lets a tree round-trip
losslessly through Postgres, over the wire, and through a model's structured
output. A prop that cannot survive `JSON.parse(JSON.stringify(x))` cannot exist.

**`discriminatedUnion` on `kind`.** Every traversal gets exhaustiveness checking
from the compiler. Add a fourth kind and TypeScript lists every place that must
now handle it — which is precisely the tax being avoided.

---

## Try it

Predict each answer before running.

```ts
import { describe, expect, it } from "vitest"
import { sampleTree } from "./testing/fixtures.js"
import { walkTree, findNode, pathToNode } from "./tree/navigation.js"

describe("exploring the tree", () => {
  it("walks depth-first, parents before children", () => {
    const { tree } = sampleTree()
    console.log(Array.from(walkTree(tree.root), (n) => `${n.kind} ${n.id}`))
    // Q1: how many nodes, and which id comes second?
  })

  it("derives a path from the root", () => {
    const { tree, ids } = sampleTree()
    console.log(pathToNode(tree.root, ids.body))
    // Q2: how long is this path?
  })

  it("has no children on a text node", () => {
    const { tree, ids } = sampleTree()
    const headline = findNode(tree.root, ids.headline)
    console.log(headline)
    // Q3: try adding `.children` — what does the compiler say?
  })
})
```

Then try to break it:

```ts
import { elementNodeSchema } from "./tree/node.js"

// Q4: predict success/failure for each, then check.
elementNodeSchema.safeParse({ kind: "element", id: "n_1", type: "card", props: { onClick: () => {} }, children: [] })
elementNodeSchema.safeParse({ kind: "element", id: "n_1", type: "Card",  props: {}, children: [] })
elementNodeSchema.safeParse({ kind: "element", id: "1",   type: "card",  props: {}, children: [] })
```

---

## It could have been otherwise

**Add a `fragment` kind.** A wrapper with no visual output is genuinely useful.
Rejected because it is expressible as a *registered primitive* named `fragment` —
an element like any other. Two ways to express one thing complicates every
traversal and buys nothing the registry does not already give you.

**Text as a prop.** Covered above: it makes the most-edited content in the
system unaddressable.

**Conditional and loop nodes.** Covered above: it makes the Gate's approval
meaningless. This is the one to remember.

**Allow arbitrary values in props.** Rejected because it breaks serialisation,
and serialisation is not a convenience here — it is what makes a tree storable,
transmittable, and expressible as model output. A prop holding a function is a
prop that cannot cross any of the system's boundaries.

---

## Check yourself

1. Why is `slot` a distinct kind rather than an element with `type: "slot"`?

2. A teammate wants to add `props: { renderItem: (x) => <Row x={x}/> }` to a
   list primitive. What breaks, and what should they do instead?

3. If there is no conditional node, how does a Loom page show different content
   to logged-in users?

4. What does making text a node buy you that a `text` prop does not?

---

## Deeper

- [`decisions/0001`](../decisions/0001-tree-and-delta-as-the-unit-of-change.md)
- [`src/tree/navigation.ts`](../src/tree/navigation.ts) — traversal, and note that nothing caches
- Next: [03 — Change as data: the delta](03-change-as-data.md)

---

## Answers

**Q1** Seven nodes. Depth-first, parents first: `n_7, n_2, n_1, n_5, n_4, n_3, n_6`
— so `n_2` (the header) is second.

Note the ids are *not* in tree order. The fixture builds leaves before their
parents, so `card` is `n_4` and the `main` slot that contains it is `n_5` — a
child with a lower id than its parent. If that looks like a bug, it is the
lesson: **an id says nothing about position.** Lesson 04 is about why that is
deliberate.

**Q2** Four: `[n_7, n_5, n_4, n_3]` — page → main → card → body. Note this is
*derived*, not stored. Lesson 04 is about why that matters.

**Q3** It does not compile. `findNode` returns `LoomNode | null`, and once you
narrow to `kind === "text"` the type has no `children`. The absence is enforced
by the type system, not by convention.

**Q4** All three fail. First: a function is not a JSON value. Second: primitive
types are kebab-case with optional dot-namespacing, so `Card` is invalid.
Third: node ids must match `n_<body>`, so a bare `1` is invalid. Each is a
different boundary refusing malformed input at the edge rather than deep inside.

**1** Because a slot is not an instance of anything — it has no primitive to
resolve, no props, and its children mean something different (fallback content,
not content). Modelling it as an element would mean every renderer special-cases
one magic `type` string, which is a discriminated union with extra steps.

**2** A function is not a `JsonObject` value, so it will not typecheck, and if it
were forced through it could not be stored, sent, or produced by a model.
Instead: the *primitive* owns rendering behaviour. Register a list primitive that
knows how to render its children, and let the tree express the rows as child
nodes. Behaviour belongs in registered code; the tree carries data.

**3** Something outside the tree notices the condition and proposes a delta — an
`EditIntent` with origin `system-signal`. That proposal is assessed and gated
like any other. The branch is resolved *before* the Gate sees it, so the Gate is
always judging one concrete tree, never a family of possible ones.

**4** Identity. A sentence gets a stable id, so it can be addressed by a delta,
moved without being recreated, attributed in telemetry, decorated in edit mode,
and counted ("this headline was rewritten four times"). A prop value has none of
that — it is anonymous data inside another node.
