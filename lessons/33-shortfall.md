# 33 — Shortfall: the fact whose only witness runs too late to report it

**After this lesson you will be able to** say which of the ways a binding can go
wrong is invisible from outside the primitive that reads it, and why; explain who
the sentence on the page is for and who the count is for, and why those are two
different audiences with two different artefacts; give the three reasons a
component may not raise a diagnostic, in the order that makes the first one
decisive; state the general remedy — *when the only party who knows runs at the
wrong time, take its function rather than its report* — and say what makes the
handover safe; say why one declaration on a primitive is a function where eight
others are data, and what question decides that; explain why the runtime rather
than the primitive decides which readings are worth saying out loud; say what a
guard around another author's code owes the page it is inside; and name the one
thing this seam cannot catch, together with the construction that makes it
unlikely and the reason that construction cannot be enforced.

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
[32](32-layout.md).

Lesson 32 ended on a question: **what is this fact a function of, and which of
those inputs does anybody in this system own?** For a word too wide for a phone
the answer was *one of five*, and the lesson said what that costs — an
instrument, a reason for every reading it throws away, and somebody willing to
read a line that does not fail the build.

It also said what the other answer means. *A seam where the answer is all of them
is a check waiting to be written.*

This seam is that answer, and the check was not waiting to be written. Twelve
rows arrive from a source. A primitive parses each one against a shape it holds
and can draw eleven. Nothing is missing: the answer is here, in memory, resolved
before the walk began; the shape is here, in the primitive's own module; the two
inputs the fact is a function of are owned by **one party**, which also performs
the comparison and is the only thing in the system that could possibly be wrong
about it.

And the count of what it dropped could not be reported, for a year, to anybody
who wanted it. Not because the knower lacked the knowledge. Because of **when it
runs**.

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Write something for all
five before you look anything up.

1. A `Result` is returned and nothing throws. Give the reason that is about the
   *audit trail* rather than about control flow, and then name the one thing in
   the runtime that is allowed to throw. *(05)*
2. The renderer is a total, pure projection of the tree. Say what "total" obliges
   it to do about a node it cannot resolve, and say why that obligation is a
   different discipline from returning a `Result`. *(14)*
3. A primitive declares `reads: ["entries"]`, and another primitive declares
   nothing at all. Say what the registry answers for each, and then say what the
   second answer is *not*. *(18)*
4. Lesson 29 wanted to know whether a component reads a prop it was handed, and
   could not find out by watching the output. State the remedy it reached, in a
   sentence beginning *to observe a read*. *(29)*
5. A page with a copy button on it, rendered to static markup, contains no
   button. Say why, and then say which moment that forced the registry to do all
   four of its behaviour checks at. *(31)*

Question 4 is the one this lesson takes away from you, and question 2 is the one
it leans on hardest. If your answer to 2 was about `Result`, read it again before
you go on: the two are not the same promise and this lesson turns on the
difference.

---

## Predict

**In writing, before reading on.** Four questions. Question 2 is the one to rate
your confidence on, and it is the question of the lesson. Question 4 is where the
principled answer and the shipped answer are the same answer for a reason worth
having.

1. A source answers a `loom.feed` with twelve rows under a name the feed reads.
   Eleven carry a `title`; the twelfth carries `headline`, because somebody
   renamed a column. The feed parses each row, keeps eleven, draws them, and
   writes *"Some entries could not be shown."* on the page — with no number in
   it, deliberately.

   The author of that page wants to know **eleven of twelve**. Write down where
   that count should go, and name the mechanism that carries it there. Be
   specific enough that somebody could implement what you wrote.

2. Suppose the mechanism you named is the obvious one: the render context gains
   a `report` function, and the component calls it when it skips a row. The
   walk's signature is unchanged — `renderLoomTree` returns
   `{ element, diagnostics }` — and `report` pushes into that same `diagnostics`
   array.

   Write down what a caller sees in `diagnostics` for the page above. Then write
   down what it sees if it renders the element twice. **Rate your confidence
   1–5.**

3. The primitive is the only party that knows which rows it can read, so whatever
   it declares has to be **code** rather than data — every other declaration on a
   primitive is data. Write down what that function may be handed.

   Then write down why handing it anything *more* than the component gets would
   be a defect rather than a convenience. The second half is the one to think
   about.

4. A declaration returns three readings and the second one says
   `{ name: "extra", given: 1, shown: 2 }` — two rows shown of one given.

   Write down what the runtime should do about the **other two**, and give your
   reason. Then write down what it should do with a declaration that throws
   halfway through, and say whether your two answers are the same shape.

Do not read on until all four are written. Question 1 is where almost every first
answer names the thing question 2 then demolishes — which is the point, so write
it down rather than hedging.

---

## The problem

### Eleven of twelve, and nothing in the system is wrong

Start from the page, because the page is already correct and that is what makes
this hard to see.

`loom.feed` is handed an answer. It parses the answer as a list, then parses each
row against an entry schema, keeps the ones that pass, and draws them. A row that
fails is skipped rather than fatal, which is
[0175](../decisions/0175-a-listing-skips-the-row-it-cannot-read-and-fails-the-one-it-cannot-place.md):
one unreadable row out of twelve should cost one row, not a band. And the reader
is told — the feed draws a sentence saying some entries could not be shown.

That sentence has no number in it, and the absence is deliberate. A count there
is a plural, and a plural is a grammatical form this library cannot construct in
every language it may be served in. So the reader gets the fact and not the
figure, which is the right trade for a reader: *something is missing here* is
actionable and *eleven of twelve* is trivia you cannot act on from the outside.

Now ask who the figure is for.

### The count is useful to exactly one person, and that person is not the reader

It is useful to the author of the page, and it is the most useful number in this
entire scenario to them, because it is the one that says *when*. A feed that
quietly draws eleven rows looks like a feed. A feed that drew twelve yesterday
and eleven today, because somebody upstream renamed a column from `title` to
`headline`, is a bug with a date on it — and the date is the only thing that
turns "the list looks shorter than I remember" into "the column moved on
Tuesday".

Every comparable fact in the render walk is already a **diagnostic**: collected
beside the element, addressed to whoever is looking at diagnostics rather than at
the page, and read by a person who has the power to fix a source.
[0206](../decisions/0206-a-primitive-declares-what-it-could-not-show-and-the-runtime-decides-whether-to-say-so.md)
opens by sorting the ways a binding can be wrong into the ones **visible from
outside the primitive that reads it** and the one that is not. The walk reports
the outside ones on its own, and when that record was written there were three:

- an unregistered source, or an adapter that could not answer → `data-unavailable`
- a malformed `loom:data` → `data-misdeclared`
- a name the primitive says it does not read → `data-unread`

