# 27 — Scale: the fact a sibling holds and a renderer may not reach

**After this lesson you will be able to** say why a container cannot read its own
children and name the exact line of type that makes it impossible; give the three
ways round that constraint and say what each one costs, being specific about
which published capability the most obvious of them destroys; explain what it
means to move a computation onto a different machine, and state the rule about
what you inherit when you do; say why the aggregate a chart needs is *not*
computed even after a machine that could compute it has been found, and give the
editorial argument for that; say where a clamp belongs and why; and say what it
costs that a decision's own argument — *being forced to state the ceiling is a
feature* — is implemented as an optional prop with a default.

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
[26](26-liveness.md).

Every seam in Part V so far has been about a fact that lives somewhere Loom
cannot reach. A registry somebody else fills in. A host page the runtime never
sees. A declaration nobody has made yet. A second store the first one may not
open.

This one is not like that, and the difference is the lesson.

Everything needed here is **inside one subtree, in one render, in one process, in
front of one reader.** Six numbers, six sibling nodes, one parent. Nothing is
absent, nothing is undeclared, nobody else owns anything. And the parent still
cannot have the number it needs — because of a rule this system chose on purpose
and would choose again.

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Write something for all
five before you look anything up.

1. A render is a **total** pure projection. Say what "total" means here, and then
   say why it is a *different* discipline from the one the rest of the runtime
   follows with `Result` — including what a renderer does when it is handed
   something it cannot draw. *(14)*
2. Lesson 21 asked where you check a property that belongs to no single party —
   not the tree, not the registry, not the primitive. Give the answer and give
   one example of such a property. *(21)*
3. Text is a node and not a prop, and a fixed field is a prop and not a node. Say
   what decides which of the two a piece of content is, and give the thing that
   goes wrong if you get it backwards in each direction. *(02)*
4. A reading hands back three lists where it once handed back two. Name them, say
   what each one is about, and give the rule that decides how many there should
   be. *(24)*
5. A liveness check has three answers where most queues have two. Name them, and
   say where the comparison is allowed to live and why it may not live in either
   store. *(26)*

Question 1 is the one to be exact about, and question 3 is the one most likely to
come back half-right. Everything below is downstream of question 1 being a rule
rather than a preference.

---

## Predict

**In writing, before reading on.** Four questions. Question 4 is the one to rate
your confidence on.

1. You are building a chart. Six `loom.stat` nodes sit inside a
   `loom.stat-chart`, each carrying a number, and each has to draw a column whose
   height is its share of the scale.

   **Write down how the sixth child finds out what the scale is.** Not in
   principle — name the function that computes it, name the value it reads, and
   name the route by which the answer reaches the sixth child. If your answer is
   "the container maps over its children", write down what the container is
   holding when it maps over them.

2. Now write down **the markup**. A chart whose ceiling is 100, holding a child
   whose number is 58. Write the element for that child, including every
   attribute. Then circle the number in it that says how tall the bar is.

3. Suppose the channel in your answer to (1) turns out to exist. **Write down
   the largest set of values it can carry**, and answer one question about it:
   can two sibling children receive *different* values through it? Then name one
   ordinary chart feature you have just discovered you cannot build.

4. The ceiling is a prop. It is optional and it defaults to `100`. You plot four
   quarters of revenue in millions — `0.8`, `1.2`, `1.9`, `3.4` — and you do not
   set it.

   **Write down what each of three instruments says**: the render's diagnostics,
   the props validator, and the Gate. Then write down, in one sentence, what a
   reader sees on the page. **Rate your confidence 1–5.**

Do not read on until all four are written. Question 2 is the one where most
people write down a plausible attribute that is not there, and noticing *which*
attribute you invented is worth more than getting it right.

---

## The problem

On 13 September the primitive library was measured against a target, and the
largest single hole in ninety-two primitives was this: **nothing plotted a
series.**

`loom.stat` prints one figure. `loom.meter` draws one proportion. `loom.spec`
sets one measured fact inline. Every number in the library stood alone, so a page
could say *"99.9% uptime"* and could not say *"here is uptime over six months"* —
which is the most ordinary thing a metrics band on a product page does.

So: a chart. Its children are a label and a number, which is exactly `loom.stat`'s
content model already, so by [0054](../decisions/0054-a-container-is-its-childs-name-plus-the-arrangement.md)
this is a second *container* over the same child rather than a second pair of
primitives. Nothing had to be renamed. That part took an afternoon.

Then it hit a wall, and the wall is not about charts.

**A bar's height is not a fact about the bar.** It is a fact about the bar *and
every other bar in the band* — 58 is tall or short depending entirely on what it
is being plotted against. The number the child needs is the ceiling, the ceiling
is a fact about the set, and the only node that can see the set is the parent.

So the parent computes it and hands it down. Except it cannot, and here is the
line that stops it:

```ts
export type LoomPrimitiveProps<…> = {
  readonly loom: LoomRenderContext<…>
  /** The node's props, exactly as they appear in the tree. */
  readonly props: TProps
  /** Rendered children in tree order, or null when the node has none. */
  readonly children: ReactNode
}
```

Read the third field again. A container does not receive its children. It
receives **its children's output** — a `ReactNode`, already drawn, opaque. By the
time `loom.stat-chart`'s component runs, the six numbers it wants have been
turned into markup and are no longer numbers.

That is [0008](../decisions/0008-the-renderer-is-a-total-pure-projection.md)
working exactly as written: a render is a total, pure projection **of one node**.
Not of a subtree. One node, its own props, and whatever its children came out as.
There is no moment at which a parent and a child's props exist in the same scope.

