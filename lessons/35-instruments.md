# 35 — Instruments: the rule a probe's reach wrote in the library's hand

**After this lesson you will be able to** say what a claim about a primitive is
quantified over, and why the two probes in one file quantify it oppositely
without either being careless; state which direction a larger population can
move each kind of verdict, and derive that from the quantifier rather than
remembering it; say what a closed choice is to an instrument and why an open prop
contributes not one sample but none; explain why a region placed on a condition
is unreportable under either quantifier, and what actually settles it; name what
cannot be invented for a probe and who holds each of those things; state the
general failure — *an instrument that cannot reach a state puts pressure on the
system to forbid the state* — and say where that pressure lands and why it is
invisible at the place it lands; and say what happened in this repository on the
day the reach was finally extended.

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
[32](32-layout.md), [33](33-shortfall.md), [34](34-hindsight.md).

Lesson 34 closed on a question about records: **which questions did you decide
you would never be able to ask, on the day you chose what to write down?** It is
a question about an omission somebody committed, once, while thinking about
something else.

This lesson is that question asked of an instrument, and the answer is worse,
because nobody decided anything. The conformance probe calls every registered
component and reports what each one promised and did not keep. It calls each one
several times, under several sets of props, and it has to turn what it saw into
**one claim per primitive** — which means choosing, somewhere, a word between
*the renders I tried* and *this primitive*. That word is in the source twice, in
two functions forty lines apart, and it is a different word each time.

Neither choice is careless. What neither choice can do is say *I never tried the
state your component cares about* — and when a correct primitive was reported as
broken because of a state the probe could not reach, the thing that changed was
not the probe. It was **the library**, which was given a rule about what a
primitive may declare, in a decision record, with the instrument's limit written
down as the reason and a sentence admitting it: *"That is a defensible design on
its own and it was not chosen: it is what the probe permits."*

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Write something for all
five before you look anything up.

1. A primitive's registration is a promise with two halves, and two different
   parties check them. Name the halves, and say which half a human has to look
   at. *(15)*
2. *Is every member of this union handled* and *is every member of this union
   listed* are two claims. Say which one a compiler checks, and then name the
   third claim of the three, which is not checkable at all. *(25)*
3. Lesson 29 asked whether a component reads a prop it was handed and could not
   find out by watching what came back. Say why watching the output cannot
   answer it, and then say what `unplacedSlots` is a list of — being precise
   about whether it is a list of suspicions or a list of certainties. *(29)*
4. A fact in a repository can get a second copy in three ways. Name them, say
   which is cheapest, and say who pays for the one you manufacture. *(28)*
5. A behaviour is checked four ways by the registry. Say what the four checks
   are about, and then say what moment all four happen at and why it could not
   be any later. *(31)*

Question 3 is the one this lesson takes apart, and question 4 is the one it
leans on at the end. If your answer to 3 said *certainties*, keep it where you
can see it.

---

## Predict

**In writing, before reading on.** Four questions. Question 1 is the question of
the lesson and the one to rate your confidence on. Question 4 is where the
answer you would defend and the answer the repository has are not the same
answer, which is the last section of this lesson.

1. A container declares one region, `aside`. Its props schema closes over a
   `tone` of `plain | accent | warning`, a two-member enum and a boolean, so the
   probe renders it under eight configurations: the defaults, then each closed
   value on its own. The component places `aside` **only when `tone` is `accent`** — so one
   of those eight renders contains the region and seven do not.

   Write down whether `unplacedSlots` names this primitive.

   Now the same primitive, same condition, and a second promise: it carries
   `loom.editable` — the handle the portal addresses it by — only when `tone` is
   `accent`. Same one render in eight.

   Write down whether `notDecorated` names it. **Rate your confidence 1–5 that
   your two answers match.**

2. Same primitive, one change: the condition is now `label` being a non-empty
   string, where the schema says `label: z.string().optional()`.

   Write down what each of the two lists says now, and the reason. Then write
   down how many of the eight configurations set `label`.

3. A primitive reads a data binding and draws three different things: the rows
   when a source answered with some, an empty region when it answered with none,
   and a failure region when the source did not answer at all. The probe has no
   answer to give it, because nothing in the probe knows what this primitive
   can draw.

   Write down what the audit reports about this primitive. Then write down which
   of three things you would change — the probe, the primitive, or the list the
   audit reports — and say who pays in each case.

4. Suppose the probe is then taught to take answers from whoever registered the
   primitive, and the record doing it says in as many words that the rule in
   question "no longer binds".

   Write down what you expect to find in the library two weeks later: in the
   bound primitives' own source, and at the place the audit is actually called.

Do not read on until all four are written. Question 1 is one question with two
halves on purpose, and a confident *they match* is the ordinary answer rather
than a careless one.

---

## The problem

The registry can check a great deal about a primitive without running it. It can
read the props schema, hold a declared slot name against a string, refuse a
behaviour declared without the text that names its control, and refuse a cross
that closes a region nothing opens. All of that is data about data, and lesson 15
is where you met it.

What it cannot do by reading is answer the questions that are about the
**component** — a function somebody else wrote, which the library is going to
call on a page where nobody is watching:

- Does it put the portal's handle on something? A primitive that ignores
  `loom.editable` renders perfectly and is invisible to every tool that wants to
  point at it.
- Does it place the region it declared? The catalogue tells a model the region
  exists, a proposal puts a heading in it, and a component that never reads
  `loom.slots.aside` drops that heading — with the content gone from the page,
  still present in the tree, and nothing anywhere saying so.
- Does it place the control it asked the framework for? A code panel that
  declares `copy` and never reads `loom.behaviours.copy` is a code panel with no
  copy button. The snippet reads perfectly without one, which is exactly why
  nobody notices.

So the SDK has an instrument that calls them: `auditRegistry`, which probes every
registered component and reports what it found — a hundred-odd of them today, and
exercise E prints the exact figure. It runs in a test rather than at
registration, for the reason its own header gives: calling arbitrary components
while a module graph is still evaluating is not something a library should do
behind a host's back. And it **reports rather than decides**, because whether an
undecorated primitive should stop a release depends on whether the deployment has
a portal.

All of that is lesson 29's territory and this lesson assumes it. Here is the part
lesson 29 did not need and this one is about.

