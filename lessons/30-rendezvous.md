# 30 — Rendezvous: the name two parties have to spell the same

**After this lesson you will be able to** take a binding apart into its three
parts and say, for each, which party could refuse it and why; explain why two of
the three ways a binding declaration can be wrong are caught before anything is
drawn and the third was caught by nothing for two months; say what a system has
to do when a fact it wants to check exists in only one place, and who pays for
the second copy; say why the declaration that closes this seam cannot be a list
of names and what it has to be instead; read a diagnostic fired on a page where
nothing failed and nothing threw; give the rule that keeps *nobody has said* and
*this reads nothing* apart, and say what a default would have asserted on behalf
of an author who never spoke; and — the half this lesson found by running
rather than by reading — say what happened when the **write** path was asked to
judge the same node, and why nothing had noticed.

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
[29](29-readership.md).

Lesson 29 ended on a question about *subjects*: a declaration with six audiences
cannot be audited against any one of them, so before you decide what counts as a
promise being kept, work out who the promise was made to.

This lesson is the same question one seam along, and it has a sharper answer,
because here the promise has exactly **two** parties and they are both inside
your own page. A tree asks a question under a name. A primitive looks up an
answer under a name. If the two names differ by one letter, everything works:
the question is asked, the network is paid, the answer comes back, the page
renders, nothing throws, and nothing is drawn.

The interesting part is not that this can happen. It is that of the three things
a binding declaration says, this is the *only* one nothing could refuse — and
working out why is a better lesson about checks than the check itself is.

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Write something for all
five before you look anything up.

1. A binding is a question the tree asks, and it is answered **before** the
   walk rather than during it. Give the reason, and make it a sentence about
   what the renderer is rather than a sentence about performance. *(18)*
2. `undefined` and `[]` are different answers from a declaration, and the
   runtime is forbidden to round either to the other. State the rule, and then
   say what a default would be asserting, and on whose behalf. *(24)*
3. A check is a comparison. Name the three places a second copy of a fact can
   come from, and say what each one costs. *(28)*
4. A props schema has more than one reader. Name four of them, and say which
   single one the registry is able to hold the schema against. *(29)*
5. Where do you put a list so that leaving something off it is a build failure
   rather than a habit? Give the shape of the answer, not the file name. *(25)*

Question 3 is the one this lesson is built on top of — the whole design below is
one of those three options, chosen because the other two were unavailable.
Question 2 is the one most likely to come back as a slogan: *absence is not
emptiness* is the phrase, and the reason is the part that transfers.

---

## Predict

**In writing, before reading on.** Four questions. Question 1 is the one to rate
your confidence on, and question 4 is the one that decides whether the second
half of this lesson tells you anything.

1. A page has one `loom.feed` on it, bound to a source that works:

   ```json
   { "loom:data": { "entires": { "source": "blog.posts", "params": { "limit": 3 } } } }
   ```

   The primitive reads its rows out of `loom.data["entries"]`. The name in the
   tree is misspelled by one letter and nothing else is wrong.

   Answer four things: **(a)** is the source asked? **(b)** what does the reader
   see on the page? **(c)** how many render diagnostics? **(d)** what does the
   Gate do with the change that inserted this node? **Rate your confidence 1–5.**

2. Now the other two ways the same binding could have been written wrong: a
   source id nobody registered, and a params object the source's schema refuses.
   Put all three in order of how much each costs — the deployment first, then
   the reader — and say which of the three is the loudest and which is the
   quietest. If your order is the same for both parties, look again.

3. A primitive has never said anything about what binding names it reads. A tree
   binds something on it under `rows`. Write down what you think the runtime
   should say.

   Then the same question for a primitive whose author has declared, in as many
   words, that it reads **no** data at all. Write down what the runtime should
   say about *that*.

   If your two answers are the same sentence, write one line on what is lost.

4. You are going to add a declaration to the primitive so the two names can be
   compared — `reads: ["entries"]`, a list of the names it looks under. Write
   the comparison out: what it takes, what it answers.

   Then, before you read on: find a node it would **accuse wrongly**, and a node
   it would **wave through**. Both exist, both are in the starter library's own
   shape of primitive, and one of the two is the more dangerous.

Do not read on until all four are written. Question 1's (d) is where most
readers put something that feels safe and is not; question 4 is this lesson's
actual subject and every part of it is findable from lesson 18 alone.

---

## The problem

### A binding is three things, and only two of them are references

[0058](../decisions/0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md)
made a binding a question the tree asks. A node carries `loom:data`, and each
entry in it has three parts:

| part | what it is | who holds the other end |
| --- | --- | --- |
| `source` | a registered source id | the **data registry** |
| `params` | what to ask with | the **source's own schema** |
| the **name** it is filed under | how the primitive finds the answer | *nobody* |

The first two are references. A reference can be wrong in exactly one way — it
can point at something that is not there — and a reference can be checked by
asking the thing that holds the other end. An unregistered source is refused
with `no-such-source`; params the source did not declare are refused by the
source's own schema, which it was required to publish precisely so that this
check could exist.

The name is not a reference to anything. It is an **agreement**: the tree writes
it, the primitive reads it, and the two have to be the same string. Nothing else
in the system has a copy of it.

Ask, party by party, who could possibly object:

- **The source cannot.** 0058's whole argument is that a binding is the *tree's*
  question and the source knows nothing about the page. One source answers many
  primitives, each of which files the answer under whatever name suits it.
- **The registry cannot.** It holds primitives by type. A name lives on a node,
  and a registry is not handed nodes.
- **The data seam cannot.** It holds the node, and it can see the name perfectly
  well — but it resolves questions into answers and has no idea what a component
  is going to look up.
- **The component could, and by the time it runs it is too late in a more
  interesting way than being late.** Looking up a key that is not there is not
  an error in JavaScript. It is `undefined`. There is no event. The failure is
  the *absence* of an event, which is why no amount of care inside the component
  helps: the component that handles a missing answer gracefully and the
  component that was never given one are running the same line of code.

### Which means the cost is upside down

Put the three mistakes next to each other and the ordering is the reverse of
what you would design:

