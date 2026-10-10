# 29 — Readership: the declaration with more than one reader

**After this lesson you will be able to** say what a primitive's props schema
promises and to whom, and name the parties that read it besides the component;
explain why the registry can compare four of a primitive's declarations against
its schema and cannot compare the schema against the component; say what property
an unplaced slot has that an unread prop does not, and what follows for any check
built on watching output; describe how to make a read observable and what changes
about the checker when you do; read a sweep that finds seven suspects and say, for
each, whether it is a defect, a limit of the measurement, or correct by design;
and — the half this lesson is really for — say why *the component does not read
this prop* was the wrong question, and what the right one is.

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
[26](26-liveness.md), [27](27-scale.md), [28](28-corroboration.md).

Lesson 28 ended on a rule and an instruction. The rule: **a check is a
comparison, and a unique thing has nothing to be compared to.** The instruction
that follows from it is to go looking for facts this repository already writes
down *twice* and has never compared — because those are the cheap ones, the ones
where the second copy is already sitting there and all that is missing is the
comparison.

Here is one. A primitive declares what props it accepts. Its component then reads
some props out of a bag. Those are two statements of one fact, in one file,
usually thirty lines apart.

Nothing in Loom compares them.

That sounds like an oversight, and the first half of this lesson is about why it
is not one. The second half is about what happens when you write the comparison
anyway — which this lesson did, and the answer it gave was eighteen rows, not one of
which was the thing it was looking for.

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Write something for all
five before you look anything up.

1. A primitive makes a promise in two halves, and the two halves are checked by
   different things at different times. Name both halves, name what checks each,
   and say which of the two can only be checked by *calling* the component.
   *(15)*
2. *Is every member of this union handled* sounds like one claim and is three.
   Name all three, say which one the compiler answers, and say what the other two
   need instead of a compiler. *(25)*
3. A reading hands back three fields where a simpler design would have had two.
   Say what the third one is for, and give the test for whether two failures
   deserve one field or two. *(24)*
4. `loom.embed` declares `frames: ["src"]` rather than `frames: true`. Give the
   reason it is a list of prop names — the answer is a sentence about JSON, not
   about security — and then say what the runtime does with that list. *(20)*
5. The model is never shown the AST. Say what it is shown instead, and then say
   where the description of a primitive's props in that projection comes from.
   *(12)*

Question 1 is the one this lesson is built on top of. Question 5 is the one most
likely to come back half-answered: *the catalogue* is the name of the thing, not
an answer to where the props in it come from.

---

## Predict

**In writing, before reading on.** Four questions. Question 3 is the one to rate
your confidence on.

1. Three primitive registrations, differing only in their component:

   ```ts
   const props = z.object({ tone: z.enum(["accent", "neutral"]).optional() }).strict()

   // (a) reads the prop it declares
   component: ({ props: given }) => createElement("span", null, given.tone)

   // (b) declares the prop and reads nothing
   component: () => createElement("span", null, "quiet")

   // (c) reads a prop it does not declare
   component: ({ props: given }) => createElement("span", null, given.colour)
   ```

   For each of (a), (b) and (c), say what happens at each of three moments: the
   typecheck, `createPrimitiveRegistry`, and the first render in production.
   **Nine cells.** Fill all nine before reading on.

2. `auditRegistry` calls every registered component and reports, among other
   things, `unplacedSlots` — a primitive that declared a region and then did not
   render it — and `unplacedBehaviours`, the same for a control it asked the
   runtime for. Both are described in the source as *a promise the registration
   made and the component did not keep.*

   A props schema is also a promise the registration made. Write down **why the
   audit cannot report an unkept one** — and make your answer about a property
   that slots and behaviours have and props do not, rather than about effort.

3. Suppose you build the check anyway: call every component in the starter
   library, under every configuration the audit already probes, and record which
   prop names it actually reaches for.

   Across the whole library, **how many declared props does no component ever
   read?** Write a number. Then name the primitives you would bet on, and for
   each one write what you would *do* about it. **Rate your confidence 1–5.**

4. You now have an instrument that can see a prop being read. Write down the
   assertion you would add to the suite — the sentence a failure would print —
   and then write down what a red build from it would actually mean. Is it a
   defect in the primitive, a defect in the check, or neither?

Do not read on until all four are written. Question 1 is the one where the
pattern in the nine cells matters more than any single cell, and question 4 is
the one that looks like housekeeping and is the whole second half of this lesson.

---

## The problem

Every earlier Part V seam was a fact somebody could not reach. Out of scope; in
another store; undeclared; one level down behind a promise; unique, so with
nothing to compare against.

This one is two copies of a fact, both inside one file, both inside one package,
both readable by any program that cares to look — and the comparison still does
not exist. Working out why is more interesting than writing it, and writing it
turns out to be the easy part.

### What a props schema promises, and to whom

`definePrimitive` takes a `props` schema and it is not optional. The reason is in
its own doc comment, and it is about the model rather than about types:

> `props` — the schema the render seam enforces (0009). Required, with no
> "unvalidated" option: props in a tree are AI-authored, and a primitive that
> declines to say what it accepts is asking the deployment to trust a model's
> guess about its own internals.

So the schema is a declaration made to a **deployment** about what an
AI-authored tree may say. And once you put it that way, the interesting question
is not *does the component read it* but *who is reading it at all* — because the
answers pile up fast:

- **The render seam** validates a node's props against it before the component is
  called, which is what makes a tree gateable rather than hopeful (0009).
- **The catalogue** projects its field names, so the interpreter can tell a model
  what it may write (0013, and 0004 for what kind of thing a projection is;
  lesson 12). A prop the schema declares is a prop the
  model is *invited* to set.
- **The portal** reads the same catalogue to build an insert menu.
- **Telemetry** records what was available at the moment a proposal was made, so
  a later reading of a disposition knows which vocabulary the model had.
- **Four other declarations on the same registration** name props by string, and
  the registry holds each one against the schema.
- **And the component**, which is the only one of these that renders anything.

Six readers. The component is the last of them and it is the one nothing checks.

And there is a seventh thing worth noticing, which is not a reader but a claim.
[0009](../decisions/0009-primitives-receive-props-in-a-bag.md) — the record that
decided props arrive in a bag rather than spread — states the invariant this
lesson is about, in one clause, in its Decision section:

