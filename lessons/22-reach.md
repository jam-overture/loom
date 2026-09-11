# 22 — Reach: the fault that belongs to two nodes

**After this lesson you will be able to** say why a page can be valid node by
node and broken as a whole, and give the example that is invisible in a
screenshot; name the three seams already built that could each have caught this
and say why each one is blind to it *for a good reason*; state what a primitive
declares here and, more importantly, what it is forbidden from declaring;
give the test for whether a primitive is a target as a question about its
rendering rather than about its props, and apply it to a case this course has
not discussed; predict the stakes level and the disposition of a change that
puts a control out of reach, and explain why refusal is the *useful* answer
rather than the severe one; say what a delta is answerable for when the tree it
starts from is already broken, and why that rule is not leniency; explain what a
deployment that declares nothing gets, and why that is the default; and say what
a wrong declaration costs in each of the two directions it can be wrong in —
with an example of one, currently shipping, in this repository.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md), [08](08-two-axes.md), [09](09-the-gate.md),
[10](10-the-pipeline.md), [11](11-the-model-seam.md), [12](12-projection.md),
[13](13-refusal-and-repair.md), [14](14-rendering.md),
[15](15-primitives-and-the-registry.md), [16](16-persistence.md),
[17](17-telemetry.md), [18](18-data.md), [19](19-destinations.md),
[20](20-origins.md), [21](21-appearance.md).

Lesson 21 ended on a question rather than on a pattern. Its seam — a look the
tree names and cannot check — turned out to be interesting not because of the
registry but because the property it exists to protect, *can a reader read this
page*, belongs to no single party. The lesson said that the place to look for a
fifth Part V seam was not another dangerous value but another property of that
shape.

This is one, and it is the sharpest instance available, because the property
here does not belong to two *parties*. It belongs to **two nodes**, both of
which are perfectly valid, in a tree that satisfies every schema it is checked
against. There is no field to put it in. There is no party to ask.

It is also the one place in the whole system where the Gate refuses a change for
being **wrong** rather than for being consequential — and the first exercise in
this course where the code disagrees with a decision record that this course has
already taught you.

---

## Warm-up

Closed book, five minutes, mixed across seven lessons. Write something for all
five before you look anything up.

1. Lesson 07's separation: the analysis measures and the policy judges. State
   what the analysis is *forbidden* from doing, then name the one input to
   `analyzeDelta` that looks like a violation of it and say why it is not.
   *(07, 09)*
2. A change carries a `critical` stake factor and a perfect inverse delta. Say
   what each axis reports, and what the Gate does with the pair under the
   default policy. *(06, 08, 09)*
3. A primitive promises two things — one checkable by the registry and one not.
   Name both halves and say who checks the checkable one and when. *(15)*
4. The renderer is total. Give the rule in one sentence, then say what the
   renderer does when it meets a tree it thinks is wrong, and name the channel
   it uses instead of refusing. *(14)*
5. A proposal is refused. Say what the pipeline does next, what is written to
   the record, and the one thing a repair is not allowed to be. *(10, 13)*

Question 4 is the one to be precise about rather than roughly right about. The
difference between *the renderer may not refuse* and *the renderer does not
happen to refuse* is the whole reason this lesson has a subject.

---

## Predict

**In writing, before reading on.** Four questions. Question 2 catches most
people out by one operation, and question 4 is the one to put a confidence
number against — it is a question about this repository as it stands today, and
you can check the answer yourself in ten lines.

1. A page has a card. The card is a link — the whole surface is clickable. Inside
   it somebody puts a "Buy the guide" button that is also a link. HTML forbids
   interactive content inside interactive content, and a browser handed this does
   not complain: it resolves the ambiguity by dropping one of the two. **Which
   part of Loom catches this?** Choose from: the props schema, `applyDelta`, the
   renderer, `auditRegistry`, the Gate, or nothing does. Write your answer and,
   for each option you rejected, one clause saying why it cannot.

2. **Which of the four delta operations can produce this fault?** There are four:
   `insert`, `remove`, `move`, `configure`. Name every one that can, and for each
   one you name, write the specific change in one line. Be exact — the count is
   the question.

3. A tree already has a link inside a link when the model arrives; nobody knows
   how it got there. A proposal moves an unrelated paragraph three nodes away.
   **What does the analysis report about nested targets, and why that?** Then
   answer the harder half: what should it report if that same proposal *also*
   introduces a second, different nesting — and what would the alternative rule
   cost the person reading the assessment?

4. `loom.nav` is the bar across the top of a page: a brand region, a menu of
   `loom.link` children, and an actions region. **Does the starter library
   declare `loom.nav` a target?** Answer yes or no, **rate your confidence 1–5**,
   and then — whichever way you answered — write down what follows for a proposal
   that adds one menu item to a nav.

Do not read on until all four are written. Question 4 is the one this lesson
turns on, and it is worth noticing now whether your answer came from the rule
you would state or from the page you have in your head.

---

## The problem

