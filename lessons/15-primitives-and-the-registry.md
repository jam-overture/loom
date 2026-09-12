# 15 — Primitives and the registry: a promise, and who checks it

**After this lesson you will be able to** say what a deployment's registry
actually bounds and what it does not; name the five places a primitive's
registration is acted on, give the *different* question each one answers, and
say which single one of the five prevents rather than detects; explain why
declaring a prop schema is mandatory and why declaring one still restricts
nothing unless the author asked it to; say why building a registry is forbidden
from calling a component and what that forced into a separate function; give the
rule for what the audit is allowed to conclude from one render and what it is
not; and say what the audit has in common with the Gate about the kind of thing
a library is willing to decide.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md), [08](08-two-axes.md), [09](09-the-gate.md),
[10](10-the-pipeline.md), [11](11-the-model-seam.md),
[12](12-projection.md), [13](13-refusal-and-repair.md),
[14](14-rendering.md). The ones this lesson leans on hardest are 09, 12 and 14.

Lesson 14 ended on a loose end and named it:

> a primitive that drops a region it was handed produces no diagnostic here,
> and something has to catch it.

The renderer's whole dependency on a registry is one lookup — `resolve(type)`,
returning a component or nothing. That was the right size for lesson 14 and it
is a lie of omission. Behind the lookup is a set of promises somebody made
about a component, and this lesson is about what those promises are worth.

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Write something for all
five before you look anything up.

1. Lesson 12 defined a projection in one sentence. Write it from memory, then
   say what the catalogue is a projection *of* and name the one thing it throws
   away that everything else in this system keeps. *(12)*
2. The catalogue answers `props: undefined` for one primitive and `props: []`
   for another, and they render as `not declared` and `none`. Say what a model
   reading each one does differently. *(12)*
3. Why does an unknown primitive take its whole subtree with it rather than
   promoting its children? *(14)*
4. Loom cannot build a carousel unless one is registered. Bug, limitation, or
   the point? *(01)*
5. Name the property that puts a field on `CompositionRuntime`. Then say what
   something being an injected *seam* buys that the same thing as a value does
   not. *(05)*

Question 4 has been in your review sets since Set C and this is the lesson that
makes it concrete. Write the answer you have been giving it, in full, before you
read on — you are about to find out whether it was the shape of an answer or an
answer.

---

## Predict

In writing, before reading on.

> 1. `loom.header` declares its props as `z.object({})`. 0011's phrase for that
>    is "a claim rather than a silence". A proposal sets
>    `dangerouslySetInnerHTML` on a `loom.header` node and the Gate accepts it.
>    Write down three things: the render seam's verdict on those props, what the
>    component receives, and what the catalogue had told the model about that
>    prop *before* the proposal was made. Then say what changes if the author
>    had written `z.object({}).strict()`.
>    **Rate your confidence 1–5 before you check.**
>
> 2. A primitive declares a slot named `aside`, and its component never places
>    it. A tree puts three nodes in that region. List every check in this system
>    that could in principle catch the drop, in the order they run, and mark the
>    one that does. Then answer the part that matters: what does the reader see
>    if nobody ran it?
>
> 3. `auditRegistry` can tell you that a registered component is broken. Nothing
>    anywhere in Loom refuses to start because of what it found. Argue that this
>    is a hole in the design, as strongly as you can. Then argue that it is
>    *required* by the same rule that stops the Gate applying a change it
>    approved. **Rate your confidence 1–5 in each argument, separately.**

Predict 3 is this lesson's spine and both arguments are available to you from
Part II alone. If the second one feels impossible to make, you are missing
something lesson 09 spent a whole section on.

---

## The problem

A tree names `loom.card`. That name is a string in a JSON document that a model
proposed, a policy weighed, and a database stored. Somewhere else entirely,
somebody wrote a React component.

Getting from the string to the component is the easy half — it is a map lookup,
and lesson 14 used one. The hard half is everything the string implies and the
map cannot check.

### The tree's side and the deployment's side disagree about what a type is

From the tree's side, `loom.card` is an identifier with a grammar
(`primitive-type.ts`) and no meaning. §1 validates the shape of the string and
deliberately stops there, so that the AST does not depend on any particular
component library — a decision from the very first record, and the reason a
tree written against one deployment is legible against another.

From the deployment's side, `loom.card` is a promise: *there is a component,
it accepts these props, it projects these regions, and it behaves the way the
runtime needs it to.* Four claims, and the tree carries none of them.

Between those two sides sits a third party who is not in the room: the model,
which has to choose a type before there is anything to look at.

### The three failures, and how differently they fail

Consider what can go wrong, and notice that these are not variants of one
problem.

**The model names something that does not exist.** Without help, its only
source of types is the tree in front of it, so the first use of any primitive is
a guess. Lesson 14 showed what the guess costs at render time: the node and its
subtree are gone, one diagnostic, a hole in a page.

**The tree's props do not match what the component expects.** The props were
authored by a model, weighed against a policy, and stored — possibly against a
schema this deployment no longer runs. A component's TypeScript types say what
it expects; nothing so far in this course has made that true at runtime.

**The component does not do what its registration said it would.** It declares
`aside` and never places it. It ignores `loom.editable` and becomes invisible to
the portal. It renders beautifully and quietly drops half of what it was handed.

The first is a *bound* problem — it is about what may be proposed at all. The
second is a *data* problem — it is about a document meeting a schema. The third
is a *behaviour* problem, and it is the awkward one: it cannot be read off any
declaration, because the whole failure is the gap between a declaration and the
code beside it.