**The probe does not call a component once.** It cannot: a primitive whose
rendering turns on a prop would otherwise be reported by the shape it happens to
take at its defaults, which is a claim about one configuration wearing the name
of the primitive. `loom.field` places children only when its `type` is `select`,
because only a select has choices, and probed at its default type alone it
reported as a **leaf** — a primitive with nowhere to put a child node, which is
false and is the one fact a portal reads that list to decide. So 0075 made the
probe render every shape the schema closes over.

And now the instrument has a problem that is not about reach at all. It has eight
observations and it owes the caller one word. `unplacedSlots` is a list of
primitive types; a type is either in it or not. Somewhere between *eight renders*
and *one list* there is a quantifier, and whichever one you pick, you have
decided something about every conditional primitive anybody will ever write —
before any of them exists, in a file that has no idea what they will be
conditional on.

---

## The idea

### One claim from many renders is a quantifier, and the quantifier is the design

`conformance.ts` holds three probes. Two of them are in this lesson, they run
over the same list of configurations, and they reduce it in opposite directions.

The decoration probe:

```ts
return answered.every((node) => carriesDecoration(node, editable))
  ? { outcome: "decorates" }
  : { outcome: "not-decorated" }
```

The placement probe:

```ts
const placed = (marker: string): boolean =>
  answered.some((attempt) => attempt.result.ok && containsMarker(attempt.result.value, marker))

return {
  outcome: "probed",
  unplacedSlots: declaredSlots.filter((name) => !placed(slotMarker(name))),
  unplacedBehaviours: declaredBehaviours.filter((name) => !placed(behaviourMarker(name))),
  rendersChildren: placed(PROBE_CHILDREN),
  …
}
```

`every` against `some`. One primitive, one condition met in one render out of
eight, and the two verdicts disagree: it is **not decorated** and its slot is
**placed**.

That is not an inconsistency to tidy up. It is two facts with two different
jobs, and the quantifier is how each one says what its job is.

**The decoration is a property of a render.** The portal's handle is how a tool
finds *this node, on this page, as it is drawn now*. A primitive that carries it
under seven configurations and drops it under the eighth is a primitive that
becomes unaddressable when somebody sets a prop, and "mostly addressable" is not
a thing a portal can be written against. The claim worth making is *every render
of this primitive carries the handle*, and `every` is that claim.

**A placement is a property of the primitive.** `unplacedSlots` answers *did this
component keep the promise its registration made* — and a component that places
the region under one configuration has demonstrably read `loom.slots.aside`. It
knows the region exists; it put the content somewhere. Whether it also places it
when `tone` is `warning` is a question about this primitive's design, which the
audit's own header says it does not decide: *"a primitive that deliberately
ignores a region under some prop combination is a design choice."* The claim
worth making is *no render of this primitive placed it*, and `some`, negated, is
that claim.

Say both out loud and the asymmetry stops being surprising. One is a promise
about **every** page. The other is a promise the author either kept **somewhere**
or never kept at all.

### Which way a bigger population can move the verdict

Here is the part that makes the choice a technique rather than a taste, and it is
worth deriving before you read it.

The list of configurations is not fixed for all time. It got longer in September
when 0185 let a caller add answer states, and it gets longer every time somebody
adds an enum to a props schema. So for each verdict there is a question with a
yes-or-no answer: **if the population grows, which way can this verdict move?**

- `every` is **anti-monotone**. Adding a configuration can turn `decorates` into
  `not-decorated` and can never do the reverse. A larger population can only
  ever find new faults.
- `some` is **monotone**. Adding a configuration can turn a reported drop into
  silence and can never do the reverse. A larger population can only ever clear
  false alarms.

Which is exactly what each one needs, and it is the same argument as before read
from the other end. A decoration claim that *strengthens* as the instrument's
reach grows is a claim you can build a portal on: whatever it says today, more
looking will only make it stricter. A placement claim that *weakens* as reach
grows is a claim you can extend an instrument under: adding a state to the probe
cannot turn a correct primitive into a reported one, so nobody has to re-audit
the library's design every time the harness learns a new trick.

Get those backwards and both properties invert. `every` on placement would mean
that teaching the probe about answers in September would have turned five correct
bound primitives into reported drops overnight — every one of them draws
different regions in different states, which is the whole point of binding
anything. `some` on the decoration would mean a primitive that carries the handle
in one configuration out of eight is reported as addressable, and a portal
querying for it gets nothing on seven pages out of eight.

So: **pick the quantifier by which direction you can afford the verdict to move
as the instrument gets better.** You will be extending the instrument; you will
not be rewriting its callers.

### The population is not every shape the schema accepts

Both quantifiers range over `answered` — the configurations that came back — and
the honest name for that set is *the states somebody arranged for the probe to
try*. A props schema holds two kinds of prop, the probe treats them completely
differently, and how it combines the first kind is a third decision on top.

**A closed choice is enumerated.** An enum of three members and a boolean are
each a finite set of values the schema itself names, so `probeConfigurations`
reads them off the registration and cannot be wrong about them. Nobody declares
them; they are derived.

**The product is not taken.** The configurations are the defaults, then each
closed value on its own, with everything else left alone — the **sum** of the
choices rather than their product. Lesson 29 is where you derived what that
costs: six enums of eight members is forty-eight renders this way and two hundred
and sixty thousand the other, and the price of the cheap answer is that a
primitive which places a region only under two particular values *together* is
never found. The file says so, and says nothing in the library is shaped that
way.

**And an open prop contributes nothing at all.** This is the one worth stopping
on, because it is easy to read the first two and assume the third is "one sample,
the default". `label: z.string().optional()` is not a closed set. There is no
list of strings to enumerate, so the probe does not try a string — it does not
try *absent* either, as a case it knows about. The prop simply never appears in
any configuration, and the only renders that exist are ones where it is missing.

Those are two different situations wearing one word. For `tone` the probe has
three samples of a three-valued thing and the verdict means what it says. For
`label` the probe has no samples of an unbounded thing, and the verdict is about
a primitive nobody ever showed a label to. **Nothing in the verdict distinguishes
them**, which is this course's lesson 24 one floor down: a reading that cannot
say which of two silences it is.

### What cannot be invented, and who holds it

A probe is a render with no page around it, so everything the render context
normally carries has to come from somewhere. `conformance.ts` makes five
decisions about that — four inventions and one refusal — and reading them
together is the best short lesson in instrument design this repository contains.