Exercise A puts all three on one page and the fourth beside them. The fourth is
the one nothing outside could see: the source answered *perfectly*, under a name
the primitive reads, with rows the primitive then declined one at a time —
because each row has a shape **only the primitive knows**. There is no vantage
point outside a component from which *this row does not parse* is a visible
event. The schema is a `const` inside a module; the comparison happens inside a
function; and what comes out the other side is markup with eleven list items in
it, which is indistinguishable from an answer that had eleven rows in it.

### So the component has to say it, and the component had no way to

Here is where the obvious answer arrives, and it is worth writing down before it
is taken away, because it is the answer the finding that produced this record
proposed.

`LoomRenderContext` — the object a primitive's component is handed as `loom` —
carries `slots`, `data`, `text`, `behaviours`, `submit`, `frames`, `anchor` and
`decorative`. **Nothing on it reaches the walk's `collect`.** So a primitive
holding a fact its author needs has exactly two options: say it to the reader, or
say it to nobody. It says it to the reader, without a count, and the count goes
nowhere.

Give the context a `report`, then. A read-only function, restricted to a
diagnostic code the runtime already knows, pushing into the array the walk is
going to return. It is five lines. The finding that proposed it also named the
reason to think twice: it lets a registered component write into the runtime's
output, which nothing outside the runtime does today.

That reason is a reason about taste, and taste is not what settles this. What
settles it is that **the thing does not work**, and the three ways it does not
work are worth separating, because only the first is specific to React.

---

## The idea

### Three reasons a component may not report, in order of decisiveness

**A component body runs after the walk has finished.** This is the decisive one
and it is not about React at all — it is about lesson 14. `renderLoomTree`
returns `{ element, diagnostics }`. An *element* is a description of what to
render; it has not rendered. The component functions inside it are called later —
by `renderToStaticMarkup`, by a browser mounting, by an image renderer, or
**never**. Meanwhile every caller reads `diagnostics` off that return value, and
some of them read it and never render the element at all. A diagnostic pushed
from a component body lands in an array its reader has already finished with.

Exercise C is that sentence as a transcript: at the moment the caller reads
`diagnostics`, the number of times the component has pushed anything is `0`.

**React decides how many times.** `StrictMode` renders twice. A re-render on
state renders again. A second medium renders the same element a second time.
Exercise D does the last of those and the component's count comes out `2` against
a walk that happened once — so a count reported from a render body is reported as
many times as somebody feels like calling it, which for a *count* is worse than
silence. A diagnostic you see twice is a diagnostic you learn to distrust.

**Reporting in render is a side effect in render**, which React asks components
not to do, and which this package has no business publishing a seam for. If the
only correct use of your API breaks the host framework's rules, you have
published a trap with documentation attached.

Notice the shape of that list. The first reason would be true in a system with no
React in it at all, as long as rendering were separated from describing. The
second and third are React's. **A seam rejected for a framework's reason might be
worth revisiting when the framework changes; this one is rejected for a reason
that is the architecture.**

### The remedy: take the function, not the report

Every remedy Part V has used so far does something about *where a fact is*. Reach
further to see it (22). Manufacture a second copy to compare it against (28).
Instrument the place it happens (29). Ask the author to write it down (30). Close
the set so there is nothing unwritten (31). Stand where it is made and take a
reading (32).

None of them is available here, and the reason is not that the fact is hard to
reach. It is in the room. It is being computed, correctly, by the one party that
could compute it, out of two inputs that party holds. The problem is that the
party computing it **runs at a time when the channel has closed**.

So the seventh remedy is a handover, and the direction is the whole of it:

> **When the only party that knows a fact runs at the wrong time, do not take its
> report. Take its function, and call it yourself at the right time.**

A primitive declares a pure function. The walk calls it, once per node, inside
the walk, before anybody has seen the array. The runtime decides which of its
readings is worth a diagnostic. **Nothing is handed a way to write into the
walk's output**, and the component keeps its one job, which is drawing.

Every property the `report` version lacked, the inversion has for free. Called
once, because the walk calls it once. Called before the array is read, because
the array has not been built yet. No side effect in render, because it does not
run in render. The function is pure, it is handed what it needs, it returns a
value, and the caller decides what the value means — which is the same bargain
`analyzeDelta` and the Gate make (lesson 07), one floor down.

### A function, where every other declaration is data

`type`, `slots`, `text`, `frames`, `behaviours`, `role`, `copy` and `reads` are
all data: strings, lists, maps. The declaration this lesson is about is a
function, and the asymmetry is the honest one rather than a shortcut. It is worth
being able to say which way round the question goes, because it generalises.

`reads` is a list of **names**, and a name is data. That is exactly why lesson 29's
seam could answer the name-comes-from-a-prop case with a `{ fromProp, default }`
form instead of a callback: a rule about which name to use is still data about the
primitive.

*How many rows survived a shape* is not data about a primitive. **It is the
primitive reading an answer.** There is no data form of it — the only candidate is
a number somebody maintains by hand beside the code that makes it true, which is
lesson 28's second copy with the worst possible owner.

So the test to carry: **is the thing you are asking an author to declare a
property of their component, or a computation over its inputs?** A property can be
data. A computation cannot, and asking for it as data gets you a value that was
true once.

### What it is handed, and why not one thing more

The declaration receives exactly what the component receives of the same two
things: the node's props as the tree wrote them, and the host's answers for that
node.

```ts
export type UnshownDeclaration = (
  props: JsonObject,
  data: NodeData
) => readonly UnshownReading[]
```

Not less, and — the half Predict 3 asks about — **not more**. The reason more
would be a defect is the only reason this construction is worth anything: if the
declaration is handed the same two values the component is handed, then *the
declaration can be the same function the component calls*, and a count and a page
derived from one function cannot disagree. Hand the declaration a richer argument
— the resolved tree, the whole data resolution, a parent's props — and you have
made it a second implementation. A second implementation of *which rows parse* is
a second answer to which rows parse.

Props are included for lesson 30's reason rather than for symmetry: a primitive
may read its binding under whichever name a prop gives
([0184](../decisions/0184-a-primitive-may-read-under-whichever-name-a-prop-gives.md)),
so a declaration that could not see props would be counting the wrong answer on
every node that renamed one. The walk is the only place holding both.

### Both counts, and never the rows

```ts
export type UnshownReading = {
  /** The binding name the answer arrived under. */
  readonly name: string
  /** Rows in the answer as the primitive found it. */
  readonly given: number
  /** Rows the primitive placed on the page. */
  readonly shown: number
}
```

Two numbers rather than one, because the sentence the author needs is *eleven of
twelve* and a lone `11` cannot say it — and a lone `1`, the difference, cannot
say it either. One dropped row out of twelve is a renamed optional field. One
dropped row out of two is a broken source. The same difference, two different
mornings.