Here is a card. It is a link: the whole surface is the thing a reader aims at,
which is a real design and a good one — a card whose only clickable part is a
"learn more" that says nothing is a worse target than the card itself.

Inside it, on the day the marketing copy changed, a model put a button.

```
loom.card  href="/guides/onboarding"
├── "Everything you need to start"
└── loom.action  href="/buy"   "Buy the guide"
```

Every node here is valid. The card's props pass the card's schema. The action's
props pass the action's schema. The tree is well formed: three nodes, correct
kinds, unique ids, no orphans. Every check this course has taught you passes.

And the page is broken. Nested interactive content is invalid HTML, and browsers
do not report invalid HTML — they repair it. Handed an anchor inside an anchor, a
browser drops one of the two. Which one it drops is its business. What you get is
a page that renders, looks exactly right in a screenshot, passes a visual review,
and has one thing on it that silently does not work.

This is the rare structural mistake that is **invisible in a picture and obvious
to a user**, which is precisely the wrong way round for every review process
Loom has built so far.

Now the harder part. Ask where the fault *is*.

It is not in the card: a linked card is fine, and thousands of pages have one.
It is not in the action: a button that links somewhere is the most ordinary node
in the library. It is not in the pair's *types*, either — a `loom.action` inside
a `loom.card` is the commonest correct composition on any page, and refusing it
outright would be a check every host switches off within a week.

**The fault is a relation between two nodes, conditional on the props of one of
them.** There is nowhere to put that. And every seam already built is blind to
it, each for a reason you would defend:

- **A props schema** (lesson 15) validates one node's props. It cannot see
  descendants. Widening it to see them would make every primitive's schema a
  claim about the tree around it.
- **The renderer** (lesson 14) is a total, pure projection —
  [0008](../decisions/0008-the-renderer-is-a-total-pure-projection.md). It may
  not refuse to render. It could emit a diagnostic, but only after the page has
  been built and served, which is a report about damage rather than a check.
- **`auditRegistry`** (lesson 15) probes each primitive in isolation. That is
  what makes it cheap, and it is exactly what makes it blind here: there is no
  isolated primitive to probe. The fault needs two.
- **`applyDelta`** (lesson 03) is vocabulary-free by construction. It knows
  nothing about what `loom.card` means, and the day it does, the tree model
  stops being a tree model.
- **The Gate** (lesson 09) is where a judgment about a change belongs — but the
  Gate judges what the analysis measured, and the analysis is computed from the
  tree alone. Nothing in the tree says a card with an `href` is a link.

`loom.card`'s own doc comment used to say *a linked card should hold no link*.
That sentence is documentation, which is what a library can do when the
constraint is real, cheap to check, and expressible nowhere.

---

## The idea

**A primitive declares whether the reader aims at the whole of it. The Gate
derives, from a deployment's set of those declarations, whether a change leaves
one target inside another — and refuses the change if it does.**

Five parts, and each one is a decision that could have gone the other way.

### The declaration is about the node, never about the parent

```ts
definePrimitive({ type: "loom.action", interactive: "always", … })
definePrimitive({ type: "loom.card", interactive: { whenProps: ["href"] }, … })
```

`"always"`, or *a target when the tree gave it one of these props*. Nothing in
that declaration mentions children, parents, or what may sit inside what. It is
a fact about the component, checkable by looking at the component.

That restraint is [0054](../decisions/0054-a-container-is-its-childs-name-plus-the-arrangement.md)
holding. 0054 turned down a `childType` field — a claim about a primitive's
*relationships*, which the renderer would then be tempted to enforce, and which
would make the registry a place where page structure is legislated. This
declaration says what the primitive **is**. The relation is derived from the
tree by something else entirely, and the renderer never reads any of it.

Notice what that buys: the rule *interactive content does not nest* is stated
**once**, in the runtime, rather than once per primitive in fifty registry
entries that could each get it wrong.

### The conditional form is not a convenience

A `loom.card` with no `href`, holding a `loom.action`, is the ordinary
composition of an ordinary page. A check that refused it would be turned off by
every host that installed it, and a check that is off catches nothing.

So `{ whenProps: ["href"] }` is load-bearing, and so is the definition of *gave
it one*: a prop that is absent, `null`, or the empty string does not count.
Without that last clause the change that **fixes** a nesting — clearing the
card's `href` so the button underneath works again — would itself be refused for
producing one. A check that refuses its own repair is worse than no check.

### "Target" is a question about rendering, not about props

[0064](../decisions/0064-a-primitive-says-whether-it-is-a-target-and-the-gate-derives-the-nesting.md)
built the declaration and never said what qualified. Applied to schemas, "has an
`href`" gets the library wrong in both directions, and
[0068](../decisions/0068-a-primitive-is-a-target-when-the-reader-aims-at-the-whole-of-it.md)
is the missing sentence:

> **A primitive is a target when the thing a reader aims at covers the whole
> node. How it covers it does not matter.**

Two ways of covering, equivalent for this purpose:

1. **The root is the anchor** — `loom.action`; `loom.card` when linked.
2. **An overlay spans the node** — `loom.article`, whose title anchor stretches
   a `::after` across the whole card. The markup stays perfectly well formed and
   a control placed underneath receives nothing at all. Not a nested-anchor
   hazard; the same damage by a different mechanism.

And one way that is not covering it:

3. **A control inside the node's surface** — `loom.product`, which links its
   *name* and deliberately leaves the rest of the card free, because
   [0066](../decisions/0066-a-card-is-the-target-when-it-is-read-and-the-control-is-the-target-when-it-is-bought.md)
   puts a real "Buy" action in the region beneath it. Undeclared, on purpose:
   declaring it would make the Gate refuse the library's own intended
   composition.

The test to apply to the next primitive is a question about the rendering:
*is there anywhere inside this node where a reader could put a second control
and have it work?* If the answer is no, it is a target.

Hold on to that sentence. Exercise F asks you to apply it to a primitive that
answers **yes, obviously** — and to look at what that primitive actually
declares.

### The vocabulary is derived, not written

```ts
const policy = gatePolicySchema.parse({ interactiveTypes: interactiveTypesFor(registry) })
```

One line. A host that hand-wrote `{ "loom.card": { whenProps: ["href"] } }` would
be maintaining, in a second place, a fact that is only knowable in the first —
and the day someone gives `loom.feature` an `href`, the hand-written copy is
wrong and nothing says so.

This is the same move `textCatalogue` makes (lesson 15) for the same reason:
derive what a deployment must configure from what its primitives already
declare, so the configuration cannot describe a library that is not the one
installed. It is still the host's explicit call — a deployment that wants none
of this leaves the line out, and then nothing is a target and this never fires.
Silence is the default ([0002](../decisions/0002-gate-policy-is-host-owned-and-explicit.md)).

### The fact is measured on both trees, and only the difference counts

Every operation kind can produce a nesting and only two of them look like they
can. `insert` and `move` put a target somewhere. `configure` does it without
touching a single child: give a card an `href` and every link already inside it
is broken by one operation against one node.

So the analysis walks the tree the delta **produces**, walks the tree it
**started from**, and reports the difference — the pairs this change introduced,
not the pairs it inherited.

That rule is not leniency. A change is answerable for the breakage it causes; a
rule that charged it for the breakage it found would mean the first proposal
touching a legacy page is refused for a fault nobody in the conversation
created, and — worse — that the model cannot be told anything useful about it,
because there is no operation in its delta to point at.

### It is a stake factor, not a Gate rule

`nested-target`, at `critical`, which under the default refusal floor is a
refusal. **No new rule in the ladder.**

That is the argument worth carrying out of this lesson. Every other stake factor
in the system measures a change that might be *right*: destroying a protected
primitive is what a redesign looks like, discarding later work is sometimes
exactly the intention, moving a form's destination is what splitting a mailing
list requires. Those get held for a person, because a person can say yes.

This one measures a change that is **wrong however it was meant**. Nobody wants
a link a browser will drop. There is no yes available, so there is nobody to
ask — and putting the question to a person who can only answer no is not
caution, it is a queue.

Refusal is also the *useful* disposition rather than the severe one, and lesson
13 is why: a refused proposal is the one a repairer gets to try again, with the
refusal's own sentence as the input. *"You put a target where the reader cannot
reach it: `loom.action n_2` inside `loom.card n_4`"* is feedback a model can act
on. Confirmation would skip the repair path entirely and spend a person's
attention on it instead.

---

## In the code

- [`src/interactivity.ts`](../src/interactivity.ts) — `InteractiveWhen`, the
  schema, and `isInteractiveWith`. It lives beside the identifier schemas rather
  than in the SDK or the runtime because it has two readers that do not know
  about each other: the SDK, where an author declares it, and the Gate's policy,
  where a deployment's set of them arrives as vocabulary.
- [`src/runtime/nesting.ts`](../src/runtime/nesting.ts) — `interactivePredicateFor`
  turns the vocabulary into a predicate; `nestedTargetsIn` walks a tree and
  reports pairs. Read the comment about the *nearest* enclosing target rather
  than the outermost.
- [`src/runtime/analysis.ts`](../src/runtime/analysis.ts) —
  `introducedNestedTargets`, which is the before-and-after subtraction, and the
  predicate arriving as an argument that defaults to "nothing is a target".
- [`src/runtime/stakes.ts`](../src/runtime/stakes.ts) — the `nested-target`
  factor, and a doc comment worth reading twice: **the damage is unreachability,
  not nesting.**
- [`src/sdk/interactivity.ts`](../src/sdk/interactivity.ts) —
  `interactiveTypesFor`, sixteen lines, the whole seam between a library and a
  policy.
- [`src/sdk/registry.ts`](../src/sdk/registry.ts) — the two registration
  refusals: `undeclared-interactive-prop`, and `undeclared-interactive-behaviour`.
  The second one is the subject of exercise F, and of most of what follows it.