This is why the lesson belongs in Part V and why it is the odd one in it. The
information is not missing. It is not somebody else's. It is not undeclared, not
in a second store, not behind an origin boundary. It is *right there*, one level
down, in the same array. And the renderer may not look at it, because looking at
it is the thing the renderer promised not to do.

---

## The idea

### What the promise actually buys

It would be easy to read 0008 as bookkeeping. It is not. Three things are true
because a node renders from nothing but itself:

- **A node can be drawn on its own.** `renderLoomExcerpt` takes a tree and one
  node id and renders that node, correctly, with no ancestor present. Exercise G
  does it to a stat out of the middle of a chart. Any design where a child needs
  its parent to have run first costs this outright.
- **The same node draws the same way everywhere.** Exercise B renders one stat
  inside a chart and the identical node inside a grid and compares the bytes.
  They are equal. A reviewer looking at a node in a diff is looking at the whole
  of that node.
- **Order does not matter, so nothing has to be scheduled.** No pass, no
  two-phase layout, no "parents before children" that some later primitive
  violates.

Those are worth more than a chart is, which is why the chart is the thing that
had to bend.

### The three ways round it, and what each costs

**React context.** The obvious engineering answer: a provider on the container, a
consumer in each child. It works on the first try and it takes the first property
above out behind the building. A node that renders correctly *only* inside a
particular parent is no longer a projection of itself, `renderLoomExcerpt` either
throws or silently renders a default, and a reviewer reading one node in
isolation is reading something that will not look like that in the page.

**Repeat the ceiling on every child.** One number written six times. Wrong the
moment one copy is edited, and — the part that is easy to miss — it makes a
`configure` on the *container* unable to change the scale, which is the one
operation a reader of lesson 03 would expect to work. The chart's own knob stops
being connected to the chart.

**Compute it in a seam above the renderer.** Walk the tree before rendering,
work out the maxima, hand them in. This moves tree-shaped knowledge out of the
tree and gives one primitive a private channel that nothing else in the library
has — the parallel channel [0052](../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)'s
neighbours have refused every time it has been proposed, and for the same reason
each time: two places now decide what a page means, and only one of them is in
the log.

Each of these is a way of making the renderer do it anyway. The answer was to
stop trying.

### Give the job to a machine that is allowed to look at more than one box

A render function may see one node. **A layout engine may see the whole
document** — that is its entire job, and it has been doing cross-element
arithmetic since before any of this existed.

So the container publishes the ceiling as a CSS custom property on its own
element, each child publishes its own number on its own element, and the
relationship between them is a rule:

```
loom.stat-chart   style="--loom-chart-max: 100"      ← the ceiling, published
loom.stat         style="--loom-stat-magnitude: 58"  ← this node's own number

.loom-stat-chart > .loom-stat-plotted::before {
  height: calc(var(--loom-chart-plot) * min(1, max(0, var(--loom-stat-magnitude, 0) / var(--loom-chart-max, 100))));
}
```

Custom properties inherit. The child reads the parent's value without either
render function reading the other's node, and **the cross-node arithmetic happens
in the browser.** The two components stay exactly as pure as they were; what
changed is where the multiplication runs.

This is not a new bargain. [0079](../decisions/0079-a-layout-css-alone-can-express-belongs-in-the-stylesheet.md)
put `loom.mosaic`'s rhythm in the stylesheet, and `loom.heading` caps its top two
steps in `cqi` so that — 0079's words — *"the browser rather than the render
function is what reads the width."* Both are the same move, one axis apart: the
renderer stays a projection of one node, and the layout engine does what the
renderer may not. 0150 exists to name the move so the next primitive that needs
it reaches for this rather than for context.

**One consequence caught `loom.stat` on the way through.** The stylesheet's first
mechanic is that an inline style beats a rule, so a property a second arrangement
has to change must not also be set on the element. `loom.stat` had its type set
inline, and a chart wants the figure at a column's size rather than a headline's
— so every type declaration moved into the stylesheet, verbatim. *A child that
lays itself out inline cannot be rearranged by the container it is in.* That
sentence was written for `loom.milestone` and is the one to keep; it is the
general cost of a child that is too specific about itself.

### What you inherit when you move a computation

Here is the part that transfers, and it is not about CSS.

**When you hand a computation to another machine, you inherit that machine's data
model — and its limits become limits of your design.** CSS custom properties
carry *a scalar*, and they carry it *by inheritance*, which means every
descendant gets the same one. That is the whole shape of the channel. So:

- A ceiling: fine. One number, everybody needs it, everybody needs the same one.
- A rank — *this is the third tallest* — impossible. Every child inherits the
  same value, so there is no value the container can publish that distinguishes
  one child from another.
- A running total, an index, a color-by-position, *draw the tallest one
  differently*: all impossible, all for that one reason.

A primitive that needs one of those is back at the top of this section with none
of its options improved, and the right thing to do is say so rather than reach
for context. Notice that this limit is not a limit of Loom, or of the tree, or of
0008. It is a limit of the machine the work was handed to, and it arrived
attached to the solution.

### And then the aggregate is not computed at all

Follow the argument this far and you expect it to end with the browser working
out the maximum. It does not, and this is the turn worth slowing down for.

**The ceiling is a prop.** `max`, authored, with a default. Nothing computes it —
not the renderer, which may not, and not the browser, which cannot: inheritance
runs downwards, and there is no CSS mechanism by which a parent learns the
largest value among its children. The browser does the *division*. The
*aggregation* is never performed by anybody.

And the reason is not that it could not be arranged. It is that **the ceiling is
not a fact.**