Numbers rather than the rows themselves, which is a line already drawn elsewhere
in the same walk: `data-unavailable` names the source that could not answer and
never what it answered. **A diagnostic is logged; a row is the host's data.** Put
a row in a diagnostic and you have put a customer's order into whatever collects
logs, as a decision made by a library on the host's behalf.

### The primitive reports every reading; the runtime reports the ones that differ

A declaration returns a reading for every answer it read — the ones it read
*whole* included. It is not asked to decide whether `shown === given` is
interesting, and the walk's answer to that question is no: an answer read whole
is the ordinary case, and reporting it would put one line per bound region into
every log on every page.

Two reasons for putting that rule in the runtime, and the second is the one that
transfers.

It is the walk that owns the diagnostic vocabulary
([0181](../decisions/0181-a-primitive-declares-the-binding-names-it-reads-and-saying-nothing-is-not-saying-none.md)),
so what counts as worth saying is the walk's call.

And: **a rule that each of ninety-nine authors implements separately is a rule
that holds ninety-eight times.** Ask every primitive to suppress its own
uninteresting readings and you have ninety-nine chances to get it wrong, in
ninety-nine files, each of which looks right on its own. Exercise F hands the
runtime three readings — one whole, two short, in the order the declaration
happened to produce them — and prints what comes out: the whole one dropped, and
the two short ones **name-sorted**, because a list whose order follows some
author's array is a list a test can only assert loosely.

### Absence is not emptiness, and this time there is no `[]`

A primitive whose author has declared nothing is reported on by nothing. That is
the same bargain `reads` and `copy` make, and it is what lets the seam ship
additively: silence is not a claim that this primitive shows everything it is
given, because no author made that claim.

There is one difference from `copy` and `reads`, and it is a small, sharp lesson
in what a type can hold. For `reads`, an author can write `[]` — *I read no
bindings* — and the registry can tell that from `undefined`. Here there is no
such thing. A reading is made **per answer, at render time**, so a declaration
that returns `[]` and no declaration at all are the same fact about this node,
and the registry answers `undefined` for both. The distinction exists in the
other seam because the declaration is data and data can be empty. A computation
cannot be empty; it can only have nothing to say today.

### A guard, because the code on the other side is somebody else's

A declaration is another author's code, called inside a walk whose entire
contract is that it always returns an element. Lesson 14's *total* is the promise
at risk, not lesson 05's `Result` — and this is the distinction the warm-up asks
for. So four decisions, all of them visible in exercise E.

**A throw is caught** and becomes a diagnostic of its own. A page lost to a
primitive's own *bookkeeping* would be the worst trade available in this package:
the count is information about an answer, not part of drawing one, and the node
renders exactly as it would have. Exercise E prints `the node still rendered:
true` four times, which is the only acceptable answer in all four cases.

**An impossible reading is refused rather than clamped.** *Thirteen of twelve*
could be quietly turned into twelve of twelve. Then the author of the page is
sent hunting a defect in their source when the defect is in the primitive telling
them about it, and they will not find it, because it is not there. **A diagnostic
that has been repaired is worse than one that is missing**, and that holds well
outside this file.

**The whole batch is refused, not the offending reading.** This is Predict 4, and
the argument is two sentences. A declaration that miscounted one answer has not
earned belief about the others. And once a partial report is in a log it is
indistinguishable from a complete one — so keeping the two readings that looked
fine means publishing *this node dropped rows under these two names* when the
truth is *this node's bookkeeping is broken*.

**What the type promises is checked anyway** — that the return value is an array,
that each member is an object. The point of a guard is that the code on the other
side of it is somebody else's, and a host's JavaScript need not agree with this
package's types. A declaration returning `undefined` is a thing that happens.

### The one diagnostic addressed to nobody in the deployment

The code for a declaration that cannot be believed is the one member of the
render walk's diagnostic vocabulary that **neither a tree nor a deployment can
cause.** Every other code is a thing somebody can fix by changing a tree, a
registry, a source or a palette. This one is reachable only by a mistake in a
component's own bookkeeping, and the person who can act on it is whoever wrote
the component — who may work at a different company from everybody reading the
log.

That is worth noticing as a property of a vocabulary rather than as a fact about
one code. When you add a diagnostic, ask who it is addressed to. A list in which
every entry is addressed to the same party is a list that will eventually acquire
one that is not, silently, and be read by people who cannot act on it.

### The lie this cannot catch

And now the part that keeps this honest, because the seam has an exposure and the
record says so in its own consequences.

A declaration that returns `{ name: "entries", given: 12, shown: 12 }` for a
component that drew eleven is **silent and believable**. The counts are
consistent, nothing is impossible, the guard passes, the runtime drops the
reading as uninteresting, and the page quietly disagrees with the record of it.
Exercise G runs exactly that, beside a primitive whose declaration is the
function its component calls, and prints both: eleven rows on the page in both
cases, `11 of 12` from one and `nothing` from the other.

The construction that makes it unlikely is the only defence available, and it is
lesson 28's preference acted on: **the declaration is the function the component
already calls.** Not a copy of it, not a re-derivation of it — the same function,
which a primitive that skips rows already contains, because it had to decide what
to skip in order to skip it. Two readings from one function cannot drift, because
there is nothing to drift from.

Nothing can enforce that. It is the same exposure `copy`, `interactive` and
`submits` carry, and it is worth stating in the terms lesson 28 gave: this seam
manufactures a second copy of a fact, and somebody has to keep it true. What the
design can do — all it can do — is make the honest construction the *easiest* one
to write. `loom.feed` already has a `readAnswer` that returns the number; its
declaration is one line that calls it.

Which is as good a place as any to say what is not done yet. The number of
primitives in the starter library that have made this claim is printed by exercise
G, from the registry rather than from this paragraph, and on the day this lesson
was written it was **none**. The seam exists; the primitive with the exposure has
not declared one; that line lives in another lane's directory and is filed rather
than taken. The exercise reads the registry so that a reader who runs it finds out
what is true *now* instead of what was true when somebody typed a number into a
lesson.

---

## In the code