| what is wrong | the source is | the reader is told | a diagnostic |
| --- | --- | --- | --- |
| an unregistered source id | never asked | *This list could not be loaded.* | yes |
| params the source refuses | asked and refuses | *This list could not be loaded.* | yes |
| **a name nothing reads** | **asked, and answers** | **nothing** | **not until 22 September** |

The two cheap mistakes are loud. The expensive one — a round trip paid for, a
database queried, an answer serialised and handed across — is silent, and the
page it produces is not a broken page. It is an **empty region**, which is a
state the primitive has on purpose for the author who has not connected a source
yet. Exercise C runs all three.

This is worth sitting with before the remedy, because the shape recurs far
outside Loom: **the failures a system catches are the ones where something it
already holds is being pointed at.** A string that has to match another string
nobody holds is where the silence lives, and every system has some.

### Why there was nothing to compare, in lesson 28's terms

Lesson 28 said a check is a comparison and a unique thing has nothing to be
compared to, and then gave three places a second copy can come from: somewhere
that already has one, somewhere that can be made to derive one, or **an author,
asked to write one down**.

The binding name had none of the first two. So for two months this seam had no
check for the reason lesson 28 describes and not because anybody forgot — and
[0181](../decisions/0181-a-primitive-declares-the-binding-names-it-reads-and-saying-nothing-is-not-saying-none.md)
is unusually clear about *why it was not built the day it was noticed*:

> a declaration nothing declares is a field on ninety-six definitions and a
> projection nobody reads.

It was filed on 19 September, deliberately not built, and it named its own
trigger: **the moment the first primitive reads a binding is the moment to build
it.** That is a rule worth stealing whole. A seam that nothing is on either side
of is not a seam; it is a field, a projection, a catalogue clause, a diagnostic
code and a page of prose, all describing a situation that has never arisen.

### And in the meantime, the model was told to be careful

The one thing that *could* be done without the declaration was done, and reading
it is the best argument for the declaration. The interpreter's prompt — the
thing the model is actually shown, lesson 12 — carried this sentence:

> Do not invent a binding name: the name is how the primitive reading the answer
> finds it, so repoint or re-param a name already on the node rather than adding
> one of your own.

Look at what that asks for. A model shown no list of the names that exist, and
told not to invent one, can comply only by **never binding anything new**. The
instruction is sound and it is a bound on the product: the system's answer to
*which names may I use* was *do not ask*.

---

## The idea

### Ask the one party that knows, and write it down

The component knows the name. Its author knows it at the moment they write the
lookup. Every other party in the system is downstream of that knowledge and
cannot recover it.

So `PrimitiveDefinition` gains `reads`, and the second copy comes into existence
because somebody was asked to type it — lesson 28's third source, with the bill
that goes with it: a declaration that has to be kept true by a person, forever,
and that nothing can hold to the component it describes.

That bill is real and it is paid for a reason worth naming. `reads` is not only
the input to a check. It is the input to the **catalogue**, and the catalogue is
what a model is told it may write. The check is the cheaper half of what the
declaration buys; the expensive half is that a name stops being something a
model has to be warned off.

### Three answers, and the middle one is the whole design

The field is optional, and the runtime keeps three states apart:

| the author wrote | it means |
| --- | --- |
| `reads: ["entries"]` | this reads one binding, under that name |
| `reads: []` | this primitive reads **no** data at all |
| nothing | **nobody has said** |

There is no default. A default would be the runtime asserting something on
behalf of an author who never spoke, and — this is the part that decides it —
the assertion would be *false* for every bound primitive written before the
declaration existed. Defaulting to `[]` would have meant: on the day this
shipped, a page that had been binding data correctly for months starts reporting
that its bindings are read by nobody.

This is [0122](../decisions/0122-a-primitive-says-which-of-its-props-a-reader-reads.md)'s
bargain made a second time, one seam over, and it is what let the seam ship into
a library where nothing declared: a hundred-odd primitives say nothing, and the
seam says nothing about any of them. Lesson 24's rule — a reading that cannot
answer owes its caller a way to say so — arriving as a *design permission*
rather than as a courtesy. The third state is what makes the feature shippable
on a Tuesday instead of after ninety-nine edits.

### What the model is shown, and the one clause that is missing on purpose

The catalogue line a model reads writes only two of the three answers:

| declared | the line says |
| --- | --- |
| `["entries"]` | ` reads: entries` |
| `[]` | ` reads: none` |
| nothing | *(no clause at all)* |

That is the **opposite** of how the same catalogue renders props, where a
primitive whose schema cannot be enumerated gets an explicit `props: not
declared`. The difference is not inconsistency; it is which answer is common.
Every primitive declares a props schema, so *not declared* is rare and earns its
words. `reads` is absent on nearly every primitive there is, and a line saying
`reads: not declared` on ninety-odd consecutive entries would spend tokens on
every proposal and every repair to say nothing at all.

So the absence of the clause **is** the third answer, and the prompt now
contains one sentence teaching the reader of a catalogue how to read a missing
clause. That sentence is doing work no field can do, and is a good thing to have
seen once: a projection can encode a value in *silence* as long as something
tells its reader that silence is a value.

### The declaration cannot be a list of names

Here is where the design gets its second half, and it came from the obvious
thing failing.

0181 shipped `reads` as a list of strings. Then somebody went to declare it on
the two primitives in the library that actually read a binding, and could not:

| primitive | what it reads | what a fixed list could say |
| --- | --- | --- |
| `loom.feed` | `loom.data[binding ?? "entries"]` | nothing honest |
| `loom.tally` | `loom.data[binding ?? "value"]` | nothing honest |

Both take the name from an **optional prop**. The tree does not merely ask a
question under a name — it can also *tell the primitive which name to look
under*, because a page with two feeds on it needs two different names and the
prop is the entire mechanism by which they get them.

A fixed list would have to write the default and then be wrong about every node
that set the prop. Wrong in both directions, and exercise F runs both:

- a feed told to read `rows`, answered under `rows`, **correct**, reported as a
  binding nobody reads;
- a feed told to read `rows`, answered under `entries`, **broken for ever**,
  passing the check in silence.

The second is the one that matters, and notice what kind of mistake it is: not a
check that is too weak, but a check that is *confidently wrong* about the exact
case it was built for. A wrong accusation gets investigated. A wrongly granted
pass gets believed.