Where the axis stops is an argument the author is making. A chart that picked its
own ceiling — the usual `max = Math.max(...values)` — would make that argument on
the author's behalf, and it would make the same one every time: the tallest bar
is full height in *every* chart, so a series that crept from 94% to 96% and a
series that tripled both end at the top of the plot, and the top of the plot
stops meaning anything outside the one band you are looking at. Uptime is
plotted against 100 because a percentage's ceiling is not a matter of opinion.
Revenue has no such number, and choosing one is the work.

So the sequence for this seam runs: *the renderer may not compute it* → *find a
machine that may* → *and then decline to compute it anyway, because it was never
a measurement.* The first two steps are engineering. The third is the one that
decides what the primitive is.

### Clamping is in the rule, and that is a real decision

`min(1, max(0, …))`. A value above the ceiling fills the plot and stops.

The tempting alternative is to refuse it earlier — a schema that rejects a
magnitude above `max`, or a Gate rung. Both are wrong here, and the reason is the
two-axis habit from lesson 08 applied to a rendering rather than to a change: ask
what each failure *costs a reader*.

A bar drawn out through the band above it is a **broken page** — overlapping
text, a layout nobody designed, and no way to tell from looking at it what
happened. A bar at full height next to a printed value larger than the axis is a
chart that is **merely scaled wrong**, and a reader can see that it is wrong and
roughly why. Only the second is recoverable by looking at it. Exercise C prints
what it looks like: at a ceiling of 60, five of the six bars sit flat against the
top, and the shape of that is unmistakable.

The clamp is also in the *rule* rather than in the component, for the reason the
whole pattern exists: the component does not know the ceiling.

### The trap, which is this lesson's finding

0150 argues — and `loom.stat-chart`'s own header repeats — that being forced to
state the ceiling is a feature rather than a shortfall.

**Nobody is forced.** `max` is optional with a default of `100`, and the model is
told so in as many words: `props: max?, plot?`. The default is exactly right for
the one series whose ceiling is not a matter of opinion, and silently wrong for
every other kind of number a page might plot.

Exercise D plots four quarters of revenue in millions against the ceiling nobody
set. The render returns **no diagnostics**. Every prop is **valid**, including
the chart's empty props object. The Gate weighs the insert at **medium** stakes
and **accepts** it. And the four bars come out at 0.8%, 1.2%, 1.9% and 3.4% of
the plot — a flat line along the bottom of a band, under four correct figures
printed at full size.

Every instrument in this repository says yes. The page is nonsense. The
`loom.stat-chart` argument for authoring the ceiling is sound, and the primitive
does not implement it: it defaults it, and the default is the one value that
makes the failure invisible rather than loud.

That is filed as a finding rather than fixed here — `src/primitives/` belongs to
another lane, and a lessons branch that changes behavior is a lessons branch
nobody can review. It is in the lesson because the gap between *what a decision
argues* and *what the code does about it* is the most useful thing on this page,
and because it took writing exercise D to see it. Reading the record does not
show it; the record's argument is correct. Running it does.

---

## In the code

| Where | What |
| --- | --- |
| `src/render/primitive.ts` | `LoomPrimitiveProps`. Three fields, and `children: ReactNode` is the one that makes this lesson necessary. |
| `src/primitives/loom.stat-chart.ts` | The container. Publishes `--loom-chart-max` and `--loom-chart-plot` and nothing else; `max` is a prop with a default, `plot` is a name that resolves to a multiple of a spacing step. |
| `src/primitives/loom.stat.ts` | The child. `magnitude` beside `value`, optional; the `loom-stat-plotted` class and the custom property are set together or not at all. |
| `src/primitives/stylesheet.ts` | The three rules, and the one `calc` that relates a parent's value to a child's. |
| `src/primitives/compositions/metrics-chart-band.ts` | The phrasebook entry. States `max: 100` explicitly and says why a revenue band has to think about it. |
| [0150](../decisions/0150-a-container-that-must-aggregate-publishes-a-custom-property-and-the-browser-does-the-arithmetic.md) | The record. Read its *Consequences* for the ceiling of the pattern. |
| [0008](../decisions/0008-the-renderer-is-a-total-pure-projection.md) | The constraint everything above is downstream of. |
| [0079](../decisions/0079-a-layout-css-alone-can-express-belongs-in-the-stylesheet.md) | The same bargain, one axis across, struck first. |
| [0115](../decisions/0115-three-fields-of-one-shape-are-a-list-wearing-three-names.md) | The test that decides whether `magnitude` beside `value` is two facts or one fact written twice. |

---

## Try it

Seven exercises. **Predict every output in writing, then run.** Exercise D is the
one to commit to hardest and the one to rate your confidence on — it is Predict 4,
executed. Exercise B is the one whose answer most people are sure of and have not
actually checked.

Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

The shared preamble for all seven:

```ts
import { renderToStaticMarkup } from "react-dom/server"
import { describe, it } from "vitest"

import { sequentialIdFactory } from "./ids.js"
import { renderCatalogue } from "./interpretation/index.js"
import type { JsonObject } from "./json.js"
import { createStarterPrimitiveRegistry } from "./primitives/index.js"
import { libraryStylesheet } from "./primitives/stylesheet.js"
import { renderLoomExcerpt, renderLoomTree } from "./render/render.js"
import { analyzeDelta } from "./runtime/analysis.js"
import { assessChange } from "./runtime/assessment.js"
import { gate } from "./runtime/gate.js"
import { defaultGatePolicy } from "./runtime/policy.js"
import type { ProposedChange } from "./runtime/proposal.js"
import { catalogueOf } from "./sdk/index.js"
import { createThemeRegistry } from "./theme/index.js"
import { buildElement } from "./tree/builders.js"
import type { TreeDelta } from "./tree/delta.js"
import { createTree, type LoomTree } from "./tree/tree.js"

/** The starter library, and the themes a page needs to render at all. */
const registry = (() => {
  const built = createStarterPrimitiveRegistry()
  if (!built.ok) throw new Error(JSON.stringify(built.error))

  return built.value
})()

const themes = createThemeRegistry()
const spare = sequentialIdFactory("x")

/** A page holding one band, whose children are stats. */
const banded = (
  container: string,
  containerProps: JsonObject,
  stats: readonly JsonObject[]
): LoomTree => {
  const ids = sequentialIdFactory()
  const children = stats.map((props) => buildElement(ids, { type: "loom.stat", props, children: [] }))
  const band = buildElement(ids, { type: container, props: containerProps, children })
  const page = buildElement(ids, { type: "loom.page", props: {}, children: [band] })

  return createTree(page, ids)
}

const render = (tree: LoomTree) => {
  const out = renderLoomTree(tree, { resolver: registry, themes, validator: registry })

  return { markup: renderToStaticMarkup(out.element), diagnostics: out.diagnostics }
}

/** Every `loom.stat` element in a page's markup, whole. */
const statsIn = (markup: string): readonly string[] =>
  markup.match(/<div class="loom-stat[ "][\s\S]*?<\/span><\/div>/g) ?? []

const attrIn = (markup: string, pattern: RegExp): string => markup.match(pattern)?.[0] ?? "(none)"

/** The rule, transcribed into TypeScript: what the browser works out per bar. */
const plotted = (magnitude: number | undefined, max: number): number =>
  Math.min(1, Math.max(0, (magnitude ?? 0) / max))

const bar = (fraction: number): string => {
  const filled = Math.round(fraction * 24)

  return `[${"#".repeat(filled)}${"·".repeat(24 - filled)}]`
}

/** Six months of one measure, which is what this band is for. */
const UPTIME: readonly JsonObject[] = [
  { value: "58%", label: "Apr", magnitude: 58 },
  { value: "66%", label: "May", magnitude: 66 },
  { value: "71%", label: "Jun", magnitude: 71 },
  { value: "80%", label: "Jul", magnitude: 80 },
  { value: "88%", label: "Aug", magnitude: 88 },
  { value: "96%", label: "Sep", magnitude: 96 },
]

/** Four quarters of money, which is what this band is also for. */
const REVENUE: readonly JsonObject[] = [
  { value: "$0.8M", label: "Q1", magnitude: 0.8 },
  { value: "$1.2M", label: "Q2", magnitude: 1.2 },
  { value: "$1.9M", label: "Q3", magnitude: 1.9 },
  { value: "$3.4M", label: "Q4", magnitude: 3.4 },
]
```

### Exercise A — everything the render wrote down

```ts
describe("A", () => {
  it("prints everything the render put in the page, and the rule that is not in it", () => {
    const { markup, diagnostics } = render(banded("loom.stat-chart", { max: 100 }, UPTIME))

    console.log(`  the container: ${attrIn(markup, /<div class="loom-stat-chart"[^>]*>/)}`)
    for (const stat of statsIn(markup)) console.log(`    ${stat}`)
    console.log(`  diagnostics: ${diagnostics.length}`)

    const sheet = renderToStaticMarkup(libraryStylesheet())
    const rule = sheet.indexOf(".loom-stat-chart > .loom-stat-plotted::before")
    console.log("\n  the one line that relates them, from the stylesheet:")
    console.log(
      sheet
        .slice(rule, sheet.indexOf("}", rule) + 1)
        .split("\n")
        .filter((line) => line.includes("height:") || line.includes("::before"))
        .map((line) => `    ${line.trim()}`)
        .join("\n")
    )
  })
})
```

This is Predict 2. Before you run it: write down the attribute you expect to
carry the bar's height, then look for it.

The output:

```
  the container: <div class="loom-stat-chart" style="--loom-chart-max:100;--loom-chart-plot:calc(var(--loom-spacing-6) * 3)">
    <div class="loom-stat loom-stat-plotted" style="--loom-stat-magnitude:58"><span class="loom-stat-value">58%</span><span class="loom-stat-label">Apr</span></div>
    <div class="loom-stat loom-stat-plotted" style="--loom-stat-magnitude:66"><span class="loom-stat-value">66%</span><span class="loom-stat-label">May</span></div>
    <div class="loom-stat loom-stat-plotted" style="--loom-stat-magnitude:71"><span class="loom-stat-value">71%</span><span class="loom-stat-label">Jun</span></div>
    <div class="loom-stat loom-stat-plotted" style="--loom-stat-magnitude:80"><span class="loom-stat-value">80%</span><span class="loom-stat-label">Jul</span></div>
    <div class="loom-stat loom-stat-plotted" style="--loom-stat-magnitude:88"><span class="loom-stat-value">88%</span><span class="loom-stat-label">Aug</span></div>
    <div class="loom-stat loom-stat-plotted" style="--loom-stat-magnitude:96"><span class="loom-stat-value">96%</span><span class="loom-stat-label">Sep</span></div>
  diagnostics: 0

  the one line that relates them, from the stylesheet:
    .loom-stat-chart > .loom-stat-plotted::before {
    height: calc(var(--loom-chart-plot) * min(1, max(0, var(--loom-stat-magnitude, 0) / var(--loom-chart-max, 100))));
```

Seven elements, eight numbers, and **not one height**. The page carries the
ceiling and it carries each figure, and the fact that relates them is in a
stylesheet the markup does not mention. Nobody computed a bar. What was shipped
is two operands and an address.

### Exercise B — the same child, in two different containers