### Nothing that reads code can catch the third one

This is worth sitting with, because it is where the design becomes interesting.

You cannot type "this component spreads this object onto its root element". You
cannot check it by parsing. The only way to find out what a component does with
what it is handed is to hand it something and look at what comes back — which
means calling somebody else's render code, which is a thing a library should be
very careful about doing on its own initiative.

So the three failures cannot be answered in one place, by one mechanism, at one
time. What follows is what happens when you accept that instead of fighting it.

---

## The idea

### A registration is a set of claims, and each one is acted on somewhere else

Here is the whole shape of the lesson in one table. Read it once now; the rest
of this section is the argument for each row.

| What is checked | Where | When | What it can do |
| --- | --- | --- | --- |
| The component agrees with its own schema | `definePrimitive` | You compile | Refuse to compile |
| The declaration is coherent with itself | `createPrimitiveRegistry` | You build a registry | Return `err`; there is no registry |
| The tree's props match the declaration | the render seam | Every request | Omit the node, emit a diagnostic |
| The component behaves as declared | `auditRegistry` | A test or a build step | Return a list. Stop nobody. |

Four checks, four times, four powers — and none of them subsumes another,
which is why there are four. But the table is missing the most important row,
because it is not a check at all:

| What is *stated* | Where | When | What it can do |
| --- | --- | --- | --- |
| The set of types that exist here | the catalogue, in the prompt | Before anything is proposed | Prevent |

Every row above detects a failure that has already happened. The catalogue is
the only one that stops it happening, and it is the only one with no enforcement
anywhere in it.

### The registry is the bound, and stating it is the whole trick

Warm-up 4 asked whether "Loom cannot build a carousel unless one is registered"
is a bug, a limitation, or the point. The answer you have been giving since
lesson 01 is *the point*: narrowing what AI may produce is the trade the whole
system is built on.

That answer is right and it is incomplete, and 0013 is where the missing half
lives. A bound that nobody states is not a bound; it is a trap. Before 0013, a
model asked for a buy button had three bad options — invent
`commerce.buy-button` and hope, reuse a card and call it a button, or answer
`not-understood` for a request the deployment could in fact satisfy. The bound
existed. It was discovered by being refused.

So the registry is projected into a `PrimitiveCatalogue` and the catalogue goes
into the prompt, ahead of the tree. One line per primitive: type, description,
prop names with `?` on the optional ones, slot names.

The consequence that is easy to skate past: **the catalogue is part of the
prompt, so it is part of the prompt hash.** Two deployments with different
registries cannot produce the same provenance for the same utterance. "Which
primitives were available when this was proposed" stops being something you
reconstruct and becomes something you read. That is lesson 07's separation
paying out somewhere lesson 07 never looked.

Notice also what the catalogue is *not*. It carries no schemas, no types, no
components — a projection throws away code, which is exactly what makes it able
to leave the process (12). And it is optional and absent by default: a host who
wires no catalogue gets exactly the behaviour of the system before 0013.
Nothing is invented to fill the gap.

### Declaring is mandatory. Restricting is not.

`PrimitiveDefinition.props` is required. There is no "unvalidated" option and no
gradual-adoption escape hatch, and the argument is the one that shows up
everywhere an option would be tempting: *the deployments that most need checking
are the ones that would skip it.* A primitive that declines to say what it
accepts is asking a deployment to trust a model's guess about its own internals.

A primitive that genuinely takes no props says so with `z.object({})`, which is
a claim rather than a silence.

Now the part that surprises most readers, and it is Predict 1. A Zod object
schema, by default, **accepts unknown keys**. So `z.object({})` is a claim about
what the primitive *reads* and not a restriction on what the tree may *carry*.
The catalogue will say `props: none` — which is honest about the declaration —
and the render seam will hand that primitive a bag containing anything at all,
with a verdict of `valid`.

Is that a hole? No, and the reason is 0009, two records earlier. Props arrive
in a **bag**. They are never spread onto the component's own props, so
`dangerouslySetInnerHTML` in a tree reaches the bag and stops there — inert,
tested, and inert whether or not anyone declared anything. Strictness turns an
inert prop into a *refused node*, one step earlier and with a diagnostic naming
it. Whether a primitive is strict is its author's call, and both answers are
defensible.

The general form is worth having: **the declaration is what a reader is told;
the schema is what the seam enforces; the bag is what makes the gap between
them survivable.** Three different jobs that a careless reading collapses into
one.

### Validation is a predicate, not a codec

The render seam parses the props against the declared schema and **throws the
parse output away.** What the component receives is the tree's props, unchanged
— no defaults applied, no coercion, nothing.

That looks like leaving value on the table. Every form library in existence
returns the parsed value, and it is genuinely more ergonomic. 0011 calls it the
closest call in the record, and rejects it for one reason:

> the same tree renders differently on two deployments, and a page's content
> cannot be read off the tree.

Which is the property that makes a delta reviewable, attributable and
reversible in the first place. A schema that supplied a default would make the
rendered page a function of the deployment's schema version *as well as* the
tree — and lesson 14's whole claim, that the tree is the page, would become
approximately true, which is the same as false.

Defaults therefore live inside primitives, where presentation lives. An author
who wants `variant="plain"` when the tree omits it writes that in the component.

### Building a registry may not call a component

0010 asked §4 to catch an undecorated primitive "at registration, not as a
runtime surprise". Taken literally, that means `createPrimitiveRegistry` calls
every registered component while the module graph is still evaluating.