| What | Where |
| --- | --- |
| what a reading is | `UnshownReading` in `src/render/unshown.ts` |
| what a primitive declares | `UnshownDeclaration`, same file |
| the guard around another author's code | `readUnshown`, same file |
| which readings are worth saying | `unshownRows`, same file |
| why a declaration cannot be believed | `UnshownFault`, same file |
| where an author writes it | `unshown` on `PrimitiveEntry` in `src/sdk/definition.ts` |
| how the walk finds it | `unshownBy` in `src/sdk/registry.ts`, detected by `isUnshownReader` |
| where the walk calls it | `reportUnshownRows` in `src/render/render.ts` |
| the two codes | `data-unshown` and `unshown-unreadable` in `src/render/diagnostics.ts` |
| the primitive with the exposure | `readAnswer` in `src/primitives/loom.feed.ts` |
| the sentence the reader gets instead | the `unreadable` copy key in the same file |
| the picture of both audiences at once | [`tools/specimen/unshown.specimen.ts`](../tools/specimen/unshown.specimen.ts) |
| the decision | [0206](../decisions/0206-a-primitive-declares-what-it-could-not-show-and-the-runtime-decides-whether-to-say-so.md) |
| a listing skips a row and says so | [0175](../decisions/0175-a-listing-skips-the-row-it-cannot-read-and-fails-the-one-it-cannot-place.md) |
| saying nothing is not saying none | [0181](../decisions/0181-a-primitive-declares-the-binding-names-it-reads-and-saying-nothing-is-not-saying-none.md) |
| a binding name that comes from a prop | [0184](../decisions/0184-a-primitive-may-read-under-whichever-name-a-prop-gives.md) |

One thing to notice before the exercises. Every row above is in `src/` or in a
tool that reads it, which is the opposite of lesson 32's table — and the two
tables together are the two halves of Part V's answer to *who owns this fact*.
When nobody owns the inputs, the code goes where a browser is. When one party
owns all of them, the code goes where that party is, and the only question left is
*when*.

---

## Try it

Seven exercises. **Predict every output in writing, then run.** Exercise C is
Predict 2's other half and is the one to commit to hardest; exercise G's last
three lines are the lesson's open question rather than its conclusion.

Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

The shared preamble for all seven. It builds the smallest thing that has this
exposure: one pure function that reads an answer, a component that draws what it
returns, and a declaration that is **that same function**.

```ts
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, it } from "vitest"
import { z } from "zod"

import {
  createDataRegistry,
  defineSource,
  type DataRegistry,
  type SourceEntry,
} from "./data/adapter.js"
import { NO_DATA, type NodeData } from "./data/resolution.js"
import { resolveTreeData } from "./data/resolve.js"
import { sequentialIdFactory } from "./ids.js"
import type { JsonObject, JsonValue } from "./json.js"
import { createStarterPrimitiveRegistry } from "./primitives/index.js"
import { describeRenderDiagnostic } from "./render/diagnostics.js"
import type { LoomPrimitiveProps } from "./render/primitive.js"
import { renderLoomTree } from "./render/render.js"
import { readUnshown, unshownRows, type UnshownDeclaration } from "./render/unshown.js"
import { DATA_PROP_KEY } from "./reserved-props.js"
import { ok } from "./result.js"
import { definePrimitive, type PrimitiveEntry } from "./sdk/definition.js"
import { createPrimitiveRegistry, type PrimitiveRegistry } from "./sdk/registry.js"
import { buildElement, buildText } from "./tree/builders.js"
import { createTree, type LoomTree } from "./tree/tree.js"

/** Twelve rows, eleven of them strings. The twelfth arrived under a renamed column. */
const ELEVEN_OF_TWELVE: readonly JsonValue[] = [
  ...Array.from({ length: 11 }, (_row, index) => `Row ${index + 1}`),
  { renamedColumn: "Row 12" },
]

/** The one pure function. The component draws what it returns; the declaration counts it. */
const rowsIn = (value: unknown): readonly string[] =>
  Array.isArray(value) ? value.filter((row): row is string => typeof row === "string") : []

const answerAt = (data: NodeData, name: string): readonly JsonValue[] => {
  const outcome = data[name]

  return outcome?.status === "ready" && Array.isArray(outcome.value) ? outcome.value : []
}

const readingOf = (props: JsonObject, data: NodeData) => {
  const name = typeof props.binding === "string" ? props.binding : "entries"
  const given = answerAt(data, name)

  return { name, given: given.length, shown: rowsIn(given).length }
}

const feed = definePrimitive({
  type: "loom.feed",
  description: "A list of entries a source answered with.",
  props: z.object({ binding: z.string().optional() }),
  reads: [{ fromProp: "binding", default: "entries" }],
  unshown: (props, data) => [readingOf(props, data)],
  component: ({ loom, props }: LoomPrimitiveProps<{ binding?: string }>) => {
    const given = answerAt(loom.data, props.binding ?? "entries")
    const shown = rowsIn(given)

    return createElement(
      "div",
      null,
      createElement("ul", null, shown.map((row) => createElement("li", { key: row }, row))),
      /** 0175: the reader is told, and deliberately without a count. */
      shown.length < given.length ? createElement("p", null, "Some entries could not be shown.") : null
    )
  },
})

const page = definePrimitive({
  type: "loom.page",
  description: "The page.",
  props: z.object({}),
  component: ({ children }: LoomPrimitiveProps) => createElement("main", null, children),
})

const registryOf = (...entries: readonly PrimitiveEntry[]): PrimitiveRegistry => {
  const registry = createPrimitiveRegistry(entries)
  if (!registry.ok) throw new Error(`registry refused: ${registry.error.code}`)

  return registry.value
}

const sources = (answer: readonly JsonValue[] = ELEVEN_OF_TWELVE): DataRegistry => {
  const entry: SourceEntry = defineSource({
    id: "catalogue.entries",
    description: "The entries this profile offers",
    params: z.object({}).passthrough(),
    answers: z.array(z.union([z.string(), z.record(z.string())])),
    adapter: { fetch: () => Promise.resolve(ok([...answer])) },
  })

  const registry = createDataRegistry([entry])
  if (!registry.ok) throw new Error(`source registry refused: ${registry.error.code}`)

  return registry.value
}

/** One bound node under a page, which is every tree in this lesson. */
const bound = (type: string, declared: unknown, props: object = {}): LoomTree => {
  const ids = sequentialIdFactory()
  const node = buildElement(ids, {
    type,
    props: { ...props, [DATA_PROP_KEY]: declared } as never,
    children: [buildText(ids, "")],
  })

  return createTree(buildElement(ids, { type: "loom.page", children: [node] }), ids)
}

const render = async (
  tree: LoomTree,
  resolver: PrimitiveRegistry,
  answer?: readonly JsonValue[]
) => {
  const data = await resolveTreeData(tree, { registry: sources(answer) })

  return renderLoomTree(tree, { resolver, validator: resolver, data })
}

const codes = (diagnostics: readonly { readonly code: string }[]): readonly string[] =>
  diagnostics.map((diagnostic) => diagnostic.code).sort()

/** Two bound nodes under one page, which is exercise A's tree and nothing else's. */
const twoBound = (first: unknown, second: unknown): LoomTree => {
  const ids = sequentialIdFactory()
  const one = buildElement(ids, {
    type: "loom.feed",
    props: { [DATA_PROP_KEY]: first } as never,
    children: [buildText(ids, "")],
  })
  const two = buildElement(ids, {
    type: "loom.feed",
    props: { [DATA_PROP_KEY]: second } as never,
    children: [buildText(ids, "")],
  })

  return createTree(buildElement(ids, { type: "loom.page", children: [one, two] }), ids)
}
```