So [0184](../decisions/0184-a-primitive-may-read-under-whichever-name-a-prop-gives.md)
widens an entry in `reads` from a name to *a name or a rule for getting one*:

```ts
export type BindingDeclaration<Name extends string = string> =
  | Name
  | {
      /** The prop whose value is the name. Declared by the primitive's schema. */
      readonly fromProp: string
      /** The name read when that prop is absent, which is the common case. */
      readonly default: Name
    }
```

`reads: [{ fromProp: "binding", default: "entries" }]` says *this reads one
binding, under whichever name the `binding` prop gives, and under `entries` when
it gives none.*

### Which splits the seam, and the split is the technically interesting part

A declaration is now half a question about a **type** and half a question about
a **node**. So who resolves it?

The registry is asked about types. Handing it a node's props to resolve a
declaration would be giving a type-level index an argument it has no business
knowing about. So it does not resolve anything — `bindingsReadBy(type)` hands
back the *declaration*, unresolved, and the **walk** resolves it, because the
walk is the one place holding both halves at once.

That is a generalisable move and it is worth stating on its own:

> When a fact needs two inputs that live at different scopes, the seam answers
> with the unresolved fact and the caller that holds both scopes resolves it.
> A seam that resolves early has to be handed something from a scope it does not
> belong to, and that argument is the one that goes wrong later.

Lesson 27 met the same shape from the other end — a container that cannot read
its own children — and took the opposite decision for a reason worth comparing:
there the second input could be published into CSS and the browser could do the
arithmetic, so nobody had to hold both. Here nothing downstream can hold both,
so the walk does.

### What is checked, what is not, and why the untruthful direction was chosen

The registry checks two things about a declaration and refuses registration if
either fails: the name is a legal binding name (`invalid-binding-name`), and a
`fromProp` is a prop the schema actually declares (`undeclared-reads-prop`) —
the same drift check `frames`, `copy` and `interactive` already get.

Two things are **not** checked and both are stated out loud rather than assumed:
that the named prop holds a string (the catalogue keeps a prop's name and
whether it is required, deliberately not its type), and that the component
actually looks under that name — which would need the component called, and is
lesson 29's whole subject.

There is one line in 0181 worth reading twice, about the check it *does* make:

> This is the only check available and it is worth making, because it fails in
> the worst direction. A declared name no tree could ever write matches no
> binding, so the primitive reports **every** binding it is ever given rather
> than none.

That is a deliberate choice about which way an unmaintained declaration rots. A
misdeclaration makes the diagnostic maximally *noisy* rather than silently
absent. Compare it with the props floor in exercise D, which fails in the other
direction, and with `EVERY_TYPE_REGISTERED` in lesson 22, which fails in the
other direction on purpose too. *Which way does this fail when it is wrong* is a
question worth asking of every default in a system, and the three answers in
this paragraph are not the same.

### It reports; it does not refuse — and it is measured on the answers

`data-unread` is a render diagnostic beside `props-undeclared`: the render found
a node whose declaration and whose primitive do not agree, drew the page anyway,
and said so.

It fires on the **answers**, not on the raw declaration. So a binding whose
source could not answer is reported as `data-unavailable`, and if the name is
also unread, both are reported — two true things about one mistake, in the order
somebody would fix them. A malformed `loom:data` reaches neither, because there
are no names in it to be read.

And the seam is detected structurally, the way the frame and behaviour resolvers
are: a registry built by the SDK satisfies it, and a host resolving primitives
from a plain object has registered nothing that could have declared a name in
the first place. Nothing to wire, so nothing that can be left unwired — which is
the same argument lesson 20 gives for the frame seam and lesson 24 for text.

---

## In the code

| Where | What |
| --- | --- |
| `src/render/reads.ts` | The whole seam: `BindingDeclaration`, `BindingReader`, `nameRead` and `unreadBindings`. Eighty lines, half of them explaining themselves. |
| `src/render/render.ts` | `reportUnreadBindings`, and the line above it that decides this runs on answers rather than declarations. |
| `src/render/diagnostics.ts` | `data-unread`, and the sentence it prints — which names the node, the name and the type, because those are the three things whoever fixes it needs. |
| `src/sdk/definition.ts` | `reads?: readonly BindingDeclaration[]`, optional, undefaulted. |
| `src/sdk/registry.ts` | `invalid-binding-name` and `undeclared-reads-prop`, and `bindingsReadBy`. |
| `src/interpretation/render.ts` | The catalogue clause, and the comment on why absence gets no words. |
| `src/interpretation/prompt.ts` | What replaced *do not invent a binding name*. |
| `src/primitives/loom.feed.ts` | The first declaration, and the doc comment saying what it buys. |
| [0058](../decisions/0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md) | Where the name came from, and why it belongs to the primitive. |
| [0181](../decisions/0181-a-primitive-declares-the-binding-names-it-reads-and-saying-nothing-is-not-saying-none.md) | The declaration, the three answers, the diagnostic. |
| [0184](../decisions/0184-a-primitive-may-read-under-whichever-name-a-prop-gives.md) | Why an entry is a name *or* a rule, and why the walk resolves it. |
| [0122](../decisions/0122-a-primitive-says-which-of-its-props-a-reader-reads.md) | The same bargain, one seam over, struck first. |

---

## Try it

Seven exercises. **Predict every output in writing, then run.** Exercise B is
Predict 1 executed and is the one to commit to hardest. Exercise F is Predict 4
executed, and is the one most readers get half of.

Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

The shared preamble for all seven:

```ts
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, it } from "vitest"
import { z } from "zod"

import {
  createDataRegistry,
  defineSource,
  planTreeData,
  resolveDataPlan,
  type DataRegistry,
  type SourceEntry,
} from "./data/index.js"
import { sequentialIdFactory } from "./ids.js"
import { renderCatalogue } from "./interpretation/index.js"
import type { JsonObject } from "./json.js"
import { createStarterPrimitiveRegistry } from "./primitives/index.js"
import { DATA_PROP_KEY } from "./reserved-props.js"
import { describeRenderDiagnostic, renderLoomTree, type LoomPrimitiveProps } from "./render/index.js"
import { ok } from "./result.js"
import { assessChange } from "./runtime/assessment.js"
import { gate } from "./runtime/gate.js"
import { defaultGatePolicy } from "./runtime/policy.js"
import type { ProposedChange } from "./runtime/proposal.js"
import { catalogueOf, propsVocabularyFor, registeredTypesFor } from "./sdk/index.js"
import { definePrimitive } from "./sdk/definition.js"
import { createPrimitiveRegistry, describeRegistryError } from "./sdk/registry.js"
import { buildElement } from "./tree/builders.js"
import type { TreeDelta } from "./tree/delta.js"
import { createTree, type LoomTree } from "./tree/tree.js"

const registry = (() => {
  const built = createStarterPrimitiveRegistry()
  if (!built.ok) throw new Error(describeRegistryError(built.error))

  return built.value
})()

const spare = sequentialIdFactory("x")

/** How many times each source was actually asked, across a whole exercise. */
const asked = new Map<string, number>()

const posts: SourceEntry = defineSource({
  id: "blog.posts",
  description: "The latest posts, newest first.",
  params: z.object({ limit: z.number().int().min(1).max(20) }),
  answers: z.array(z.object({ title: z.string() })),
  adapter: {
    fetch: async ({ params }) => {
      asked.set("blog.posts", (asked.get("blog.posts") ?? 0) + 1)

      return ok(Array.from({ length: params.limit }, (_, index) => ({ title: `Post ${index + 1}` })))
    },
  },
})

const sources: DataRegistry = (() => {
  const built = createDataRegistry([posts])
  if (!built.ok) throw new Error(`loom: ${built.error.code}`)

  return built.value
})()

/** One `loom.feed`, with whatever props and whatever `loom:data` map you give it. */
const feedPage = (props: JsonObject, data: JsonObject): LoomTree => {
  const ids = sequentialIdFactory()
  const node = buildElement(ids, {
    type: "loom.feed",
    props: { ...props, [DATA_PROP_KEY]: data } as never,
  })

  return createTree(node, ids)
}

/** Resolve this tree's questions, then render it, then say what happened. */
const run = async (tree: LoomTree, resolver: typeof registry = registry) => {
  const resolution = await resolveDataPlan(planTreeData(tree), { registry: sources })
  const output = renderLoomTree(tree, { resolver, data: resolution })
  const markup = renderToStaticMarkup(output.element).replace(/<style[\s\S]*?<\/style>/g, "")

  return { diagnostics: output.diagnostics, markup }
}

/** The page's own words, with the library's markup taken off. */
const words = (markup: string): string => markup.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()

const say = (label: string, result: { diagnostics: readonly unknown[]; markup: string }): void => {
  console.log(`  ${label}`)
  console.log(`    diagnostics: ${result.diagnostics.length}`)
  for (const diagnostic of result.diagnostics) {
    console.log(`      ${(diagnostic as { code: string }).code} — ${describeRenderDiagnostic(diagnostic as never)}`)
  }
  console.log(`    the page says: ${JSON.stringify(words(result.markup))}`)
}
```

Two things in the preamble are load-bearing and neither is obvious.

`asked` counts calls to the adapter rather than assuming them. The claim this
lesson makes about cost — *the round trip is paid for and then thrown away* — is
exactly the kind of sentence a lesson can be wrong about for weeks, because it
sounds right. Counting it is one line.

`words` strips the markup and the library's stylesheet off, so *what the reader
sees* is a string you can read in a terminal. An empty string in these
transcripts is the whole point of the lesson and would be invisible in markup.

### Exercise A — the two spellings, and who holds each

The registry's answer for three primitives, and then the clause the model is
shown for the two that have one.

```ts
describe("A", () => {
  it("prints the two spellings, for the two primitives that have both", () => {
    for (const type of ["loom.feed", "loom.tally", "loom.badge"]) {
      console.log(`  ${type}: ${JSON.stringify(registry.bindingsReadBy(type as never))}`)
    }

    for (const line of renderCatalogue(catalogueOf(registry)).split("\n")) {
      const clause = /^- (loom\.(?:feed|tally)) .*( reads: .*)$/.exec(line)
      if (clause) console.log(`  ${clause[1]} —${clause[2]}`)
    }
  })
})
```

```
  loom.feed: [{"fromProp":"binding","default":"entries"}]
  loom.tally: [{"fromProp":"binding","default":"value"}]
  loom.badge: undefined
  loom.tally — reads: the name in "binding" (default value)
  loom.feed — reads: the name in "binding" (default entries)
```

Three things to notice. Neither of the two primitives in this library that reads
a binding could have used the simple form — the shape 0181 shipped first is used
by nothing. `loom.badge` answers `undefined`, which is *nobody has said*, and
the next four exercises are about how much work that answer does. And the
catalogue does not flatten the declaration to `entries`: it writes the rule out,
because a model shown `reads: entries` can bind one thing correctly and has no
way to bind a second.

### Exercise B — one letter wrong

Predict 1, executed. The same page twice, differing by one transposition.

```ts
describe("B", () => {
  it("binds one letter wrong, and asks every instrument about it", async () => {
    asked.clear()
    const right = await run(feedPage({}, { entries: { source: "blog.posts", params: { limit: 3 } } }))
    say('bound under "entries"', right)

    const wrong = await run(feedPage({}, { entires: { source: "blog.posts", params: { limit: 3 } } }))
    say('bound under "entires"', wrong)

    console.log(`  the source was asked: ${asked.get("blog.posts") ?? 0} time(s)`)
  })
})
```

```
  bound under "entries"
    diagnostics: 0
    the page says: "Post 1 Post 2 Post 3"
  bound under "entires"
    diagnostics: 1
      data-unread — node n_1 binds "entires" and "loom.feed" does not read a binding of that name, so the answer was resolved and then read by nobody
    the page says: ""
  the source was asked: 2 time(s)
```

**Two.** The misspelled page paid for its query in full. Three posts were
fetched, validated against the source's own answer schema, filed into the
resolution under `entires`, carried into the render, handed to the component in
its bag — and the component looked under `entries`, got `undefined`, and drew
its empty state, which is a state it has for the author who has not connected
anything yet.

The diagnostic is the entire difference between this and an invisible fault, and
it did not exist before 22 September.

### Exercise C — three ways to be wrong, and how far each one gets