Two things go wrong, and they are different kinds of wrong.

**It runs somebody else's render as a side effect of an import.** A library that
does that has made a decision about the host's process that the host never
agreed to.

**It cannot work anyway.** A component that uses hooks cannot be called outside
a renderer at all. Registration would fail for a reason that has nothing to do
with whether the contract is met — the worst kind of failure, because the
message would be about the wrong thing.

So the decision is a split, and the split is the interesting artefact:

- **`createPrimitiveRegistry` is pure.** It validates identifiers, refuses
  duplicates, checks that a declaration is coherent with itself, and builds
  lookups. It never touches a component. Importing a registry has no side
  effects, and registration cannot fail for a reason unrelated to registration.
- **`auditRegistry(registry)` is a function a host calls**, in a test or a build
  step, where a failure stops a release rather than a request.

Everything checkable by reading moved to the first. Everything requiring a call
moved to the second. That is a boundary drawn along *what a check costs*, which
is an unusual axis to draw one on and the right one here.

### What one render is allowed to prove

The probe calls a component and looks at what came back. Three claims come out
of it, and they do not resolve the same way — which is 0075, and it is the
subtlest thing in this lesson.

A primitive whose rendering turns on a prop has more than one shape.
`loom.field` renders children only when its `type` is `select`, because only a
select has choices. Probed at its default, it places nothing and is reported a
leaf: "this primitive has nowhere to put a child node", which is false, and
false in a way a portal would act on.

So the probe runs under **every configuration the primitive's own schema closes
over** — the values that can be *listed* rather than invented. A `z.enum`'s
members. Both values of a `z.boolean`. Looking through `.optional()`,
`.default()` and `.nullable()`, which change whether a prop is present and not
which values it accepts. A string, a number or a record has no enumerable set,
and picking one would make the audit's answer a function of the guess.

Then each claim resolves the way *that claim's failure mode* requires:

| Claim | Resolved | Because |
| --- | --- | --- |
| renders children | true if **any** configuration placed them | "has nowhere to put a child" is refuted by one shape that takes one |
| a declared slot is unplaced | only if **no** configuration placed it | same shape of claim, same refutation |
| decoration | must hold under **every** configuration | it is a promise, not a capability |

Read that table again as three sentences about existence and universality, not
as three facts about an audit. A capability is proved by one witness. A promise
is broken by one counterexample. The audit is careful about which of the two
each claim is, and getting that backwards is how you ship a report that is
confidently wrong in both directions at once.

And the configurations are the **sum** of the closed choices, not their
product. The starter library today is 61 primitives and 402 configurations; the
product would be unbounded, and a schema with six enums of eight members would
be a quarter of a million renders. The record names what the sum misses — a
primitive that places children only when two particular values are set together
is still reported a leaf — rather than leaving it to be discovered. You will
meet that limit yourself in Exercise E.

### "I cannot tell you" is a value in this system, over and over

A component that throws when called outside a renderer answers
`not-probeable` — a third verdict, not a failure. A hook-using component and a
class component are both legitimate primitives; the probe simply cannot judge
them, and saying so is more useful than a pass or a fail it did not earn.

Stop and count how many times you have now seen this exact move:

- `props: undefined` in the catalogue, distinct from `props: []` — *I cannot
  enumerate these* is not *there are none* (12).
- `PropsVerdict.undeclared`, distinct from `valid` and `invalid` — *no schema
  is registered for this type* is not *these props are fine*.
- `unavailable` with a reason on a data binding, distinct from absent — *we
  could not reach your services* is not *you have no services*.
- `not-probeable`, distinct from `decorates` and `not-decorated`.

Four seams, four places where the obvious two-valued answer was rejected. It is
the same argument every time: a consumer acts differently on ignorance than on
either answer, so a shape that cannot express ignorance guarantees that
somebody, eventually, acts on a fact nobody established.

`decorationFromAudit` shows what acting on it looks like. `not-probeable` counts
as decorating, because the probe said it could not answer and a portal that
queries the DOM for a handle can degrade when it misses; a type absent from the
audit entirely counts as *not* decorating, because an unregistered type renders
as nothing at all and its whole subtree is missing from the DOM. Two judgement
calls, each argued from the failure it produces rather than from a default.

### The audit reports; it does not decide

Nothing in the SDK refuses to run over a `not-decorated` primitive.
`notDecorated` is a list, and it is there to be asserted empty by a host that
cares.

Predict 3 asked you to argue that this is a hole. The argument is easy and it is
strong: the library knows the component is broken, and it lets it through.

Now the other side, which is 0012's, and which you have met before. **Whether
`not-decorated` matters depends on whether the deployment has a portal at all**
— and the SDK does not know that and cannot find out. A library that failed the
build would be deciding, on behalf of every host, that a capability it cannot
see is required.

That is lesson 09's rule, in a different subsystem and a different decade of the
codebase. The Gate reaches a verdict and does not apply anything; the runtime
measures and does not judge; the render seam produces diagnostics and does not
decide whether to serve the page. Here the audit produces lists and does not
decide whether to ship. Every one of those is the same refusal: **the library
answers questions it can answer, and hands back the ones whose answer depends on
facts it does not have.**

The price is stated plainly rather than hidden: a host that never runs the audit
gets no protection at all. Which is why `describeRegistryAudit` produces a
string fit to be a failing test's output — the intent is that hosts wire it
once, and the design's job is to make wiring it once obvious rather than to make
it compulsory.