| what the context carries | what the probe does | why |
| --- | --- | --- |
| the portal's handle (`editable`) | a marker node id and type | it is the thing being measured |
| the decorative renderer | answers with a **distinct** marker | a primitive placing only the decorative copy would render its content unaddressable, and a shared marker would make the placement probe call it a primitive that renders its children |
| a frame outcome (0095) | `allowed`, against `https://probe.loom.invalid` | a primitive that declares a frame renders a *refusal* when told no, so a probe that always said no would photograph every embed's error state and call it the primitive |
| the primitive's own declared strings | handed over as declared | a component that reads `loom.text.excluded` and formats it would throw on `undefined` and read as `not-probeable` — a false negative produced entirely by the probe, about a correct primitive |
| an answer to a data binding | **nothing**, unless a caller supplies one | see below |

The first four are inventions, and each one is chosen so that getting it wrong is
*recognisable*. The marker origin is a hostname nobody can register, so one that
escapes into real markup is obvious on sight rather than being a plausible video
that silently never loads.

The fifth could not be invented, and the reason is the one sentence to carry out
of this section:

> An invented answer is either one the primitive happens to be able to draw — in
> which case the probe is measuring its own guess — or one it cannot, in which
> case every bound primitive reports its failure region as the only one it
> places. Whoever registered the primitive knows what it reads. The probe does
> not.

Note what this is *not* about. It is not that answers are expensive, or
asynchronous, or that a source might be down. The probe is synchronous and holds
the answer in its hand. The obstacle is that **the space of answers is not
enumerable and not declared anywhere the probe can read**, which is the same
shape as `label` and a great deal more consequential, because a bound primitive's
whole design is a function of which answer arrived.

And 0184's `reads` does not help, which is worth saying because it looks like it
should. `reads` gives the probe the **name** the answer arrives under. The name
was never the hard half.

### The state the instrument could not reach, and the rule that grew where it landed

Now put the pieces together in the order they actually happened, because this is
the part that is about a system and not about a function.

On 22 September the library gained its first two bound primitives. A bound
primitive draws a different region for each state an answer can be in. With no
answer at all it takes one branch, every time, so the other regions are placed in
no probe — and `unplacedSlots`, which is `some` negated, correctly reports them
as regions nothing ever placed. `library.test.ts` asserts that list empty.

Three things could have changed. The probe, so it could reach the states. The
list, so a primitive could opt out of it. Or the library, so no primitive had a
region the probe could not reach.

**The library changed.** 0180 decided it, in one clause:

> **A bound primitive may therefore declare only the regions it places without
> an answer**, and everything else it says is declared text.

Read that clause cold, in the file where it binds, and it is a design principle.
It has the shape of one. It sounds like something learned about bound
primitives — perhaps that a failure is not content, or that a region nobody
authored should not be a region. A reader of `loom.feed` sees a primitive with
one slot and two declared sentences, and **nothing on the page they are reading
says that a second region was possible and an instrument said no.**

The record was honest about it in the same breath, which is why this story is
recoverable at all: *"That is a defensible design on its own and it was not
chosen: it is what the probe permits."* And it filed the limit as a finding
rather than keeping it, because the probe belongs to the framework and the
library was the party paying.

0185 then answered the finding on 23 September, and named the thing in one
sentence that is the title of this lesson:

> That rule is the probe's limit wearing the library's clothes.

A probe's configuration became `{ props, data }`. The answers are **supplied**,
by whoever registered the primitive, for the reason quoted two sections up — and
summed into the configurations by a second function rather than folded into the
first, so that a machine's enumeration and a person's declaration do not end up
behind one name where, the day they disagree, nobody can say which half was
wrong. The restriction, 0185 says, "no longer binds".

### The general shape, which is the thing to keep

Strip the specifics and what is left is a failure mode worth recognising on
sight, because it does not look like a failure while it is happening.

> **An instrument that cannot reach a state puts pressure on the system to
> forbid the state.** Extending the instrument is somebody else's work in
> somebody else's directory. Narrowing the thing being measured is available
> today, to the person who is blocked, and it makes the red go green.

Three properties make it dangerous, and none of them is anybody's carelessness.

**The pressure lands where the instrument is not.** The red test is in the
library's suite; the limit is in the SDK. Whoever is blocked owns the first and
not the second, and the cheapest correct-looking move is the one inside their own
lane. Every incentive points at the library.

**The prohibition survives as a principle.** Once written down in a record, it is
quoted into the next primitive's header and the next after that. A constraint
with a reason has a reason *attached*; a constraint quoted forward is a rule
somebody inherits. Its reason is one directory away, in a record about an
instrument, which nobody reads while authoring a component.

**And nothing goes red when the reason stops being true.** This is the worst of
the three. A discharged limit does not fail a test. 0185 could extend the probe,
say the restriction no longer binds, and leave behind a library whose source
still states it — and every suite in the repository stays green, because a
primitive declaring *fewer* regions than it could is not a defect in any sense a
program can detect. The thing that changed was permission, and permission is
invisible.

Which is the answer to the question lesson 34 ended on, arriving from a direction
that lesson could not have pointed at. *Which questions did you decide you would
never be able to ask?* Here, nobody decided. An instrument had a reach, the reach
was not written down as a limit anywhere the consequence landed, and the system
reshaped itself around the answerable question so smoothly that the reshaping
reads as design.

### What the repository looks like today, which is the honest end of the lesson

0185 is two weeks old at the time of writing. Here is the state of play, and it
is three facts rather than one.

**The mechanism exists, is proved, and is never pointed at a real primitive.**
`auditRegistry` takes `{ answers }` — a map from primitive type to the states
each one should be probed in — and `src/sdk/audit.test.ts` holds it to exactly
the pair of claims exercise F below prints: a bound primitive's regions read as
dropped when it is asked about props alone, and the report clears once the
answers that reach them are declared. That suite is the only caller in the
repository that passes `answers`, and the primitive it passes them for is
`loom.bound-listing`, which exists in that file and on no page.

Every audit of a registry of **real** primitives takes one argument. Exercise E
prints the consequence from the audit's own side: five bound primitives, probed
in as many states as their own schemas close over, and **not one of those states
carrying an answer**.

**The library still reads as though the limit held.** `loom.feed`'s header is
the original — *"it cannot supply an answer"*, which was true the day it was
written, beside the sentence saying the limit was filed because the audit is the
framework's. `loom.plate` landed on 6 October, thirteen days after 0185, and
states the rule again as a flat fact about the present: *a bound primitive
declares only the regions it places without an answer, **because `auditRegistry`
cannot supply one***. It can. It has been able to for two weeks, and nothing
anywhere said so to whoever wrote that line.