> A primitive reads what it declares out of the bag; nothing else can be smuggled
> past it.

Both halves of that sentence are claims. The second half is enforced: the bag is
validated against the schema before the component sees it, and every schema in the
starter library is closed with `.strict()`, so a prop nobody declared is refused
rather than passed through. The first half — *a primitive reads what it declares* — is
enforced by nothing, and it has been sitting in an `Accepted` record since 29 July.
It is a sentence with a second copy available thirty lines away from every
primitive in the library, which is exactly the specimen lesson 28 sent you looking
for.

### What the registry already compares

This is the part that makes the gap conspicuous rather than obvious. The registry
*is* in the business of comparing declarations against the schema. It does it four
times:

| Declaration | Names | Refused when |
| --- | --- | --- |
| `interactive: { whenProps }` | the props that make this a target | a named prop is not declared |
| `frames` | the props whose values reach an `iframe` | a named prop is not declared |
| `copy` | the props a reader reads as words | a named prop is not declared |
| `reads: [{ fromProp }]` | the prop that gives a binding name | a named prop is not declared |

Each refusal has a written reason and each reason is the same shape. `frames`:

> the seam would then check nothing and the frame would render whatever the tree
> said

`copy`:

> a preview built on that declaration would report a word the page never shows,
> and go on reporting it after the prop was renamed

`reads`:

> that prop can never arrive, so the primitive would read its default for ever
> and go on doing so after the prop it names was renamed

Read those three together and the pattern is explicit: **the drift the registry is
defending against is a prop renamed and a declaration left pointing at nothing.**
It is the same drift in all three cases and it is refused in all three. The
component is the one place where a prop name is written a second time and *not*
held to the schema — and it is the place where a rename is most likely to happen,
because renaming a prop means editing the component.

### What the audit already catches, and the one property it needs

`createPrimitiveRegistry` never calls a component; that is 0012, and the reason is
in the file — registering something should not run somebody's render as a side
effect of an import. The checks that need to call a component live in
`auditRegistry`, which a host runs in a test or a build step.

And the audit is thorough. It calls every component under every configuration its
own schema closes over (0075), in every answer state its registrant supplied
(0185), and it reports:

- a primitive that ignores `loom.editable`, so the portal cannot see it;
- a primitive that declared a **slot** and dropped it;
- a primitive that took a **behaviour** from the runtime and did not place its
  control;
- a primitive that declared `submits` and placed no address, or placed one
  without declaring;
- a primitive that **threw** under props its own schema accepts.

Two of those are described in `audit.ts` in exactly the words this lesson needs.
`unplacedSlots` and `unplacedBehaviours` are each *a promise the registration made
and the component did not keep* — and the comment on the second one goes one step
further and stops one step short:

> Like `unplacedSlots` this is a promise the registration made and the component
> did not keep — and unlike a slot, nothing else on the page hints that something
> is missing, because the content a behaviour acts on renders perfectly without
> it.

That sentence is ranking two broken promises by **how visible the breakage is**.
A dropped slot loses content, which a reader might notice. A dropped behaviour
loses a control beside content that renders perfectly, which a reader will not.
The axis is already in the file. Take it one notch further and you arrive at this
lesson: an unread prop loses *nothing*. The page renders, the content is all
there, the control is all there, and what is missing is a thing that was never
going to appear.

So here is the property, and it is the answer to Predict 2. Every promise the
audit can check is one whose keeping **shows up in what the component returned**.
A placed slot is a marker in the returned tree. A placed control is a marker in
the returned tree. A thrown exception is not a tree at all. The audit is a
function of the component's *output*, and reading a prop produces no output. A
component that reads `tone` and one that ignores it can return byte-identical
markup — in fact for most props, under most values, they will.

**A checker that watches output can only see a declaration kept when keeping it
changes the output.** That is not a gap in the audit. It is the boundary of what
its instrument measures.

---

## The idea

### Stop watching the output; watch the act

If the fact you want is *did this function read this key*, then the place it
exists is the read itself, and the read is an operation on an object. JavaScript
lets you stand in front of that operation:

```ts
const watched = new Proxy({ ...props }, {
  get: (target, key) => {
    if (typeof key === "string") seen.add(key)

    return Reflect.get(target, key)
  },
})
```

Hand the component `watched` instead of `props` and the set `seen` is the answer.
Nothing about the render changes: `Reflect.get` returns exactly what a plain
property access would have returned, so the component draws what it would have
drawn.

This is worth pausing on, because the move is more general than the trick. Every
Part V seam so far ended with one of two remedies: *reach further* (resolve
something before the walk, pass a second store, hand the work to a different
machine) or *arrange for a second copy* (derive it, write it twice, register it).
This one is neither. The second copy already exists and nothing needs reaching.
What was missing was that one of the two copies was not **observable** — and
making it observable is a third kind of remedy, which is to instrument a place
rather than to move a fact.

It is also the cheapest of the three sources lesson 28 ranks. Nobody declares
anything, nobody maintains a list, and the comparison derives itself from the
component. Lesson 28's argument for preferring derivation was that its obligation
is discharged by a program rather than by somebody remembering; that holds here
exactly.

### What it found

Exercise C runs it over the whole starter library. Beside it, for contrast, the
three things the audit already checks:

```text
  declared slots no component placed:      4
  declared behaviours no component placed: 0
  components that threw under their own schema: 0
  primitives with a declared prop nothing read: 10
    loom.menu        label
    loom.dialog      label
    loom.trend       max, plot, prefix, suffix
    loom.tally       prefix, suffix
    loom.voices      columns, density
    loom.recording   shape
    loom.brand       viewBox
    loom.feed        density, meta, separators
    loom.plate       decorative, fit
    loom.embed       src
```

Every promise the audit can observe is kept — with one line's worth of
asterisk, added on 9 October and explained below. The first promise it cannot
observe has eighteen exceptions.

> **Why the first line is 4 and not 0, since 9 October.** It is not four broken
> primitives. `loom.feed`, `loom.trend`, `loom.voices` and `loom.plate` each
> declare a region they draw **only when their source did not answer**
> ([0246](../decisions/0246-a-bound-primitives-failure-region-is-a-slot-over-its-declared-sentence.md)),
> and the audit above is called the way this exercise calls it — with no
> answers. So the probe never puts them in the state that renders the region,
> and reports a declaration it did not see rendered. The report is true about
> the states it tried and wrong about the primitives, which is the distinction
> the whole of this lesson is about, arriving in the one list that had been the
> control. Hand `auditRegistry` the `answers` 0185 added and the line is 0
> again; `src/primitives/library.test.ts` does exactly that, and asserts both
> the 0 and this 4.
>
> *This note was written by `Loom primitives` to keep the transcript true, not
> by this lesson's author. The teaching above it is unrevised and the move
> deserves better than a footnote — filed.*