### The probe is honest about being a probe

One last property, and it is a small piece of intellectual hygiene worth
copying.

The probe searches the elements a component returned for the attributes it
supplied, following `children` and recognising the runtime's own object by
identity when it is handed on to another component. A primitive that copies the
decoration into a prop of its own naming reads as `not-decorated` — a **false
negative**, and it is tested and documented rather than papered over.

A checker that overstates what it proved is worse than one that does less. This
one says what it is: a probe.

---

## In the code

**`src/primitive-type.ts`** — the grammar. One pattern for every name a tree
uses to reach something a deployment registered — a primitive, a data source, a
submission endpoint — because "the sameness is the point". Read the comment on
`NAMESPACED_ID_PATTERN`; a second grammar would claim those are different kinds
of name when they are not.

**`src/sdk/definition.ts`** — `PrimitiveDefinition` and `definePrimitive`. The
registration contract. The doc comment lists each field with the thing
downstream that cannot work without it, which is the right way to read it: no
field is here because it seemed useful. Note the one narrowing cast in the SDK
and the paragraph arguing it is sound.

**`src/sdk/registry.ts`** — `createPrimitiveRegistry`. Pure, fallible, and
satisfying four renderer-facing interfaces at once. `describeRegistryError` is
worth reading on its own: every message says what would go wrong, not what is
wrong. `"loom.card" is registered twice; a tree naming it would resolve to
whichever registration won.`

**`src/catalogue.ts`** — `catalogueFields` and `closedChoices`. Two functions
reading the same object schema through the same public Zod surface, for two
completely different consumers: a model, and a probe.

**`src/sdk/catalogue.ts`** — `catalogueOf`, and read the first line of its
comment: *the one function that turns a registry into something that can leave
the process.*

**`src/sdk/conformance.ts`** and **`src/sdk/audit.ts`** — the probe and what is
made of it. `probeConfigurations` is four lines and is the whole of 0075.

**`src/render/props.ts`** — 46 lines, and the sharpest statement of the
predicate-not-codec rule anywhere in the repository.

**`src/primitives/`** — the starter library: 61 registered primitives, each in a
file named after its type verbatim, dots included (0015). The filename *is* the
type, which is what makes the registry module regenerable from the directory
rather than hand-maintained.

---

## Try it

Six exercises. Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

**Predict every output in writing, then run.** Exercises B and E have answers
that most readers do not write down, and those two are the exercises.

The shared preamble for all six:

```ts
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, it } from "vitest"
import { z } from "zod"

import { renderCatalogue } from "./interpretation/index.js"
import type { LoomPrimitiveProps } from "./render/index.js"
import { describeRenderDiagnostic, renderLoomTree } from "./render/index.js"
import {
  auditRegistry,
  catalogueOf,
  createPrimitiveRegistry,
  definePrimitive,
  describeRegistryAudit,
  describeRegistryError,
  probeConfigurations,
} from "./sdk/index.js"
import { testDefinitions, registryOf } from "./testing/definitions.js"
import { sampleTree } from "./testing/fixtures.js"
```

### Exercise A — the bound, printed

```ts
describe("A", () => {
  it("projects the registry and refuses two registrations", () => {
    const registry = registryOf(testDefinitions)

    console.log(renderCatalogue(catalogueOf(registry)))
    console.log("---")
    console.log(JSON.stringify(catalogueOf(registry)[1], null, 0))

    const badName = createPrimitiveRegistry([
      definePrimitive({
        type: "Loom.Card",
        description: "a card",
        props: z.object({}),
        component: () => null,
      }),
    ])
    const duplicate = createPrimitiveRegistry([...testDefinitions, testDefinitions[2]!])

    console.log("---")
    console.log("badName ok?", badName.ok)
    if (!badName.ok) console.log(" ", describeRegistryError(badName.error))
    console.log("duplicate ok?", duplicate.ok)
    if (!duplicate.ok) console.log(" ", describeRegistryError(duplicate.error))
  })
})
```

The output:

```
- loom.page — The page shell; everything else lives inside it. props: subtitle?, title slots: main
- loom.header — The banner at the top of a page. props: none
- loom.card — A bounded block of related content. props: elevation?, variant
- loom.footer — The closing band at the bottom of a page. props: none
---
{"type":"loom.header","description":"The banner at the top of a page","props":[],"slots":[]}
---
badName ok? false
  "Loom.Card" is not a valid primitive type — expected dot-namespaced kebab-case, like "commerce.product-card"
duplicate ok? false
  "loom.card" is registered twice; a tree naming it would resolve to whichever registration won
```

Four lines of text. **That is the entire statement of what AI may build in this
deployment** — everything a model is told about the vocabulary it must compose
in. For the real starter library it is 61 lines and 9,379 characters, which is
worth holding onto the next time the bound feels like an abstraction.

Both refusals are `Result`s, and neither has anything to do with a component.
Read the duplicate message again: it does not say what is wrong, it says what
would go wrong. A tree's meaning would depend on module evaluation order.

### Exercise B — what a declaration actually refuses

This is Predict 1.

```ts
describe("B", () => {
  it("shows what each declaration actually refuses", () => {
    const registry = registryOf(testDefinitions)
    const v = (type: string, props: Record<string, unknown>): void => {
      const verdict = registry.validateProps(type as never, props as never)
      console.log(type, JSON.stringify(props), "->", JSON.stringify(verdict))
    }

    v("loom.header", { dangerouslySetInnerHTML: { __html: "<script>x</script>" } })
    v("loom.header", { anything: "at all", nested: { deep: true } })
    v("loom.card", { variant: "outlined", elevation: 1 })
    v("loom.card", { variant: "outlined", dangerouslySetInnerHTML: "x" })
    v("loom.card", { variant: "glowing" })
    v("loom.page", { title: "Home", unexpected: 1 })
    v("loom.carousel", { slides: 3 })
  })
})
```