**And the condition 0185 set for revisiting its own deferred alternative has
been met.** It rejected generating an answer from a declared shape "for now",
and wrote: *worth revisiting if a third bound primitive arrives.* Three more
arrived in one change on 6 October. There are five.

None of that is this lesson's to fix — see the bottom of this file — and none of
it is a defect in the sense of something broken on a page. Every bound primitive
in the library works. What has happened is smaller and harder to see: a rule is
being quoted forward under a reason that expired, and the instrument that was
taught to reach further is still being called the old way by the one suite whose
red started it.

---

## In the code

| file | what to read |
| --- | --- |
| `src/sdk/conformance.ts` | `probeEditableDecoration`'s `every` and `probePlacement`'s `some`, forty lines apart. Then `probeConfigurations`, four lines, and the doc comment on `ProbeConfiguration` that says what `NO_DATA` used to be: *"not a default — it was the only state reachable"*. |
| `src/sdk/audit.ts` | `auditRegistry` and `RegistryAuditOptions`. The header is the reporting bargain — it reports, it does not decide — and `ThrowingConfigurations.everyConfiguration` is a third quantifier choice, made for a third reason. |
| `src/primitives/loom.feed.ts` | The three-state table in the header, `readAnswer`, and the paragraph that explains why no outcome reads as `empty`. The restriction is stated here as the primitive's own shape. |
| `src/primitives/loom.plate.ts` | The same restriction, with the reason 0185 discharged, in a primitive that landed afterwards. |
| `src/primitives/library.test.ts` | Every `auditRegistry(registry)` call in it. Count the arguments. |

| record | what it settles |
| --- | --- |
| [0075](../decisions/0075-a-primitive-is-audited-under-every-shape-its-schema-closes-over.md) | The population the probe derives, and the sum rather than the product. |
| [0180](../decisions/0180-a-primitive-that-draws-an-answer-declares-the-shape-it-can-draw.md) | The clause in decision 3, and the sentence conceding what chose it. |
| [0185](../decisions/0185-a-probe-is-handed-answers-the-way-it-is-handed-props.md) | The discharge, the four rejected alternatives, and the sentence this lesson is named after. |
| [0095](../decisions/0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md) | The seam whose outcome the probe invents, and what a primitive does when told no. |
| [0184](../decisions/0184-a-primitive-may-read-under-whichever-name-a-prop-gives.md) | The declaration that gives the probe a binding's *name*, and why the name was never the hard half. |

---

## Try it

Six exercises. **Predict every output in writing, then run.** Exercise B is
Predict 1 and is the one to commit to hardest; exercise C is the derivation the
middle of this lesson asks you to do rather than read; exercise F is Predict 3
and 4 in one fence.

Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

The shared preamble for all six. One props schema with three closed choices and
one open string, so that the population is the same eight configurations every
time and the only thing that varies is what the component does with them.

```ts
import { createElement } from "react"
import { describe, it } from "vitest"
import { z } from "zod"

import { NO_DATA, nodeDataOf, type NodeData } from "./data/resolution.js"
import { primitiveTypeSchema, type PrimitiveType } from "./primitive-type.js"
import { createStarterPrimitiveRegistry } from "./primitives/index.js"
import type { LoomPrimitiveProps } from "./render/primitive.js"
import { auditRegistry, type RegistryAudit } from "./sdk/audit.js"
import {
  probeConfigurations,
  probeEditableDecoration,
  probePlacement,
  probeStates,
  unasked,
  type ProbeAnswers,
} from "./sdk/conformance.js"
import { definePrimitive, type PrimitiveEntry } from "./sdk/definition.js"
import { createPrimitiveRegistry, type PrimitiveRegistry } from "./sdk/registry.js"

/**
 * One schema for every primitive in this lesson, so the population the probe
 * derives is the same eight configurations each time and the only thing that
 * differs is what the component does with them.
 */
const PROPS = z.object({
  tone: z.enum(["plain", "accent", "warning"]).default("plain"),
  align: z.enum(["start", "end"]).optional(),
  tight: z.boolean().optional(),
  label: z.string().optional(),
})

const registryOf = (...entries: readonly PrimitiveEntry[]): PrimitiveRegistry => {
  const registry = createPrimitiveRegistry(entries)
  if (!registry.ok) throw new Error(`registry refused: ${JSON.stringify(registry.error)}`)

  return registry.value
}

const auditOf = (...entries: readonly PrimitiveEntry[]): RegistryAudit =>
  auditRegistry(registryOf(...entries))

/** `[{ type, slots }]` and `[type]` both read better as one line of names. */
const names = (types: readonly PrimitiveType[]): string => types.join(", ") || "(none)"

const dropped = (entries: readonly { type: PrimitiveType; slots: readonly string[] }[]): string =>
  entries.map(({ type, slots }) => `${type}: ${slots.join(" ")}`).join("; ") || "(none)"

const controls = (
  entries: readonly { type: PrimitiveType; behaviours: readonly string[] }[]
): string => entries.map(({ type, behaviours }) => `${type}: ${behaviours.join(" ")}`).join("; ") || "(none)"

/**
 * A region and the decoration, both placed on one condition — which is the whole
 * variable in this lesson. `always` is the control.
 */
const when = (type: string, keep: (props: z.infer<typeof PROPS>) => boolean): PrimitiveEntry =>
  definePrimitive({
    type,
    description: "A container that keeps its two promises on a condition.",
    props: PROPS,
    slots: ["aside"],
    component: ({ loom, props, children }: LoomPrimitiveProps<z.infer<typeof PROPS>>) =>
      keep(props)
        ? createElement("div", { ...loom.editable }, children, loom.slots["aside"] ?? null)
        : createElement("div", null, children),
  })

const always = when("loom.always", () => true)
const onAccent = when("loom.on-accent", (props) => props.tone === "accent")
const onLabel = when("loom.on-label", (props) => (props.label ?? "") !== "")
const exceptWarning = when("loom.except-warning", (props) => props.tone !== "warning")
const never = when("loom.never", () => false)
```

### Exercise A — the population, and the prop that is not in it