```ts
describe("B", () => {
  it("renders one stat in a chart and the same stat in a grid", () => {
    const child: JsonObject = { value: "71%", label: "Jun", magnitude: 71 }

    const inChart = statsIn(render(banded("loom.stat-chart", { max: 100 }, [child])).markup)[0]
    const inGrid = statsIn(render(banded("loom.stat-grid", {}, [child])).markup)[0]

    console.log(`  in a chart: ${inChart}`)
    console.log(`  in a grid : ${inGrid}`)
    console.log(`  identical? ${inChart === inGrid}`)
  })
})
```

Predict the last line, and predict *why* before you predict *what*.

The output:

```
  in a chart: <div class="loom-stat loom-stat-plotted" style="--loom-stat-magnitude:71"><span class="loom-stat-value">71%</span><span class="loom-stat-label">Jun</span></div>
  in a grid : <div class="loom-stat loom-stat-plotted" style="--loom-stat-magnitude:71"><span class="loom-stat-value">71%</span><span class="loom-stat-label">Jun</span></div>
  identical? true
```

**Byte for byte.** The child does not know which container it is in and has no
way to find out. One of these draws a column and the other draws a figure in a
row, and the entire difference is in an ancestor's class name and a rule that
matches on it. This is the property React context would spend, and it is worth
looking at as bytes rather than as a principle.

### Exercise C — the arithmetic, done by hand

```ts
describe("C", () => {
  it("does the browser's arithmetic in TypeScript, at two ceilings", () => {
    for (const max of [100, 60]) {
      console.log(`  max: ${max}`)
      for (const stat of UPTIME) {
        const fraction = plotted(stat["magnitude"] as number, max)
        console.log(
          `    ${String(stat["label"]).padEnd(4)} ${String(stat["magnitude"]).padStart(3)}  ${(fraction * 100)
            .toFixed(1)
            .padStart(6)}%  ${bar(fraction)}`
        )
      }
    }
  })
})
```

Predict the second block before you run it, and in particular predict how many of
the six bars are at the top.

The output:

```
  max: 100
    Apr   58    58.0%  [##############··········]
    May   66    66.0%  [################········]
    Jun   71    71.0%  [#################·······]
    Jul   80    80.0%  [###################·····]
    Aug   88    88.0%  [#####################···]
    Sep   96    96.0%  [#######################·]
  max: 60
    Apr   58    96.7%  [#######################·]
    May   66   100.0%  [########################]
    Jun   71   100.0%  [########################]
    Jul   80   100.0%  [########################]
    Aug   88   100.0%  [########################]
    Sep   96   100.0%  [########################]
```

The second block is the clamp, and it is the argument for putting it in the rule.
Five bars flat against the ceiling is a chart a reader can *see* is scaled wrong,
beside six printed figures that tell them what the numbers actually were. The
alternative — bars running up through whatever band is above — is a page with no
diagnosis available from looking at it.

### Exercise D — the ceiling nobody set

