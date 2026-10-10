# 36 — Vantage: the fact a render cannot see and a document already holds

**After this lesson you will be able to** say why *nothing can compute this* is a
claim about a moment rather than about a system, and name the three moments in
Loom at which the two halves of a plotted band's claim are both in one party's
hands; say which of the two sibling bands in the starter catalogue could be
checked and which one can never be, and name the thing that decides it — which
is not in either band's type, props or schema; say why a ceiling written into a
schema and a ceiling written as a prop are two different kinds of promise, and
derive from that which of the two the Gate can refuse; say what the write path is
handed and what it spends it on, and why the answer is about the shape of the
seams rather than about anybody's reach; name the pair-shaped walk that is
already wired into `analyzeDelta` and say what a second one would need that the
first one gets for free; say which of two checks about the same pair of nodes got
written on the same afternoon and give the property of the *failure* that decided
it; and say what it costs to take a true sentence about one moment and read it as
a sentence about a system.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md), [08](08-two-axes.md), [09](09-the-gate.md),
[10](10-the-pipeline.md), [11](11-the-model-seam.md), [12](12-projection.md),
[13](13-refusal-and-repair.md), [14](14-rendering.md),
[15](15-primitives-and-the-registry.md), [16](16-persistence.md),
[17](17-telemetry.md), [18](18-data.md), [19](19-destinations.md),
[20](20-origins.md), [21](21-appearance.md), [22](22-reach.md),
[23](23-anchors.md), [24](24-silence.md), [25](25-exhaustiveness.md),
[26](26-liveness.md), [27](27-scale.md), [28](28-corroboration.md),
[29](29-readership.md), [30](30-rendezvous.md), [31](31-behaviour.md),
[32](32-layout.md), [33](33-shortfall.md), [34](34-hindsight.md),
[35](35-instruments.md).

Lesson 35 closed on a question about populations: **what is this check's
population, who chose it, and what has the system already changed about itself to
stay inside it?**

This lesson is that question asked where nobody chose anything, and the answer
turns out to be a *when*. Lesson 27 took apart a chart whose container cannot
read its own children, and it said something true in the course of doing it:

> `max` is a prop because nothing can compute it — a render is a total pure
> projection of one node (0008), so the container cannot read its children.

Read the whole sentence and it is exact. Read the first clause on its own — and
the first clause is the one that got repeated, in two primitives' headers and in
a composition's — and it says something much larger and false. **Nothing in a
render can compute it.** The same two numbers sit side by side, in one file, in
one literal, in a module that is a pure function of nothing, three directories
away. They sit side by side again inside `analyzeDelta`, which is handed the
whole tree as its first argument and already walks it looking for a fact that
belongs to a *pair* of nodes.

So this is the first seam in Part V where nothing is out of reach at all, by
anybody, at any point — and the thing that is still unchecked is unchecked
because a sentence about one moment got read as a sentence about the system.

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Write something for all
five before you look anything up.

1. A container that needs a fact about its children cannot read them. Give the
   clause that forbids it — the clause, not the sentiment — and then say what the
   container publishes instead and who does the arithmetic. *(27)*
2. "Total" and `Result` are two different disciplines and rendering uses one of
   them. Say which, and say what the renderer does with a node it has no
   primitive for. *(14)*
3. The Gate refuses exactly one thing for being *wrong* rather than for being
   consequential. Name it, say what shape the fact has, and say who supplies the
   predicate that makes it visible. *(22)*
4. Name the argument that carries the whole tree into the write path, and say
   which function it is the first argument of. Then say what the pipeline does
   with a tree it is handed and a delta that does not apply to it. *(10)*
5. Where do you put a list so that making it incomplete is a build failure rather
   than a habit? Then say which of the three claims about a union a compiler
   actually checks. *(25)*

Question 1 is the sentence this lesson is about and question 3 is the precedent
it leans on hardest. If your answer to 1 was "because of purity", go back and get
the clause — the difference between the clause and the sentiment is this whole
lesson.

---

## Predict

**In writing, before reading on.** Four questions. Question 1 is the question of
the lesson and the one to rate your confidence on. Question 3 is the one where
the repository's answer and the answer you would defend are probably the same
answer, and the *order* you would have done them in is the finding.

1. A page carries a `loom.stat-chart` with three `loom.stat` children. The
   children's magnitudes are `12000`, `18000` and `24000` — three quarters of
   revenue in pounds. The chart states `max: 100`.

   Write down, separately, what each of these says about that page:

   - the `loom.stat` props schema, asked about a magnitude of `24000`
   - the `loom.stat-chart` props schema, asked about a `max` of `100`
   - `renderLoomTree`, rendering the page — how many diagnostics
   - the Gate, handed a delta that produced it

   Then write down what a reader sees. **Rate your confidence 1–5 that you have
   all five right.**

2. The starter catalogue has two bands that plot a series, and both state
   `max: 100`. One holds its figures as six numbers in the same module, in the
   same literal as the ceiling. The other names a binding and holds no figures at
   all until a deployment connects a source.

   For each one, write down whether a program in this repository could ever check
   that the ceiling fits the figures. If your two answers differ — and one of them
   should — write down what the difference is a difference *in*. It is not the
   primitive, it is not the prop, and it is not the schema.

3. `src/primitives/compositions.test.ts` already holds a check about exactly this
   pair of nodes — a chart and the stats under it — and its doc comment says, in
   as many words, *so the check has to be about the pair*.

   Write down what you would expect that check to be. Then write down the *other*
   check about the same pair that it is not, and say which of the two you would
   have written first if you had sat down to write one. Commit to an order; the
   order is the point.

4. `loom.meter` plots a value on a scale of 0 to 100, and the 100 is in its own
   props schema. `loom.stat-chart` plots figures on a scale its author states, and
   the ceiling is a prop.

   Write down which of the two the Gate can refuse an out-of-range value on, and
   then write down the general rule you used to decide — as a sentence about where
   a number lives rather than about either primitive.