```ts
describe("A", () => {
  it("prints the population the probe derives, and the prop that is not in it", () => {
    const registry = registryOf(always)
    const entry = registry.primitives[0]
    const choices = entry?.choices ?? []
    const configurations = probeConfigurations(choices)

    console.log(`  closed choices: ${choices.map(({ name, options }) => `${name}=${options.join("|")}`).join(", ")}`)
    console.log(`  props the schema accepts: ${Object.keys(PROPS.shape).join(", ")}`)
    console.log(`  configurations: ${configurations.map((props) => JSON.stringify(props)).join(" ")}`)
    console.log(`  how many: ${configurations.length}`)
    console.log(`  their product would be: ${choices.reduce((total, { options }) => total * options.length, 1)}`)
    console.log(`  configurations naming label: ${configurations.filter((props) => "label" in props).length}`)
  })
})
```

```
  closed choices: align=start|end, tight=false|true, tone=plain|accent|warning
  props the schema accepts: tone, align, tight, label
  configurations: {} {"align":"start"} {"align":"end"} {"tight":false} {"tight":true} {"tone":"plain"} {"tone":"accent"} {"tone":"warning"}
  how many: 8
  their product would be: 12
  configurations naming label: 0
```

Three closed choices, sorted by name, and `label` — a prop the schema plainly
accepts — in **zero** configurations. Not in one as a default; in none, as a
thing the probe has no way to pick a value for.

The product line is there to be read beside the count: twelve against eight for
three small choices, which is 0075's bargain at the smallest scale it is visible
at. Lesson 29 is where that trade is argued; what matters here is that both
numbers are about `tone`, `align` and `tight`, and neither is about `label` at
all.

### Exercise B — one primitive, one condition, two verdicts

This is Predict 1. Five containers, identical except for *when* they keep their
two promises — `loom.always` keeps them in every configuration, `loom.on-accent`
in exactly one, `loom.except-warning` in seven of eight, `loom.on-label` in none
the probe tries, and `loom.never` in none at all.

```ts
describe("B", () => {
  it("reports one primitive twice over, and the two reports disagree", () => {
    const audit = auditOf(always, onAccent, exceptWarning, onLabel, never)

    console.log(`  notDecorated: ${names(audit.notDecorated)}`)
    console.log(`  unplacedSlots: ${dropped(audit.unplacedSlots)}`)
    console.log(`  notProbeable: ${names(audit.notProbeable)}`)
  })
})
```

```
  notDecorated: loom.on-accent, loom.except-warning, loom.on-label, loom.never
  unplacedSlots: loom.on-label: aside; loom.never: aside
  notProbeable: (none)
```

**`loom.on-accent` is in the first list and not the second**, and nothing about
the primitive differs between the two questions. One condition, one render in
eight, two opposite answers — because `notDecorated` is `every` failing and
`unplacedSlots` is `some` failing.

`loom.except-warning` is the one to look at next. It carries the handle under
seven configurations out of eight and the verdict is the same flat word
`loom.never` gets. That is what a quantifier costs: it answers the question it
was asked and throws away the count. Whether *seven of eight* would be a better
report is the last thing in **It could have been otherwise**.

And `loom.on-label` is in **both** lists, which is Predict 2. Its condition is
not false; it is unreachable. A page that sets `label` gets the handle and the
region, and the audit has never seen such a page and does not say so.

### Exercise C — which way a bigger population can move each verdict

Each primitive probed twice: under `{}` alone, and under all eight. This is the
monotone/anti-monotone claim, and it is four lines of output rather than an
argument to take on trust.

```ts
describe("C", () => {
  it("prints which way a bigger population can move each verdict", () => {
    const registry = registryOf(always, onAccent, exceptWarning, onLabel, never)
    const one = [unasked({})]

    for (const primitive of registry.primitives) {
      const eight = probeStates(probeConfigurations(primitive.choices))
      const line = (states: typeof one): string => {
        const decoration = probeEditableDecoration(primitive.component, primitive.text, states)
        const placement = probePlacement(primitive.component, primitive.slots, primitive.text, states)
        const placed =
          placement.outcome === "probed"
            ? placement.unplacedSlots.length === 0
              ? "placed"
              : "dropped"
            : placement.outcome

        return `${decoration.outcome} / ${placed}`
      }

      console.log(`  ${primitive.type}`)
      console.log(`    probed under {} alone: ${line(one)}`)
      console.log(`    probed under all ${eight.length}: ${line(eight)}`)
    }
  })
})
```

```
  loom.always
    probed under {} alone: decorates / placed
    probed under all 8: decorates / placed
  loom.on-accent
    probed under {} alone: not-decorated / dropped
    probed under all 8: not-decorated / placed
  loom.except-warning
    probed under {} alone: decorates / placed
    probed under all 8: not-decorated / placed
  loom.on-label
    probed under {} alone: not-decorated / dropped
    probed under all 8: not-decorated / dropped
  loom.never
    probed under {} alone: not-decorated / dropped
    probed under all 8: not-decorated / dropped
```

Read the column that changes. `loom.on-accent` goes **dropped → placed** as the
population grows, and `loom.except-warning` goes **decorates → not-decorated**.
Nothing moves the other way, in either column, for any of the four — and nothing
can:

- a slot placed in some render of the small population is placed in some render
  of the large one, because the small one is a subset;
- a decoration carried in every render of the large population is carried in
  every render of the small one, for the same reason.

So growing the instrument's reach can only ever clear a placement report and only
ever raise a decoration one. That is not a property of these four primitives. It
is a property of `some` and `every`, and it is the whole reason extending the
probe in September was a safe change to make to a library of a hundred
primitives nobody re-read.

### Exercise D — a control the page has and the audit does not

The behaviour case, which is where this matters most in practice: a code panel
whose copy control sits in a caption, and the caption is an open string prop.

```ts
const coded = (type: string): PrimitiveEntry =>
  definePrimitive({
    type,
    description: "A snippet whose copy control is placed beside a caption.",
    props: PROPS,
    text: { copy: "Copy", copied: "Copied" },
    interactive: "always",
    behaviours: ["copy"],
    component: ({ loom, props, children }: LoomPrimitiveProps<z.infer<typeof PROPS>, "copy" | "copied", "copy">) =>
      createElement(
        "figure",
        { ...loom.editable },
        children,
        (props.label ?? "") === ""
          ? null
          : createElement("figcaption", null, props.label, loom.behaviours.copy)
      ),
  })

describe("D", () => {
  it("names a control the page has, and clears it when somebody says where to look", () => {
    const code = coded("loom.code")
    const registry = registryOf(code)
    const primitive = registry.primitives[0]
    if (primitive === undefined) throw new Error("no primitive")

    console.log(`  unplacedBehaviours: ${controls(auditRegistry(registry).unplacedBehaviours)}`)

    const derived = probeConfigurations(primitive.choices)
    const withCaption: readonly ProbeAnswers[] = [{ data: NO_DATA, props: { label: "Install" } }]
    const placement = probePlacement(
      primitive.component,
      primitive.slots,
      primitive.text,
      probeStates(derived, withCaption),
      primitive.behaviours
    )

    console.log(`  states probed with the caption supplied: ${probeStates(derived, withCaption).length}`)
    console.log(
      `  unplaced behaviours then: ${
        placement.outcome === "probed" ? placement.unplacedBehaviours.join(", ") || "(none)" : placement.outcome
      }`
    )
  })
})
```