### Exercise A — the three a walk can see, and the fourth beside them

```ts
describe("A", () => {
  it("asks two nodes every way a binding can be wrong", async () => {
    const tree = twoBound(
      { entries: { source: "catalogue.entries" }, extra: { source: "nowhere.at.all" } },
      { entries: { source: 12 } }
    )
    const rendered = await render(tree, registryOf(page, feed))

    for (const diagnostic of rendered.diagnostics) {
      console.log(`  ${diagnostic.code}`)
      console.log(`    ${describeRenderDiagnostic(diagnostic)}`)
    }
  })
})
```

```
  data-unavailable
    node n_2 binds "extra" to "nowhere.at.all" and it could not be answered — no source is registered for it — registered: catalogue.entries
  data-unread
    node n_2 binds "extra" and "loom.feed" does not read a binding of that name, so the answer was resolved and then read by nobody
  data-unshown
    node n_2 was answered 12 rows under "entries" and "loom.feed" showed 11 of them, so the rest arrived and were not drawn
  data-misdeclared
    node n_4 declares data that is not a map of binding names to sources, so it rendered with none — entries.source: Expected string, received number
```

Read the four sentences and ask, for each, *what did the walk have to know to say
this?* Three of them it worked out on its own, from the resolution and the
registry: a source that is not registered, a name nothing reads, a declaration
that is not a map. The third line it could not have produced from anything it
holds. `12` and `11` are both facts about a shape in a module the walk has never
read, and the only reason that line exists is that something told the walk.

Two details worth a second look. `n_2` and `n_4` are the two bound nodes and
neither is the page, which is lesson 04 arriving uninvited: the leaves were built
before their parents, and an id says nothing about position. And the three on
`n_2` are three true things about two mistakes, in the order you would fix them —
the unregistered source, then the fact that nobody reads it anyway.

### Exercise B — what the reader is told, and what the author is told

```ts
describe("B", () => {
  it("reports the shortfall, says nothing of an answer read whole, and draws the eleven either way", async () => {
    for (const [label, answer] of [
      ["twelve rows, the twelfth under a renamed column", ELEVEN_OF_TWELVE],
      ["two rows, both readable", ["One", "Two"]],
    ] as const) {
      const tree = bound("loom.feed", { entries: { source: "catalogue.entries" } })
      const rendered = await render(tree, registryOf(page, feed), answer)
      const markup = renderToStaticMarkup(rendered.element)

      console.log(`  ${label}`)
      console.log(`    diagnostics: ${codes(rendered.diagnostics).join(", ") || "(none)"}`)
      console.log(`    rows drawn: ${(markup.match(/<li>/g) ?? []).length}`)
      console.log(`    the page says something is missing: ${markup.includes("could not be shown")}`)
      console.log(`    the sentence it says it with: ${markup.match(/<p>([^<]*)<\/p>/)?.[1] ?? "(none)"}`)
    }
  })
})
```

```
  twelve rows, the twelfth under a renamed column
    diagnostics: data-unshown
    rows drawn: 11
    the page says something is missing: true
    the sentence it says it with: Some entries could not be shown.
  two rows, both readable
    diagnostics: (none)
    rows drawn: 2
    the page says something is missing: false
    the sentence it says it with: (none)
```

The two audiences, in four lines each. The reader gets a sentence with no figure
in it; the author gets a figure and no sentence. Both come from one function, run
once, and the second block is the part people skip: **an answer read whole
produces nothing at all.** Not a `0`, not an "all good" — nothing, because the
ordinary case is not news.

### Exercise C — when each of the two runs

This is Predict 2. The component here does what the rejected proposal would have
had it do — push its own count — and the declaration does what the record chose.
Both are counted.

```ts
/**
 * The proposal 0206 turned down, built so it can be watched: the component
 * pushes what it dropped into an array of its own, which is what a `report` on
 * the render context would have done.
 */
const pushed: string[] = []
const declared: string[] = []

const pushingFeed = definePrimitive({
  type: "loom.pushing-feed",
  description: "A feed that reports from its own render body.",
  props: z.object({}),
  reads: ["entries"],
  unshown: (props, data) => {
    declared.push("the walk asked")

    return [readingOf(props, data)]
  },
  component: ({ loom }: LoomPrimitiveProps) => {
    const given = answerAt(loom.data, "entries")
    const shown = rowsIn(given)

    if (shown.length < given.length) pushed.push(`${shown.length} of ${given.length}`)

    return createElement("ul", null, shown.map((row) => createElement("li", { key: row }, row)))
  },
})

describe("C", () => {
  it("asks when each of the two runs, relative to the array the caller reads", async () => {
    pushed.length = 0
    declared.length = 0

    const tree = bound("loom.pushing-feed", { entries: { source: "catalogue.entries" } })
    const rendered = await render(tree, registryOf(page, pushingFeed))

    console.log("  the moment renderLoomTree returns, which is where every caller reads diagnostics")
    console.log(`    diagnostics: ${codes(rendered.diagnostics).join(", ") || "(none)"}`)
    console.log(`    times the walk called the declaration: ${declared.length}`)
    console.log(`    times the component pushed: ${pushed.length}`)

    renderToStaticMarkup(rendered.element)

    console.log("  after somebody renders the element")
    console.log(`    diagnostics: ${codes(rendered.diagnostics).join(", ") || "(none)"}`)
    console.log(`    times the walk called the declaration: ${declared.length}`)
    console.log(`    times the component pushed: ${pushed.length}`)
    console.log(`    what it pushed: ${pushed.join(", ") || "(nothing)"}`)
  })
})
```

```
  the moment renderLoomTree returns, which is where every caller reads diagnostics
    diagnostics: data-unshown
    times the walk called the declaration: 1
    times the component pushed: 0
  after somebody renders the element
    diagnostics: data-unshown
    times the walk called the declaration: 1
    times the component pushed: 1
    what it pushed: 11 of 12
```

**`times the component pushed: 0`** is the whole argument, and it is one line.

The component's count is correct. It is `11 of 12`, it is computed by the party
that knows, and it arrives *after* the moment at which every caller in this
repository has already read the diagnostics array and moved on. A `report` on the
render context would have been that line, writing into an array somebody had
finished with — and it would have passed every test anybody thought to write for
it, because a test renders the element.

The declaration's `1` is in the first block, which is to say: before the return.

### Exercise D — how many times, and whether at all