If you are holding a number from Predict 3, this is the moment to compare it. But
the number is the least interesting thing here, and the rows are why. **Read them
before reading on and decide, for each, what you would do.** Seven of these ten
primitives are in the same situation as each other and it is not the situation the
sweep was looking for.

### Seventeen of the eighteen are the measurement, not the code

`loom.feed` draws a list of entries read from a data binding. Its component starts
like this:

```ts
const reading = readAnswer(loom.data[given.binding ?? DEFAULT_BINDING])
```

and then branches. With no answer, `readAnswer` returns `{ kind: "empty" }` and
the component draws its empty region and returns. `density`, `separators` and
`meta` are all read further down, in the branch that draws entries — which no
probe reaches, because a probe supplies no data.

`loom.tally` is the same shape one size smaller: `prefix` and `suffix` are read
only in the arm where a figure arrived.

Exercise D supplies an answer to each and both lists go empty. Nothing was wrong
with either primitive; what was wrong was the population the check ran over.

That is **lesson 25's rule, for the third time in five lessons**: a check is
bounded by the population of values that pass through the place it runs. Lesson 25
found it in a scale that could not place a level. Lesson 28 found it in prose,
where the population was a decision about syntax. Here the population is *states a
component can be called in*, and the states the probe can derive are exactly the
ones the registration closes over. An answer is not one of them, and 0185 says why
in a sentence worth having twice:

> the probe would have to invent a value, and an invented answer is either one the
> primitive happens to be able to draw — in which case the probe is measuring the
> guess — or one it cannot, in which case every bound primitive reports its failure
> region as the only one it places.

`loom.recording` is the sharpest of them, and it is the one to read twice,
because it defeats the obvious fix. Its `shape` prop is a closed enum, so the
probe *does* set it — `{ shape: "wide" }`, `{ shape: "square" }`, and so on, one
render each. And the component still never reads it:

```ts
const framed = given.artwork !== undefined || playable
const marked = framed && given.artwork === undefined
// ...
...(marked ? { blockSize: "4.75rem" } : { aspectRatio: SHAPES[given.shape ?? "wide"] }),
```

`shape` is read only when there is artwork to shape. `artwork` is a URL — an open
string, not a closed set — so the probe has no value for it and cannot make one up
for the same reason it cannot make up an answer. **Probing a prop's own values does
not make that prop read.** Exercise E supplies one artwork URL and the row
disappears.

`loom.brand` is the same shape arriving from outside this lesson, which is the
useful thing about it. It was registered on 28 September, after this transcript was
first written, and it joined the set on its first run:

```ts
given.mark === undefined
  ? null
  : createElement("svg", { viewBox: given.viewBox ?? DEFAULT_VIEW_BOX, /* … */ })
```

`viewBox` is the field a mark is drawn in, so it is read only where there is a mark
to draw. `mark` is SVG path data — an open string the probe cannot invent, for the
third time on this page — so every probe takes the `null` arm and the read never
happens. Nothing about the primitive is wrong: it is `loom.recording` with
`artwork` spelled `mark`, written by somebody who had not read this lesson, which
is the nearest thing to evidence available that the pattern is ordinary rather than
a peculiarity of the three primitives that happened to be in the library on the day
the sweep was written.

So seventeen of the eighteen rows say nothing about the library and everything about
the instrument. Which brings us to the eighteenth.

### The eighteenth is real, and it is correct

`loom.embed` declares five props. Its component reads four of them. The one it
does not read is `src` — the URL of the document being framed, which is to say the
single most important string on the node.

This is not a bug and it is not a near-miss. It is the design, and the file says so
in prose:

> So this file no longer decides anything about the URL and no longer reads one.
> `frames: ["src"]` is the declaration — the one thing the runtime cannot work out
> for itself, since a `src` reaching an `iframe` and a `src` reaching an `img` are
> the same JSON string and very different documents — and what comes back on
> `loom.frames.src` is a verdict rather than a prop.

The prop goes to the **frame seam**, which resolves it against the origins the
deployment permits (0095) and hands the component back a `FrameOutcome`. What the
component places in the `iframe` is the outcome's normalised `url`, never the
string from the tree. Exercise F shows both, side by side, and they are different
strings:

```text
  the src the tree carried: https://tree.example.com/video
  the src on the page:      https://probe.loom.invalid/src
```

That difference is load-bearing rather than incidental, and its reason is also in
the file: echoing the prop instead *would leave the check advisory — two strings
that differ only in case or a trailing dot are one origin to the allowlist and can
be two to a browser.*

So `loom.embed.src` is a declared prop that its component is **forbidden** to
read. A check that reported it would be reporting the correct implementation of a
security boundary as a defect.

### And then the turn: the question had the wrong subject

Eight rows, seven of them artefacts of the measurement, one of them right. Score it
as a bug-finding exercise and the instrument found nothing, which after two
lessons about how expensive a check is might read as a reason not to have built it.

That is the wrong conclusion, and the reason is the one thing in this lesson worth
carrying anywhere else. The sweep did not fail to answer its question. **It
answered its question exactly, and the question was about the wrong party.**

*Does the component read this prop* treats the component as the prop's reader. It
is one of six, and for `src` it is the one that must not be. The question that has
a useful answer is:

> Does this declared prop have **any** reader?

Exercise G asks it of `loom.embed.src` and gets four affirmative answers before it
ever reaches the component: the schema refuses a `javascript:` URL, the catalogue
tells the model the prop exists and is required, the frame seam resolves it against
an allowlist and refuses an unregistered origin. The component's *no* is the fifth
answer and the least important one.

Which means the check worth writing is not the one Predict 4 probably described.
*Every declared prop must be read by its component* is false in the library today
and false for a good reason. What is defensible is narrower and harder:

**a declared prop with no reader anywhere is a prop the model is invited to write
and nothing consumes** — and *that* is a real fault, because of what a declaration
is for. The catalogue is what the model is told it may do (lesson 12). A prop in it
that nothing reads is a lie of a particular kind: the model writes it, the
validator accepts it, the Gate weighs the change, a reviewer approves it, the
attribution records who asked for it, and the page is identical. A whole pipeline
runs correctly on a change that cannot matter.

Nothing in Loom is in a position to check *that*, and this is where the lesson
stops rather than where it gets clever. The readers are in different packages, some
of them are in deployments this repository has never seen, and "read by the portal's
insert menu" is not observable from here at all. The honest output is the one
exercise C prints: a **list of candidates**, each of which a person has to classify
as reachable, unreachable, or somebody else's. That is a finding, not a gate —
lesson 28's distinction between a reading and a check, arriving from the other
direction. A reading is a very good way to find a candidate and a poor thing to
block a build on.

---

## In the code

| Where | What |
| --- | --- |
| `src/sdk/definition.ts` | The registration contract. Read the doc comment top to bottom as a list of *audiences*: almost every field names who reads it and several say "read by nothing at render time", which is the distinction this lesson is about. |
| `src/sdk/registry.ts` | `undeclaredInteractiveProp`, `undeclaredFrameProp`, `undeclaredCopyProp`, `registeredReads`. Four comparisons against the schema, and the three refusal messages that name one drift. |
| `src/sdk/audit.ts` | `unplacedSlots` and `unplacedBehaviours`, and the comment that ranks two broken promises by how visible each is. The axis this lesson extends is written there. |
| `src/sdk/conformance.ts` | `probeConfigurations` — the sum of the closed choices, not their product — and `probeStates`, whose comment argues why one half is derived and the other supplied. |
| `src/primitives/loom.embed.ts` | The one true row. Its header says the component no longer reads a URL, and why the placed `src` must be the seam's and not the tree's. |
| `src/primitives/loom.feed.ts` | `readAnswer`, and why a binding with no outcome reads as empty. The reason exercise C's first three rows exist. |
| `src/primitives/loom.recording.ts` | `marked`, four lines that make a closed enum unreachable through an open string. |
| [0009](../decisions/0009-primitives-receive-props-in-a-bag.md) | The bag, and the sentence this whole lesson is about: *a primitive reads what it declares out of the bag.* |
| [0012](../decisions/0012-conformance-is-probed-and-reported-not-enforced.md) | Registration is pure and never calls a primitive; the audit is a function a host runs; and the audit reports rather than decides. All three matter here. |
| [0013](../decisions/0013-the-registry-is-what-the-model-is-told-it-may-build.md) | The catalogue as a projection of the registry — which is what makes a declared prop a thing the model is invited to write. |
| [0075](../decisions/0075-a-primitive-is-audited-under-every-shape-its-schema-closes-over.md) | The population the probe derives, and the cost of summing rather than crossing. |
| [0095](../decisions/0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md) | The record that took the URL away from the primitive. |
| [0185](../decisions/0185-a-probe-is-handed-answers-the-way-it-is-handed-props.md) | Why an answer state is supplied and not invented, in the sentence this lesson quotes. |

---

## Try it

Seven exercises. **Predict every output in writing, then run.** Exercise C is the
one to commit to hardest — it is Predict 3, executed — and exercise E is the one
whose answer most people are sure of, because it looks like it has already been
ruled out.

Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

The shared preamble for all seven:

```ts
import { createElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, it } from "vitest"
import { z } from "zod"

import { nodeDataOf, NO_DATA, type NodeData } from "./data/resolution.js"
import { createFrameOriginRegistry } from "./frame/origin.js"
import { describeFrameRefusal, NO_FRAMES, resolveFrame, type NodeFrames } from "./frame/resolution.js"
import { nodeIdSchema } from "./ids.js"
import type { JsonObject } from "./json.js"
import { primitiveTypeSchema } from "./primitive-type.js"
import { createStarterPrimitiveRegistry } from "./primitives/index.js"
import { NO_BEHAVIOURS } from "./render/behaviour.js"
import { LOOM_NODE_ATTRIBUTE, LOOM_TYPE_ATTRIBUTE } from "./render/editable.js"
import { asCallablePrimitive, NO_SLOTS, type LoomPrimitiveProps } from "./render/primitive.js"
import { auditRegistry } from "./sdk/audit.js"
import { catalogueOf } from "./sdk/catalogue.js"
import { probeConfigurations } from "./sdk/conformance.js"
import { definePrimitive } from "./sdk/definition.js"
import {
  createPrimitiveRegistry,
  describeRegistryError,
  type RegisteredPrimitive,
} from "./sdk/registry.js"

const registry = (() => {
  const built = createStarterPrimitiveRegistry()
  if (!built.ok) throw new Error(describeRegistryError(built.error))

  return built.value
})()

const entryFor = (type: string): RegisteredPrimitive => {
  const found = registry.primitives.find((primitive) => primitive.type === type)
  if (!found) throw new Error(`loom: no ${type} in this registry`)

  return found
}

/** The prop names a primitive's schema declares, which is what the catalogue carries. */
const declaredOf = (entry: RegisteredPrimitive): readonly string[] =>
  (entry.declaredProps ?? []).map((prop) => prop.name)

const PROBE_ID = nodeIdSchema.parse("n_probe")
const PROBE_TYPE = primitiveTypeSchema.parse("loom.probe")
const PROBE_ORIGIN = "https://probe.loom.invalid"

/** The frame verdicts a primitive that declared `frames` is handed at render time. */
const framesFor = (entry: RegisteredPrimitive): NodeFrames => {
  if (entry.frames.length === 0) return NO_FRAMES

  const outcomes = Object.create(null) as Record<string, unknown>
  for (const prop of entry.frames) {
    outcomes[prop] = { status: "allowed", url: `${PROBE_ORIGIN}/${prop}`, origin: PROBE_ORIGIN, sameOrigin: false }
  }

  return Object.freeze(outcomes) as NodeFrames
}

/**
 * One call of a component, with every prop key it touches written into `seen`.
 *
 * The props bag is a `Proxy` rather than the object itself, so the record is of
 * the *act* of reading rather than of anything the render produced.
 */
const callWatching = (
  entry: RegisteredPrimitive,
  props: JsonObject,
  data: NodeData,
  seen: Set<string>
): ReactNode => {
  const callable = asCallablePrimitive(entry.component)
  if (!callable.ok) throw new Error(callable.error)

  const watched = new Proxy({ ...props } as Record<string, unknown>, {
    get: (target, key) => {
      if (typeof key === "string") seen.add(key)

      return Reflect.get(target, key)
    },
  })

  return callable.value({
    loom: {
      nodeId: PROBE_ID,
      type: PROBE_TYPE,
      editable: { [LOOM_NODE_ATTRIBUTE]: PROBE_ID, [LOOM_TYPE_ATTRIBUTE]: PROBE_TYPE },
      slots: NO_SLOTS,
      data,
      frames: framesFor(entry),
      text: entry.text,
      behaviours: NO_BEHAVIOURS,
      decorative: () => null,
    },
    props: watched as JsonObject,
    children: "children",
  } as LoomPrimitiveProps)
}

type ExtraState = { readonly props?: JsonObject; readonly data?: NodeData }

/** Every prop name a component reached for, across the states it was probed in. */
const propsRead = (entry: RegisteredPrimitive, extra: readonly ExtraState[] = []): readonly string[] => {
  const seen = new Set<string>()

  const states: ExtraState[] = [
    ...probeConfigurations(entry.choices).map((props) => ({ props })),
    ...extra,
  ]

  for (const state of states) {
    try {
      callWatching(entry, state.props ?? {}, state.data ?? NO_DATA, seen)
    } catch {
      /* a configuration that throws answers nothing either way, as the audit has it */
    }
  }

  return [...seen].sort()
}

/** The declared props no call touched. */
const unreadIn = (entry: RegisteredPrimitive, extra: readonly ExtraState[] = []): readonly string[] => {
  const read = new Set(propsRead(entry, extra))

  return declaredOf(entry).filter((name) => !read.has(name))
}
```