---

## The problem

Somebody drops the plotted metrics band onto a page and edits it into what their
company actually measures. Six months of uptime becomes three quarters of
revenue. The labels change, the figures change, the band keeps the ceiling it
shipped with.

Here is what that page does. The three columns are twelve, eighteen and
twenty-four thousand pounds, against an axis that stops at a hundred:

```
  Q1  [########################] 100%
  Q2  [########################] 100%
  Q3  [########################] 100%
```

Three bars at full height, in a chart whose entire purpose is to show that a
number went up. The page is not broken. Every node in it validates. The render
emits no diagnostics. The Gate accepts the change that produced it. There is
nothing anywhere to look at.

And it is worth being precise about *why* it looks like that rather than like a
crash, because the reason is a correct decision made somewhere else. The
stylesheet computes each column's height as

```
min(1, max(0, var(--loom-stat-magnitude, 0) / var(--loom-chart-max, 100)))
```

— so a figure above the ceiling fills the plot and stops. That clamp is right:
without it a bar at 24000/100 would be two hundred and forty times the plot's
height and would push the rest of the page off the screen. The clamp is what
turns a layout catastrophe into a plausible-looking chart, which is the whole
difficulty. **A fault that renders as a hole gets found. A fault that renders as
a full column gets shipped.**

The second shape of the same problem is the one that does not need anybody to
edit anything. A chart whose figures are fine today gets a new column tomorrow —
one `insert`, which is exactly what `metrics-chart`'s own rationale advertises:
*a seventh month is one insert*. If that column is an order of magnitude above
the rest, every other column in the series collapses towards the floor and the
chart now says the opposite of what the series says. One operation, accepted,
no diagnostic.

So the question is not *why is nothing checking this*. The question is **who
would be in a position to**, and that question has a better answer than lesson 27
left it with.

---

## The idea

A fact that belongs to two nodes needs a **vantage**: a party, at a particular
moment, holding both halves at once. Lesson 22 established that such facts exist
and that a node-by-node checker is blind to them. What it did not have to ask —
because the pair it was about is in the tree at every moment — is *when* the two
halves are both in somebody's hands.

For a plotted band they are in somebody's hands at three different moments, and
the three are not equally good.

### The moment a render has

None. This is lesson 27's clause, and it is exactly right.

`loom.stat-chart`'s component is handed its own props and `children`, and
`children` is already-rendered output rather than nodes it can interrogate. There
is no reading of 0008 under which it could get the magnitudes: a render is a
total pure projection of **one** node, and a component that needed its children's
props would be a component that cannot render on its own — which is the property
lesson 27's exercise G is about, and the reason the design pays a stylesheet to
do arithmetic instead.

So the renderer cannot emit a diagnostic for this and should not be asked to. The
clause holds.

### The moment the write path has

The whole tree, as the first argument.

```ts
analyzeDelta(tree, delta, isInteractive, isRegistered, checkProps, reads)
```

That is not a technicality. `analyzeDelta` applies the delta operation by
operation and holds the tree the change produces, and it **already walks that
tree for a fact that belongs to a pair of nodes** — `introducedNestedTargets`,
which is lesson 22's subject. It walks the produced tree for nested targets, it
walks the tree the change started from, and it reports the difference, so a delta
is answerable for the pairs it introduced and not the ones it inherited.

That is the shape a ceiling check would have, in the same function, built. The
pair-shaped seam is not missing. It exists, it is wired, it has a stake factor and
a rung above it, and it is serving one pair.

### The moment the catalogue has

Both halves, in one literal, in a module that takes nothing but an id factory.

```ts
const SERIES = [
  { value: "58%", label: "Apr", magnitude: 58 },
  ...
]
```

…and nine lines down, `props: { max: 100, plot: "standard" }`. A composition's
`build` is a pure function of an id factory, which means the whole subtree exists
at test time, before any render, with no host and no deployment. This is the
cheapest vantage in the system and the narrowest: its population is the
catalogue, and the catalogue is the starting points a host drops in rather than
the pages they end up with.

### What makes the three different is not reach

Here is the turn. The render cannot see it; the other two can, easily; and
neither does. If the reason were reach, the write path would be the fix and the
story would be an engineering gap.

It is not reach. **Every seam the write path has is shaped `(type, props) →
verdict`.** The props check 0179 wired is `propsVocabularyFor(registry)`: it
walks the produced tree, finds the nodes whose props fail, and asks each node's
own primitive about its own props. The registry's `validate` takes one object.
`notDecorated`, `unplacedSlots`, every verdict lesson 29 and lesson 35 are about
— all of them are one primitive, asked about itself.

So the write path holds a tree and spends it one node at a time, and it is not
because it cannot do otherwise: it does do otherwise, once, for nesting. The
general version is worth having:

> **A check's population is usually decided by the shape of the seam that was
> available, and then gets mistaken for the shape of what is possible.**

Lesson 35 asked who chose a population. Here the answer is that the first seam
anybody built was per-node, because almost every question about a page is, and
every question asked afterwards got asked in the shape there was a slot for.
`nestedTargetsIn` is what it looks like when somebody is forced out of that shape
— and what forced them was a fault that makes a page *unusable*, not merely
wrong. Nothing has yet been forced out of it by a fault that renders politely.

### And then the thing that decides the population, which nobody chose

This is the part worth slowing down for, because it is the first time in Part V
that a check's population is decided by something that is not a party, a scope, a
quantifier or a moment.

The catalogue has two bands that plot a series. Both state `max: 100`.

| band | the ceiling | the figures |
| --- | --- | --- |
| `metrics-chart` | `max: 100`, on a `loom.stat-chart` | six numbers, in the same literal |
| `metrics-trend` | `max: 100`, on a `loom.trend` | `binding: "uptimeByMonth"` |

The first band's fit is a fact about a module. A program can read it today, in
milliseconds, with no host, and get a certain answer.