```ts
describe("C", () => {
  it("asks for one thing three wrong ways, and counts how far each gets", async () => {
    asked.clear()

    say("an unregistered source", await run(feedPage({}, { entries: { source: "blog.post", params: { limit: 3 } } })))
    say("a param the source never declared", await run(feedPage({}, { entries: { source: "blog.posts", params: { first: 3 } } })))
    say("a name the primitive does not read", await run(feedPage({}, { entires: { source: "blog.posts", params: { limit: 3 } } })))

    console.log(`  the source was asked: ${asked.get("blog.posts") ?? 0} time(s)`)
  })
})
```

```
  an unregistered source
    diagnostics: 1
      data-unavailable — node n_1 binds "entries" to "blog.post" and it could not be answered — no source is registered for it — registered: blog.posts
    the page says: "This list could not be loaded."
  a param the source never declared
    diagnostics: 1
      data-unavailable — node n_1 binds "entries" to "blog.posts" and it could not be answered — the params in the tree are not what the source accepts — limit: Required
    the page says: "This list could not be loaded."
  a name the primitive does not read
    diagnostics: 1
      data-unread — node n_1 binds "entires" and "loom.feed" does not read a binding of that name, so the answer was resolved and then read by nobody
    the page says: ""
  the source was asked: 1 time(s)
```

One asked, out of three attempts, and it was the attempt whose page says
nothing. Read the *reader's* column rather than the diagnostics column: the two
mistakes a registry could refuse produce a sentence on the page — a bad one, but
a true one that a person can report. The mistake nothing could refuse produces a
page that looks finished and is empty.

The two refusal messages are worth reading closely as well. Both name the thing
that holds the other end of the reference — the registered ids, the params the
schema wanted. That is what a reference can give you and an agreement cannot:
the refuser knows what would have been right.

### Exercise D — the write path, asked about the same three nodes

The Gate's turn. Three inserts: one with the *type* misspelled, one with the
*name* misspelled, one with neither. Each is put through twice — once on a
deployment that has told the runtime which primitives exist, and once on a
deployment that has also wired the props floor from
[0179](../decisions/0179-what-a-primitive-accepts-is-a-vocabulary-the-write-path-is-handed-not-a-field-on-a-policy.md).

```ts
describe("D", () => {
  it("puts three nodes through the write path, twice — once with the props floor wired", () => {
    const ids = sequentialIdFactory("d")
    const base = createTree(buildElement(ids, { type: "loom.page", children: [] }), ids)
    const policy = { ...defaultGatePolicy, registeredPrimitiveTypes: registeredTypesFor(registry) }
    const question = { source: "blog.posts", params: { limit: 3 } }

    const insert = (type: string, data: JsonObject): TreeDelta => ({
      deltaId: spare.deltaId(),
      treeId: base.treeId,
      baseRevision: 0,
      operations: [
        {
          op: "insert",
          parentId: base.root.id,
          index: 0,
          node: buildElement(ids, { type, props: { [DATA_PROP_KEY]: data } as never }),
        },
      ],
    })

    const proposalOf = (delta: TreeDelta): ProposedChange => ({
      proposalId: spare.proposalId(),
      intentId: spare.intentId(),
      delta,
      rationale: "show the latest posts",
      provenance: {
        origin: "developer",
        interpreter: "scratch",
        authoredBy: "model",
        confidence: 0.99,
        interpretedAt: "2026-09-28T00:00:00.000Z",
      },
    })

    const nodes = [
      ["the type misspelled", insert("loom.feeed", { entries: question })],
      ["the name misspelled", insert("loom.feed", { entires: question })],
      ["neither misspelled", insert("loom.feed", { entries: question })],
    ] as const

    for (const [wiring, checkProps] of [
      ["the registered types wired, and nothing checking props", undefined],
      ["and propsVocabularyFor(registry) wired as well", propsVocabularyFor(registry)],
    ] as const) {
      console.log(`  ${wiring}`)
      for (const [label, delta] of nodes) {
        const assessed = checkProps
          ? assessChange(base, proposalOf(delta), policy, spare.deltaId(), checkProps)
          : assessChange(base, proposalOf(delta), policy, spare.deltaId())
        if (!assessed.ok) throw new Error("loom: the delta would not apply")

        const { analysis, stakes } = assessed.value
        const issues = analysis.invalidProps.flatMap((invalid) => invalid.issues.map((issue) => issue.message))
        console.log(
          `    ${label.padEnd(20)} unknown types: ${analysis.unknownPrimitives.length}  invalid props: ${
            analysis.invalidProps.length
          }  stakes: ${stakes.level.padEnd(8)} gate: ${gate(assessed.value, policy).kind}`
        )
        for (const issue of issues) console.log(`      ${issue}`)
      }
    }
  })
})
```

```
  the registered types wired, and nothing checking props
    the type misspelled  unknown types: 1  invalid props: 0  stakes: critical gate: rejected
    the name misspelled  unknown types: 0  invalid props: 0  stakes: medium   gate: accepted
    neither misspelled   unknown types: 0  invalid props: 0  stakes: medium   gate: accepted
  and propsVocabularyFor(registry) wired as well
    the type misspelled  unknown types: 1  invalid props: 0  stakes: critical gate: rejected
    the name misspelled  unknown types: 0  invalid props: 0  stakes: medium   gate: accepted
    neither misspelled   unknown types: 0  invalid props: 0  stakes: medium   gate: accepted
```

The first block is the lesson's answer to Predict 1(d), and it is the point of
the exercise: **one typo in the type is refused before the change reaches the
log, and one typo in the name is accepted at medium stakes.** Same node, same
delta shape, one character wrong in each. The difference is not importance — a
page with a hole in it and a page with an empty region are about equally bad —
it is that `loom.feeed` is a reference into a registry and `entires` is not.

The second block is the same three rows, and that is the point of running it
twice: **wiring the props floor changes nothing here.** *Nothing* is the correct
reading — a binding lives under `loom:data`, which is the runtime's key rather
than the primitive's, so no primitive's schema has any business being asked
about it, and a floor that fired would be refusing the change for a key the
runtime itself put there. This lesson first printed a second block that did
exactly that, and it took a fix to `src/` to make these two blocks agree. See
below.

### Exercise E — absence is not emptiness