`loom.header` declares `z.object({})`. `loom.card` declares
`z.object({ variant: z.enum([...]), elevation: z.number().optional() }).strict()`.
`loom.page` declares an ordinary non-strict object. Predict all seven verdicts
before you run.

The output:

```
loom.header {"dangerouslySetInnerHTML":{"__html":"<script>x</script>"}} -> {"outcome":"valid"}
loom.header {"anything":"at all","nested":{"deep":true}} -> {"outcome":"valid"}
loom.card {"variant":"outlined","elevation":1} -> {"outcome":"valid"}
loom.card {"variant":"outlined","dangerouslySetInnerHTML":"x"} -> {"outcome":"invalid","issues":[{"path":"props","message":"Unrecognized key(s) in object: 'dangerouslySetInnerHTML'"}]}
loom.card {"variant":"glowing"} -> {"outcome":"invalid","issues":[{"path":"variant","message":"Invalid enum value. Expected 'outlined' | 'filled', received 'glowing'"}]}
loom.page {"title":"Home","unexpected":1} -> {"outcome":"valid"}
loom.carousel {"slides":3} -> {"outcome":"undeclared"}
```

**The catalogue says `loom.header` has `props: none`, and `loom.header` accepts
everything.** Both of those are true and neither is a bug. The catalogue reports
the declaration; the seam enforces the schema; and a non-strict Zod object is a
schema that says "these are the props I read", not "these are the props that may
exist". The gap between those two sentences is survivable only because of the
bag: `dangerouslySetInnerHTML` reaches `props` and goes no further, on a strict
primitive and a lax one alike.

Three more things in that output worth a note each.

**The two `loom.card` failures have different `path` values** — `props` for the
unrecognised key, `variant` for the bad enum. A whole-bag fault and a per-field
fault are told apart in the shape, not in the prose.

**Zod's message quotes the rejected value.** `received 'glowing'` is
AI-authored content, now inside a diagnostic. 0011 names the consequence:
diagnostics are content-bearing, and a telemetry pipeline must treat them as
such rather than as safe constants.

**`loom.carousel` is `undeclared`, not `invalid`.** Nobody registered it, so
there is nothing to be wrong about. That is the third-value move again, and
Exercise F shows what the renderer does with it.

### Exercise C — registration cannot fail for a reason unrelated to registration

```ts
describe("C", () => {
  it("registers a component that cannot be called", () => {
    const exploding = definePrimitive({
      type: "loom.exploding",
      description: "Throws whenever it is rendered",
      props: z.object({ tone: z.enum(["calm", "loud"]).optional() }),
      component: () => {
        throw new Error("boom")
      },
    })

    const built = createPrimitiveRegistry([exploding])
    console.log("registry built?", built.ok)

    if (!built.ok) return

    const audit = auditRegistry(built.value)
    console.log(describeRegistryAudit(audit))
    console.log("throwsOnDeclaredProps:", JSON.stringify(audit.throwsOnDeclaredProps))
    console.log("notProbeable:", JSON.stringify(audit.notProbeable))
    console.log("notDecorated:", JSON.stringify(audit.notDecorated))
  })
})
```

The output:

```
registry built? true
loom.exploding: could not be probed (threw under every configuration probed: {} (boom), {"tone":"calm"} (boom), {"tone":"loud"} (boom)); placement not probed (threw under every configuration probed: {} (boom), {"tone":"calm"} (boom), {"tone":"loud"} (boom))
throwsOnDeclaredProps: [{"type":"loom.exploding","failures":[{"props":{},"reason":"boom"},{"props":{"tone":"calm"},"reason":"boom"},{"props":{"tone":"loud"},"reason":"boom"}],"everyConfiguration":true}]
notProbeable: ["loom.exploding"]
notDecorated: []
```

A component that throws unconditionally **registers fine**. That is the purity
rule with a face on it: nothing in `createPrimitiveRegistry` calls it, so
nothing in `createPrimitiveRegistry` can find out.

It is in **both** lists, and the second one carries a flag. `notProbeable` says
the probe never got an answer; `throwsOnDeclaredProps` says what it threw on,
under `everyConfiguration: true`. Write down, before reading on, what that flag
has to be *for* — a list that reports everything and distinguishes nothing would
not need one.

Here is what it is for, and it is the distinction the two lists exist to hold
apart. `everyConfiguration: false` means some configurations rendered and this
one threw: the component is callable and a value its own schema accepts crashes
it. **Certain**, and Exercise E produces it. `everyConfiguration: true` means
nothing answered at all — and from outside a renderer, a broken component and a
*hook-using* one are indistinguishable. Both are functions, both throw, and the
error React raises for a hook outside a render is a message rather than a type.
A hook-using component is a legitimate primitive
([0012](../decisions/0012-conformance-is-probed-and-reported-not-enforced.md)),
so the audit reports rather than concludes.

Which means a host reads the two halves differently: one with no hook-using
primitives asserts the whole list empty, and one that ships them asserts the
`false` half and reads the rest.