The second band's fit is **not a fact about anything yet**, and will not be a
fact about anything a program in this repository can reach. The figures arrive as
an answer's rows at render time, from a source a deployment registered, under a
name this band names and does not resolve ([0233](../decisions/0233-a-bound-twin-is-earned-by-a-system-of-record-and-a-row-shape-the-primitive-can-declare.md)
is why the points are rows rather than nodes). The ceiling is authored and the
figures are read, so the comparison straddles the one seam in this system that
nothing static crosses. Lesson 18's subject, arriving as a property of a check
rather than of a page.

**Same prop, same number, same part of the catalogue, two sibling files — and one
of them is checkable forever and the other is unreachable forever.** Nothing in
either band's type says which. Nothing in the props schema says which: `max` is
`z.number().finite().positive().optional()` on both. Nothing in the catalogue
line the model is shown says which. The discriminator is **how the figures got
there** — a literal or a binding — which is a property of the authored document
and of nothing the system models.

That is the honest answer to lesson 35's question, and it is more uncomfortable
than a population somebody chose badly. A population *nobody* chose has no
argument to overturn.

### What such a check would be worth, said honestly

Today: nothing. There is one authored plot in the starter catalogue, its six
figures run from 58 to 96, and its ceiling is 100 because the series is a
percentage. The fit holds, and a check over the catalogue would pass on the day it
was written and go on passing.

That is lesson 23's cost exactly — *correct, tested, and reaching nothing* — and
lesson 23 is the reason not to stop there. Two things make this one different
from an anchor check nothing could reach.

**The population grows, and grows towards the fault.** The catalogue gains bands;
`loom.stat-chart`'s own header names the case that breaks this, in the present
tense, as the reason `max` is authored at all: *a band that plots revenue has to
think about this*. The file has already written down which band will be wrong. A
check whose population contains the case its subject's documentation predicts is
not a check reaching nothing; it is a floor under a prediction.

**And the fault is invisible by construction**, which is the argument the anchor
case could not make. A duplicate anchor has a witness the moment somebody clicks
the link. A saturated axis has no witness at all: the chart looks like a chart,
the figures beside the bars are correct, and the only thing wrong is a
relationship between two numbers that nobody prints together.

### The check that got written, and the one that did not

The sharpest thing in this lesson is not any of the above. It is that the pair
check already exists, in `compositions.test.ts`, and its doc comment is a better
statement of this lesson's thesis than this lesson is:

> `loom.stat` takes `magnitude` as optional because a stat in a `loom.stat-grid`
> has nothing to be a magnitude *of*; inside a `loom.stat-chart` it is what gives
> the bar its height, and its absence is the quietest failure in this band's
> vicinity. Nothing refuses it — the schema is satisfied, the render is total, the
> diagnostics are empty — and what a reader gets is a chart with a gap in the
> series where one month's bar should be. **So the check has to be about the
> pair**, which is what this is: any stat under a chart, in any band, now or
> later.

Every clause of that is this lesson's argument, written by somebody who had the
vantage in their hands and used it. The author found the right moment, wrote a
pair-shaped check at it, and generalised it over the whole catalogue and over
bands that do not exist yet.

And there are two facts about that pair, not one:

- a figure with **no** magnitude draws nothing — a gap in the series
- a figure **above the ceiling** draws a full column — a lie in the series

The first is checked. The second is not. Both are computable from the same walk,
in the same loop, from the same two numbers; the one that got written is four
lines long and the one that did not would be three.

Nobody decided this. What decided it is the property of each failure rather than
anything about the check: *the quietest failure in this band's vicinity* is how
the comment describes a missing bar, and a missing bar is a hole in a picture. A
full bar is not a hole. It is a picture. **Between two faults in one pair of
nodes, the one that renders as an absence is the one somebody goes looking for.**

That is the general thing to carry out of Part V's nineteenth seam, and it is
about people rather than about trees: a vantage is necessary and is not what
decides. Having the moment, having both halves, and having a working precedent in
the same file does not make a check get written. The failure being *legible* does.

---

## In the code

| Where | What |
| --- | --- |
| `src/primitives/loom.stat-chart.ts` | The container. `max: z.number().finite().positive().optional()`, published as `--loom-chart-max` with `given.max ?? 100`. Its header states the case that breaks the default, in the present tense. |
| `src/primitives/loom.stat.ts` | The child. `magnitude` optional, non-negative, finite — and the doc comment on why it is not a second copy of `value`. |
| `src/primitives/stylesheet.ts` | `min(1, max(0, magnitude / max))`. The clamp that turns the fault into a plausible chart. |
| `src/primitives/loom.trend.ts` | The bound twin. Same `max`, same default, and a series that arrives as an answer's rows — so the same comparison is unreachable here and not merely unchecked. |
| `src/primitives/compositions/metrics-chart-band.ts` | Both halves in one module: `SERIES` and `max: 100`, nine lines apart. The whole vantage, in one file, in one literal. |
| `src/primitives/compositions/metrics-trend-band.ts` | The sibling. `binding: "uptimeByMonth"`, `max: 100`, and a header arguing that the ceiling is the editorial decision in the band. |
| `src/primitives/compositions.test.ts` | `gives every plotted figure a magnitude to be drawn at` — the pair check that exists, over every band now or later. The one next to it is not here. |
| `src/runtime/analysis.ts` | `introducedNestedTargets`: the pair-shaped walk that **is** wired, produced-less-inherited, on the tree `analyzeDelta` holds. The precedent, one screen from where a second one would go. |
| `src/sdk/vocabulary.ts` | `propsVocabularyFor` — the write path's other check, and the shape almost everything here has: one node, its own primitive, its own props. |
| [0008](../decisions/0008-rendering-is-a-total-pure-projection-of-the-tree.md) | The clause. Read it for what it is a claim about, which is a render. |
| [0150](../decisions/0150-a-container-that-must-aggregate-publishes-a-custom-property-and-the-browser-does-the-arithmetic.md) | Why the arithmetic is the browser's, and the four alternatives it rejected. |