---

## Try it

Seven exercises. **Predict every output in writing, then run.** Exercise F is
the one to commit to hardest and the one to rate your confidence on — it is
Predict 4, executed.

Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

The shared preamble for all seven:

```ts
import { renderToStaticMarkup } from "react-dom/server"
import { describe, it } from "vitest"

import { sequentialIdFactory } from "./ids.js"
import type { JsonObject } from "./json.js"
import { createStarterPrimitiveRegistry } from "./primitives/index.js"
import { renderLoomTree } from "./render/render.js"
import { analyzeDelta } from "./runtime/analysis.js"
import { assessChange } from "./runtime/assessment.js"
import { gate } from "./runtime/gate.js"
import { describeNestedTarget, interactivePredicateFor, nestedTargetsIn } from "./runtime/nesting.js"
import { defaultGatePolicy, gatePolicySchema, type GatePolicy } from "./runtime/policy.js"
import type { ProposedChange } from "./runtime/proposal.js"
import { interactiveTypesFor } from "./sdk/interactivity.js"
import { createThemeRegistry } from "./theme/index.js"
import { buildElement, buildSlot, buildText } from "./tree/builders.js"
import type { TreeDelta, TreeOperation } from "./tree/delta.js"
import { createTree, type LoomTree } from "./tree/tree.js"

/** The starter library, and the vocabulary a host derives from it in one line. */
const registry = (() => {
  const built = createStarterPrimitiveRegistry()
  if (!built.ok) throw new Error(JSON.stringify(built.error))

  return built.value
})()

const vocabulary = interactiveTypesFor(registry)
const isTarget = interactivePredicateFor(vocabulary)
const policy: GatePolicy = gatePolicySchema.parse({ interactiveTypes: vocabulary })

const spare = sequentialIdFactory("x")

/** A page holding one card, and inside the card one thing a reader aims at. */
const cardPage = (cardProps: JsonObject): LoomTree => {
  const ids = sequentialIdFactory()
  const action = buildElement(ids, {
    type: "loom.action",
    props: { href: "/buy" },
    children: [buildText(ids, "Buy the guide")],
  })
  const card = buildElement(ids, {
    type: "loom.card",
    props: cardProps,
    children: [buildText(ids, "Body copy"), action],
  })
  const page = buildElement(ids, { type: "loom.page", props: { title: "Home" }, children: [card] })

  return createTree(page, ids)
}

const deltaOf = (tree: LoomTree, operations: readonly TreeOperation[]): TreeDelta => ({
  deltaId: spare.deltaId(),
  treeId: tree.treeId,
  baseRevision: 0,
  operations,
})

const proposalOf = (delta: TreeDelta): ProposedChange => ({
  proposalId: spare.proposalId(),
  intentId: spare.intentId(),
  delta,
  rationale: "teaching",
  provenance: {
    origin: "developer",
    interpreter: "scratch",
    authoredBy: "model",
    confidence: 0.99,
    interpretedAt: "2026-09-10T00:00:00.000Z",
  },
})

/** Analyse, assess, gate — and print the three numbers this lesson is about. */
const weigh = (
  label: string,
  tree: LoomTree,
  operations: readonly TreeOperation[],
  applied: GatePolicy = policy
) => {
  const delta = deltaOf(tree, operations)
  const analysis = analyzeDelta(tree, delta, interactivePredicateFor(applied.interactiveTypes))
  if (!analysis.ok) throw new Error(JSON.stringify(analysis.error))

  const assessed = assessChange(tree, proposalOf(delta), applied, spare.deltaId())
  if (!assessed.ok) throw new Error(JSON.stringify(assessed.error))

  console.log(
    `  ${label.padEnd(28)} nested=${analysis.value.nestedTargets.length} stakes=${
      assessed.value.stakes.level
    } gate=${gate(assessed.value, applied).kind}`
  )
  for (const factor of assessed.value.stakes.factors) {
    console.log(`      ${factor.code} (${factor.level}): ${factor.detail}`)
  }
}

const childOf = (tree: LoomTree): string =>
  tree.root.kind === "element" ? String(tree.root.children[0]?.id) : "?"
```

### Exercise A — what the library says about itself

```ts
describe("A", () => {
  it("reads the vocabulary off the library", () => {
    console.log(`  primitives registered: ${registry.primitives.length}`)
    console.log(`  of those, declaring a target: ${Object.keys(vocabulary).length}`)
    for (const [type, when] of Object.entries(vocabulary)) {
      console.log(`    ${type.padEnd(16)} ${JSON.stringify(when)}`)
    }
  })
})
```

Predict the second number before you run it. Seventy primitives ship in the
starter library; write down how many of them you expect to be targets, and then
name three you are sure of and one you are unsure about.

The output:

```
  primitives registered: 70
  of those, declaring a target: 10
    loom.nav         "always"
    loom.card        {"whenProps":["href"]}
    loom.feature     {"whenProps":["href"]}
    loom.article     {"whenProps":["href"]}
    loom.logo        {"whenProps":["href"]}
    loom.credential  {"whenProps":["href"]}
    loom.code        "always"
    loom.action      "always"
    loom.button      "always"
    loom.link        "always"
```

Ten of seventy. Most of a component library arranges targets rather than being
one, which is the ratio that makes this check affordable.

Two entries in that list should stop you. `loom.code` is a code block — an
`"always"` target, which is not what a block of text sounds like. And
`loom.nav` is the bar of links across the top of the page. Write down, now, what
you think each of those is claiming, and keep it for exercise F.

### Exercise B — the pair, and the prop that decides there is one

```ts
describe("B", () => {
  it("finds the pair, and only when the card is a link", () => {
    for (const props of [{}, { href: "/guide" }, { href: "" }]) {
      const found = nestedTargetsIn(cardPage(props).root, isTarget)
      console.log(
        `  card props ${JSON.stringify(props).padEnd(18)} → ${
          found.length === 0 ? "nothing" : found.map(describeNestedTarget).join("; ")
        }`
      )
    }
  })
})
```

Three trees, identical but for one prop on one node. Predict all three lines,
including the ids — Warm-up 3 in lesson 21 asked you for this same arithmetic,
and the card here is the *second* node built.

The output:

```
  card props {}                 → nothing
  card props {"href":"/guide"}  → loom.action n_2 inside loom.card n_4
  card props {"href":""}        → nothing
```

The third line is the interesting one and it is the reason the empty string is
written into `isSet`. A card whose `href` has been cleared renders a plain
surface again, so the button inside it works, so there is no fault — and a rule
that read a blank as a link would refuse the change that fixed the page.

The ids are `n_2` and `n_4` because the fixture builds leaves before parents:
the text "Buy the guide" is `n_1`, the action holding it is `n_2`, the card's
own body text is `n_3`, the card is `n_4`. An id still says nothing about
position (lesson 04), and this is the fourth lesson in which that has cost
somebody a prediction.

### Exercise C — one operation, one node, one broken page

```ts
describe("C", () => {
  it("weighs the one operation that puts a control out of reach", () => {
    const tree = cardPage({})
    console.log(`  the card is ${childOf(tree)}`)

    weigh("configure: give it an href", tree, [
      { op: "configure", nodeId: childOf(tree), set: { href: "/guide" }, unset: [] },
    ])
    weigh("configure: rename the page", tree, [
      { op: "configure", nodeId: tree.root.id, set: { title: "Home page" }, unset: [] },
    ])
  })
})
```

Two `configure` operations. Same op, same shape, one node each. Predict the
stakes level and the disposition of both, and — this is Predict 2 — say whether
you expected `configure` to be able to produce this fault at all.

The output:

```
  the card is n_4
  configure: give it an href   nested=1 stakes=critical gate=rejected
      nested-target (critical): puts a target where the reader cannot reach it: loom.action n_2 inside loom.card n_4
  configure: rename the page   nested=0 stakes=low gate=accepted
```

Nothing was inserted. Nothing moved. One prop was set on one node, and a control
somewhere below it stopped working — which is why the analysis measures the
*resulting tree* rather than reading the operations. A rule that looked for
`insert` and `move` would have let this through, and it is the case that
actually happens: the copy changes, somebody makes the whole card clickable, and
the button inside it silently dies.

### Exercise D — the same change, at a deployment that declared nothing

```ts
describe("D", () => {
  it("says nothing at all to a host that declared no targets", () => {
    const tree = cardPage({})

    weigh(
      "the same change, no vocabulary",
      tree,
      [{ op: "configure", nodeId: childOf(tree), set: { href: "/guide" }, unset: [] }],
      defaultGatePolicy
    )
  })
})
```

Identical delta, identical tree, `defaultGatePolicy` instead of the derived one.
Predict all three columns.

The output:

```
  the same change, no vocabulary nested=0 stakes=low gate=accepted
```

`low`, and applied. The fault is still in the page — the browser will still drop
a link — and the runtime says nothing, because this deployment never told it
which of its primitives a reader aims at.

That is not a bug and it is worth sitting with. The check is **vocabulary**, and
vocabulary is host-owned (0002): a library whose components the runtime has
never seen cannot have its compositions judged, and a runtime that guessed would
be legislating. What the host does to get the check is one line —
`interactiveTypesFor(registry)` — and what it does to keep the old behaviour is
nothing at all.

### Exercise E — answerable for what you did, not for what you found

```ts
describe("E", () => {
  it("is not answerable for what it inherited", () => {
    const tree = cardPage({ href: "/guide" })
    console.log(`  already in the tree: ${nestedTargetsIn(tree.root, isTarget).length}`)

    weigh("add a line somewhere else", tree, [
      {
        op: "insert",
        parentId: tree.root.id,
        index: 1,
        node: { kind: "text", id: spare.nodeId(), text: "Published Tuesday" },
      },
    ])
  })
})
```