Three registries holding a primitive that differs only in what its author said
about reading. One node, bound under `rows`, against each.

```ts
/** A list that reads its entries under whichever name its `binding` prop gives. */
const listComponent = ({ loom, props }: LoomPrimitiveProps) => {
  const name = typeof props["binding"] === "string" ? (props["binding"] as string) : "entries"
  const outcome = loom.data[name]
  const rows = outcome?.status === "ready" && Array.isArray(outcome.value) ? outcome.value : []

  return createElement("ul", null, rows.map((row, index) =>
    createElement("li", { key: index }, String((row as { title?: string }).title ?? "?"))
  ))
}

const listProps = z.object({ binding: z.string().min(1).max(60).optional() }).strict()

/** A one-primitive registry, whose `demo.list` declares whatever you hand it. */
const listRegistryDeclaring = (reads: readonly (string | { fromProp: string; default: string })[] | undefined) => {
  const built = createPrimitiveRegistry([
    definePrimitive({
      type: "demo.list",
      description: "A list read from a binding.",
      props: listProps,
      ...(reads === undefined ? {} : { reads }),
      component: listComponent,
    }),
  ])
  if (!built.ok) throw new Error(describeRegistryError(built.error))

  return built.value
}

/** One `demo.list`, with whatever props and whatever `loom:data` map you give it. */
const listPage = (props: JsonObject, data: JsonObject): LoomTree => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, { type: "demo.list", props: { ...props, [DATA_PROP_KEY]: data } as never }),
    ids
  )
}

describe("E", () => {
  it("asks one node three times, of three primitives that differ only in what they said", async () => {
    const question = { source: "blog.posts", params: { limit: 2 } }

    for (const [label, declared] of [
      ['declared reads: ["entries"]', ["entries"]],
      ["declared reads: []", []],
      ["declared nothing", undefined],
    ] as const) {
      const resolver = listRegistryDeclaring(declared)
      const result = await run(listPage({}, { rows: question }), resolver as never)
      say(label, result)
      console.log(`    the catalogue line: ${JSON.stringify(renderCatalogue(catalogueOf(resolver)).split("\n").find((line) => line.startsWith("- demo.list")))}`)
    }
  })
})
```

```
  declared reads: ["entries"]
    diagnostics: 1
      data-unread — node n_1 binds "rows" and "demo.list" does not read a binding of that name, so the answer was resolved and then read by nobody
    the page says: ""
    the catalogue line: "- demo.list — A list read from a binding. props: binding? reads: entries"
  declared reads: []
    diagnostics: 1
      data-unread — node n_1 binds "rows" and "demo.list" does not read a binding of that name, so the answer was resolved and then read by nobody
    the page says: ""
    the catalogue line: "- demo.list — A list read from a binding. props: binding? reads: none"
  declared nothing
    diagnostics: 0
    the page says: ""
    the catalogue line: "- demo.list — A list read from a binding. props: binding?"
```

**The three pages are identical.** The same component, the same node, the same
wasted round trip, the same empty list. What differs is only whether anybody had
told the runtime enough for it to be allowed to say so.

The third row is the one to sit with. It is the same fault as the first two, the
runtime can see the name and can see the answer, and it says nothing — on
purpose, because the alternative is saying it about every correctly-bound node
in every deployment whose primitives predate the declaration.

And the catalogue lines are the other half of the same three-way answer: `reads:
entries`, `reads: none`, and a line that stops after the props.

### Exercise F — the fixed list, wrong in both directions

Predict 4 executed. Two nodes, each judged by a fixed-list declaration and by
the prop-named one, with the component unchanged.

```ts
describe("F", () => {
  it("checks the same two nodes against a fixed list and against the prop that names one", async () => {
    const question = { source: "blog.posts", params: { limit: 2 } }
    const fixed = listRegistryDeclaring(["entries"])
    const named = listRegistryDeclaring([{ fromProp: "binding", default: "entries" }])

    const nodes = [
      ['renamed, and bound under the old name', { binding: "rows" }, { entries: question }],
      ['renamed, and bound under the new name', { binding: "rows" }, { rows: question }],
    ] as const

    for (const [label, props, data] of nodes) {
      console.log(`  ${label}`)
      say('  against reads: ["entries"]', await run(listPage(props, data), fixed as never))
      say('  against reads: the name in "binding"', await run(listPage(props, data), named as never))
    }
  })
})
```

```
  renamed, and bound under the old name
    against reads: ["entries"]
    diagnostics: 0
    the page says: ""
    against reads: the name in "binding"
    diagnostics: 1
      data-unread — node n_1 binds "entries" and "demo.list" does not read a binding of that name, so the answer was resolved and then read by nobody
    the page says: ""
  renamed, and bound under the new name
    against reads: ["entries"]
    diagnostics: 1
      data-unread — node n_1 binds "rows" and "demo.list" does not read a binding of that name, so the answer was resolved and then read by nobody
    the page says: ""
    against reads: the name in "binding"
    diagnostics: 0
    the page says: "Post 1 Post 2"
```

Read the four blocks as two pairs and the `the page says` line as the ground
truth, because it is the only line here produced by the component rather than by
a checker.

The **first** node is broken: it tells the primitive to look under `rows` and
files its answer under `entries`, so it will draw nothing for as long as it
exists. The fixed list says `diagnostics: 0`.

The **second** node is correct and draws its two posts. The fixed list accuses
it.

So the fixed-list check is not merely weaker than the prop-named one. On the
exact pair of nodes this feature exists for, it is **inverted**: silent on the
broken page, loud on the working one. A checker that is wrong in one direction
gets tuned. A checker that is wrong in both is not a weaker version of the right
one — it is an instrument measuring a different quantity than the one its name
claims, which is where lesson 29 ended.

### Exercise G — how far the seam reaches in this library today

```ts
describe("G", () => {
  it("counts how far the seam reaches in this library today", () => {
    const catalogue = catalogueOf(registry)
    const declaring = catalogue.filter((primitive) => primitive.reads !== undefined)

    console.log(`  primitives registered:     ${catalogue.length}`)
    console.log(`  declaring what they read:  ${declaring.length} — ${declaring.map((primitive) => primitive.type).join(", ")}`)
    console.log(`  declaring they read none:  ${declaring.filter((primitive) => primitive.reads?.length === 0).length}`)
    console.log(`  saying nothing either way: ${catalogue.length - declaring.length}`)
  })
})
```