---

## Try it

**Predict every output before you run anything.** Write your predictions down
first — all six fences — and then run the lot.

Put the snippets in `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

The shared preamble for all six:

```ts
import { renderToStaticMarkup } from "react-dom/server"
import { describe, it } from "vitest"

import { sequentialIdFactory } from "./ids.js"
import type { JsonObject } from "./json.js"
import { STARTER_COMPOSITIONS } from "./primitives/compositions/index.js"
import { createStarterPrimitiveRegistry } from "./primitives/index.js"
import { renderLoomTree } from "./render/render.js"
import { assessChange } from "./runtime/assessment.js"
import { gate } from "./runtime/gate.js"
import { gatePolicySchema, type GatePolicy } from "./runtime/policy.js"
import type { ProposedChange } from "./runtime/proposal.js"
import { propsVocabularyFor } from "./sdk/vocabulary.js"
import { createThemeRegistry } from "./theme/index.js"
import { applyDelta } from "./tree/apply.js"
import { buildElement } from "./tree/builders.js"
import type { TreeDelta, TreeOperation } from "./tree/delta.js"
import type { LoomNode } from "./tree/node.js"
import { createTree, type LoomTree } from "./tree/tree.js"

const registry = (() => {
  const built = createStarterPrimitiveRegistry()
  if (!built.ok) throw new Error(JSON.stringify(built.error))

  return built.value
})()

const themes = createThemeRegistry()
const spare = sequentialIdFactory("x")

/** Every element in a subtree, the root included. */
const elementsIn = (node: LoomNode): readonly LoomNode[] =>
  node.kind === "text" ? [] : [node, ...node.children.flatMap(elementsIn)]

const propsOf = (node: LoomNode): Record<string, unknown> =>
  node.kind === "element" ? (node.props as Record<string, unknown>) : {}

/** The two things a plotted band states, read off one subtree: the ceiling, and the figures under it. */
const plots = (root: LoomNode) =>
  elementsIn(root).flatMap((node) =>
    node.kind === "element" && node.type === "loom.stat-chart"
      ? [
          {
            max: propsOf(node)["max"] as number | undefined,
            magnitudes: node.children
              .flatMap(elementsIn)
              .flatMap((child) =>
                typeof propsOf(child)["magnitude"] === "number" ? [propsOf(child)["magnitude"] as number] : []
              ),
          },
        ]
      : []
  )

/** A page holding one chart, whose children are stats. */
const banded = (containerProps: JsonObject, stats: readonly JsonObject[]): LoomTree => {
  const ids = sequentialIdFactory()
  const children = stats.map((props) => buildElement(ids, { type: "loom.stat", props, children: [] }))
  const chart = buildElement(ids, { type: "loom.stat-chart", props: containerProps, children })
  const page = buildElement(ids, { type: "loom.page", props: {}, children: [chart] })

  return createTree(page, ids)
}

const render = (tree: LoomTree) => {
  const out = renderLoomTree(tree, { resolver: registry, themes, validator: registry })

  return { markup: renderToStaticMarkup(out.element), diagnostics: out.diagnostics }
}

/** The rule the browser applies per bar, transcribed from the stylesheet. */
const plotted = (magnitude: number | undefined, max: number): number =>
  Math.min(1, Math.max(0, (magnitude ?? 0) / max))

const bar = (fraction: number): string =>
  `[${"#".repeat(Math.round(fraction * 24))}${"·".repeat(24 - Math.round(fraction * 24))}]`

/** Three quarters of money, which is the other thing this band is for. */
const REVENUE: readonly JsonObject[] = [
  { value: "$12k", label: "Q1", magnitude: 12000 },
  { value: "$18k", label: "Q2", magnitude: 18000 },
  { value: "$24k", label: "Q3", magnitude: 24000 },
]

const POLICY: GatePolicy = gatePolicySchema.parse({
  policyId: "teaching",
  registeredPrimitiveTypes: registry.primitives.map((one) => one.type),
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
    interpretedAt: "2026-10-10T00:00:00.000Z",
  },
})

/** A revenue chart whose ceiling is right, with a meter beside it. */
const chartTree = () => {
  const ids = sequentialIdFactory()
  const children = REVENUE.map((props) => buildElement(ids, { type: "loom.stat", props, children: [] }))
  const chart = buildElement(ids, { type: "loom.stat-chart", props: { max: 24000, plot: "standard" }, children })
  const meter = buildElement(ids, { type: "loom.meter", props: { value: 96, label: "Uptime" }, children: [] })
  const page = buildElement(ids, { type: "loom.page", props: {}, children: [chart, meter] })

  return { tree: createTree(page, ids), chart: chart.id, meter: meter.id }
}

const judge = (tree: LoomTree, delta: TreeDelta) => {
  const assessed = assessChange(tree, proposalOf(delta), POLICY, spare.deltaId(), propsVocabularyFor(registry))
  if (!assessed.ok) throw new Error(assessed.error.code)

  return gate(assessed.value, POLICY)
}