The tree starts broken. The delta adds a line of text three nodes away. Predict
the first line and the `nested=` column, and predict the stakes level too —
there is a second factor here that has nothing to do with this lesson.

The output:

```
  already in the tree: 1
  add a line somewhere else    nested=0 stakes=medium gate=accepted
      shallow-structural-change (medium): restructures at depth 1
```

One fault in the tree, zero reported against the change. The proposal is
answerable for the breakage it introduced and not for the breakage it inherited.

The `medium` is worth noticing on its own: inserting one text node at depth 1 is
a shallow structural change, so this proposal is not *unremarkable* — it is
simply not remarkable for this reason. Two factors from two lessons, measured
separately, judged together. That is lesson 07's separation doing its job.

### Exercise F — what a nav says it is

```ts
describe("F", () => {
  it("asks what a nav is", () => {
    const ids = sequentialIdFactory()
    const link = buildElement(ids, {
      type: "loom.link",
      props: { href: "/pricing", scale: "small" },
      children: [buildText(ids, "Pricing")],
    })
    const nav = buildElement(ids, { type: "loom.nav", props: { tone: "surface" }, children: [link] })
    const page = buildElement(ids, { type: "loom.page", props: { title: "Home" }, children: [nav] })
    const tree = createTree(page, ids)

    console.log(`  loom.nav declares:  ${JSON.stringify(vocabulary["loom.nav"])}`)
    console.log(`  loom.link declares: ${JSON.stringify(vocabulary["loom.link"])}`)
    console.log(
      `  in the tree:        ${
        nestedTargetsIn(tree.root, isTarget).map(describeNestedTarget).join("; ") || "nothing"
      }`
    )

    weigh("insert a menu item", tree, [
      {
        op: "insert",
        parentId: nav.id,
        index: 1,
        node: {
          kind: "element",
          id: spare.nodeId(),
          type: "loom.link",
          props: { href: "/docs" },
          children: [{ kind: "text", id: spare.nodeId(), text: "Docs" }],
        },
      },
    ])

    const rendered = renderLoomTree(tree, { resolver: registry, themes: createThemeRegistry() })
    const markup = renderToStaticMarkup(rendered.element)
    console.log(
      `  what it renders:    ${markup.slice(markup.indexOf("<nav"), markup.indexOf("<nav") + 22)}…`
    )
    console.log(`  render diagnostics: ${JSON.stringify(rendered.diagnostics)}`)
  })
})
```

This is Predict 4. A nav with one link in it, and a proposal that adds a second —
the most ordinary edit anybody makes to a website. **Write down the whole output
before you run it**, and put your confidence number next to the `gate=` column.

The output:

```
  loom.nav declares:  "always"
  loom.link declares: "always"
  in the tree:        loom.link n_2 inside loom.nav n_3
  insert a menu item           nested=1 stakes=critical gate=rejected
      nested-target (critical): puts a target where the reader cannot reach it: loom.link n_x2 inside loom.nav n_3
  what it renders:    <nav class="loom-nav" …
  render diagnostics: []
```

**Adding a menu item to a navigation bar is refused as damage.**

Read the last two lines before you decide what that means. The nav renders a
`<nav>` — not an anchor, not an overlay. The links inside it work. A browser
drops nothing, the renderer reports nothing, and a reader can click every one of
them. There is no fault on this page.

So apply 0068's test to `loom.nav` yourself: *is there anywhere inside this node
where a reader could put a second control and have it work?* The node is a menu.
Its whole purpose is to hold controls that work. The answer is yes, obviously,
which by the definition this lesson taught you means it is **not** a target.

Why does it say it is? Because a nav grew a "more" disclosure button, and the
registry has a second rule: a primitive that takes a behaviour which renders a
control must declare `interactive`, or registration fails
([0086](../decisions/0086-a-behaviour-is-a-control-the-runtime-builds-and-a-primitive-places.md)).
That rule exists to stop a primitive that *places* a control from being nested
inside an anchor — a real hazard, correctly identified. But `interactive` was
already spoken for. In 0068 it means **the whole of this node is the target**,
and in 0086 it is being used to mean **this node contains a control**. Those are
different claims, and one field is carrying both.

The declaration is therefore true of the button inside the nav and false of the
nav. Everything downstream reads it as the second thing, so every link in every
navigation bar in the deployment is a target inside a target, and every change
that touches one is refused for damage that is not there.

Neither record is wrong. Each is right about its own case, and each was written
without the other in view — which is what this whole lesson is about. **A
property that belongs to two nodes has to be *declared* by one of them, and a
declaration is a claim that can be false.** The registry checks the half it can
(a trigger prop that the schema does not declare fails registration). It cannot
check that a component renders what it says it renders, and 0064 says so
explicitly, and this is what that unchecked half costs.

Note also what kind of failure it is. A missing declaration loses a real hazard,
quietly. A wrong one refuses correct pages, loudly — and loudly is much the
better of the two, because this one is now in front of you and the other kind is
not.