**This is the paragraph that used to teach the opposite**, and the reason is
worth more than the correction. Run on 24 August, this exercise printed
`throwsOnDeclaredProps: []` — the component that throws on *every* value its
schema accepts was absent from the list whose stated purpose is the fault where
*a tree the validator accepts can take the page down*. The most extreme
instance of the fault was missing from the list that names the fault, and it was
sitting instead in the one list a host cannot assert empty, beside the class and
hook-using components that belong there.

That was filed, and it became
[0090](../decisions/0090-a-probe-that-declines-says-whether-it-got-as-far-as-calling.md),
which draws the line at *whether the probe got as far as calling the component*
and adds the flag rather than the silence. So the transcript above is the second
answer this exercise has given, and the first one is why the design changed.
Neither reading was a misunderstanding of the code; the code was wrong, and
running it is how anybody found out.

And `notDecorated` being empty is still the point of the three-valued design. A
host asserting `notDecorated` is empty is asserting something true. It is not
asserting that everything is fine.

### Exercise D — a promise kept and a promise dropped

```ts
describe("D", () => {
  it("audits two primitives that keep half their promise", () => {
    const forgetful = definePrimitive({
      type: "loom.forgetful",
      description: "Renders, but ignores everything the runtime hands it",
      props: z.object({}),
      slots: ["aside"],
      component: ({ children }: LoomPrimitiveProps) => createElement("div", null, children),
    })

    const careful = definePrimitive({
      type: "loom.careful",
      description: "Places its region and decorates its root",
      props: z.object({}),
      slots: ["aside"],
      component: ({ loom, children }: LoomPrimitiveProps) =>
        createElement("section", { ...loom.editable }, children, loom.slots.aside),
    })

    const built = createPrimitiveRegistry([forgetful, careful])
    if (!built.ok) return

    const audit = auditRegistry(built.value)
    console.log(describeRegistryAudit(audit))
    console.log("---")
    console.log("notDecorated:", JSON.stringify(audit.notDecorated))
    console.log("unplacedSlots:", JSON.stringify(audit.unplacedSlots))
    console.log("leaves:", JSON.stringify(audit.leaves))
  })
})
```

The output:

```
loom.forgetful: does not spread loom.editable — it will be invisible to the portal; declares aside and does not place it
loom.careful: spreads loom.editable; renders its children
---
notDecorated: ["loom.forgetful"]
unplacedSlots: [{"type":"loom.forgetful","slots":["aside"]}]
leaves: []
```

This is Predict 2's loose end from lesson 14, caught. The two primitives are
four lines apart and the difference between them is entirely in what they do
with `loom` — a thing no schema, no type and no registration check can see.

Read `describeRegistryAudit`'s first line as prose written for a person who has
to fix something: *does not spread loom.editable — it will be invisible to the
portal.* Not "conformance failure". Not a code. The consequence.

And read the second half of the audit's own doc comment while you are here:
`unplacedSlots` "loses content rather than a handle, so a host with no portal at
all still wants it empty". Two lists, two different arguments for caring,
because they fail differently.

### Exercise E — what the probe can and cannot see

Both primitives here declare the same schema — one enum and one boolean.

```ts
describe("E", () => {
  it("probes every shape the schema closes over", () => {
    const schema = z.object({
      kind: z.enum(["text", "select"]).optional(),
      required: z.boolean().optional(),
    })

    const conditional = definePrimitive({
      type: "loom.conditional",
      description: "Places its region only when it is a select",
      props: schema,
      slots: ["options"],
      component: ({ loom, props, children }: LoomPrimitiveProps<z.infer<typeof schema>>) => {
        if (props.required === true && props.kind === "select") throw new Error("no")

        return createElement(
          "label",
          { ...loom.editable },
          children,
          props.kind === "select" ? loom.slots.options : null
        )
      },
    })

    const single = definePrimitive({
      type: "loom.single",
      description: "Throws on one value its own schema accepts",
      props: schema,
      slots: ["options"],
      component: ({ loom, props, children }: LoomPrimitiveProps<z.infer<typeof schema>>) => {
        if (props.kind === "select") throw new Error("no")

        return createElement("label", { ...loom.editable }, children, loom.slots.options)
      },
    })

    console.log("choices:", JSON.stringify(conditional.choices))
    console.log("configurations:", JSON.stringify(probeConfigurations(conditional.choices)))

    const built = createPrimitiveRegistry([conditional, single])
    if (!built.ok) return

    const audit = auditRegistry(built.value)
    console.log(describeRegistryAudit(audit))
    console.log("unplacedSlots:", JSON.stringify(audit.unplacedSlots))
    console.log("throwsOnDeclaredProps:", JSON.stringify(audit.throwsOnDeclaredProps))
  })
})
```

Before you run: write down how many configurations a schema with one two-member
enum and one boolean produces, and then write down what the audit says about
each of the two primitives. `loom.conditional` throws only when `required` is
`true` *and* `kind` is `select`. `loom.single` throws whenever `kind` is
`select`.

The output:

```
choices: [{"name":"kind","options":["text","select"]},{"name":"required","options":[false,true]}]
configurations: [{},{"kind":"text"},{"kind":"select"},{"required":false},{"required":true}]
loom.conditional: spreads loom.editable; renders its children
loom.single: spreads loom.editable; renders its children; threw on {"kind":"select"} (no)
unplacedSlots: []
throwsOnDeclaredProps: [{"type":"loom.single","failures":[{"props":{"kind":"select"},"reason":"no"}],"everyConfiguration":false}]
```