Two things about the preamble are worth reading before you run anything.

`framesFor` hands a primitive that declared `frames` the same shape the audit's
probe does — an `allowed` verdict pointing at an invented origin. Without it,
`loom.embed` takes its refusal branch and the sweep reports *two* unread props on
it rather than one, and the extra one is entirely the measurement's fault. It is
the correction this exercise needed before its output meant anything, and it is
the same class of mistake as the three rows exercise D removes.

`propsRead` swallows a throw and says why in a comment. That is the audit's own
rule — a configuration that throws answers nothing either way — and it matters
here because a swallowed throw is a state in which *no* prop was read, which would
silently inflate every row. Nothing in the starter library throws under its own
schema, so it costs nothing today; it is there so that the day something does, the
rows do not quietly become wrong.

### Exercise A — the two copies, for one primitive

`loom.badge` is the smallest case in the library: one optional prop, three
treatments, a `span`. Predict both lines.

```ts
describe("A", () => {
  it("prints the two copies, for one primitive", () => {
    const badge = entryFor("loom.badge")

    console.log(`  declared: ${declaredOf(badge).join(", ")}`)
    console.log(`  read:     ${propsRead(badge).join(", ")}`)
  })
})
```

```
  declared: tone
  read:     tone
```

Dull on purpose, and worth having. This is what agreement looks like, and it is
the shape all but four of the library's primitives are in. The rest of this section is
about the four that are not.

### Exercise B — what the registry refuses, and what it waves through

Predict 1, executed for the two moments that happen at runtime. Two registrations
of the same schema: one names a prop in `frames` that the schema does not declare;
the other declares two props and reads neither.

```ts
describe("B", () => {
  it("prints what the registry refuses and what it accepts", () => {
    const props = z.object({ src: z.string(), tone: z.enum(["quiet", "loud"]).optional() }).strict()
    const silent = () => createElement("div", null, "a component that reads nothing")

    const misdeclared = definePrimitive({
      type: "demo.misdeclared",
      description: "Says it frames a prop its schema does not declare.",
      props,
      frames: ["source"],
      component: silent,
    })

    const unread = definePrimitive({
      type: "demo.unread",
      description: "Declares two props and reads neither.",
      props,
      component: silent,
    })

    for (const entry of [misdeclared, unread]) {
      const built = createPrimitiveRegistry([entry])

      console.log(`  ${entry.type.padEnd(17)} ${built.ok ? "registered" : "refused"}`)
      if (!built.ok) console.log(`    ${describeRegistryError(built.error)}`)
    }

    const built = createPrimitiveRegistry([unread])
    if (!built.ok) throw new Error("loom: expected a registry")

    const type = primitiveTypeSchema.parse("demo.unread")

    console.log(`  a tree writing both props:  ${built.value.validateProps(type, { src: "x", tone: "loud" }).outcome}`)
    console.log(`  what the model is told it may write: ${catalogueOf(built.value)[0]?.props?.map((prop) => prop.name).join(", ")}`)
  })
})
```

```
  demo.misdeclared  refused
    "demo.misdeclared" says it frames "source", which its props schema does not declare; the seam would then check nothing and the frame would render whatever the tree said
  demo.unread       registered
  a tree writing both props:  valid
  what the model is told it may write: src, tone
```

One declaration naming a prop that does not exist is a hard failure with a
paragraph of explanation. Two props nothing reads register, validate, and go into
the catalogue — which is to say, they are handed to the model as things it may
write.

The third moment in Predict 1 is the typecheck, and it cannot be printed by a
program, so here it is run separately. To reproduce it: put the three definitions
from Predict 1 into `src/scratch.ts` — a plain module rather than a `.test.ts`,
because nothing here is being run — and then

```bash
npx tsc -p tsconfig.json --noEmit
```

Reading only the lines about that file, the whole of what it says is:

```text
src/scratch.ts(28,97): error TS2339: Property 'colour' does not exist on type '{ tone?: "accent" | "neutral" | undefined; }'.
```

**One diagnostic, for (c), naming line 28 of three definitions.** (a) and (b) are
both silent. `type Props = z.infer<typeof props>` is what does it: the component's
parameter is typed from the schema, so reading a prop the schema does not declare
is an error at the read. There is nothing symmetrical available — a type cannot
require that a function body mention a field, and a component legitimately need not.

So all nine cells of Predict 1 come out as three columns of *fine, fine, fine* and
one cell of *error*, in a corner nobody was worried about. Reading a prop you did
not declare is caught three ways over. Declaring a prop nobody reads is caught
nowhere.

### Exercise C — every declared prop in the library that nothing read