### Exercise G — the library's own chrome, weighed against the library's own vocabulary

```ts
describe("G", () => {
  it("counts the pairs in the library's own chrome", () => {
    const ids = sequentialIdFactory()
    const link = (label: string, href: string) =>
      buildElement(ids, {
        type: "loom.link",
        props: { href, scale: "small" },
        children: [buildText(ids, label)],
      })

    const nav = buildElement(ids, {
      type: "loom.nav",
      props: { position: "sticky", tone: "surface", align: "end" },
      children: [
        link("Product", "https://example.com/product"),
        link("How it works", "https://example.com/how-it-works"),
        link("Pricing", "https://example.com/pricing"),
        link("Docs", "https://example.com/docs"),
        buildSlot(ids, "brand", [
          buildElement(ids, {
            type: "loom.logo",
            props: { name: "Loom", href: "https://example.com/" },
          }),
        ]),
        buildSlot(ids, "actions", [
          buildElement(ids, {
            type: "loom.action",
            props: { href: "https://example.com/start", variant: "primary", scale: "small" },
            children: [buildText(ids, "Start building")],
          }),
        ]),
      ],
    })
    const page = buildElement(ids, { type: "loom.page", props: { title: "Home" }, children: [nav] })

    const found = nestedTargetsIn(createTree(page, ids).root, isTarget)
    console.log(`  pairs in the library's own chrome: ${found.length}`)
    for (const one of found) console.log(`    ${describeNestedTarget(one)}`)

    const blank = sequentialIdFactory("b")
    const empty = createTree(
      buildElement(blank, { type: "loom.page", props: { title: "Home" }, children: [] }),
      blank
    )

    weigh("propose that chrome", empty, [
      { op: "insert", parentId: empty.root.id, index: 0, node: nav },
    ])
  })
})
```

This nav is the shape the starter library ships in its own fixture: four menu
links, a logo in the brand slot, a call to action in the actions slot. Predict
the count, and then predict what happens when a model proposes building it.

The output:

```
  pairs in the library's own chrome: 6
    loom.link n_2 inside loom.nav n_14
    loom.link n_4 inside loom.nav n_14
    loom.link n_6 inside loom.nav n_14
    loom.link n_8 inside loom.nav n_14
    loom.logo n_9 inside loom.nav n_14
    loom.action n_12 inside loom.nav n_14
  propose that chrome          nested=6 stakes=critical gate=rejected
      broad-change (medium): touches 14 nodes
      shallow-structural-change (medium): restructures at depth 1
      nested-target (critical): puts 6 targets where the reader cannot reach them: loom.link n_2 inside loom.nav n_14; loom.link n_4 inside loom.nav n_14; loom.link n_6 inside loom.nav n_14; loom.link n_8 inside loom.nav n_14; loom.logo n_9 inside loom.nav n_14; loom.action n_12 inside loom.nav n_14