const deltaOf = (tree: LoomTree, operations: readonly TreeOperation[]): TreeDelta => ({
  deltaId: spare.deltaId(),
  treeId: tree.treeId,
  baseRevision: 0,
  operations,
})
```

### Exercise A — the two bands, and the thing that is not in either of them

Predict the four lines each band prints. The one to commit to hardest is the last
line of the second band: predict the exact word.

```ts
describe("A", () => {
  it("prints every plotted band in the catalogue, its ceiling and its figures", () => {
    const CHARTS = new Set(["loom.stat-chart", "loom.trend"])

    for (const composition of STARTER_COMPOSITIONS) {
      for (const node of elementsIn(composition.build(sequentialIdFactory()))) {
        if (node.kind !== "element" || !CHARTS.has(node.type)) continue

        const magnitudes = node.children
          .flatMap(elementsIn)
          .flatMap((child) =>
            typeof propsOf(child)["magnitude"] === "number" ? [propsOf(child)["magnitude"] as number] : []
          )

        console.log(`  ${composition.id} / ${node.type}`)
        console.log(`    max stated: ${propsOf(node)["max"] ?? "(not stated — the default)"}`)
        console.log(`    binding:    ${propsOf(node)["binding"] ?? "(none)"}`)
        console.log(`    figures in the subtree: ${magnitudes.length > 0 ? magnitudes.join(", ") : "(none)"}`)
      }
    }
  })
})
```

<!-- moves: when Loom primitives adds, removes or re-plots a band that holds a
     loom.stat-chart or a loom.trend, or changes the figures in one. Every line
     of this fence is a second copy of src/primitives/compositions/, so a red
     here is this lesson's claim following the catalogue rather than drift:
     re-run A and paste in what it prints. The sentence beginning "Six figures
     and no binding" counts the fourth line of the first band and is registered
     in claims.test.ts, so correcting the fence means reading that sentence too.
     What this mark does NOT cover is the second band's last line becoming
     anything other than "(none)": a loom.trend with magnitudes in its subtree
     would mean the read series had stopped being rows, and the three paragraphs
     under this fence and half of The idea are wrong rather than stale. -->

```
  metrics-chart / loom.stat-chart
    max stated: 100
    binding:    (none)
    figures in the subtree: 58, 66, 71, 80, 88, 96
  metrics-trend / loom.trend
    max stated: 100
    binding:    uptimeByMonth
    figures in the subtree: (none)
```

**Six figures and no binding** on the first; no figures and a binding on the
second. Both state the same ceiling, with the same prop, from the same schema.

The first pair of numbers is a fact about a file. Anybody can read it: 96 against
100, in a module that imports nothing but builders.

The second is not a fact about anything. `(none)` is not a chart with no data in
it — the band is correct and complete, and the figures it will plot are rows in
an answer a deployment has not connected yet. The comparison the first band
invites is, for the second band, a comparison between a number that exists and a
number that does not exist in this repository and never will.

That is the whole of the discriminator, printed. It is not in `max stated`, which
is identical. It is in the line between them.

### Exercise B — the check that exists and the one beside it, run over the catalogue

Predict all four numbers. Two of them are the point.

```ts
describe("B", () => {
  it("runs both halves of the pair check over the catalogue", () => {
    let bands = 0
    let points = 0
    let missing = 0
    let over = 0

    for (const composition of STARTER_COMPOSITIONS) {
      for (const plot of plots(composition.build(sequentialIdFactory()))) {
        const ceiling = plot.max ?? 100

        bands += 1
        points += plot.magnitudes.length
        missing += plot.magnitudes.length === 0 ? 1 : 0
        over += plot.magnitudes.filter((magnitude) => magnitude > ceiling).length
      }
    }

    console.log(`  authored plots in the catalogue: ${bands}`)
    console.log(`  figures under them:              ${points}`)
    console.log(`  the check that exists   — figures with no magnitude:  ${missing}`)
    console.log(`  the check that does not — figures above the ceiling:  ${over}`)
  })
})
```

<!-- moves: the first two lines are a second copy of src/primitives/compositions/
     — how many bands hold an authored loom.stat-chart, and how many figures sit
     under them — so they move when Loom primitives ships or re-plots a band. The
     sentence beginning "One authored plot" counts the first line and is
     registered in claims.test.ts: correcting the fence means reading that
     sentence too. The two zeros are NOT covered. The third line going non-zero
     means a band in the catalogue has a figure that would draw nothing, which
     the composition suite asserts against and should have caught first; the
     fourth going non-zero means a band in the catalogue is saturating its own
     axis, which is this lesson's subject arriving for real and is news rather
     than drift — say so loudly rather than pasting it in. -->

```
  authored plots in the catalogue: 1
  figures under them:              6
  the check that exists   — figures with no magnitude:  0
  the check that does not — figures above the ceiling:  0