The sweep. Predict the number on the fourth line and the rows under it before you
run this; if you wrote a number for Predict 3, this is where it gets marked.

```ts
describe("C", () => {
  it("prints every declared prop in the library that no call touched", () => {
    const rows = registry.primitives.flatMap((entry) => {
      const unread = unreadIn(entry)

      return unread.length === 0 ? [] : [`    ${entry.type.padEnd(16)} ${unread.join(", ")}`]
    })

    const audit = auditRegistry(registry)

    console.log(`  declared slots no component placed:      ${audit.unplacedSlots.length}`)
    console.log(`  declared behaviours no component placed: ${audit.unplacedBehaviours.length}`)
    console.log(`  components that threw under their own schema: ${audit.throwsOnDeclaredProps.length}`)
    console.log(`  primitives with a declared prop nothing read: ${rows.length}`)
    for (const row of rows) console.log(row)
  })
})
```

<!-- moves: when a primitive in src/primitives/ gains a declared prop its own
     component does not read. Two ways that happens today, and the second was
     added on 7 October: a prop nothing reads *unless an answer arrives* (a
     bound primitive's, which is what this fence was written about), and a prop
     the *runtime* reads off the node rather than the component — a control
     named from the tree under 0234, where the primitive must declare the prop
     and the component never touches it. loom.menu and loom.dialog are the
     first two of the second kind. Both land in the "measurement, not the code"
     group below, so the lesson's argument is unchanged and only its arithmetic
     moves; a member of a *third* kind would be news the prose has to answer.
     This mark covers the fourth line and the rows under it, which are what the
     lesson is about. Loom primitives owns the change that would do it.

     The first line is also covered, as of 9 October, and the reason is the
     thing lesson 35 teaches rather than an exception. It read `0` for two
     weeks and that was never a fact about the library: `auditRegistry(registry)`
     is called here with one argument, so the probe never reaches the state a
     bound primitive's failure region is drawn in, and 0246 gave four primitives
     such a region. Nothing is broken. The number moves whenever a bound
     primitive declares a region an unanswered probe cannot place — and if it
     moves, the sentence under this fence beginning "The two zeros are the
     control" has to move with it, because it says which lines are which.

     The two zeros on the second and third lines are the control and move for
     nobody: if one of those is what drifted, this mark does not cover it and
     something is wrong. All four lines are in one fence because they are one
     comparison and the prose names "the fourth line". -->

```
  declared slots no component placed:      4
  declared behaviours no component placed: 0
  components that threw under their own schema: 0
  primitives with a declared prop nothing read: 10
    loom.menu        label
    loom.dialog      label
    loom.trend       max, plot, prefix, suffix
    loom.tally       prefix, suffix
    loom.voices      columns, density
    loom.recording   shape
    loom.brand       viewBox
    loom.feed        density, meta, separators
    loom.plate       decorative, fit
    loom.embed       src
```

The two zeros are the control and they are the reason the fourth line is worth
anything. It is not that this library is sloppy about its declarations — every
promise anything has ever looked at is kept by every primitive, the first line's
four included: those are four regions the audit was not put in a position to
see, not four regions nobody draws (the note under the first transcript has the
detail). The fourth line is the first promise nothing had looked at.

**This transcript is a second copy of a fact about `src/primitives/`, and it will
go red when that fact changes.** That is deliberate here and it is the only place
in this course where it is: the set of primitives with a conditionally-read prop is
exactly what this lesson is about, so a new member of it is news rather than
noise. Lesson 28's warning applies in full — the bill goes to whoever next writes
a primitive whose prop is read only under an answer — and the mitigation is that
the row is four words and the reason is this paragraph.

### Exercise D — the same two primitives, with an answer beside them

`loom.feed` and `loom.tally` both read a binding. Predict all four lines, and in
particular predict whether the second and fourth are empty.

```ts
describe("D", () => {
  it("prints the same two primitives with an answer beside them", () => {
    const feed = entryFor("loom.feed")
    const tally = entryFor("loom.tally")

    const entries = nodeDataOf({
      entries: { status: "ready", value: [{ title: "A post", meta: "Tuesday" }] },
    })
    const figure = nodeDataOf({ value: { status: "ready", value: 12480 } })

    const say = (name: string, unread: readonly string[]) =>
      console.log(`  ${name.padEnd(30)} ${unread.length === 0 ? "(nothing unread)" : unread.join(", ")}`)

    say("loom.feed, unanswered", unreadIn(feed))
    say("loom.feed, answered", unreadIn(feed, [{ data: entries }]))
    say("loom.tally, unanswered", unreadIn(tally))
    say("loom.tally, answered", unreadIn(tally, [{ data: figure }]))
  })
})
```

```
  loom.feed, unanswered          density, meta, separators
  loom.feed, answered            (nothing unread)
  loom.tally, unanswered         prefix, suffix
  loom.tally, answered           (nothing unread)
```

Five of exercise C's eighteen rows, removed by one line of data each. Notice what had
to happen for that: somebody who knows what `loom.feed` reads had to write
`{ entries: { status: "ready", value: [{ title: "A post" }] } }` — a binding name,
an outcome shape, and a row shape that matches an internal schema. The probe could
not have derived any of it, which is 0185's argument, and it is why the answers an
audit probes with are supplied by the host rather than invented by the library.

Which is also the honest reading of this exercise: the check does not become right
when you add data. It becomes right *for the states somebody bothered to supply*,
and the next primitive that reads a prop in a branch nobody described will show up
in exercise C looking exactly like a defect.

### Exercise E — the prop the probe sets and the component still never reads

The one most people rule out. `shape` is a closed enum, and `probeConfigurations`
renders once per value of every closed choice — so surely it gets read. Predict all
three lines.

```ts
describe("E", () => {
  it("prints the prop the probe sets and the component still never reads", () => {
    const recording = entryFor("loom.recording")

    console.log(`  the choices the probe varies: ${recording.choices.map((choice) => choice.name).join(", ")}`)
    console.log(`  unread, probed as the audit probes: ${unreadIn(recording).join(", ")}`)
    console.log(
      `  unread, with artwork supplied:      ${
        unreadIn(recording, [{ props: { artwork: "https://example.com/cover.png" } }]).join(", ") || "(nothing)"
      }`
    )
  })
})
```

```
  the choices the probe varies: shape
  unread, probed as the audit probes: shape
  unread, with artwork supplied:      (nothing)
```

The first two lines together are the whole point. `shape` is the *only* choice this
schema closes over, so the probe sets it explicitly, by name, in its own render —
and the component never touches it, because the branch that uses it is gated on
`artwork`, an arbitrary URL string. One invented artwork URL closes the row.

**Setting a prop is not the same as reaching the code that reads it.** A
product-of-configurations probe would not have helped either; what was needed was a
value from outside the schema's closed sets, which is exactly what 0075 says the
probe cannot supply.

### Exercise F — what `loom.embed` reads, and what reaches the page

The real row. Predict all four lines, and predict the last one *precisely* — it is
not the string on line three.

```ts
describe("F", () => {
  it("prints what loom.embed reads and what reaches the page", () => {
    const embed = entryFor("loom.embed")
    const seen = new Set<string>()

    const markup = renderToStaticMarkup(
      createElement(() =>
        callWatching(embed, { src: "https://tree.example.com/video", title: "A talk" }, NO_DATA, seen)
      )
    )

    console.log(`  props it declares:        ${declaredOf(embed).join(", ")}`)
    console.log(`  props the component read: ${[...seen].sort().join(", ")}`)
    console.log(`  the src the tree carried: https://tree.example.com/video`)
    console.log(`  the src on the page:      ${/<iframe[^>]*\ssrc="([^"]*)"/.exec(markup)?.[1] ?? "(no iframe)"}`)
  })
})
```

```
  props it declares:        aspect, caption, frame, src, title
  props the component read: aspect, caption, frame, title
  the src the tree carried: https://tree.example.com/video
  the src on the page:      https://probe.loom.invalid/src