```
  primitives registered:     106
  declaring what they read:  5 — loom.trend, loom.tally, loom.voices, loom.feed, loom.plate
  declaring they read none:  0
  saying nothing either way: 101
```

Five, out of whatever the first line printed — and the five are the only
primitives in the library that read a binding at all, so the seam covers
everything it currently can.

The third line is the one to keep. **Nothing has ever declared `reads: []`**, so
the middle of the three answers has no instances anywhere: the distinction
between *nobody has said* and *this reads nothing* is, today, a distinction
between one populated state and one empty one. That is not an argument against
it — the empty state is what will let a primitive say *do not bind anything to
me* the day one wants to — but it is worth knowing that the design's most
carefully argued clause is currently carrying no weight at all, and that the
reason to keep it is entirely about what it prevents the runtime from asserting.

---

## Found by running it: the write path and the render path disagreed about props

This is not this lesson's subject and it is the most consequential thing the
exercises turned up. It was filed rather than fixed when this lesson was
written; `Loom daily build` has since fixed it, and
[0203](../decisions/0203-a-props-vocabulary-is-handed-the-props-a-primitive-is-handed.md)
records what was decided. The account below is kept because the *shape* of the
defect is the part worth learning, and the transcript above is what the exercise
prints now.

Look again at the second block of exercise D, as it read before the fix. The
node with *nothing wrong with it* — a `loom.feed` carrying a correctly spelled
binding to a registered source with valid params — came back `invalid props: 1`,
critical, **rejected**.

The reason was in the message: `Unrecognized key(s) in object: 'loom:data'`.

Here were the two halves of the disagreement.

**The render path splits reserved keys off before it validates.** `loom:data`,
`loom:submit`, `loom:anchor` and `loom:theme` are the runtime's own namespace;
`render.ts` removes them from a node's props, hands the rest to the primitive's
schema, and reports anything reserved that nothing read. Every props schema in
the starter library is `.strict()` precisely because it never sees those keys.

**The write path did not.** 0179 gave the Gate a props floor — a node carrying
props its own primitive refuses is `invalid-props`, critical, and cannot be
written. `invalidPropsIn` walked the resulting tree and handed each node's props
to the vocabulary **as they were**, reserved keys included. `propsVocabularyFor`
is a one-line adapter onto the same strict schemas. So the floor refused the key
the runtime itself put there. It now splits them off first, with the same
function the render walk calls.

Measured rather than reasoned: of the primitives the starter library registers,
**every one** refused a node carrying `loom:anchor`, and the same held for the
other three reserved keys. And the deployments in this repository that wire the
floor are the portal and the marketing site's adapt path.

Three more things I checked before writing that down, because each one would
have changed the size of it:

- **Inserting** a bound node was refused. **Configuring** a node that had no
  binding into one was refused. **Re-pointing a node that was already bound was
  not** — it came back `high` and `requires-confirmation`.