```
  unplacedBehaviours: loom.code: copy
  states probed with the caption supplied: 9
  unplaced behaviours then: (none)
```

`loom.code: copy` is a report about a primitive that **does** place its control —
on every page that gives it a caption, which is every page anybody would build
with it. The audit is not lying and it is not broken. It is answering *did any
render I performed contain the control*, truthfully, about renders it chose.

The second half is the mechanism 0185 built, used for a prop rather than an
answer: one state supplied by somebody who knows what this primitive does, summed
into the eight, and the report clears. Nine states, not eight. **Nothing about the
primitive changed** — what changed is that the instrument was told where to look.

That is also the clearest view of why the opt-out 0185 rejected is a different
thing. Supplying a state says *probe me here too*; an opt-out says *do not ask*.
The first can only ever clear a false alarm, and leaves the genuine defect this
list exists for — a region the author simply forgot — fully reported. The second
would excuse both, identically, and a list a primitive can opt out of is a list a
host cannot assert empty.

### Exercise E — the library, audited the way its own suite audits it

```ts
describe("E", () => {
  it("prints the library as its own suite audits it", () => {
    const starter = createStarterPrimitiveRegistry()
    if (!starter.ok) throw new Error("the starter library refused to register")
    const registry = starter.value
    const audit = auditRegistry(registry)
    const bound = registry.primitives.filter((primitive) => (primitive.reads ?? []).length > 0)

    console.log(`  primitives registered: ${registry.primitives.length}`)
    console.log(`  primitives that read a binding: ${bound.map((primitive) => primitive.type).join(", ")}`)
    console.log(`  notDecorated: ${names(audit.notDecorated)}`)
    console.log(`  notProbeable: ${names(audit.notProbeable)}`)
    console.log(`  unplacedSlots: ${dropped(audit.unplacedSlots)}`)
    console.log(`  unplacedBehaviours: ${controls(audit.unplacedBehaviours)}`)

    for (const primitive of bound) {
      const entry = audit.audits.find((one) => one.type === primitive.type)
      const probed = entry?.placement.outcome === "probed" ? entry.placement.probed : []
      const answered = probed.filter((state) => Object.keys(state.data).length > 0)

      console.log(
        `  ${primitive.type}: slots ${primitive.slots.join(" ") || "(none)"}, probed in ${probed.length} state${probed.length === 1 ? "" : "s"}, ${answered.length} of them answered`
      )
    }
  })
})
```

<!-- moves: the first two lines of this fence are a second copy of the starter
     library — how many primitives it registers, and which of them declare
     `reads` — and the five per-primitive lines below them are a function of
     each one's props schema, so every one of these moves when `Loom
     primitives` ships or changes a primitive. A red here is this lesson's
     claim following the code rather than drift: re-run E and paste in what it
     prints. The sentence under it beginning "A binding is read by" counts the
     second line and is registered in claims.test.ts, so correcting the fence
     means reading that sentence too. The four empty verdict lists are the
     library being correct and are expected to stay empty; if one of them
     stops being empty, this mark does not cover it and something is wrong. -->

```
  primitives registered: 107
  primitives that read a binding: loom.trend, loom.tally, loom.voices, loom.feed, loom.plate
  notDecorated: (none)
  notProbeable: (none)
  unplacedSlots: loom.trend: unavailable; loom.voices: unavailable; loom.feed: unavailable; loom.plate: unavailable
  unplacedBehaviours: (none)
  loom.trend: slots empty unavailable, probed in 4 states, 0 of them answered
  loom.tally: slots (none), probed in 1 state, 0 of them answered
  loom.voices: slots empty unavailable, probed in 11 states, 0 of them answered
  loom.feed: slots empty unavailable, probed in 7 states, 0 of them answered
  loom.plate: slots empty unavailable, probed in 13 states, 0 of them answered
```

A binding is read by five of them, and the figure to stop on is the last one on
each of those five lines. However many states each was probed in, **none of those
renders had an answer in it.** Every
judgement the library's own suite makes about its bound primitives is a judgement
about the state a page is in before anybody has connected a source.

Three of the four verdict lists above are the library being correct. The fourth
is `unplacedSlots`, and **it stopped being empty on 9 October** — which is this
lesson's subject arriving in its own transcript.

It had been empty for two reasons, and the sentence that used to stand here
named both: *"partly because the components are right and partly because no
bound primitive in this library declares a region the probe cannot reach — which
is the rule, still holding, two weeks after the record that discharged it."* The
second half is what moved.
[0246](../decisions/0246-a-bound-primitives-failure-region-is-a-slot-over-its-declared-sentence.md)
gave `loom.feed`, `loom.trend`, `loom.voices` and `loom.plate` a region they
draw only when their source did not answer. The components are still right. The
audit above is still called the way E calls it — with one argument — so it never
reaches the state that renders those regions, and it reports four declarations
it did not see rendered.

Which is the whole lesson, standing in its own output: **an instrument's reach
is a property of how it was called, and a verdict is a claim about the states
that were tried.** Zero was never a fact about the library; it was a fact about
a library whose regions all happened to be reachable without an answer, and it
read as a fact about the library for two weeks. Hand `auditRegistry` the
`answers` 0185 built and the list is empty again —
`src/primitives/library.test.ts` passes them, and asserts both this four and
that nothing.

> *The transcript and this passage were corrected by `Loom primitives` to keep
> the exercise true. The lesson's own argument is better served than it was, and
> re-teaching it around this is its author's — filed.*

`loom.tally` is worth a glance: probed in **one** state, because its schema
closes over nothing. One render, one claim, and the word *every* and the word
*some* mean exactly the same thing about it. That is the degenerate case the
quantifier question disappears in, and it is where ninety-six of these
primitives sat on the day 0075 was written.

### Exercise F — a correct primitive reported as dropping content

Predict 3 and 4. `loom.listing` is the shape 0180's clause forbids: two declared
regions, one placed when the answer is empty, one placed when the source failed.
It is a perfectly ordinary primitive and there is nothing wrong with it.

```ts
/** The shape 0180 said a bound primitive may not have: a region only a failure places. */
const listing = definePrimitive({
  type: "loom.listing",
  description: "A list that places one region when it is empty and another when the source failed.",
  props: PROPS,
  slots: ["empty", "unavailable"],
  reads: ["entries"],
  component: ({ loom, children }: LoomPrimitiveProps<z.infer<typeof PROPS>>) => {
    const outcome = loom.data["entries"]

    if (outcome?.status === "unavailable")
      return createElement("div", { ...loom.editable }, loom.slots["unavailable"] ?? null)
    if (outcome?.status === "ready" && Array.isArray(outcome.value) && outcome.value.length > 0)
      return createElement("div", { ...loom.editable }, children)

    return createElement("div", { ...loom.editable }, loom.slots["empty"] ?? null)
  },
})