**Five configurations, not eight.** The sum of the choices — the default, then
each value one at a time — never the product. If you wrote 8, you predicted the
complete answer rather than the affordable one.

**`loom.conditional` is reported clean, and it is not clean.** It throws on
`{ kind: "select", required: true }`, which its own schema accepts, and no probe
ever built that object. This is the limit 0075 names in its consequences rather
than leaving to be found: *a combination is not probed.* You have just found it
anyway, which is the better way to know it.

**`loom.single` is caught, and named rather than counted.** The failure carries
`{"kind":"select"}` — the whole reproduction, in the report, because a person
reading it has to reproduce it. And it carries `everyConfiguration: false`: this
is the certain half of the list from Exercise C, the one a host asserts empty
whatever else it ships, because something rendered and this configuration did
not.

**Neither slot is reported unplaced**, and this is the row of the table you
should check your prediction against. `loom.conditional` places `options` under
exactly one of five configurations. One witness is enough, because "this
primitive never places its region" is refuted by a single shape that does.

If you now want the product probed, read 0075's rejection of it before you
decide: `loom.field` alone would be 704 renders, and a schema with six enums of
eight members a quarter of a million. Then read the second half of the argument,
which is the one that actually settles it — a primitive whose children appear
only under two particular values together is a primitive nobody can read.

### Exercise F — four checks and one render

```ts
describe("F", () => {
  it("renders a tree the registry only half agrees with", () => {
    const registry = registryOf(testDefinitions)
    const { tree } = sampleTree()

    const out = renderLoomTree(tree, { resolver: registry, validator: registry })
    console.log("clean:", out.diagnostics.length, "diagnostic(s)")
    console.log(renderToStaticMarkup(out.element))

    const noValidator = renderLoomTree(tree, { resolver: registry })
    console.log("no validator:", noValidator.diagnostics.length, "diagnostic(s)")

    const partial = registryOf([testDefinitions[0]!, testDefinitions[1]!, testDefinitions[3]!])
    const gapped = renderLoomTree(tree, { resolver: partial, validator: partial })
    console.log("partial registry:", gapped.diagnostics.length, "diagnostic(s)")
    for (const d of gapped.diagnostics) console.log("  -", d.code, "—", describeRenderDiagnostic(d))

    const resolverOnly = { resolve: registry.resolve }
    const mismatched = renderLoomTree(tree, { resolver: resolverOnly, validator: partial })
    console.log("mismatched seams:", mismatched.diagnostics.length, "diagnostic(s)")
    for (const d of mismatched.diagnostics) console.log("  -", d.code, "—", describeRenderDiagnostic(d))
    console.log("card still on the page?", renderToStaticMarkup(mismatched.element).includes("Body copy"))
  })
})
```

The last case is the one to predict carefully: a resolver that knows
`loom.card` wired against a validator that does not.

The output:

```
clean: 0 diagnostic(s)
<main data-props="{&quot;title&quot;:&quot;Home&quot;}"><header data-props="{}">Welcome</header><footer data-props="{}"></footer><article data-props="{&quot;variant&quot;:&quot;outlined&quot;,&quot;elevation&quot;:1}">Body copy</article></main>
no validator: 0 diagnostic(s)
partial registry: 1 diagnostic(s)
  - unknown-primitive — no primitive is registered for "loom.card", so node n_4 and its subtree were omitted
mismatched seams: 1 diagnostic(s)
  - props-undeclared — no prop schema is registered for "loom.card", so node n_4 rendered with unchecked props
card still on the page? true
```

Three different states, three different treatments.

**No validator: zero diagnostics, and nothing was checked.** Not one warning.
0011 is explicit about why — a validator is a separate interface precisely so
that "this deployment checks AI-authored props" is a visible wiring decision at
the composition root, and a library that nagged about a choice the host made
would be second-guessing the choice. The cost is real and it is stated: silence
is what not wiring it looks like.

**Partial registry: the node and its subtree are gone.** Lesson 14's rule,
unchanged. "Body copy" goes with the card.

**Mismatched seams: the node renders, with a diagnostic.** This is the case
worth understanding. `props-undeclared` is not the tree's fault — the tree did
nothing that a correctly-wired deployment would refuse — so refusing to render
would punish a page for a composition-root mistake. Two seams disagreeing is a
fault of whoever wired them, it is reported as such, and the page stays up.

Now put those beside each other and read the fourth column of this lesson's
first table again. The same underlying condition, *this deployment does not
fully know this type*, produces a missing subtree in one wiring and a rendered
node with a note in another — because the two wirings mean different things
about who made the mistake.

---

## It could have been otherwise

Seven, drawn from 0009, 0011, 0012, 0013 and 0075. Several are the most
instructive rejections in the repository.

**Make declaring a prop schema optional, so adoption can be gradual.**
Rejected. The one thing every primitive must state is what a model may set on
it, and making that optional means the deployments that most need checking are
the ones that skip it. Hosts who want no checking already have
`staticPrimitiveResolver` and no validator — an explicit choice rather than a
default.

**Render with the parse output, so schemas can default and coerce.** Rejected,
and 0011 calls it the closest call. It is ergonomic and it is how every form
library works. It also means two deployments render the same revision
differently, and a page's content stops being readable off the tree.

**Generate a JSON Schema per primitive and constrain the model's reply to it.**
Rejected for now, and the most interesting rejection in 0013 — it would make an
invalid prop *unrepresentable* rather than merely refused. It needs a recursive,
per-primitive output schema, which is exactly the structured-output limitation
0004 worked around by unrolling. Revisit if invalid-prop diagnostics turn out to
be common in telemetry. Note what that condition is: a design decision waiting
on a measurement, which is what lesson 07's separation is *for*.