```ts
describe("D", () => {
  it("counts the two again, for a walk whose element is rendered twice and a walk whose element is never rendered", async () => {
    for (const [label, renders] of [
      ["rendered twice — a page and an image of the same walk", 2],
      ["never rendered — a caller that read the diagnostics and stopped", 0],
    ] as const) {
      pushed.length = 0
      declared.length = 0

      const tree = bound("loom.pushing-feed", { entries: { source: "catalogue.entries" } })
      const rendered = await render(tree, registryOf(page, pushingFeed))
      for (let pass = 0; pass < renders; pass += 1) renderToStaticMarkup(rendered.element)

      console.log(`  ${label}`)
      console.log(`    declaration calls: ${declared.length}`)
      console.log(`    component pushes: ${pushed.length}`)
      console.log(`    data-unshown diagnostics: ${codes(rendered.diagnostics).filter((code) => code === "data-unshown").length}`)
    }
  })
})
```

```
  rendered twice — a page and an image of the same walk
    declaration calls: 1
    component pushes: 2
    data-unshown diagnostics: 1
  never rendered — a caller that read the diagnostics and stopped
    declaration calls: 1
    component pushes: 0
    data-unshown diagnostics: 1
```

One walk, two renders, **two pushes and one diagnostic.** And one walk, no
renders, no pushes and one diagnostic. The component's count is a function of how
many times somebody rendered; the declaration's is a function of how many times
the tree was walked, which is once, which is the number the author asked about.

This is the second of the three reasons, with `StrictMode` left out on purpose:
nothing here is in development mode and nothing is in a browser, and the count
still doubles — because *rendering an element twice* is an ordinary thing to do to
a description of a page. A page and a social image. A server render and a
hydration. The framework's own double-invoke would be a third occasion, not the
only one.

### Exercise E — four declarations that cannot be believed

```ts
/** A primitive whose declaration is wrong in exactly one way. */
const declaring = (type: string, unshown: UnshownDeclaration): PrimitiveEntry =>
  definePrimitive({
    type,
    description: "A feed whose declaration cannot be believed.",
    props: z.object({}),
    reads: ["entries"],
    unshown,
    component: () => createElement("ul", null, createElement("li", null, "drawn anyway")),
  })

describe("E", () => {
  it("hands the walk four declarations that cannot be believed", async () => {
    const wrong: readonly [string, UnshownDeclaration][] = [
      [
        "loom.thrower",
        () => {
          throw new Error("read the rows wrong")
        },
      ],
      ["loom.thirteen", () => [{ name: "entries", given: 12, shown: 13 }]],
      ["loom.nothing", (() => undefined) as unknown as UnshownDeclaration],
      [
        "loom.one-good-one-bad",
        () => [
          { name: "entries", given: 12, shown: 11 },
          { name: "extra", given: 1, shown: 2 },
        ],
      ],
    ]

    for (const [type, unshown] of wrong) {
      const tree = bound(type, { entries: { source: "catalogue.entries" } })
      const rendered = await render(tree, registryOf(page, declaring(type, unshown)))
      const markup = renderToStaticMarkup(rendered.element)

      console.log(`  ${type}`)
      console.log(`    diagnostics: ${codes(rendered.diagnostics).join(", ")}`)
      console.log(`    ${describeRenderDiagnostic(rendered.diagnostics[0] as never)}`)
      console.log(`    the node still rendered: ${markup.includes("drawn anyway")}`)
    }
  })
})
```

```
  loom.thrower
    diagnostics: unshown-unreadable
    node n_2 is drawn by "loom.thrower", which says what it could not show and could not be believed, so nothing was reported of what it dropped — the declaration threw — read the rows wrong
    the node still rendered: true
  loom.thirteen
    diagnostics: unshown-unreadable
    node n_2 is drawn by "loom.thirteen", which says what it could not show and could not be believed, so nothing was reported of what it dropped — the declaration returned a reading that cannot describe an answer — reading 0 ("entries") showed 13 of 12 rows
    the node still rendered: true
  loom.nothing
    diagnostics: unshown-unreadable
    node n_2 is drawn by "loom.nothing", which says what it could not show and could not be believed, so nothing was reported of what it dropped — the declaration returned a reading that cannot describe an answer — the declaration returned no readings at all
    the node still rendered: true
  loom.one-good-one-bad
    diagnostics: unshown-unreadable
    node n_2 is drawn by "loom.one-good-one-bad", which says what it could not show and could not be believed, so nothing was reported of what it dropped — the declaration returned a reading that cannot describe an answer — reading 1 ("extra") showed 2 of 1 rows
    the node still rendered: true
```

Four faults, four diagnostics, four pages that rendered. `the node still
rendered: true` on every row is lesson 14's *total* being kept under pressure
that lesson never imagined: the pressure is not a node the renderer cannot
resolve, it is a **third party's code**, inside the walk, free to throw.

The fourth row is the one to sit with, and it is Predict 4 answered out loud. The
first of its two readings — `entries 11 of 12` — is perfectly good, perfectly
believable, and **is not reported**. The sentence names the second reading as the
reason. A primitive that miscounted one answer has not earned belief about the
others, and a log containing one of two readings looks exactly like a log
containing both.

The third row is the cheap one that matters most in practice: a declaration that
returns `undefined`. The type says it returns an array. The type is a promise
between this package and a compiler, and a host's JavaScript was never party to
it.

### Exercise F — who decides what is worth saying

```ts
describe("F", () => {
  it("asks what the primitive said and what the runtime passes on", () => {
    const said = [
      { name: "footnotes", given: 4, shown: 4 },
      { name: "entries", given: 12, shown: 11 },
      { name: "authors", given: 3, shown: 1 },
    ]
    const believed = readUnshown(() => said, {}, NO_DATA)

    console.log(`  the primitive reported: ${said.map((reading) => `${reading.name} ${reading.shown}/${reading.given}`).join(", ")}`)
    console.log(`  believed: ${believed.ok}`)
    console.log(`  the runtime passes on: ${unshownRows(believed.ok ? believed.value : []).map((reading) => `${reading.name} ${reading.shown}/${reading.given}`).join(", ")}`)
    console.log(`  the declaration's own array is still in its own order: ${said.map((reading) => reading.name).join(", ")}`)
  })
})
```

```
  the primitive reported: footnotes 4/4, entries 11/12, authors 1/3
  believed: true
  the runtime passes on: authors 1/3, entries 11/12
  the declaration's own array is still in its own order: footnotes, entries, authors