```

Line four is the seam's invented URL, not the tree's. The component was handed a
`src` in its props and an `allowed` verdict on `loom.frames.src`, and it placed the
verdict's `url`. The tree's string reached the page not at all.

That is what *the component is forbidden to read this prop* looks like from the
outside, and it is why a check asserting the opposite would have been wrong about
the only row it was right about. Two further things are in that transcript:

- **`title` is read**, which it would not have been without `framesFor` in the
  preamble. A refused frame takes the notice branch, which renders the box and says
  so, and never gets as far as the `iframe` the title belongs to.
- **The component reads four props and places a fifth value nobody wrote.** The
  `src` on the page came from the deployment's origin registry by way of the frame
  seam — which is lesson 20's *the URL stays in the tree and the origins do not*,
  observed rather than argued.

### Exercise G — everybody who reads `loom.embed`'s `src`

The question the sweep should have asked. Predict each line, and predict the last
one after having read exercise F.

```ts
describe("G", () => {
  it("prints everybody who reads loom.embed's src", () => {
    const embed = entryFor("loom.embed")
    const type = primitiveTypeSchema.parse("loom.embed")
    const catalogued = catalogueOf(registry).find((primitive) => primitive.type === type)

    const origins = createFrameOriginRegistry([
      { origin: "https://player.vimeo.com", description: "Vimeo player embeds" },
    ])
    if (!origins.ok) throw new Error("loom: expected an origin registry")

    const good = "https://player.vimeo.com/video/1"
    const bad = "javascript:alert(1)"

    console.log(`  the schema          ${embed.validate({ src: bad, title: "A talk" }).outcome} for ${bad}`)
    console.log(`  the catalogue       tells the model "src", required: ${
      catalogued?.props?.find((prop) => prop.name === "src")?.required
    }`)
    console.log(`  the frame seam      ${resolveFrame(good, origins.value).status} for a registered origin`)

    const refused = resolveFrame("https://elsewhere.example.com/video", origins.value)

    console.log(`                      ${refused.status}${
      refused.status === "refused" ? ` — ${describeFrameRefusal(refused.refusal)}` : ""
    }`)
    console.log(`  the component       reads src: ${propsRead(embed).includes("src")}`)
  })
})
```

```
  the schema          invalid for javascript:alert(1)
  the catalogue       tells the model "src", required: true
  the frame seam      allowed for a registered origin
                      refused — no registered origin covers it — "https://elsewhere.example.com" is not registered
  the component       reads src: false