```

Six pairs, and the slots make no difference: a region projected into a node sits
inside it exactly as a child does, which is why the logo and the action count.

The last line is the one to keep. **A deployment running the starter library,
with the starter library's own derived vocabulary, cannot build the starter
library's own navigation bar through the Gate.** Not "is warned about" —
refused, at `critical`, with no confirmation path, because refusal is what this
factor is for.

That is the cost of a false declaration stated as precisely as it can be stated.
And notice the shape of how it was found: not by reading the registry, not by
reading either decision record — both of which are internally consistent and
well argued — but by running the two of them together against a tree and looking
at the number.

---

## It could have been otherwise

Six, and the last is not in any record because it is the one exercise F walked
into.

**A render diagnostic instead of a Gate factor.** The registry is already at the
render seam, so a `nested-target` diagnostic beside `data-unavailable` would
cost almost nothing and would need no vocabulary in a policy. Rejected as the
*primary* home because it reports after the fact: the page is built and served
before anybody hears. Still worth having for trees that arrive from outside the
Gate — hand-authored, imported, or written before a host declared its targets —
and left open rather than built.

**`interactive: true`, with no props.** Half the code and unusable. It refuses
the commonest correct composition on the page — an action inside an unlinked
card — and a check that refuses the ordinary case is a check that gets switched
off.

**A dedicated Gate rule below the refusal floor**, so the disposition is
`requires-confirmation`, the shape `discards-later-work` has. Rejected because
that shape exists for changes a person might legitimately want. It would also
skip the repair path, which is where the useful outcome is.

**A declared constraint on the parent** — "this primitive admits no interactive
descendants". More machinery, it re-opens what 0054 settled, and it states the
rule once per primitive when the rule is the same everywhere.

**Enforcement in `applyDelta`.** Wrong layer, and the reason is the one lesson
03 gave: the tree model is vocabulary-free by construction, and a delta a host's
policy would accept must still apply.

**A second declaration for "contains a control".** Not considered anywhere,
because until 0086 there was nothing to distinguish it from — and it is what
exercise F says is missing. A primitive that places a control is making a
different claim from a primitive that *is* one: the first must not be dropped
into an anchor, the second must not have one dropped into it. One field cannot
hold both, and the version of this system with two fields is a different system
with a different registry check and a different failure. That is a decision
record somebody has to write, and this course is not where it gets written.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections while
you write. Then compare.

1. **Explain, to somebody who has just learned that a props schema validates a
   node, why this fault needed a new mechanism.** Then do the harder half:
   generalise. Give the shape of *any* constraint that this system's existing
   seams structurally cannot express, and give one more example of that shape
   from anywhere in the course — Parts II to V are all fair game. If you cannot
   find a second example, say what that suggests about how common this shape is,
   and check whether you believe it.

2. **Derive this seam from lesson 15 and lesson 07 together, without looking at
   either.** Lesson 15 gave you a primitive making a promise the registry checks
   half of; lesson 07 gave you measurement separated from judgment. Show how the
   two produce this design — declaration, derivation, analysis, factor — and
   then name the one thing in it that neither lesson could have predicted.

Predict, before writing (1): if your generalisation is "constraints about
relationships between nodes", you have described this instance rather than the
shape. Push on it — what is it about *where the fact lives* that makes an
existing seam unable to check it?

---

## Self-check

Seven questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. Name the three existing seams that cannot catch a target inside a target, and
   give each one's reason in the form *"because it only ever sees …"*. Then say
   which of the three could have been changed to catch it, and what that change
   would have cost elsewhere.
2. `{ whenProps: ["href"] }` treats absent, `null` and `""` alike. Give the
   argument for the empty string specifically, in terms of a change the system
   must not refuse.
3. Give 0068's test for whether a primitive is a target, then apply it to two
   cases: a card whose title is a link and whose body is free; and a card with an
   invisible overlay stretched across it by a `::after`. Same answer or
   different, and why the mechanism does not matter.
4. A `configure` operation with no children involved produced a `critical`
   refusal in exercise C. Explain how, and use it to say why the analysis
   measures trees rather than reading operations.
5. Why is `nested-target` a stake factor rather than a rule in the Gate's ladder?
   Answer with the property that distinguishes it from every other factor, and
   then say what a deployment gets from refusal that it would not get from
   confirmation.
6. A change inherits one nesting and introduces none. State what is reported and
   why, then argue the other side: give the strongest case for reporting
   inherited faults too, and say what it would cost the repair loop.
7. `loom.nav` declares itself a target and renders a `<nav>`. State the claim
   that declaration is making, the claim the rule that forced it wanted to make,
   and the two different failures those two claims protect against. Then say
   which of the two failure modes — a missing declaration, or a false one — you
   would rather ship, and defend it.

Question 7 is this lesson's question. Question 3 is the one where a half-answer
looks like a full one: if your answer to the second case is only "yes it is a
target", you have not said the part that matters.

---

## Reflect

Write for two minutes, then move on.

- Predict 1 asked which layer catches a link inside a link. If you answered "the
  renderer", the thing to write down is not that you were wrong but *why it felt
  right*: a renderer is where the HTML is, and the instinct that the layer which
  knows about anchors should be the layer that objects is a good instinct, held
  against a system that has deliberately taken that power away from it. Say what
  the system bought with that.
- Predict 2 asked which operations can produce the fault. If you left out
  `configure`, write down what you were picturing. Almost everybody pictures the
  fault being *inserted*, and the version that actually happens in a repository
  is a prop being set on a node whose children nobody was thinking about.
- Predict 4 is the one to look at hardest, and specifically at your confidence
  number. If you rated 4 or 5 and said "no, a nav is a container", you were
  right about the rule and wrong about the repository — which is the most useful
  kind of wrong there is, and precisely the pair the corrections queue exists to
  bring back. Write down what you would have had to do to catch it: not "read
  more carefully", but the specific check.
- This lesson found a real defect by running two decision records against each
  other. Both were right on their own. Write down one place in your own work
  where two rules you believe are each individually correct have never been
  executed together — and say what running them together would look like.
- Last, take the shape out of Loom entirely: a property that no single object
  owns, that only exists between two of them, and that every validator you have
  is structurally unable to see. Name one from a system you have worked on. Then
  say where the check for it would have to live, and why it is not there.

---

## Come back to this

Set AA in [`review-schedule.md`](review-schedule.md), two days after this lesson.
Interleaved with 03, 07, 08, 09, 13, 14, 15 and 21 — heavy on Part II again,
because what is interesting here is not the declaration but what the Gate did
with it, and heavy on 15 because this is the second lesson running in which a
primitive's promise turned out to be a claim rather than a fact.

Part V now has five lessons. Four of them are a name in the tree and a document
in a registry, resolved before the walk; this one has no document and nothing to
resolve — what the registry holds is a *predicate*, and what it is applied to is
a pair. If there is a sixth, the thing to look for is not another registry. It is
another fact that exists only between two things, and the question to bring to it
is the one exercise F answered the hard way: **who is allowed to declare it, and
what happens when they are wrong?**