```

**One authored plot in the catalogue**, and the two checks are eleven lines of
code between them in the same loop over the same walk.

Both pass. That is the honest state of this finding and it is worth sitting with
rather than hurrying past: there is nothing wrong in the catalogue today, the
check that exists found nothing today, and the check that does not exist would
have found nothing either.

What the two zeros differ in is what they *mean*. The third line is zero and
something is holding it there — `compositions.test.ts` asserts it on every run,
over every band, including bands nobody has written. The fourth line is zero and
nothing is holding it. It is a measurement, taken once, by this exercise.

Which is the distinction lesson 26 is about, one floor down from where it teaches
it: *a value and the reason it has that value are two facts, and a reading that
gives you the first says nothing about the second.*

### Exercise C — what the reader actually gets

Predict the three bars under the first ceiling before you predict anything else
in this lesson. Then predict the diagnostics count — both times.

```ts
describe("C", () => {
  it("plots revenue under the ceiling nobody stated", () => {
    for (const props of [{ plot: "standard" }, { max: 24000, plot: "standard" }]) {
      const { markup, diagnostics } = render(banded(props as JsonObject, REVENUE))
      const ceiling = (props as { max?: number }).max ?? 100

      console.log(`  stated max: ${(props as { max?: number }).max ?? "(none)"}`)
      console.log(`    diagnostics: ${diagnostics.length}`)
      console.log(`    the container carries: ${markup.match(/--loom-chart-max:[^;"]*/)?.[0] ?? "(none)"}`)
      for (const point of REVENUE) {
        const fraction = plotted(point["magnitude"] as number, ceiling)

        console.log(`    ${String(point["label"]).padEnd(3)} ${bar(fraction)} ${(fraction * 100).toFixed(0)}%`)
      }
    }
  })
})
```

```
  stated max: (none)
    diagnostics: 0
    the container carries: --loom-chart-max:100
    Q1  [########################] 100%
    Q2  [########################] 100%
    Q3  [########################] 100%
  stated max: 24000
    diagnostics: 0
    the container carries: --loom-chart-max:24000
    Q1  [############············] 50%
    Q2  [##################······] 75%
    Q3  [########################] 100%
```

Two things, and the second is the one to keep.

The first is the chart. Three identical full columns where a series that doubled
should be, and a container that carries `--loom-chart-max:100` with nobody having
asked for it — `given.max ?? 100`, applied unconditionally, which is lesson 27's
finding about a record arguing for an authored number and a schema shipping a
default.

The second is that both renders report **zero** diagnostics, and the second one
is correct to. This is lesson 14's discipline working exactly as designed: a
render is total, it does not refuse, and a diagnostic is for something the
renderer *noticed*. The renderer noticed nothing, because there is nothing for it
to notice — it drew one node at a time, and every node it drew was fine.

Compare the two transcripts and what is wrong is obvious to you in a second. It
is obvious because you are looking at both halves. Nothing in the render was.

### Exercise D — three schemas, and where a ceiling can live

Predict all three verdicts and the issue text of whichever one is invalid.

```ts
describe("D", () => {
  it("asks three schemas what they will refuse", () => {
    const verdict = (type: string, props: JsonObject) =>
      JSON.stringify(registry.primitives.find((one) => one.type === type)?.validate(props))

    console.log(`  loom.stat, magnitude 24000:          ${verdict("loom.stat", { value: "$24k", label: "Q3", magnitude: 24000 })}`)
    console.log(`  loom.stat-chart, max 100:            ${verdict("loom.stat-chart", { max: 100, plot: "standard" })}`)
    console.log(`  loom.meter, value 140:               ${verdict("loom.meter", { value: 140, label: "Uptime" })}`)
  })
})
```

```
  loom.stat, magnitude 24000:          {"outcome":"valid"}
  loom.stat-chart, max 100:            {"outcome":"valid"}
  loom.meter, value 140:               {"outcome":"invalid","issues":[{"path":"value","message":"Number must be less than or equal to 100"}]}
```

Both halves of the broken chart are individually valid, and they have to be. A
magnitude of 24000 is a perfectly good magnitude — that is the whole reason
`magnitude` exists separately from `value`, so a figure can plot at its own size.
A `max` of 100 is a perfectly good ceiling. Neither schema has any business
refusing the other's number, and neither is in a position to see it.

The meter is the contrast, and it is the general rule in one line. `loom.meter`'s
scale is **0 to 100, decided by the primitive**, so the ceiling lives in the
schema — `value: z.number().min(0).max(100)` — and the schema is a per-node
check, so it refuses. The chart's scale is *decided by the author of the page*,
which is the feature lesson 27 defends at length, and a ceiling the author
chooses cannot be a bound in the child's schema because the child's schema does
not know what the author chose.

So: **a ceiling in a schema is a promise one node can be held to. A ceiling in a
prop is a relationship, and a relationship has no node to be checked at.** That
is not a defect in the design; it is what authoring the scale *costs*, and the
cost was never written down beside the feature.

### Exercise E — the write path, handed the whole tree and three changes

Predict the three verdicts and the three reason codes. Then, before you look,
write down which of the three you would have most wanted the system to stop.

```ts
describe("E", () => {
  it("hands the write path the whole tree and three changes to judge", () => {
    const { tree, chart, meter } = chartTree()

    const cases: readonly [string, TreeOperation][] = [
      ["pull the ceiling down to 100", { op: "configure", nodeId: chart, set: { max: 100 }, unset: [] }],
      [
        "add a quarter ten times the rest",
        {
          op: "insert",
          parentId: chart,
          index: 3,
          node: {
            kind: "element",
            type: "loom.stat",
            props: { value: "$240k", label: "Q4", magnitude: 240000 },
            children: [],
          },
        },
      ],
      ["put 140 on the meter", { op: "configure", nodeId: meter, set: { value: 140 }, unset: [] }],
    ]

    for (const [label, operation] of cases) {
      const disposition = judge(tree, deltaOf(tree, [operation]))

      console.log(`  ${label.padEnd(34)} ${disposition.kind.padEnd(10)} ${disposition.reason.code}`)
    }
  })
})
```

```
  pull the ceiling down to 100       accepted   within-policy
  add a quarter ten times the rest   accepted   within-policy
  put 140 on the meter               rejected   stakes-at-refusal-floor
```

This is the lesson in three lines, and the props check is wired for all three:
`propsVocabularyFor(registry)` is passed in, so 0179's seam is in place and doing
its job.

The two changes that make the chart lie are accepted and the one that puts an
out-of-range number on a meter is refused **at the refusal floor** — the
strongest verdict in the ladder, the one a host cannot configure its way past.
Not because the meter's fault is more serious. Because the meter's fault is a
fact about one node, and the props check is a function from one node to a
verdict, and that is the only shape the write path has a slot for.

Note what the first row actually did: it *configured a prop on a container*, which
is the most ordinary operation in this system, and the thing it changed is the
meaning of three nodes it did not touch. Lesson 07 separates measurement from
judgment; the measurement here is correct — one `configure`, one node, one prop —
and the judgment is correct about the measurement. What is not in the measurement
is that the node is a scale.

### Exercise F — the fact, measured on the tree the Gate was already holding

Predict the two `fit` lines and the diagnostics count. The second `fit` line is
the one worth writing out in full.

```ts
describe("F", () => {
  it("measures the fit on the tree the Gate was already holding", () => {
    const { tree, chart } = chartTree()

    const fit = (one: LoomTree, label: string) => {
      for (const plot of plots(one.root)) {
        const ceiling = plot.max ?? 100

        console.log(
          `  ${label.padEnd(7)} max ${String(ceiling).padEnd(6)} tallest figure ${String(Math.max(...plot.magnitudes)).padEnd(7)} above the ceiling: ${plot.magnitudes.filter((magnitude) => magnitude > ceiling).length} of ${plot.magnitudes.length}`
        )
      }
    }

    const delta = deltaOf(tree, [{ op: "configure", nodeId: chart, set: { max: 100 }, unset: [] }])

    fit(tree, "before")
    console.log(`  the Gate said ${judge(tree, delta).kind}, holding the tree both halves are in`)

    const applied = applyDelta(tree, delta)
    if (!applied.ok) throw new Error(applied.error.code)

    fit(applied.value, "after")
    console.log(`  the page it now serves reports ${render(applied.value).diagnostics.length} diagnostics`)
  })
})
```

```
  before  max 24000  tallest figure 24000   above the ceiling: 0 of 3
  the Gate said accepted, holding the tree both halves are in
  after   max 100    tallest figure 24000   above the ceiling: 3 of 3
  the page it now serves reports 0 diagnostics
```

`0 of 3` to `3 of 3`, across one accepted `configure`.

The `fit` function in this exercise is nine lines long and takes a `LoomTree`. The
`LoomTree` it is called on after the change is the tree `applyDelta` produced; the
tree it would have had to be called on *before* the change is the one
`analyzeDelta` builds, operation by operation, and holds in a local variable
called `state`.

So this is not a check somebody would have to invent a vantage for. It is nine
lines, called on a value that already exists, in a function that already walks
that value for a different pair — `introducedNestedTargets`, produced less
inherited, which would also be the right discipline here: a delta is answerable
for the charts it breaks and not for the ones it found broken.

What is actually missing is not reach and not machinery. It is **a declaration
nobody has made**: that `loom.stat-chart`'s `max` is the ceiling for
`loom.stat`'s `magnitude`. Lesson 22's predicate comes from the host's policy;
lesson 30's rendezvous is closed by a rule a primitive declares about itself.
This one has no declarer yet, and that — not the walk — is the design question
this lesson leaves open.

---

## It could have been otherwise

Four that lesson 27 already weighed, and three that it did not.

**A required `max`, no default.** Lesson 27 names this and calls it the honest
alternative, and it is the cheapest thing on this list: it does not check the fit,
it forces the thought at the moment the band is built. It also breaks every
stored tree that relied on the default, which is the reason it is not there and
is a real reason rather than an excuse.

**A `values` array on the container, and no child nodes.** Makes the maximum
computable inside one render function, and spends the property the whole system
is built on: the figures stop being nodes, so a seventh month stops being an
`insert` and starts being a prop edit nobody can review as a position. Lesson 27
rejects this at length and the rejection is right.

**A diagnostic from the renderer.** Impossible under 0008 rather than merely
costly, and the one option on this list that should not be revisited. A component
that reads its children's props is a component that cannot be rendered alone.

**React context, container to child.** Same answer, same reason, and lesson 27's
exercise G is the demonstration.

**A stake factor and a rung.** The option this lesson adds, and the one with a
working precedent: `introducedNestedTargets` is this shape, it is in
`analyzeDelta` today, and lesson 22 teaches what the Gate does with what it
reports. The honest price is in two parts. One, the predicate: a nesting pair is
visible because a host declares `interactiveTypes` on the policy, and nothing
anywhere declares that one primitive's prop is the scale for another's. Two,
0179's constraint — a policy is a Zod-parsed serialisable value and a predicate is
a function, which is why the props vocabulary is wired in as an argument rather
than configured, and a scale predicate would arrive the same way and be as
invisible in the record. [0248](../decisions/0248-which-optional-checks-were-in-place-is-named-on-the-judgment-beside-the-rules-that-were-consulted.md)
is what that invisibility cost last time, and it is a cost somebody has already
paid down once.

**An assertion in `compositions.test.ts`, three lines under the one that is
there.** The smallest thing on this list and the only one nobody has to decide
anything to do. Its population is the catalogue, which is narrow, which lesson 23
says is a reason to be careful about calling it a remedy — and lesson 25 says is
exactly where to put a claim so that getting it wrong is an event. Both are true.
It would not catch the host who edits a band into revenue, and it would catch the
day somebody adds a band that plots revenue to the catalogue, which the
primitive's own header predicts.

**A declaration on the primitive: *this prop is the scale for that prop on my
children*.** The option that makes the other two possible rather than competing
with them, and the one that belongs to a lane this lesson does not own. It is the
shape lesson 30's rendezvous took — a rule the primitive states about itself,
rather than a list somebody maintains elsewhere — and it is a finding rather than
a proposal, because the cost of a wrong declaration in each of the two directions
is the question lesson 22 spends a whole section on and is not a question a
lessons run should answer.

---

## Explain it back

Say these out loud, or write them. No confidence rating here — there is no answer
to check yourself against, and a number would measure how fluent the explaining
felt.

1. Lesson 27 says `max` is a prop *because nothing can compute it*. Explain to
   somebody who has read lesson 27 what is true about that sentence and what goes
   wrong when it is quoted without its second clause. Do it **without using the
   word "purity"** — name the moment the clause is about, and then name two
   moments it is not about.

2. Derive this lesson from lesson 22. Both are about a fault that belongs to two
   nodes and neither node can state it. Say what lesson 22's pair has that this
   one does not, in terms of **who declares the predicate** — and then say why
   that difference, and not any difference in reach, is what left one of them
   checked and the other not.

3. Lesson 23 ends on a check that was correct, tested, and reached nothing. Say
   why a fit check over the catalogue is in the same position today, and then make
   the strongest case you can *for* writing it anyway. Your case has to use
   something about the population rather than something about the fault.

4. In your own words: why did the composition suite get the pair check about a
   *missing* magnitude and not the one about a magnitude *above the ceiling*, when
   both are the same walk and the same two numbers? Then say what that implies
   about which faults a careful team finds — and whether anything in a repository
   could be arranged to counteract it.

---

## Self-check

**Rate your confidence 1–5 before you look at each answer.** Closed book. Where
to look is at the bottom of each; go and get it rather than scrolling for a
printed answer, because there is not one.

1. Name the three moments at which both halves of a plotted band's claim are in
   one party's hands, say which of the three has none, and give the clause that
   decides it.

2. Two sibling bands in the catalogue state the same ceiling with the same prop.
   Say which one's fit is checkable, which one's is unreachable, and name the
   thing that decides it. Then say where that thing appears in the primitive's
   type, props schema or catalogue line — and be precise if the answer is
   nowhere.

3. State what `analyzeDelta` is handed as its first argument, and then name the
   one check already wired into it that is about a pair of nodes rather than one.
   Say what discipline that check applies to the two trees and why.

4. Give the general sentence about seams and populations that this lesson draws
   out of the write path, and then say what forced the one exception.

5. `loom.meter` refuses a value of 140 and `loom.stat` accepts a magnitude of
   24000. Explain both as one rule about where a number lives, and then say what
   authoring a scale costs under that rule.

6. A `configure` pulls a chart's ceiling from 24000 to 100. Give the Gate's
   verdict and reason code, and then say what the analysis correctly measured and
   what was not in the measurement.

7. Two faults live in the same pair of nodes: a figure with no magnitude, and a
   figure above the ceiling. One is checked over the whole catalogue and one is
   checked nowhere. Give the property of the *failures* that decided which, and
   then say which of the two you would expect to be checked first in a system you
   have worked on.

8. Say what is actually missing before a fit check could live in the write path —
   and be precise that the answer is neither the walk nor the vantage. Then name
   the two earlier lessons whose seams were closed by the thing that is missing.

Where to look: 1 and 5 are 0008 beside `loom.meter.ts` and `loom.stat-chart.ts`.
2 is `metrics-chart-band.ts` against `metrics-trend-band.ts`, plus 0233. 3 is
`introducedNestedTargets` in `src/runtime/analysis.ts`. 4 is this lesson. 6 is
exercise E. 7 is the doc comment above `gives every plotted figure a magnitude to
be drawn at`. 8 is lesson 22's predicate beside lesson 30's rule.

---

## Reflect

Go back to your four predictions.

**Predict 1, and the confidence you put on having all five right.** Most people
get the two schemas and the diagnostics count and then expect *something* at the
Gate. If you did, note what you expected it to be — a stakes factor, a rung, a
diagnostic — and then note that you were reasoning from what the system ought to
notice rather than from the shape of what it has. That is the right instinct and
it is how this finding was found; it is also exactly the reasoning that produced
the wrong answer.

**Predict 2.** If your two answers were the same, you have the more defensible
position and the less useful one: it is perfectly reasonable to say *neither is
checked* and be right. The question was whether a program *could ever*, and the
two bands differ on that permanently. If you got the difference, check whether
you located it in the right place — a lot of people say "one is bound and one is
not" and then put the difference in the primitive, where it is not, rather than in
how the figures got into the document.

**Predict 3, and the order you committed to.** This is the one to keep. Almost
everybody, told that a check about a chart-and-its-stats exists, guesses the
*magnitude-presence* one, and almost everybody says they would have written it
first. That is not a lapse — a missing bar is a hole and a hole is what a person
looking at a chart notices. The point is that the preference is about the shape of
the failure and has nothing to do with which fault is worse, and nobody involved
in that choice made it on purpose.

**Predict 4.** The meter is usually easy and the general rule usually is not.
Check whether your rule was about *where the number lives* or about *who owns the
scale*. Both get the meter right; only the first one tells you that authoring a
scale costs you the ability to check it, which is the thing this lesson is for.

One thing to carry forward, if you keep only one: **a sentence about a moment is
not a sentence about a system, and the two are written identically.** Lesson 27's
clause was correct, carefully argued, and recorded with its reason. Dropping four
words off the end of it turned it into a statement about the whole repository,
and that statement travelled into two primitives' headers and a composition's
without anybody making a claim they would have defended.

---

## Come back to this

Set AO in [`review-schedule.md`](review-schedule.md), two days after this lesson.
Interleaved with 14, 18, 22, 23, 26, 27 and 35 — heavy on 27, because this lesson
is one clause of that one read more carefully and is unreadable if the clause is
fuzzy; and on 22, because the pair-shaped seam this lesson wants is the one that
lesson already has.

Part V has nineteen seams now, and this one is the first where **nothing is out of
reach by anybody at any moment.** Every earlier seam is somebody unable to
answer: the checker cannot see enough (23), cannot interpret what it sees (24),
runs too late to report it (33), may not write down what it saw (34), or answers a
narrower question than the one asked (25, 35). Here two numbers sit in one
literal, nine lines apart, in a module that imports two builders — and separately
in a local variable inside the function that judges every change this system
makes.

What is wrong is three things stacked, and the third is the one to keep.

The first is a quotation. A true sentence about a render got repeated without its
clause and became a false sentence about a system.

The second is a shape. Every seam the write path has is one node wide, because
almost every question about a page is, and the one exception was built by somebody
whose fault made a page unusable. A check's population is usually decided by the
shape of the seam that was available, and then gets mistaken for the shape of
what is possible.

The third is about which faults get found. Two checks about one pair of nodes,
same walk, same two numbers, eleven lines apart — and the one that exists is the
one whose failure renders as a hole. **A fault that renders as a plausible page
has no witness, and having a vantage on it changes nothing about whether anybody
takes it.** That is not a fact about Loom and it will not be fixed by a
declaration.

The question to carry into a twentieth seam is therefore not *who can see this*,
which Part V has now asked nine ways. It is: **of the facts this system is in a
position to check and does not, which ones would announce themselves if they went
wrong — and what is true of the rest?** The first half of that list is a backlog.
The second half is the part that needs a method, because nothing in it is going to
turn up by somebody noticing.