```

Three readings in, two out, in a different order. The primitive was not asked to
suppress `footnotes 4/4` and it did not; the runtime dropped it, because *this
answer was read whole* is the ordinary case and the walk owns the question of what
is worth a line in a log.

The last row is not padding. `unshownRows` sorts, and sorting a caller's array in
place would have reordered a value that belongs to somebody else's declaration —
a function that was handed a list and mutated it. It filters first, which copies,
and the sort never reaches the original. Worth noticing because the lesson's whole
subject is a function from another author: the guard runs in both directions, and
*do not scribble on the argument* is the half nobody writes a decision record
about.

### Exercise G — the lie nothing catches, and who has signed up

```ts
/** The same component twice, with two ways of arriving at a count. */
const honest = definePrimitive({
  type: "loom.honest",
  description: "A feed whose declaration is the function its component calls.",
  props: z.object({}),
  reads: ["entries"],
  unshown: (props, data) => [readingOf(props, data)],
  component: ({ loom }: LoomPrimitiveProps) =>
    createElement(
      "ul",
      null,
      rowsIn(answerAt(loom.data, "entries")).map((row) => createElement("li", { key: row }, row))
    ),
})

const confident = definePrimitive({
  type: "loom.confident",
  description: "A feed whose author wrote the count down beside the code.",
  props: z.object({}),
  reads: ["entries"],
  unshown: (_props, data) => [{ name: "entries", given: answerAt(data, "entries").length, shown: answerAt(data, "entries").length }],
  component: ({ loom }: LoomPrimitiveProps) =>
    createElement(
      "ul",
      null,
      rowsIn(answerAt(loom.data, "entries")).map((row) => createElement("li", { key: row }, row))
    ),
})

describe("G", () => {
  it("asks each of two declarations what it drew, and counts who has made the claim at all", async () => {
    for (const entry of [honest, confident]) {
      const tree = bound(entry.type, { entries: { source: "catalogue.entries" } })
      const rendered = await render(tree, registryOf(page, entry))
      const markup = renderToStaticMarkup(rendered.element)
      const reported = rendered.diagnostics.filter((diagnostic) => diagnostic.code === "data-unshown")

      console.log(`  ${entry.type}`)
      console.log(`    rows on the page: ${(markup.match(/<li>/g) ?? []).length}`)
      console.log(`    what it told the walk: ${reported.map((diagnostic) => `${(diagnostic as { shown: number }).shown} of ${(diagnostic as { given: number }).given}`).join(", ") || "nothing"}`)
    }

    const starter = createStarterPrimitiveRegistry()
    if (!starter.ok) throw new Error("the starter registry refused")

    const library = starter.value.primitives
    const reading = library.filter((entry) => starter.value.bindingsReadBy(entry.type) !== undefined)
    const declaringUnshown = library.filter((entry) => starter.value.unshownBy(entry.type) !== undefined)

    console.log(`  primitives that read a binding: ${reading.map((entry) => entry.type).join(", ")}`)
    console.log(`  primitives that declare what they could not show: ${declaringUnshown.map((entry) => entry.type).join(", ") || "(none)"}`)
    console.log(`  what the registry answers for loom.feed: ${typeof starter.value.unshownBy("loom.feed" as never)}`)
  })
})
```

```
  loom.honest
    rows on the page: 11
    what it told the walk: 11 of 12
  loom.confident
    rows on the page: 11
    what it told the walk: nothing
```

<!-- moves: when Loom primitives gives loom.feed the `unshown` declaration 0206
     names, which this lesson filed for that lane. These three lines read the
     starter registry at run time rather than printing a number this lane typed,
     so their red is this lesson's claim following the code. Re-run G and paste
     in what it prints; the prose below already says "on the day this lesson was
     written". They are a fence of their own so that the six lines above — which
     are two components answering, and move for nobody — are not covered by this
     mark. -->

```
  primitives that read a binding: loom.trend, loom.tally, loom.voices, loom.feed, loom.plate
  primitives that declare what they could not show: loom.trend, loom.tally, loom.voices, loom.feed, loom.plate
  what the registry answers for loom.feed: function