const ROWS: NodeData = nodeDataOf({ entries: { status: "ready", value: ["One", "Two"] } })
const NONE: NodeData = nodeDataOf({ entries: { status: "ready", value: [] } })
const FAILED: NodeData = nodeDataOf({
  entries: { status: "unavailable", unavailable: { reason: "adapter-threw", detail: "the source timed out" } },
})

describe("F", () => {
  it("reports a correct primitive as dropping content, until the audit is handed the states", () => {
    const registry = registryOf(listing)
    const answers = new Map<PrimitiveType, readonly ProbeAnswers[]>([
      [primitiveTypeSchema.parse("loom.listing"), [{ data: ROWS }, { data: NONE }, { data: FAILED }]],
    ])

    for (const [label, options] of [
      ["audited the way the library audits itself", {}],
      ["audited with the three answers supplied", { answers }],
    ] as const) {
      const audit = auditRegistry(registry, options)
      const entry = audit.audits[0]
      const probed = entry?.placement.outcome === "probed" ? entry.placement.probed : []

      console.log(`  ${label}`)
      console.log(`    states probed: ${probed.length}, of them answered: ${probed.filter((state) => Object.keys(state.data).length > 0).length}`)
      console.log(`    unplacedSlots: ${dropped(audit.unplacedSlots)}`)
    }
  })
})
```

```
  audited the way the library audits itself
    states probed: 8, of them answered: 0
    unplacedSlots: loom.listing: unavailable
  audited with the three answers supplied
    states probed: 11, of them answered: 3
    unplacedSlots: (none)