```

Four readers before the component, each doing something the others cannot, and the
component's `false` at the bottom. This is the transcript to keep: exercise C's
fourth row and this one describe the same prop, and one of them makes it look like
a defect while the other makes it look like the best-attended declaration in the
library.

The difference between the two is not more data or a better probe. It is the
subject of the question.

---

## It could have been otherwise

Six, of which only one is in a record — the rest are alternatives to a check
nobody has written, which is the honest state of this seam.

**Assert that every declared prop is read by its component.** The obvious one, and
it is *false in the library today* for a reason that is not going away: 0095 took
the URL off `loom.embed` on purpose. So the assertion would need an exemption list,
and an exemption list naming `loom.embed.src` is a hand-maintained registry with
exactly the two rots lesson 28 describes — nobody removes a row when the reason
expires, and nothing notices when a row stops matching anything. For one member.

**Assert it, with the exemption derived from `frames` rather than listed.** Better,
and nearly right: a prop named in `frames` is read through `loom.frames`, not
through `props`, so exempting it derives itself. It still fails on the six
answer-gated rows, which is the whole rest of the output. Worth noticing that this
is the good version of the bad idea, and that it is *still* not enough, because the
thing making the check noisy was never the exemption.

**Report rather than block.** The shape this should take, and the precedent is
`notDecorated` in the audit itself: registered, renders, invisible to the portal —
there to be asserted empty *by a host that cares*, because whether it matters
depends on whether the deployment has a portal. The same applies exactly: whether
an unread prop matters depends on whether anything outside this package reads it.
The reason it is not in `auditRegistry` today is the one below.

**Put it in `auditRegistry` as a new field.** A `RegistryAudit` is a type several
surfaces destructure, and a new field on it is a diff in every lane that reads one.
More to the point, and the reason to say no even if it were free: a field on the
audit implies the audit can answer the question, and it cannot — it sees one of six
readers. A list of *candidates* standing next to `unplacedSlots`, which is a list
of certainties, is a category error somebody would act on.

**Cross the configurations instead of summing them.** Tempting after exercise E and
it would not have helped: `shape` was already set by name in its own render, and
what was missing was an `artwork` URL, which is not in any product of closed sets.
0075 sums rather than crosses to keep 48 renders from becoming 260,000, and the
case that argument concedes — a primitive that places children only under two
particular values together — is not the case here.

**Parse the component's source instead of calling it.** The other way to get the
second copy: read `given.shape` out of the file with a parser and never render
anything. It answers a *different* question — *does this text mention this prop* —
which is blind to a read behind a rename, blind to a helper in another module, and
sees reads on branches that can never execute. Both instruments are wrong and they
are wrong in opposite directions, which is worth more than either: static analysis
over-reports reads, observation under-reports them, and the true set is between
them. Nothing in this repository does either today.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections while
you write. Then compare.

1. **A colleague proposes adding `unreadProps` to `auditRegistry`, beside
   `unplacedSlots`.** They have the implementation working; it is thirty lines and
   it finds seven things.

   Explain what is wrong with shipping it, **without using the words "false
   positive"** — those two words make it sound like a tuning problem. The version
   that transfers separates two different objections: one about what the instrument
   can see, and one about what the name of the field would claim. Then say what you
   *would* ship, and where.

2. **Derive this lesson from lesson 15 and lesson 25 together, without looking at
   either.**

   Lesson 15: a primitive promises two things, and a different mechanism checks
   each half. Lesson 25: a compiler answers one of the three questions in *is every
   member of this union handled*, and the other two need something else.

   Say what the two halves of lesson 15's promise are, then place a props schema in
   that scheme — and notice that it does not fit, because it is a promise made to
   several parties at once rather than one promise with two halves. Then use lesson
   25's shape on it: write down the three different questions *is this prop read*
   turns out to be, and say which of them any mechanism in this repository answers.

Predict, before writing (2): the hard half is not the three questions. It is
noticing that the question you would naturally write down first — *does the
component read it* — is not one of the three a reader actually cares about.

---

## Self-check

Seven questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. Name the property every promise `auditRegistry` can check has in common, and
   use it to say why an unread prop is not among them. Then give one other fact
   about a component that the same argument rules out.
2. A props schema has at least six readers. Name five of them without looking, and
   for each say what it does that no other one does. Then say which of them a host
   could remove from a deployment entirely.
3. The registry refuses a `frames`, a `copy`, an `interactive` and a `reads`
   declaration that names an undeclared prop, and the three refusal messages
   describe one drift. State the drift in one sentence, and then say why the
   component — where that rename actually happens — is the one place not held to
   the schema.
4. Reading an undeclared prop is caught; declaring an unread prop is not. Say
   precisely what catches the first, and then say why no type system can catch the
   second — the answer is about what a type can require of a function *body*.
5. `loom.recording` declares exactly one closed choice, `shape`. The probe renders
   it once per value of `shape`, and the component reads `shape` in none of those
   renders. Explain how both of those are true at once, and then state the general
   rule in a form that would apply to a primitive you have never seen.
6. `loom.embed.src` is declared, validated, catalogued, resolved against an
   allowlist, and never read by its component. Say what would break if the
   component read it instead of reading `loom.frames.src` — and be specific: the
   answer is two strings that are one origin to one reader and two to another.
7. Exercise C prints seven suspects and one of them is real. Say what makes the
   output worth having anyway, and then state the rule about a question's *subject*
   in a form that does not mention props, primitives or Loom.

Question 7 is this lesson's question. Question 2 is where a confident
half-answer is most likely: four readers come easily and the fifth is the one that
matters, because it is the reader that makes a declared prop a thing the model is
invited to write.

---

## Reflect

Write for two minutes, then move on.

- Predict 1 asked for nine cells. Look at the shape of your grid rather than the
  cells. If you expected *something* to object to (b) — a lint rule, the registry,
  a warning at render — write down which one you reached for, because that
  expectation is the whole lesson: the amount of machinery a system has tells you
  nothing about which of its promises are covered.
- Predict 2 asked for the property slots have and props do not. If your answer was
  about effort, difficulty, or nobody having got round to it, write down what you
  now think the answer is in six words.
- Predict 3 and your confidence. Two separate things to mark. First the number —
  most people write 0 or 1, and 18 is nearer. Then, more usefully, go back to what
  you said you would *do* about each primitive you named. If you wrote "fix it" for
  any of them, that is the line to keep: seventeen of the eighteen needed nothing done,
  and the eighteenth needed a security boundary left exactly as it was.
- Predict 4 asked what a red build from your assertion would mean. Compare it with
  the answer this lesson arrived at — *a candidate for a person to classify* — and
  write down whether your version would have been a gate. A gate on this would have
  been red on the day it was written, on a correct library.
- Now go and look at your own work. Find a configuration option, a feature flag, an
  environment variable, or a function parameter that something else in the system
  advertises. Work out three things and write them down: who actually consumes it,
  whether anything would notice if the consumer stopped, and — the one people skip
  — whether anything advertises it to someone who will write it expecting an
  effect.
- Last, the general version, and it is not about software. You have a declaration
  with several audiences and a checker that can only see one of them. Pick a rule
  at an institution you deal with — a form field, a required disclosure, a box
  somebody ticks — and work out who reads it. Then ask this lesson's question: if
  the answer is *nobody*, who would ever find out, and what would they have had to
  be watching?

---

## Come back to this

Set AH in [`review-schedule.md`](review-schedule.md), two days after this lesson.
Interleaved with 12, 15, 20, 24, 25 and 28 — heavy on 25, because the population
rule arrives here for the third time and is the reason seventeen of eighteen rows are
noise; and heavy on 12, because *what the model is told it may write* is what makes
an unread declaration a fault rather than a tidiness problem.

Part V has twelve lessons now. The first six were a checker that could not see far
enough; 24 could see and not interpret; 25 saw, interpreted, and answered a
narrower question than it was asked; 26 was a fact two parties held and neither
could compare; 27 was one level away behind a promise; 28 was a fact with no second
copy at all.

This one has two copies, no obstacle, and a checker that answers correctly. The
fault is in the **subject** of the question: *does the component read this prop*
treats one reader as the reader, and a declaration with six audiences cannot be
audited against any one of them.

So the remedy is not a better instrument and not a second copy. It is to work out
who a declaration is *for* before deciding what would count as it being kept — and
then to accept that when the audiences are in different packages, what you can
build is a list of candidates for a person to classify, rather than a gate. Which
is where lesson 28 left the difference between a reading and a check, arrived at
from the other side.