**Send the Zod schemas to the model as text.** Rejected: it leaks a schema's
implementation into a prompt, invites a model to reason about refinements it
cannot see the code for, and costs tokens proportional to schema complexity
rather than to the number of primitives.

**Derive the catalogue from the tree** — the types already in use. Rejected: it
can only describe what has already been used, so the first use of any primitive
remains a guess, which is the exact failure the catalogue removes.

**Probe inside `createPrimitiveRegistry` and refuse a non-conforming
primitive.** Rejected twice over: it runs foreign render code at import time,
and it makes a hook-using primitive unregisterable for a reason unrelated to the
contract. The weaker version — probe, but only warn to the console — is rejected
too, and for a reason worth stealing: *a library writing to the console is a
decision about somebody else's log stream*, and this runtime already has a shape
for "something to report", which is a value the caller inspects.

**Have the author declare it — a `leaf: true` on `definePrimitive`.** Rejected
with the sentence this whole lesson could be built around: a declaration is a
second copy of a fact that lives in the component, and the day the component
changes, the copy is wrong and nothing says so. **The probe cannot get out of
step with the code because it is the code, run.**

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections
while you write. Then compare.

1. **Derive the audit's existence from lesson 09.** Lesson 09's Gate reaches a
   verdict and applies nothing. The audit reaches a verdict and blocks nothing.
   Write the paragraph that shows those are the same decision, and make it turn
   on *what the library cannot know* rather than on "both return values" —
   that second answer is true and is not the argument. Then apply the rule you
   just wrote to a case neither lesson mentions: the SDK could refuse to build a
   registry whose primitives collectively declare no `loom.page`. Should it?
   Defend your answer with the rule, not with taste.

2. **Say what the catalogue bought and what it cost**, with the cost stated as
   concretely as the benefit. Then answer the question the cost raises: a
   deployment grows to two hundred primitives and the catalogue no longer fits
   comfortably in a prompt. Name the *other* pressure in this system that has
   exactly the same shape, say why 0013 claims both will want the same answer,
   and then say what a scoped catalogue would break that a scoped tree outline
   would not. *(11, 12)*

Predict, before writing (1): if your paragraph contains the phrase "so the host
can decide", you have named the mechanism rather than the argument. The argument
is about which facts live on which side of the library boundary, and why they
cannot be moved.

---

## Self-check

Six questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. Name the five places a registration is acted on, and give the *different*
   question each one answers. Then say which one prevents rather than detects,
   and what follows from the fact that the preventing one has no enforcement in
   it anywhere.
2. `z.object({})` and no schema at all are different things. Say what the
   difference is worth — name the consumer that acts on it — and then say what
   the difference is *not* worth, naming the decision from two records earlier
   that makes it survivable.
3. Give the rule for what the probe may conclude from one configuration. It is
   three sentences and they are not the same sentence: one about children, one
   about a declared slot, one about decoration. Then say what the third one
   would hide if it were resolved like the first two.
4. A component that throws under every configuration and a component that throws
   under one reach the same list and are told apart by one field. Name the field
   and say which value the audit is *certain* of. Then the part worth getting
   exactly right: say which of the two also appears in `notProbeable`, name the
   legitimate primitive that appears there for a reason that is not a fault at
   all, and say what a host asserts about the list in each case. Finally: this
   was not the reporting when this lesson was first written. Say what the old
   reporting was and what was wrong with it, in terms of what the list is *for*.
5. `createPrimitiveRegistry` is pure and never calls a component. Give both
   reasons — they are different kinds of reason — and say which of the two would
   still hold if every React component in the world could be called as a plain
   function.
6. Predict 3 asked you to argue both sides of the audit having no teeth. Give
   the resolution in two sentences: one naming the fact the library does not
   have, one naming what it does instead of guessing at it.

Question 3 is the one to be least satisfied with a short answer to. Question 5
is the one most worth doing out loud.

---

## Reflect

Write for two minutes, then move on.

- Which prediction were you most confidently wrong about? If it was Predict 1,
  say what you had been assuming "declared" meant, and go and check whether you
  have been making the same assumption about any other declaration in this
  system — there are at least two more.
- Exercise E found a real hole by accident: a primitive that throws on a
  combination of two props its own schema accepts, reported clean. You now know
  a limit of this system that is written down in a decision record's
  consequences rather than in its decision. Say why a record that names what it
  misses is more useful than one that does not — and then say what it would take
  for that limit to become worth paying to close.
- Warm-up 4 asked whether the registry being a bound is a bug, a limitation, or
  the point. Answer it again now, in one paragraph, and say specifically what
  changed in your answer after 0013 — the bound was always there, so something
  else did.

---

## Come back to this

Set S in [`review-schedule.md`](review-schedule.md), two days after this lesson.
Interleaved with 01, 04, 05, 07, 09, 12 and 14, and built around the failure
mode this lesson exists to name: **treating a declaration as though it were a
guarantee.**

**Where lesson 16 goes next.** Persistence — the log is the truth and the
snapshot is a view you can rebuild. The door in from here is a sentence in this
lesson you may have read past: props in a tree "may have been written by a delta
the Gate accepted months ago against a schema this deployment no longer runs".
That sentence assumes something about storage that nothing in Parts I–IV has yet
made true, and 16 is where it gets made true.