```

**`loom.listing: unavailable`** is the whole of 0180, in one line, reproduced on
today's checkout. A list of certainties, as lesson 29 called it, containing a
primitive that drops nothing. And the author's options at that moment are the
three from Predict 3: fix the probe — somebody else's directory; change the
list — weaken it for everybody; or declare one region instead of two and write
down a reason that sounds like design.

The second block is the discharge. Three answer states supplied by the party that
knows, eleven states instead of eight, three of them answered, and the report is
gone. The primitive did not change. Nothing was excused. The instrument was
pointed at the states that exist.

**And this exercise is not a discovery, which is the part that makes it worth
running.** `src/sdk/audit.test.ts` declares a `loom.bound-listing` of its own and
asserts this same pair — dropped under props alone, clear once the answers are
declared. The mechanism is built, tested, and correct.

So the thing to sit with is not that it does not work. It is that **the first
block is how this library is audited today**, and the only primitive those
answers have ever been supplied for is one that exists in a test file and on no
page. Not because anybody decided the second block was wrong — because supplying
answers is a caller's job, the caller is a suite in another lane, and nothing
goes red when a permission is left unused.

---

## It could have been otherwise

**Cross the configurations instead of summing them.** 0075's own concession, and
it would not reach anything in this lesson. `label` is not in any product of
closed sets, and neither is an answer. Crossing turns forty-eight renders into
two hundred and sixty thousand and finds the one case the sum concedes — a region
placed only under two particular values together — which nothing in the library
is shaped like. It buys the case nobody has and misses both cases this lesson is
about.

**Use `every` for placement too, for consistency.** This is the symmetrical
design and it is the one to understand why nobody wants. It would report every
primitive that places a region conditionally, which is every bound primitive and
`loom.field`. Worse, by exercise C's argument it makes the verdict
**anti-monotone**: teaching the probe about answers would then have turned five
correct primitives into five reports on the day the harness improved, and the
only way to keep the suite green would have been to narrow the library again. The
quantifier is what made September's change cheap.

**Let a registration say "this region is placed on a condition you cannot
reach."** 0185 rejected this and named the cost precisely: it is weaker than
supplying the state, and it would quietly excuse the genuine defect
`unplacedSlots` exists to catch — a region the author simply forgot to place. A
list a primitive can opt out of is a list a host cannot assert empty. Exercise D
is the comparison: supplying a state adds a render, an opt-out removes a
question.

**Generate an answer from a declared shape.** The tidiest version, and 0180
already has every bound primitive carrying a schema for what it reads, so a
generated value is not an invention. Deferred, for two reasons worth separating:
the schema lives *inside* the component rather than on the definition, so it is a
change to `definePrimitive` and to every bound primitive; and a generated
instance of a row shape reaches the **rows** branch and never the empty one,
which is the branch the restriction was about. It would close half the gap and
add a declaration. 0185 said it was worth revisiting at a third bound primitive;
there are five.

**Derive the answer from `reads`.** The probe knows the name, so it could build
an `unavailable` outcome with no help from anybody. Rejected as a half-measure
that reads like a whole one: it reaches the failure branch only, so
`unplacedSlots` would still report a bound primitive's real regions while
appearing to have been taught about answers — which is worse than the honest
limit, because the next person reads the feature and not the branch coverage.

**Report a proportion rather than a boolean.** Mine rather than a record's, and
the one I would most like to be right. `loom.except-warning` carries the handle
in seven renders out of eight and is reported with the same word as a primitive
that carries it in none; a fraction would separate them. What stops it is what
the fraction would be *of*: eight is the size of a population this file chose for
cost reasons, so `7/8` is a number about `probeConfigurations` masquerading as a
number about the primitive, and a reader comparing `7/8` against another
primitive's `3/4` would be comparing two different denominators with no way to
know. A boolean that means *not every render* is a smaller claim and a true one.
Worth the paragraph because declining is a design choice too, and this one is the
same judgement lesson 27 makes about a ceiling nobody computes.

---

## Explain it back

Say these out loud, or write them. No confidence rating here — there is no answer
to check yourself against, and a number would measure how fluent the explaining
felt.

1. Explain to somebody who has read lesson 29 why `unplacedSlots` and
   `notDecorated` quantify oppositely over the same renders, **without using the
   words `some` or `every`**. If you find yourself saying "one is strict and one
   is lenient", you have the shape but not the reason: go back to what each fact
   is used for.

2. Lesson 25 ended on *a remedy that closes the route you found the fault by is
   not a remedy for the fault.* Derive this lesson's shape from it. Both are
   about a check whose population is smaller than the question in somebody's
   head — so say what is different here, in terms of **who changed** in response.

3. Lesson 28 says a fact can get a second copy three ways, and that whoever
   manufactures one sends the bill elsewhere. 0180's clause is a kind of second
   copy: the probe's reach, restated as a property of bound primitives. Say who
   got that bill, in which file, and on what date — and then say what it would
   have taken for the bill to come back to the instrument instead.

4. In your own words: why does *nothing goes red when a limit is discharged*
   follow from the way the limit was recorded, rather than from anybody being
   careless? Then say what a repository could keep that would have gone red — and
   be honest about whether you would want it, given lesson 28's bill.

---

## Self-check

**Rate your confidence 1–5 before you look at each answer.** Closed book. Where
to look is at the bottom of each; go and get it rather than scrolling for a
printed answer, because there is not one.

1. A probe renders a component under eight configurations. State the two
   quantifiers in `conformance.ts`, say which verdict uses each, and give the
   use each fact is put to that decides it.

2. Give the direction a growing population can move each of the two verdicts, and
   then derive both from the quantifier in one sentence each. Say which of the
   two directions made 0185 a cheap change.

3. `tone: z.enum(["plain","accent","warning"])` and
   `label: z.string().optional()` are both props a schema accepts. Say how many
   configurations each contributes, and then say what the verdict about a
   `label`-conditional primitive means — being precise about which of two
   silences it is.

4. Name the one thing on a render context that the probe refuses to invent, and
   give both halves of the reason an invented one would be worthless. Then say
   why `reads` does not help.

5. 0180's clause reads as a design principle in the file where it binds. Say what
   it actually was, name the record that said so, and quote or paraphrase the
   sentence. Then say what property of that clause meant no test went red when
   its reason expired.

6. State the general failure in one sentence beginning *an instrument that cannot
   reach a state*. Then give the three properties that make it hard to see, and
   say which of the three you would expect to bite in a repository with no
   decision records at all.

7. 0185 rejected an opt-out: a registration declaring that a region is placed on
   a condition the probe cannot reach. Give the one-sentence reason, and then say
   what an author is supposed to do instead — and what makes that alternative
   strictly stronger rather than merely different.

8. Exercise E prints five bound primitives and zero answered states. Say what has
   to be true of a caller for that zero to change, say where such a caller would
   live, and say why nothing in this repository fails today because of it.

Where to look: 1, 2 and 4 are `src/sdk/conformance.ts`. 3 is
`probeConfigurations` plus lesson 24. 5 is 0180's decision 3 beside 0185's "Why
`Accepted`". 6 is this lesson. 7 is 0185's alternatives. 8 is every
`auditRegistry` call in `src/primitives/library.test.ts`.

---

## Reflect

Go back to your four predictions.

**Predict 1, and the confidence you put on the two halves matching.** This is the
one worth being wrong about. The ordinary answer is that they match — the
primitive is the same, the condition is the same, one render in eight either way —
and the ordinary answer is a good answer right up to the point where you ask what
each fact is *for*. If you rated it 4 or 5 and got it wrong, that is the most
useful thing on this page: the two facts look like one fact, and they look like
one fact in the source too, forty lines apart in the same file.

**Predict 2.** Did you write "the probe tries `label` at its default"? Most do.
The gap between *one sample* and *no samples* is the gap between a verdict that
means something and a verdict about a page nobody rendered.

**Predict 3.** You had three things you could change and you picked one. Compare
your pick against what happened, and note which pick was *available* to the
person who was blocked: a red test in their own suite, a fix in somebody else's
directory, and a design change in their own hands that makes the red go away.
Then ask what your answer would have been if the probe had belonged to your lane.

**Predict 4.** Did you expect the library to have changed? This is the question
to keep. A record said the restriction no longer binds. Nothing was obliged to
act on that, nothing went red, and a primitive shipped thirteen days later
restating the rule with the expired reason — in a repository that is, by any
reasonable standard, unusually careful about writing down why. Permission is the
one kind of change a test cannot notice.

One thing to carry forward, if you keep only one: **when a check and the thing it
checks are owned by two different people, look at which of them is easier to
change.** That is where the design will quietly go.

---

## Come back to this

Set AN in [`review-schedule.md`](review-schedule.md), two days after this lesson.
Interleaved with 24, 25, 27, 28, 29 and 33 — heavy on 29, because this is its
instrument asked a question it did not need to ask; and on 28, because the rule
at the centre of this lesson is a second copy of a fact about an instrument,
written in another party's file, which is that lesson's bill arriving.

Part V has eighteen seams now, and this one is the first where **the fact is not
missing at all.** Every seam before it is a question somebody cannot answer: the
checker cannot see enough (23), cannot interpret what it sees (24), sees a fact
it may not write down (34), or the only witness runs too late (33). Here the
instrument answers correctly, every time, about exactly what it did.

What is wrong is one layer up, and it is a thing about systems rather than about
trees: **a correct answer to a narrower question, with nothing in the answer
saying it was narrower, is a force acting on whatever is cheapest to move.** It
moved a library. It is still moving one, two weeks after the reason stopped
existing, because the only thing that could have stopped it is somebody reading
two files in two directories on the same afternoon.

The question to carry into a nineteenth seam is therefore about neither reach nor
ownership: **what is this check's population, who chose it, and what has the
system already changed about itself to stay inside it?** The second clause is the
one with teeth. A population chosen for a good reason by somebody careful is
still a population, and the things that moved to fit it will not be filed
anywhere as having moved.