```ts
describe("D", () => {
  it("plots money against a ceiling nobody set, and asks every instrument about it", () => {
    const { markup, diagnostics } = render(banded("loom.stat-chart", {}, REVENUE))

    console.log(`  render diagnostics: ${diagnostics.length}`)
    console.log(`  the chart's own props: ${JSON.stringify(registry.validateProps("loom.stat-chart", {}))}`)
    for (const stat of REVENUE) {
      console.log(`    ${stat["label"]} ${JSON.stringify(registry.validateProps("loom.stat", stat))}`)
    }
    console.log(`  the container carries: ${attrIn(markup, /--loom-chart-max:[^;"]*/)}`)

    const ids = sequentialIdFactory("g")
    const base = banded("loom.stat-chart", {}, [])
    const delta: TreeDelta = {
      deltaId: spare.deltaId(),
      treeId: base.treeId,
      baseRevision: 0,
      operations: [
        {
          op: "insert",
          parentId: base.root.id,
          index: 1,
          node: buildElement(ids, {
            type: "loom.stat-chart",
            props: {},
            children: REVENUE.map((props) => buildElement(ids, { type: "loom.stat", props, children: [] })),
          }),
        },
      ],
    }
    const proposal: ProposedChange = {
      proposalId: spare.proposalId(),
      intentId: spare.intentId(),
      delta,
      rationale: "plot the quarterly revenue",
      provenance: {
        origin: "developer",
        interpreter: "scratch",
        authoredBy: "model",
        confidence: 0.99,
        interpretedAt: "2026-09-20T00:00:00.000Z",
      },
    }
    const analysis = analyzeDelta(base, delta)
    const assessed = assessChange(base, proposal, defaultGatePolicy, spare.deltaId())
    console.log(`  analysis ok? ${analysis.ok}`)
    console.log(
      `  stakes: ${assessed.ok ? assessed.value.stakes.level : "?"}  gate: ${
        assessed.ok ? gate(assessed.value, defaultGatePolicy).kind : "?"
      }`
    )

    console.log("\n  and what the page will draw:")
    for (const stat of REVENUE) {
      const fraction = plotted(stat["magnitude"] as number, 100)
      console.log(
        `    ${stat["label"]} ${String(stat["value"]).padStart(6)}  ${(fraction * 100).toFixed(1).padStart(5)}%  ${bar(fraction)}`
      )
    }

    console.log("\n  and what a model was told it may build:")
    for (const line of renderCatalogue(catalogueOf(registry)).split("\n")) {
      if (line.startsWith("- loom.stat-chart")) console.log(`   ${line}`)
    }
  })
})
```

This is Predict 4. Commit to all three instruments in writing, with a confidence
rating, before you run it.

The output:

```
  render diagnostics: 0
  the chart's own props: {"outcome":"valid"}
    Q1 {"outcome":"valid"}
    Q2 {"outcome":"valid"}
    Q3 {"outcome":"valid"}
    Q4 {"outcome":"valid"}
  the container carries: --loom-chart-max:100
  analysis ok? true
  stakes: medium  gate: accepted

  and what the page will draw:
    Q1  $0.8M    0.8%  [························]
    Q2  $1.2M    1.2%  [························]
    Q3  $1.9M    1.9%  [························]
    Q4  $3.4M    3.4%  [#·······················]

  and what a model was told it may build:
   - loom.stat-chart — A run of loom.stat children plotted as columns against a scale — a trend or a comparison, rather than a row of separate figures. Each child needs a magnitude to be drawn; max is the top of the scale. props: max?, plot?
```

Read the last line and the block above it together. The model is told the ceiling
exists, is told what it is for, and is told it is **optional** — which is the
truth about the schema. It writes a valid tree. The Gate accepts it at medium
stakes, because nothing about this change is consequential: it adds some nodes to
a page.

And a reader gets four correct figures over four bars that are, for practical
purposes, not there.

Nothing here is broken. Every part is doing exactly what it was built to do. The
defect is in the seam between a record that says *the author must state the
ceiling* and a schema that says `max?`.

### Exercise E — can either fallback in the rule ever fire?

```ts
describe("E", () => {
  it("asks whether either fallback in the rule can ever fire", () => {
    const { markup } = render(
      banded("loom.stat-chart", {}, [
        { value: "1", label: "a", magnitude: 1 },
        { value: "—", label: "b" },
      ])
    )

    console.log("  a chart given no props at all:")
    console.log(`    ${attrIn(markup, /<div class="loom-stat-chart"[^>]*>/)}`)
    console.log("  its two children:")
    for (const stat of statsIn(markup)) console.log(`    ${stat.slice(0, stat.indexOf(">") + 1)}`)

    const sheet = renderToStaticMarkup(libraryStylesheet())
    console.log("  every mention of the three properties in the stylesheet:")
    for (const line of sheet.split("\n")) {
      if (/--loom-chart-max|--loom-chart-plot|--loom-stat-magnitude/.test(line)) {
        console.log(`    ${line.trim()}`)
      }
    }
  })
})
```

The rule writes two `var()` fallbacks and one bare `var()`. Before running:
write down, for each of the two fallbacks, the markup that would make it fire.

The output:

```
  a chart given no props at all:
    <div class="loom-stat-chart" style="--loom-chart-max:100;--loom-chart-plot:calc(var(--loom-spacing-6) * 3)">
  its two children:
    <div class="loom-stat loom-stat-plotted" style="--loom-stat-magnitude:1">
    <div class="loom-stat">
  every mention of the three properties in the stylesheet:
    grid-template-rows: var(--loom-chart-plot) auto auto;
    height: calc(var(--loom-chart-plot) * min(1, max(0, var(--loom-stat-magnitude, 0) / var(--loom-chart-max, 100))));
```

Now try to construct the two cases.

`var(--loom-chart-max, 100)` fires for a `.loom-stat-chart` that set no ceiling —
and the component sets `given.max ?? 100` unconditionally, so a chart handed no
props at all still carries one. `var(--loom-stat-magnitude, 0)` fires for a
`.loom-stat-plotted` carrying no magnitude — and the class and the property are
set in the same ternary, so the second child above has *neither*, and the
selector does not match it.

**Both fallbacks are unreachable**, and one of them is a second copy of a number
the schema already owns. Note the third property, which has no fallback at all
and is exactly as reachable as the other two: the fallbacks were not written to a
rule, they were written out of habit. This is lesson 25's subject one floor down
— a value written in two places with nothing holding them together — with the
twist that the second copy cannot even go wrong, which is why nothing will ever
tell you it has drifted.

### Exercise F — a month that was zero, beside a month nobody measured

```ts
describe("F", () => {
  it("renders a month that measured zero beside a month nobody measured", () => {
    const { markup, diagnostics } = render(
      banded("loom.stat-chart", { max: 100 }, [
        { value: "0%", label: "Jul", magnitude: 0 },
        { value: "—", label: "Aug" },
      ])
    )

    for (const stat of statsIn(markup)) console.log(`    ${stat}`)
    console.log(`  diagnostics: ${diagnostics.length}`)
    console.log(`  Jul plots at ${(plotted(0, 100) * 100).toFixed(1)}% of the plot`)
    console.log("  Aug draws no bar at all")
    console.log(
      `  a negative magnitude: ${JSON.stringify(
        registry.validateProps("loom.stat", { value: "-3%", label: "Sep", magnitude: -3 })
      )}`
    )
  })
})
```

Predict the markup for both children, and then predict what a reader sees.

The output:

```
    <div class="loom-stat loom-stat-plotted" style="--loom-stat-magnitude:0"><span class="loom-stat-value">0%</span><span class="loom-stat-label">Jul</span></div>
    <div class="loom-stat"><span class="loom-stat-value">—</span><span class="loom-stat-label">Aug</span></div>
  diagnostics: 0
  Jul plots at 0.0% of the plot
  Aug draws no bar at all
  a negative magnitude: {"outcome":"invalid","issues":[{"path":"magnitude","message":"Number must be greater than or equal to 0"}]}
```

This is lesson 24's distinction, and it is doing something interesting.

In the **markup**, the two are unmistakable: one carries a class and a property,
the other carries neither. The system knows perfectly well which month was
measured at zero and which was not measured. On the **screen** they are the same
thing: nothing above the label.

So the distinction survives all the way to the last representation before the
glass and dies there. That is worth holding beside lesson 24's rule — *a reading
owes a caller the difference between no and nobody has said* — because here the
reading is honest and the rendering is not, and the rendering is the part the
reader gets.

The refusal at the end is a different discipline and a good one: `magnitude` is
`nonnegative`, because a bar is a length. A chart of changes that go both ways is
a different primitive with a baseline in the middle, not this one pretending.

### Exercise G — one node, on its own, out of the middle

```ts
describe("G", () => {
  it("renders one node out of the middle of a chart, on its own", () => {
    const tree = banded("loom.stat-chart", { max: 100 }, UPTIME)
    const band = tree.root.kind === "element" ? tree.root.children[0] : undefined
    const children = band?.kind === "element" ? band.children : []

    console.log(`  the page is ${tree.root.id}, the chart is ${String(band?.id)}, and its children are:`)
    console.log(`    ${children.map((child) => child.id).join(" ")}`)

    const jun = children[2]
    const out = renderLoomExcerpt(tree, String(jun?.id), { resolver: registry, themes, validator: registry })

    console.log(`  excerpting ${String(jun?.id)}: found ${out.found}, diagnostics ${out.diagnostics.length}`)
    console.log(`    ${renderToStaticMarkup(out.element).replace(/<style[\s\S]*?<\/style>/g, "")}`)
  })
})
```

Predict the ids first — all eight, in the order they were minted — and then
predict whether the excerpt carries a ceiling.

The output:

```
  the page is n_8, the chart is n_7, and its children are:
    n_1 n_2 n_3 n_4 n_5 n_6
  excerpting n_3: found true, diagnostics 0
    <div><div class="loom-stat loom-stat-plotted" style="--loom-stat-magnitude:71"><span class="loom-stat-value">71%</span><span class="loom-stat-label">Jun</span></div></div>
```

Two things, and the second is the one to keep.

The ids are lesson 04's point arriving for the fourth time in this course: the
six leaves are `n_1`–`n_6`, their container is `n_7`, and the page that holds
everything is `n_8`. The fixture builds children before parents, so the root has
the highest id in the tree. An id still says nothing about position.

And the excerpt: **found, no diagnostics, and the stat element inside the
excerpt's wrapper is byte-identical to the one in exercise A** — carrying its own
magnitude and no ceiling, because there is no chart above it to publish one. So outside a chart a plotted stat is simply a
stat. The pattern degrades to the child's own correct rendering, which is what
"a node renders correctly on its own" buys you and what a context-based design
would have had to invent an answer for.

---

## It could have been otherwise

Four from [0150](../decisions/0150-a-container-that-must-aggregate-publishes-a-custom-property-and-the-browser-does-the-arithmetic.md)
and two that are not in any record.

**React context, container to child.** The obvious engineering answer, and the
one that quietly spends the property the whole system is built on. Worth being
precise about the cost rather than invoking purity: exercise G is what stops
working. A node that renders correctly only under a particular ancestor cannot be
previewed alone, cannot be diffed alone, and cannot be reasoned about from its
own props — and every one of those is something a person does while reviewing a
change they did not write.

**A `values` array prop on the container, and no child nodes.** `[58, 66, 71,
80, 88, 96]` on the chart makes the maximum computable in one render function,
which is the whole problem solved in a line. It is also exactly the shape 0052
forbids: repeated content as a prop is unaddressable, has no author and no
history per point, and `insert` and `remove` cannot reach a single reading. The
price of the easy answer is that a chart's fifth month stops being a thing that
can be changed, attributed, or put back.

**Repeat the ceiling on each child.** One number, six copies, and a `configure`
on the container that cannot change the scale.

**A numeric `value`, with the printed string derived from it.** Avoids the
second field entirely. Rejected because the formatting is the author's: `"$1.2M"`,
`"2.4×"` and `"99.9%"` are editorial choices, and taking them away means adding a
`format` prop, which is a small programming language arriving by the side door.
This is [0115](../decisions/0115-three-fields-of-one-shape-are-a-list-wearing-three-names.md)'s
test run in the other direction — two fields of similar shape are two facts here,
not one fact written twice.

**A required `max`, with no default.** Not in the record, and it is the honest
implementation of the record's own argument. It closes exercise D's trap
completely: you cannot plot anything without saying what you are plotting it
against. The cost is real and is the reason it did not happen — every stored tree
holding a percentage chart becomes invalid, and every model that writes one has
one more thing to get right. Weigh it against the failure it prevents, which is
silent, ships, and is only visible to a person looking at the page.

**Auto-scale to the largest value, with an opt-out.** Not in any record, and it
is what most charting libraries do, which is what makes it worth understanding
rather than dismissing. It cannot be done here — neither the renderer nor the
browser can compute the maximum — but suppose the seam above the renderer did it.
You would get a chart that always fills its plot, and you would lose the ability
to compare two charts on the same page: 94→96 and 30→90 would both end at the
top. The argument against it is not mechanical, it is editorial, and it is the
same argument whichever framework you are in.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections while
you write. Then compare.

1. **A colleague proposes React context**, and they are not being careless: it is
   one provider, it is idiomatic, it is six lines, and it works. Explain why not
   — and do it **without using the word "pure"**, which makes the objection sound
   like a style preference held by people who like functional programming. The
   version that transfers names a thing somebody can no longer *do*, and there is
   a published function in this runtime whose entire purpose is that thing.

2. **Derive this lesson's shape from lesson 21 and lesson 22 together, without
   looking at either.** Lesson 21 asked where you check a property belonging to
   no single party. Lesson 22 found a fault belonging to two nodes and answered
   it with a predicate applied to a pair. Both are facts that live *between*
   things, and both got an answer. This lesson's fact also lives between things
   and got neither answer.

   Say what is different about it. Then say which half of the earlier lessons'
   reasoning survives and which half does not — the distinction you are looking
   for is between a fact somebody has to **check** and a fact somebody has to
   **deliver**, and it is worth writing down what each of those needs that the
   other does not.

Predict, before writing (2): the hard half is not naming the difference. It is
saying what *follows* from it. If your answer ends at "so there is nothing to
check", you have stopped one sentence before the useful part.

---

## Self-check

Seven questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. Name the field on `LoomPrimitiveProps` that makes this lesson necessary, say
   what it holds, and then say why the problem is not solved by putting the
   children's props beside it.
2. Give the three ways round the constraint and the cost of each. Then say which
   one of the three costs something that is *published* rather than internal, and
   name it.
3. State the rule about moving a computation onto a different machine, in one
   sentence, without mentioning CSS. Then give the data model CSS custom
   properties actually offer, and derive from it two chart features that cannot be
   built this way.
4. The record is called *"…and the browser does the arithmetic"*. Say precisely
   which arithmetic the browser does and which arithmetic nothing does. Then give
   the reason the second one is not a shortfall — the reason is about what kind of
   thing a ceiling is.
5. Why is the clamp in the stylesheet rather than in the schema or at the Gate?
   Give the answer in terms of what each failure costs a reader, and name the
   earlier lesson whose two-axis habit you just used.
6. `magnitude` sits beside `value` rather than replacing it. Give the test that
   decides whether two fields of similar shape are two facts or one fact written
   twice, and apply it here in both directions.
7. Exercise D produced four correct figures over four invisible bars with three
   instruments saying yes. Say where the defect is — it is not a bug in any of
   the files involved, each of which is doing exactly its job. Then say what
   would have to change for an instrument to be able to catch it, and why that
   instrument would be difficult to get right.

Question 4 is this lesson's question. Question 7 is where a confident half-answer
is most likely: an answer that says "the default is wrong" has named the symptom.
The part that transfers is the gap between a record's argument and the schema
that is supposed to implement it, and the fact that nothing in this repository
compares those two things.

---

## Reflect

Write for two minutes, then move on.

- Predict 1 asked how the sixth child learns the scale. If you wrote *the
  container maps over its children*, go back and write down what you thought the
  container was holding when it mapped. Almost everybody who has written React
  has that picture, and it is correct in React and wrong here, and the difference
  is one line of a type.
- Predict 2 asked you to circle the height in the markup. Write down the
  attribute you invented, because you almost certainly invented one. Then write
  down where you now think it lives, and notice that "in a stylesheet" is a
  genuinely different *kind* of answer from "in the page".
- Predict 3 and your list of features you cannot build. Compare it to the list in
  *What you inherit when you move a computation*. If yours was shorter, the thing
  to write down is not the missing items — it is whether you derived your list
  from the channel's shape or recalled it from charts you have used.
- Predict 4 and your confidence. If you predicted that *something* would object —
  a diagnostic, a schema, the Gate — and rated yourself 4 or 5, that pair is the
  most valuable line in your notes. It is not a gap in your knowledge of Loom, it
  is a belief about what validation is for, and it is the belief the whole of
  Part V has been chipping at: a system can check everything it was asked to
  check and still serve a page that means nothing.
- Now go and look. Find a component you work on that needs a fact about its
  siblings — a row that sizes to the tallest cell, a list that highlights the
  longest item, a legend that has to agree with a plot. Work out three things and
  write them down: where that fact is computed today, what the computing thing
  had to be given in order to compute it, and what stops working if you render
  one of those children on its own.
- Last, the general version, and it is not about software. This lesson is an
  instance of *a scale that is not a measurement*. Find one outside programming —
  a grading curve, a risk rating, a star system, a map's legend — and say who
  chose the ceiling, whether the people reading it know that somebody chose, and
  what they would conclude differently if they did.

---

## Come back to this

Set AF in [`review-schedule.md`](review-schedule.md), two days after this lesson.
Interleaved with 02, 04, 08, 14, 21, 22, 24 and 25 — heavy on 14, because this
lesson is a story about one clause of 0008 and is unreadable if that clause is
fuzzy, and heavy on 25, because exercise E is that lesson's subject in a place it
did not look.

Part V has ten lessons now, and this one adds a kind the first nine did not have.
Every earlier seam was a fact somebody else owned: a registry, a host page, a
party who had not declared, a compiler answering a narrower question, a second
store. The remedy was always about **reaching** the fact — declare it, register
it, resolve it before the walk, put the claim where getting it wrong is an event,
write a function allowed to hold two stores at once.

Here nothing is out of reach. The fact is six numbers in one array, one level
below the node that wants them, in the same render. What forbids it is a promise
the system made about itself — and the answer is not to reach further but to
**hand the work to a different machine entirely**, and then to live inside that
machine's data model, which is narrower than the one you left.

That is the first thing to carry: *a constraint you chose is still a constraint,
and the cost of keeping it is paid somewhere you did not expect — in this case by
a stylesheet, in a language with no variables that differ per sibling.*

The second is the one exercise D printed, and it is sharper than the first. After
all that work to find a machine that could do the arithmetic, **the number that
actually mattered is not computed by anybody, and is not supposed to be.** The
engineering answers the question *can this be worked out*. It does not answer
*should this be worked out*, and those come apart more often than they look like
they will — a default is what you get when nobody asks the second question out
loud.

The question to carry into an eleventh seam is the one the finding leaves: **when
a decision record argues for a behavior and the code implements a default
instead, what in this repository would ever notice?** Lesson 25 asked where to
put a claim so that getting it wrong is an event. This one has a claim written
down, in an `Accepted` record, in the present tense — and a schema three files
away that quietly disagrees with it.