```

Two components that draw the identical page. One of them tells the walk `11 of
12` and the other tells it **nothing**, and the second one is not lying on
purpose: its declaration counts the answer, which is twelve, twice. It is the
version somebody writes when they are declaring a fact *about* their component
rather than handing over the computation inside it, and it is believable, silent,
and wrong.

The only difference between the two is which function the declaration is. That is
the whole of the defence, it cannot be enforced, and saying so is better than
implying a guarantee that is not there.

Then the last three lines, which are the state of play rather than a conclusion —
and the state of play has moved since this lesson was written, which is what the
mark above the fence was for.

On the day it was written, two primitives in the starter library read a binding
and neither had declared a shortfall, so the third line printed `undefined`: the
registry being exactly honest — not *this primitive shows everything it is
given*, which would be a claim, but **nobody has said**. That distinction is the
point of the line and it survives the change; what it now answers is the other
state.

Today five primitives read a binding and all five declare. `loom.feed` was given
the declaration 0206 named, and the four twins 0233 added arrived with one, so
the registry answers `function` where it answered `undefined`. Note what the
third line prints and what it does not: `typeof`, because the thing behind that
name is the primitive's own reading function and printing it would put a copy of
`loom.feed`'s bookkeeping in this transcript — a second copy of exactly the kind
lesson 28 costs, and one that would go red on any edit to a primitive this lesson
is not about.

The reading in the second line is worth one more sentence, because the five are
not alike. A tally and a plate read **one** thing — a figure is read or it is
not, a picture is drawn or it is not, so there is no partial and their
declarations report `1` of `1` or `1` of `0`. A feed, a trend and a wall of
voices read a **list**, and a list is where *eleven of twelve* lives. Both are
legitimate readings of `UnshownReading`, and that they are the same shape is why
one diagnostic covers both.

---

## It could have been otherwise

**A `report` function on the render context.** The finding's own proposal, five
lines, and the reason this lesson exists. Rejected for three reasons in a
deliberate order: the component body runs after the walk returned, React decides
how many times, and reporting in render is a side effect in render. Only the first
would survive a change of framework, and the first is enough on its own.

**A data declaration.** `skipsRows: true`, or a number beside the component.
Rejected because it is not data: *how many rows survived a shape* is the primitive
reading an answer, and the only data form of it is a value somebody keeps true by
hand, which lesson 28 has already costed.

**One count instead of two.** Report the difference — `1` — and save a field.
Rejected because *one of twelve* and *one of two* are two different mornings for
the person reading it, and the sentence the author needs is a ratio.

**The rows themselves rather than the counts.** Tempting, because the author would
love to see which row failed. Rejected on the line `data-unavailable` already
holds: a diagnostic is logged, a row is the host's data, and a library that puts
one inside the other has made a decision about somebody else's customers.

**Clamp an impossible reading.** Turn thirteen of twelve into twelve of twelve and
carry on. Rejected because a repaired diagnostic sends its reader after a defect
that is not there — and the defect that *is* there, in the primitive's
bookkeeping, has been hidden by the repair.

**Drop the bad reading and keep the good ones.** Predict 4's other answer.
Rejected on two grounds: a declaration that miscounted one answer has not earned
belief about the others, and a partial report is indistinguishable from a complete
one once it is in a log.

**Report every reading, including the whole ones.** It would make the seam
symmetrical and the logs useless: one line per bound region per page. Rejected,
and placed in the runtime rather than asked of each author, because a rule
ninety-nine authors implement separately is a rule that holds ninety-eight times.

**Put the count on the page.** The simplest answer, and the one 0175 already
refused: a count in a sentence is a plural, and the library cannot form one in
every language it is served in. The reader gets the fact; the figure goes to the
one person who can act on it.

**Make the declaration required.** Then every one of the library's primitives
would have to answer a question most of them have no answer to, and absence —
which is honest — would become `[]`, which is a claim. The bargain `reads` struck
is the one struck here: saying nothing is not saying none.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections while
you write. Then compare.

1. **A colleague says: "you have overthought this. Give the component a logger
   and move on. Every framework lets you log from a render function."**

   They are right that every framework lets you. Answer them in a form that
   mentions neither React nor Loom: say what property a *report* needs that a
   *log line* does not, name the two things about when a render function runs that
   break it, and then say which of your two reasons would still hold in a system
   with no component model in it at all.

2. **Derive this lesson from lesson 14 and lesson 29, without looking at either.**

   Lesson 14 gave you the renderer as a total, pure projection of the tree — and,
   if you were reading carefully, the fact that what it returns is a *description*
   of a page rather than a page. Lesson 29 gave you a fact invisible in output and
   the remedy it reached: to observe a read, instrument the place the read
   happens.

   Starting from those two and nothing else, derive why lesson 29's remedy is
   unavailable here, and then derive what is left. The second half is the part
   that transfers: say it as a rule about parties and timing, with no primitives
   in it.

Predict, before writing (2): the step most people skip is that lesson 29's remedy
and this one look like opposites and are the same move made at different times —
both end up calling a function at a moment of the runtime's choosing rather than
watching for something to happen. What differs is whether the place the fact is
made is *inside* the window the runtime controls.

---

## Self-check

Seven questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. State the general rule this seam is an instance of, in a sentence with no
   components, no rendering and no diagnostics in it — it should be about what you
   do when the only party that knows a fact runs at the wrong time. Then give one
   example from outside Loom.
2. The ways a binding can be wrong divide into the ones a walk can see from
   outside the primitive that reads it and the one it cannot. Say what makes the
   second kind different, and make your answer about *where a shape lives* rather
   than about what the shape is.
3. The reader is told without a count and the author is told the count. Give the
   reason the page carries no figure, and then say why the same fact is worth a
   diagnostic when it is not worth a number on screen.
4. Eight declarations on a primitive are data and one is a function. State the
   question that decides which, and then apply it to something that is *not* in
   this lesson: a primitive that wants to declare how long its content takes to
   read.
5. The declaration is handed the node's props and the node's answers, and
   deliberately nothing more. Give the reason, and then say what would be lost by
   handing it the resolved tree as well. Your answer should not be about
   performance.
6. A declaration returns three readings and the second is impossible. Say what
   happens to the other two and give both halves of the argument. Then say what
   happens to the *page*, and say which of this course's promises that answer is
   keeping.
7. A declaration that returns `{ given: 12, shown: 12 }` for a component that drew
   eleven is silent and believable. Say what makes it unlikely in practice, say
   why that cannot be enforced, and then name the other declarations on a
   primitive that carry the same exposure.

Question 1 is the one the rest of the lesson exists to support. Question 4 is
where a confident wrong answer is most likely, because reading time *sounds* like
a computation and is a property of content the primitive did not author.

---

## Reflect

Write for two minutes, then move on.

- Predict 1. Almost every first answer is some version of *the component reports
  it*. If that is what you wrote, do not cross it out — write next to it what you
  assumed about when a component runs, because the assumption is the interesting
  part and it is one most working front-end code quietly relies on.
- Predict 2 and your confidence. If you wrote *the caller sees one diagnostic*
  with a 4 or a 5, that is the most useful wrong answer in this lesson. What to
  write down is not the right answer but the thing you did not ask: *has the
  component run yet?*
- Predict 3. If your answer to the second half was about efficiency or about
  encapsulation, look again. The reason to hand the declaration exactly what the
  component gets is that it lets the declaration **be** the same function, and
  nothing else in this design is load-bearing in the same way.
- Predict 4. If you wanted to keep the two good readings, write down what you
  would have done on the morning you found a log with one reading in it, believing
  it was all of them.
- Now go and look at your own work. Find a fact that only one component, handler,
  query or job knows, and that nothing downstream can derive. Write down when that
  party runs relative to the thing that would collect the fact. If the answer is
  "after", you have this seam, and the question to ask is not *how do I get it out*
  but *what function could somebody else call earlier?*
- Last, the general version. Find a place in your own work where you asked someone
  — another team, a plugin author, a client — to *declare a fact* that is really a
  computation over inputs they hold. Write down how long it has been true, and how
  you would know.

---

## Come back to this

Set AL in [`review-schedule.md`](review-schedule.md), two days after this lesson.
Interleaved with 14, 18, 28, 29 and 32 — heavy on 14, because *what a renderer
returns is a description and not a page* is the sentence this whole lesson is
built on and the one most readers have filed under something else; and on 28,
because the construction that keeps this honest is that lesson's cheapest second
copy, which is no second copy at all.

Part V has sixteen seams now, and this is the first where the fact is owned,
whole, by a single party inside the system — who also knows it, computes it
correctly, and cannot be the one to report it. Lesson 32 said that a seam whose
inputs are all owned is a check waiting to be written. That turns out to be true
only if the owner is awake when you need the answer, and the owner here is a
component body: it runs after the array its report would go into has been read,
as many times as somebody renders, and sometimes not at all.

So the remedy is the seventh, and it is a handover rather than a reach: **take the
function, not the report.** Everything good about it follows from the direction of
that handover. Called once, because the walk calls it. Called in time, because the
walk has not returned. No side effect in render, because it is not in render. And
the count cannot disagree with the page, because the declaration can be the
function the component already calls — which is an invitation the design can
extend and cannot enforce, so the one thing this seam cannot catch is an author
who declines it.

The question to carry into a seventeenth seam is neither lesson 31's nor lesson
32's. It is the one Predict 2 asks and most first answers never get to: **when
does the party that knows this run, relative to the moment somebody needs to be
told?** A fact nobody owns needs an instrument. A fact one party owns and knows
early needs a declaration. A fact one party owns and knows **too late** needs
somebody to come and ask for it — and if nothing in your system is in a position
to ask, the fact is already being lost, quietly, by code that looks correct.