- That last row is why nothing had noticed. The analysis counts *introduced*
  invalid props and treats a node that was already failing as inherited, which
  is a good rule (lesson 08's half-repair argument) and there meant the only
  changes that passed were the ones on nodes this check had already condemned.
- The interpreter's prompt teaches a model to write `{"loom:data":{…}}` inside a
  node's props, in those words. So on a deployment with the floor wired, the
  write path refused, at its highest stakes, the exact JSON the prompt asks for.

What makes it a *lesson's* finding rather than a bug report is the shape, and
the shape is lesson 28's: **the knowledge that reserved keys are not props
existed in exactly one place** — the split behind `render.ts` — and the write
path reimplemented the sentence *validate this node's props* without it. Two
implementations of one rule, no comparison between them, and the one that was
wrong was the one that never runs in the tests that render a page.

The repair is the shape rather than the symptom: both seams now call
`partitionReservedProps`, so their agreement is a fact rather than a
coincidence, and the test that holds it derives its rows from the namespace's
own module instead of listing four keys — a fifth one grows the rows with it.

---

## It could have been otherwise

Seven, five of them in the two records and two that only appear once you have
run the exercises.

**Infer the names from the component.** A primitive reads `loom.data["entries"]`,
so a build step could find the string. Rejected, and the reason is exercise F in
advance: the one thing a parser certainly cannot see is *a key computed from a
prop*, which is what both of the library's bound primitives do. Lesson 29 ended
by noting that static analysis over-reports and observation under-reports; here
static analysis does not merely over-report, it is blind to the whole mechanism.

**Default `reads` to `[]`.** One less state, one less paragraph, and the
distinction collapses. Rejected in 0122's words: it makes the runtime assert
something no author said, and the assertion is false for every bound primitive
written before the declaration existed. Exercise E's third row is what the
default would have replaced — and it would have replaced it with the first
row's diagnostic, on pages that work.

**Put the names on the source instead.** A source could say what name its answer
is filed under. Rejected because it inverts the seam: one source answers many
primitives, each filing the answer under whatever name suits the page, and
0058's argument is that a binding is the *tree's* question. Worth noticing that
this alternative is attractive for exactly the wrong reason — it is the one that
would have made the name checkable *by a registry*, which is to say it would
have made the name a reference, which is to say it would have taken the feature
away.

**Refuse the binding at render rather than report it.** Drop the unread answer
from the bag. Rejected: dropping it changes nothing the primitive can see — it
was not reading it — and costs the diagnostic its ability to name what was
dropped. A rule of thumb from this: when a remedy is invisible to the party it
is applied to, the only thing it can produce is information, so do not spend the
information.

**Make the `BindingReader` a required render option.** Rejected for the reason
the frame resolver was: a required seam is one every host must wire and one that
can therefore go missing. Detecting it structurally off the resolver means a
registry satisfies it for free and a host that has registered nothing could not
have declared anything anyway.

**Replace the list with the prop-named form entirely**, so there is one shape
rather than two: `{ name: "entries" }` for the fixed case. Rejected because it
makes the common case pay for the rare one in every declaration and every
reading of one — and because the two shapes converge on one resolved name before
anything acts on them. One mechanism is worth paying for when two shapes would
otherwise diverge downstream, and here they do not.

**Refuse an unread name at the write path rather than reporting it at render.**
The version everybody asks for after exercise B, and the finding that asked for
it is open. It is harder than it looks and exercise D says why from both sides:
the write path would have to be handed a reader *and* resolve prop-named
declarations against each inserted node's props — and the one piece of
node-level props checking the write path already does is the one that is
currently refusing every bound node in the library.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections while
you write. Then compare.

1. **A colleague says: "this is just a typo bug — give binding names a schema
   and validate them."** Binding names already have a schema; `bindingNameSchema`
   refuses `entires!` and accepts `entires`.

   Explain, without using the word "typo", what class of fault this is and why
   no schema on the *name* can reach it. The version that transfers is a
   sentence about what a schema can know, and it should apply equally to an
   environment variable, a feature flag key, and a column name in a query — none
   of which are Loom.

2. **Derive this lesson from lesson 18 and lesson 28 together, without looking
   at either.**

   Lesson 18 gave you a binding's parts and the seam that resolves them. Lesson
   28 gave you *a check is a comparison, and here are the three places a second
   copy comes from*.

   Take a binding apart, apply lesson 28's three sources to each part in turn,
   and derive — rather than recall — which part had to be handled by asking an
   author. Then say what it cost that the answer was *ask an author*, and name
   the thing the repository bought with the same declaration that is worth more
   than the check.

Predict, before writing (2): the hard half is not identifying the name. It is
saying precisely why the first two parts had a second copy available and the
third did not, in a way that does not come down to *because a registry exists*.

---

## Self-check

Seven questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. Give the general rule this lesson's seam is an instance of, in a form that
   mentions neither bindings nor primitives: it should be a sentence about which
   mistakes a system can catch. Then give an example from outside Loom.
2. A misspelled primitive type is refused before the change is written; a
   misspelled binding name is accepted. Explain the difference **without** using
   the words "registry" or "reference", and then say which of the two faults
   produces the worse page.
3. State the three answers `reads` can give and what each means. Then say what
   the catalogue writes for each, and why one of the three gets no words at all —
   the answer is about which answer is common, not about which is important.
4. An entry in `reads` may be a name *or* a prop that gives one. Say why a plain
   list of names was not merely limited but wrong in both directions, and give
   the two nodes that demonstrate it. Then say which of the two mistakes you
   would rather a check made, and why.
5. `bindingsReadBy` hands back an unresolved declaration rather than a set of
   names, and the walk resolves it. Say what argument the registry would have had
   to be handed to resolve it itself, and state the general rule about seams,
   scopes and resolution that follows.
6. A primitive that has declared nothing is handed a binding under a name nothing
   reads, and the runtime says nothing. Defend that, then attack it, then say what
   would have to be true of the library for the defence to expire.
7. Exercise D's second block refuses a node that is completely correct. Name the
   two places the rule *reserved keys are not props* is implemented, say which one
   knows it, and state the general fault in lesson 28's vocabulary.

Question 1 is the one the rest of this lesson exists to support. Question 3 is
where a confident half-answer is most likely: the three answers come easily, and
the reason the third gets no clause is the part that is usually reconstructed
wrongly as *because it does not matter*.

---

## Reflect

Write for two minutes, then move on.

- Predict 1 and your confidence. Mark (a) separately from the rest: if you said
  the source was not asked, you had the right instinct about laziness and the
  wrong model of when resolution happens — which is lesson 18's sentence, and is
  the reason the cost is what it is.
- Predict 1(d). If you wrote that the Gate refuses it, write down what you
  expected to be doing the refusing. That expectation is the lesson: a system
  with a rule ladder, a stakes model, a props floor and a registered-type floor
  can still accept a change whose only fault is a string that had to match
  another string.
- Predict 2 asked you to rank three mistakes for the deployment and for the
  reader. If your two orders agreed, go back and look at exercise C's *page says*
  column: the cheapest mistake for the deployment is the loudest for the reader,
  and the most expensive is invisible.
- Predict 4 asked for a node the fixed list would accuse and a node it would wave
  through. Most readers find the first and not the second. If that was you, write
  down what made the accusation easier to imagine than the silence — the answer
  is usually that you were picturing the check running, rather than picturing it
  passing.
- Now go and look at your own work, and look for an **agreement** rather than a
  reference: two places that have to spell the same string and no third place
  that holds it. An event name published by one module and subscribed to by
  another. A query parameter written by a client and read by a handler. A CSS
  class emitted by one system and styled by another. For one of them, answer the
  three questions this lesson answers: who could refuse a mismatch, what does the
  system do when one happens, and what does the person on the other end see?
- Last, the general version. The remedy here was to ask an author to write down
  something they already knew, and to accept that the writing-down can rot.
  Think of a place in your own work where the same trade is available — where a
  fact is in somebody's head and could be made into data — and write down who
  would have to keep it true, how they would find out they had stopped, and
  whether anything other than a check would be bought by writing it down. That
  last part is the one that decided this design: the check was the cheaper half.

---

## Come back to this

Set AI in [`review-schedule.md`](review-schedule.md), two days after this
lesson. Interleaved with 09, 18, 22, 24, 28 and 29 — heavy on 28, because this
lesson is its three-sources rule applied until only one source is left; and on
24, because *absence is not emptiness* is stated there and is what makes this
seam shippable rather than a hundred edits.

Part V has thirteen lessons now, and this one is the first whose fact was never
written down twice at all. The earlier seams were a checker that could not reach
far enough, a fact two parties held, a fact one level away behind a promise, a
fact with no second copy, and a fact with two copies and the wrong question
asked of them.

Here there was one copy and the only way to get a second was to ask a person for
it — which is worth doing when, and only when, the declaration buys something
besides the check. It did: the model can be told the names, so the prompt's
instruction to a model went from *do not invent one* to *here are the ones that
exist*, which is a capability rather than a guard.

And the shape of what the declaration had to be is the part to carry forward.
The obvious version — a list of the names — was not a simplification of the
right answer. It was inverted on the exact case the feature exists for, silent
where the page was broken and loud where it worked. When you write down a fact
so that something can check it, the first question is not *what is the fact*. It
is *what is the fact a function of* — and if the answer includes something that
varies per use, the declaration is a rule and not a value.
