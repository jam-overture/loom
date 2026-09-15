# 18 — Data: the question the tree asks

**After this lesson you will be able to** name the three constraints that
decided this seam and say which one each rejected alternative sacrifices; state
what a binding contains and — the harder half — what it is forbidden from
containing, with the reason stated as a property of the *tree* rather than as a
performance argument; say what survives of "the page is a function of the tree"
once a tree can ask questions, and what does not; give the seven named reasons a
binding has no value, say which one of the seven neither a tree nor a source can
cause, and say why "empty" is not among them and could not be; explain why a
malformed binding map is refused whole rather than in part; say what a reviewer's
approval covers when the thing approved was a question; and say what it meant
that one of those seven reasons sat in the list for a month with nothing in the
system able to produce it.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md), [08](08-two-axes.md), [09](09-the-gate.md),
[10](10-the-pipeline.md), [11](11-the-model-seam.md), [12](12-projection.md),
[13](13-refusal-and-repair.md), [14](14-rendering.md),
[15](15-primitives-and-the-registry.md), [16](16-persistence.md),
[17](17-telemetry.md). The ones this lesson leans on hardest are 05, 14 and 15.

Part V starts here, and it starts with the first thing in this course that a
tree is not allowed to hold.

Everything through Part IV was about a document: what is in it, how it changes,
who may change it, how it is judged, stored and drawn. A document is a closed
world, and the closedness is what made all of it work — lesson 14's renderer is
a pure function of the tree because there was nothing else for it to be a
function of.

Now a customer wants their actual services on their actual page. The list lives
in someone's database. It changes on a Tuesday afternoon because a person edited
it, with no proposal, no Gate and no revision. It is different for two visitors.
And nobody undoes it.

Nothing you have learned so far has anywhere to put that.

---

## Warm-up

Closed book, five minutes, mixed across six lessons. Write something for all
five before you look anything up.

1. Give the one question that decides which of the three grades a render fault
   gets, and say what the middle grade — *degrade* — is reserved for. *(14)*
2. `Clock` is injected rather than read. Say what that buys that a comment
   reading "do not call `Date.now` in here" would not, and name the party the
   injection is really for. *(05)*
3. There is no `if` in the AST. Give the reason, then give the cost — the thing
   an author genuinely cannot express — and say where that expressiveness went
   instead. *(02)*
4. A primitive declares a prop schema. Name two of the five places that
   declaration is acted on, and say which of your two *prevents* something
   rather than detecting it after the fact. *(15)*
5. Lesson 12 gave one sentence saying what a projection is. Write it from
   memory. Then say what the catalogue is a projection *of*, and what a model
   can do with a primitive that is not in it. *(12, 15)*

Question 3 is this lesson's scaffolding, and it is scaffolding by analogy rather
than by contrast: the answer you give for `if` is very close to the answer this
lesson gives for a database, and noticing that later is worth more than being
told it now.

---

## Predict

In writing, before reading on.

> 1. A page has a card that must show the services its owner actually offers —
>    a list in the host's database, edited by a person, different per visitor,
>    never undone. Lesson 14 established that `renderLoomTree` is a synchronous
>    pure function of the tree. **Design the seam.** Start with the obvious
>    answer — the answer goes in the node's props, written there by whatever
>    fetched it — and then argue against it as hard as you can. Your argument
>    has to be about what the *tree* becomes, not about how hard it is to wire.
> 2. A profile page has five nodes that ask for something. Three of them ask one
>    profile source for three different fields. The other two ask a services
>    source with the same two params, one node writing them `{ limit, kind }`
>    and the other `{ kind, limit }`. **How many times is the host's code
>    called when the page is served?** Commit to a number.
> 3. A model proposes adding a bound card, the Gate weighs it, a reviewer reads
>    it and approves, and it is applied. Three weeks later that card is showing
>    a visitor something no reviewer ever saw. Say whether that is a bug. Then
>    say, in one sentence, what the approval actually covered. **Rate your
>    confidence 1–5 before you check.**
> 4. One of the named reasons a binding has no value is `unavailable`, and its
>    definition in the source has read "ask again later — a timeout, a dead
>    connection" since the seam was designed. A primitive has had a branch for
>    it just as long. **Write down the code path that produces one.** Take the
>    question literally: name the thing that decides a call has taken too long,
>    and say which file it is in. If you cannot name it, write that down
>    instead, and write what you expect to find when you go and look.

Predict 2 has an exact answer and it is not the number of nodes. Predict 3 is
the one this lesson is really about, and it is the one most readers rate a 4 on
and get wrong. Predict 4 is a question about this repository rather than about
design, and what you write for it is worth keeping until Exercise G.

---

## The problem

Three constraints pull against each other, and every design in this space
sacrifices at least one. Getting them stated precisely is most of the work,
because once they are stated the answer is nearly forced.

### Rendering cannot wait

`renderLoomTree` is a pure synchronous function of the tree and the resolver. No
hooks, no IO, no module cache, no clock. Lesson 14 spent itself on why: it is
what lets the same function run at an edge and inside a Server Component without
the library having an opinion about the host's infrastructure, and it is what
makes two renders of one revision agree.

Fetching a profile is IO by definition. One `await` in the walk gives all of
that up — and not vaguely. An async walk resolves a binding *when it reaches
it*, so a card nested six deep waits for five ancestors that had nothing to do
with it, and the same tree rendered twice can interleave differently.

### Props belong to the tree, and data does not

This is the constraint that is easy to nod at and hard to hold on to, so hold it
against everything you know about props.

A prop is proposed by a model, weighed by the Gate, attributed by the log, and
taken back by an inverse delta. Every one of those four verbs assumes the same
thing: that the value is a **decision somebody made about the page**.

Now put a services list where a prop goes. It changes without a proposal. It has
no author the log could name. `configure` against that node is a proposal
against content nobody authored. Its inverse restores *data* rather than a
decision. And the Gate finds itself weighing the stakes of "someone's services
list changed overnight".

The tree stops being a document and becomes a cache of somebody's database. Once
you see that sentence, the alternative design is dead — and notice that it was
killed by an argument about **what the tree is**, not by an argument about
freshness or staleness. That was Predict 1, and if your case against props was
"the data would be stale", you found a real cost and missed the fatal one.

### Params are AI-authored

A binding names a source and asks it with parameters, and both arrive from a
model through the same path as everything else in a tree. A source that took a
free-form query string would be handing a model whatever query language sits
behind it.

That is exactly the failure [0053](../decisions/0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md)
rejected for URLs, in a place where the blast radius is the host's data rather
than one `href`.

---

## The idea

### A binding is a question, carried in the tree, and never an answer

```json
"loom:data": {
  "services": { "source": "catalogue.services", "params": { "limit": 6 } },
  "bio":      { "source": "profile.field", "params": { "field": "bio" } }
}
```

That is the whole shape. A registered source id, and the params to ask it with,
under a name the primitive reads its answer by. `loom:data` is the second key in
the reserved `loom:` namespace that lesson 14 partitioned out of every node's
props before anything else happens.

Read what is *not* there. Nothing about the reply. Not the list, not a
timestamp, not a cached copy, not a "last known good". Two deployments serving
one revision show the same page asking the same questions, and differ only where
their data differs.

This is the same move as Warm-up 3, and it is worth saying in one line so you
can hear it. **There is no `if` in the AST because branching is a decision the
tree refuses to hold. There is no answer in the tree because data is a fact the
tree refuses to hold.** Both times, the thing removed does not disappear — it
moves to a party who owns it, and the tree keeps a name that points at it.

### The impurity moves outward, in three steps

Lesson 14 gave the general form and promised the bill would come due here:

> **When a pure function needs something impure, the impurity moves outward to a
> point where it can happen once, and arrives as a value.**

Three functions, and the middle one is the only one that does IO:

| step | what it is | pure? |
| --- | --- | --- |
| `planTreeData(tree)` | reads every binding out of the tree, returns the deduplicated set of questions | **yes** — a pass that only reads |
| `resolveDataPlan(plan, …)` | asks every question at once, captures every failure against its own key | no; this is the seam |
| `renderLoomTree(tree, { data })` | takes the answers as a finished lookup | **yes**, exactly as before |

`renderRequest` is where the three meet, and it was already `async`. That is why
lesson 14 could tell you there is exactly one `await` in the whole render path,
sitting after the parse and before the walk: after, because a plan is read off a
tree that has been proved to be one; before, because the walk cannot wait.

Notice the shape of that table against lesson 05. `Clock` was the same move one
layer up: a pure function that needs the time does not read the time, it is
handed it. Here a pure function that needs a database does not read the
database, it is handed the answers. The seam is bigger; the trick is identical.

### The registry is the allowlist, and it validates both directions

A source is registered the way a primitive is, and the mirroring is deliberate
enough that lesson 15's vocabulary transfers wholesale. `defineSource` takes an
id, one line for the catalogue, a Zod schema for what it **accepts**, a Zod
schema for what it **answers**, and the adapter.

Three consequences, and the third is the one that is easy to skip past:

- **A binding can only reach what a deployment registered.** An unregistered
  source is not an error at registration time or a crash at render time; it is
  one named, reported reason a node has no data.
- **Params are validated before the adapter is called.** The deployment that
  forgets to check does not find out when a proposal asks a source for a column
  nobody meant to publish.
- **The answer is validated after the adapter returns**, even though the adapter
  is typed by the very schema doing the validating. That looks redundant and is
  the opposite. The doc comment says it better than a summary can:

  > the adapter's type is a claim about a database, and the schema is the only
  > thing that makes it true on the day the column changed.

  A TypeScript type is a claim checked at compile time about a value that
  arrives at run time from a system nobody in this repository controls. It is
  lesson 14's `TreeSource.load` returning `unknown`, one seam over.

And `dataCatalogue` projects the registry the way `catalogueOf` projects
primitives, for the reason Warm-up 5 asked you to state: a source a model was
never told about is one it can only guess at.

### `ready`, or `unavailable` with a reason — and "empty" is neither

A primitive receives `loom.data`, **beside `props` rather than merged into
them**, and each entry is one of exactly two things:

```ts
type DataOutcome =
  | { readonly status: "ready"; readonly value: JsonValue }
  | { readonly status: "unavailable"; readonly unavailable: DataUnavailable }
```

There are seven reasons in `DataUnavailable`. Exercise C prints six of them;
the seventh will not come out of that exercise no matter what you register, and
Exercise H is about why. What matters more than the list is what is *not* in it:

**There is deliberately no way to express "empty" as a failure.** A source with
nothing to report answers `ready` with an empty list. That is not a nicety. A
primitive that treats a missing answer as an empty list is the one that tells a
visitor their services are gone when in fact an integration timed out — and the
verbose shape is the one that cannot lie. Collapsing those two states is a
mistake the portal spent a whole day undoing after making it.

Sit with how thoroughly this is the same argument as lesson 12's. Two failures
that would produce different downstream answers must not be one code — applied
there to what a model is told, applied in lesson 14 to what a page does, applied
here to what a visitor is told about their own business. It is the third costume
of one idea, and the party protected is different every time.

### Every failure is total

An unregistered source, a binding nothing resolved, params the source refuses,
an answer that fails its own schema, an adapter that throws, a source that could
not be reached, an adapter that refuses — all seven produce a diagnostic and **a
node that still renders**.
That is lesson 14's *degrade* grade, and its rule applied cleanly: the missing
thing is the host's answer rather than the tree's content, so the node is not
unrenderable, and deleting a section over an integration being down would be the
worse page.

One detail worth stopping on, because it is the only exception of its kind in
the runtime. There is **one `try` in Loom's own code**, and it is the one around
a host adapter. Everything else in this system refuses to throw as a matter of
discipline (lesson 05). An adapter is not Loom's code, and one integration's bad
afternoon must not be why a page 500s.

### Six of the seven blame the far side; the seventh blames the wiring

Read the seven again and sort them by *who fixes it*, which is not how a union
is usually read and is the only reading that explains why there are seven.

Six of them are about the far side of the seam. The tree asked with bad params,
or named nothing; the source threw, refused, answered wrongly, or could not be
reached. Every one of those is fixed by whoever owns the data or whoever wrote
the binding, and every one of them can be reached from a tree you can type out.

`not-resolved` is not like that. It says *the answers came from resolving a
different plan than this tree* — a caller planned one tree, got answers for it,
and handed them to a render of a different one. No binding can cause it. No
adapter can cause it. The registry is untouched and every source in it is
working. It is a fault in the composition root, and the only person who can fix
it is the one who wired the render.

Until 12 September it shared a code with `no-such-source`, and the diagnostic
that produced is worth reading as a small parable:

> no source is registered for it — this binding was never resolved

Two sentences contradicting each other, sending one reader to the registry and
the other to the composition root, printed for one fault which was only ever one
of the two. **A code is an address for a person, not a label for a state**, and
two faults that send different people to different files cannot share one, no
matter how similar the surface looks. That is lesson 12's argument about what a
model is told, and lesson 13's about what a refusal says, arriving a third time
in a place where the party being protected is the person on call at 2am.

You will make one in Exercise H, and you will have to reach past the ordinary
route to do it — which is itself the evidence for everything in this section.

### A reason nobody could produce is not a reason, it is a sentence

`unavailable` is the one to sit with, and it is Predict 4.

It has been in the union from the beginning. Its definition in `adapter.ts`
reads *"ask again later — a timeout, a dead connection"*. `describeDataUnavailable`
has a sentence of its own for it, distinct from the one it has for `refused`; the
primitive in this lesson's preamble has a branch for it; and the argument for
keeping the two apart — a primitive shows different things for them, and only one
of the two is worth retrying — is sound and was always sound.

And until 13 September, **nothing in this system could produce one for the
failure it was named for.** The only route to `unavailable` was a host's adapter
returning it, which requires the adapter to have noticed its own timeout and
come back to say so. An adapter that hangs does not come back. Nothing in the
runtime ever stopped waiting, so the failure mode the word exists for was the
one failure mode that could not reach it.

Worse than not reaching it, because of the `Promise.all` you will meet in
Exercise E. Every question is asked at once, and a page's latency is the slowest
of its integrations — but a call that never answers is not a latency. One
hanging source held the entire page, not its own region, for as long as the
reader was prepared to sit there. No diagnostic was ever written, because
nothing had decided it had waited long enough. A spinner, an empty log, and the
thing that eventually gives up is the person.

[0140](../decisions/0140-a-call-into-foreign-code-has-a-ceiling-and-the-runtime-owns-it.md)
is the fix and it is one sentence: **the runtime, not the host, decides how long
it is prepared to wait.** Ten seconds per source, independently, so a page with
one dead integration and five live ones shows five regions and a diagnostic.
There is deliberately no way to switch it off — a caller that wants to wait
twenty minutes says twenty minutes, which is a number the reader of a call site
can see, and `undefined` meaning "forever" is not.

Two things generalise out of this and neither is about timeouts.

**A named state with no producer is indistinguishable from a working one, from
the inside.** Every test passed. The type was exhaustive, the switch had no
missing case, the sentence was written, the branch existed. Exhaustiveness
checks that every value in the union is *handled*; nothing checks that any value
in the union is *reachable*. A union is a claim about what can happen, and the
compiler will hold you to the second half of it and never to the first.

**And the half that mattered was the signal, not the answer.** Walking away from
a promise does not stop the work behind it. Without the abort, a page that gave
up on an integration still holds its socket, and the connections a deployment
leaks under load are exactly the ones it had already stopped waiting for.
Exercise G has two adapters that never answer, one listening for the signal and
one not, and the difference between them is not in the page.

### What this costs, stated plainly

[0050](../decisions/0050-the-runtimes-props-are-namespaced-and-the-root-mounts-the-theme.md)
opened the reserved namespace with a promise that it would keep "the page a
function of the tree alone". A tree that asks a question does not have that
property, and 0058 says so in its own consequences rather than letting somebody
discover it.

What survives is weaker and is still the thing worth having:

> **The tree alone determines what is asked.**

Which questions, of which sources, with which params, is fixed by the revision.
Only the answers vary. A page that renders differently for two visitors does so
at **named points**, each of which is a binding somebody proposed and the Gate
weighed.

And there is a second cost, which 0058 records as an open question rather than
solving speculatively — this is Predict 3:

> **A revision no longer pins what a reviewer saw.**

Approving a change to a bound node approves *the question*, not the answer that
was on screen. §6 records diagnostics; what it does not record is which answers
a render used. Reconstructing a page as a reviewer saw it would need that, and
nothing stores it.

So: not a bug. It is the declared cost of the only design that keeps the tree a
document. If you predicted "bug", the thing to correct is not the verdict, it is
the noun — you were treating a page as the reviewable artefact, and in this
system the reviewable artefact is the tree.

---

## In the code

**`src/data/binding.ts`** — what a binding is, and `parseBindings`. Read the doc
comment on the parser rather than the parser: it is four sentences and one of
them decides Exercise D.

**`src/data/plan.ts`** — `planTreeData`, and `canonical`, which is why key order
in params does not make two questions out of one. Note what `canonical` does
*not* do to arrays, and be able to say why the asymmetry is right.

**`src/data/adapter.ts`** — the host's half. `defineSource`, the seven reasons,
the single `try`, and `describeDataUnavailable`, which is the sentence a person
reads. The doc comment above the union is the one to read twice: it is about
`no-such-source` and `not-resolved`, and it is an argument about *which file a
reader is sent to* rather than about what is true.
Compare `describeDataRegistryError` two screens down: one of these two
tells you what a valid source id looks like and the other does not, which is
worth noticing and is the subject of a note in this run's report.

**`src/data/resolution.ts`** — `DataOutcome`, `NO_DATA`, and one comment
explaining why `NodeData` is a null-prototype object. It is the same hazard
lesson 14 flagged on the primitive resolver: binding names are identifiers, and
`constructor` is a valid identifier.

**`src/data/resolve.ts`** — one `Promise.all`, one ceiling per question, and the
whole latency argument in the doc comment. Read its last paragraph knowing it was
added a month after the rest: it is a doc comment telling you that the sentence
above it was not true when it was written.

**`src/deadline.ts`** — eighty lines and three exported functions, and it governs
every place Loom awaits somebody else's code: this seam, a submission, and the
model. `withCeiling` is worth
reading line by line for what it does *after* it has answered: the losing promise
is still going to settle, and an unhandled rejection arriving late would take a
Node server down for a call the runtime had already reported on.

**`src/render/data.test.ts`** — read this one as prose. It is the seam's
behaviour written as sentences, and `servicesPrimitive` at the top is the
shortest correct example of a primitive that distinguishes "none" from "could
not reach".

---

## Try it

Eight exercises. Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

**Predict every output in writing, then run.** Exercises A, B and D have answers
most readers get wrong, and they are wrong in three different directions.

The shared preamble for all eight:

```ts
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, it } from "vitest"
import { z } from "zod"

import {
  buildDataResolution,
  createDataRegistry,
  defineSource,
  describeDataUnavailable,
  planTreeData,
  resolveTreeData,
  DEFAULT_SOURCE_CEILING_MS,
  type DataAdapter,
  type DataRegistry,
  type DataUnavailable,
  type RequestKey,
  type SourceEntry,
} from "./data/index.js"
import { describeCeiling } from "./deadline.js"
import { sequentialIdFactory } from "./ids.js"
import type { JsonValue } from "./json.js"
import { DATA_PROP_KEY } from "./reserved-props.js"
import {
  describeRenderDiagnostic,
  renderLoomTree,
  staticPrimitiveResolver,
  type LoomPrimitive,
  type LoomPrimitiveProps,
} from "./render/index.js"
import { err, ok, type Result } from "./result.js"
import { buildElement } from "./tree/builders.js"
import { createTree, type LoomTree } from "./tree/tree.js"

/** A page whose nodes each carry one `loom:data` map, in the order given. */
const pageAsking = (...declared: readonly unknown[]): LoomTree => {
  const idFactory = sequentialIdFactory()

  const asking = declared.map((map) =>
    buildElement(idFactory, {
      type: "loom.services",
      props: { [DATA_PROP_KEY]: map } as never,
    })
  )

  return createTree(
    buildElement(idFactory, { type: "loom.page", children: asking }),
    idFactory
  )
}

const registryOf = (...entries: readonly SourceEntry[]): DataRegistry => {
  const registry = createDataRegistry(entries)
  if (!registry.ok) throw new Error(`registry refused: ${registry.error.code}`)

  return registry.value
}

/** Shows what it was given, and shows "none" and "could not reach" apart. */
const services: LoomPrimitive = ({ loom }: LoomPrimitiveProps) => {
  const outcome = loom.data["services"]

  if (!outcome) return createElement("section", { "data-state": "unbound" })
  if (outcome.status === "unavailable") {
    return createElement("section", { "data-state": "unavailable" }, outcome.unavailable.reason)
  }

  const items = Array.isArray(outcome.value) ? outcome.value : []

  return createElement(
    "section",
    { "data-state": items.length === 0 ? "empty" : "ready" },
    items.join(", ")
  )
}

const resolver = staticPrimitiveResolver({
  "loom.page": ({ children }: LoomPrimitiveProps) => createElement("main", null, children),
  "loom.services": services,
})

const say = (label: string, output: { diagnostics: readonly unknown[] }): void => {
  console.log(`${label}: ${output.diagnostics.length} diagnostic(s)`)
  for (const d of output.diagnostics) {
    console.log("  -", (d as { code: string }).code, "—", describeRenderDiagnostic(d as never))
  }
}
```

The primitive is the shape to steal. Three states, named, with the two failures
that a reader would confuse kept apart — and the `unbound` branch, which you
will not see until Exercise D.

### Exercise A — the questions, read off the tree

```ts
describe("A", () => {
  it("reads the questions off the tree without asking any of them", () => {
    const tree = pageAsking(
      { services: { source: "catalogue.services", params: { limit: 6 } } },
      { services: { source: "catalogue.services", params: { limit: 6 } } },
      { services: { source: "catalogue.services", params: { kind: "active", limit: 6 } } },
      { services: { source: "catalogue.services", params: { limit: 6, kind: "active" } } },
      { bio: { source: "profile.field", params: { field: "bio" } } }
    )

    const plan = planTreeData(tree)

    console.log("bindings:", plan.bindings.length, "| requests:", plan.requests.length)
    for (const request of plan.requests) console.log("  key:", request.key)
    console.log(
      "bindings by node:",
      plan.bindings.map((binding) => `${binding.nodeId}.${binding.name}`).join(" ")
    )
  })
})
```

Predict, before running: how many bindings, how many requests, and — the part
that separates the answers — **what a request key looks like**.

The output:

```
bindings: 5 | requests: 3
  key: catalogue.services {"limit":6}
  key: catalogue.services {"kind":"active","limit":6}
  key: profile.field {"field":"bio"}
bindings by node: n_1.services n_2.services n_3.services n_4.services n_5.bio
```

**Five bindings, three requests.** Nodes 1 and 2 asked identically. Nodes 3 and
4 asked identically *in different words* — one wrote `{ kind, limit }`, the
other `{ limit, kind }` — and the key printed for them is sorted, `kind` before
`limit`, which is neither node's spelling. That is `canonical` doing the one job
it exists for: a model writes params in whatever order it happens to, and key
order is not a question.

Two things to take from this that are not about deduplication.

**Nothing was asked.** No registry was involved; there is no registry in this
exercise. `planTreeData` is a pure function of the tree, and what it returns is
the *questions* — which means you can know exactly what a revision will ask
before you have anything to answer with, and a static analysis of a proposal can
too.

**Arrays keep their order and objects do not.** `canonical` sorts object keys
and leaves array elements alone. Both are right, and it is worth being able to
say why in one sentence: in an object, key order carries no meaning; in an
array, order is the meaning.

### Exercise B — how many times was the host's code called?

```ts
describe("B", () => {
  it("asks each question once, however many nodes asked it", async () => {
    const asked: string[] = []

    const counting = (id: string): SourceEntry =>
      defineSource({
        id,
        description: `counts what it was asked, for ${id}`,
        params: z.object({}).passthrough(),
        answers: z.array(z.string()),
        adapter: {
          fetch: ({ params }) => {
            asked.push(`${id} ${JSON.stringify(params)}`)

            return Promise.resolve(ok(["Coaching"]))
          },
        },
      })

    const tree = pageAsking(
      { services: { source: "catalogue.services", params: { limit: 6 } } },
      { services: { source: "catalogue.services", params: { limit: 6 } } },
      { services: { source: "catalogue.services", params: { kind: "active", limit: 6 } } },
      { services: { source: "catalogue.services", params: { limit: 6, kind: "active" } } }
    )

    const data = await resolveTreeData(tree, {
      registry: registryOf(counting("catalogue.services")),
    })

    console.log("adapter calls:", asked.length)
    for (const call of asked) console.log("  asked:", call)

    const out = renderLoomTree(tree, { resolver, data })
    console.log("sections:", renderToStaticMarkup(out.element).split("<section").length - 1)
    say("render", out)
  })
})
```

This is Predict 2, run. Four nodes ask. Commit to the number of adapter calls
*and* to the number of sections that render, before you look — the pair is the
exercise.

The output:

```
adapter calls: 2
  asked: catalogue.services {"limit":6}
  asked: catalogue.services {"kind":"active","limit":6}
sections: 4
render: 0 diagnostic(s)
```

**Two calls, four sections.** Four nodes each got an answer; the host's code ran
twice. That is not a cache and there is no cache anywhere in this seam — it is
that two nodes asking the same question are one question, decided in a pure pass
before anything was asked.

The number that would have been *worst* is three: the answer you get if you
dedupe by source id and not by params, which is a design that quietly serves one
node the wrong list. Deduplication here is exact or it is a bug, and the request
key is what makes it exact.

The motivating case is not hypothetical. In the system Loom's block library was
ported from, an `about` block bound three fields to one profile, and three round
trips for one row is a cost paid on every request, forever.

### Exercise C — six ways the far side has no answer, and one way to have nothing

```ts
describe("C", () => {
  it("names six ways the far side has no answer, and none of them is empty", async () => {
    const strict = (id: string, adapter: DataAdapter<{ limit: number }, string[]>): SourceEntry =>
      defineSource({
        id,
        description: `fails in the way ${id} is named for`,
        params: z.object({ limit: z.number() }),
        answers: z.array(z.string()),
        adapter,
      })

    const registry = registryOf(
      strict("fail.params", { fetch: () => Promise.resolve(ok(["never reached"])) }),
      strict("fail.answer", { fetch: () => Promise.resolve(ok("not a list" as never)) }),
      strict("fail.threw", {
        fetch: () => {
          throw new Error("the connection pool is gone")
        },
      }),
      strict("fail.unavailable", {
        fetch: () => Promise.resolve(err({ code: "unavailable", detail: "timed out after 2s" })),
      }),
      strict("fail.refused", {
        fetch: () => Promise.resolve(err({ code: "refused", detail: "this audience may not see it" })),
      }),
      strict("fine.empty", { fetch: () => Promise.resolve(ok([])) })
    )

    const asks = [
      { services: { source: "nowhere.at-all", params: { limit: 6 } } },
      { services: { source: "fail.params", params: { limit: "six" } } },
      { services: { source: "fail.answer", params: { limit: 6 } } },
      { services: { source: "fail.threw", params: { limit: 6 } } },
      { services: { source: "fail.unavailable", params: { limit: 6 } } },
      { services: { source: "fail.refused", params: { limit: 6 } } },
      { services: { source: "fine.empty", params: { limit: 6 } } },
    ]

    const tree = pageAsking(...asks)
    const data = await resolveTreeData(tree, { registry })
    const out = renderLoomTree(tree, { resolver, data })

    for (const node of planTreeData(tree).bindings) {
      const outcome = data.lookup(node.nodeId)["services"]
      console.log(
        outcome?.status === "ready"
          ? `ready — ${JSON.stringify(outcome.value)}`
          : `unavailable — ${outcome ? describeDataUnavailable(outcome.unavailable) : "?"}`
      )
    }

    console.log(renderToStaticMarkup(out.element))
    console.log("diagnostics:", out.diagnostics.length)
  })
})
```

Predict, before running: seven nodes, seven bindings. **How many diagnostics?**
And: `fail.threw` throws a real `Error` out of the adapter — say what happens to
the other six nodes.

The output:

```
unavailable — no source is registered for it — registered: fail.params, fail.answer, fail.threw, fail.unavailable, fail.refused, fine.empty
unavailable — the params in the tree are not what the source accepts — limit: Expected number, received string
unavailable — the source answered with something its own schema refuses — Expected array, received string
unavailable — the source threw instead of answering — the connection pool is gone
unavailable — the source could not be reached — timed out after 2s
unavailable — the source refused — this audience may not see it
ready — []
<main><section data-state="unavailable">no-such-source</section><section data-state="unavailable">invalid-params</section><section data-state="unavailable">invalid-answer</section><section data-state="unavailable">adapter-threw</section><section data-state="unavailable">unavailable</section><section data-state="unavailable">refused</section><section data-state="empty"></section></main>
diagnostics: 6
```

**Six diagnostics for seven bindings.** The seventh is `fine.empty`, and it is
the whole point of the exercise: a source that answers with nothing has
*answered*. It is `ready`, it carries `[]`, it produces no diagnostic, and the
primitive renders `data-state="empty"` rather than `data-state="unavailable"`.
Nothing went wrong, so nothing is reported.

Three more things in that output.

**The page rendered.** All seven sections are there, including the one whose
adapter threw a real exception, and nothing was caught by anyone downstream of
the seam. That is the single `try`, doing the only job it has.

**`fail.answer` returned `ok`.** Its adapter succeeded, cheerfully, with a
string where its own declaration promised a list of strings — and it took an
`as never` to get TypeScript to permit writing it. That cast is the exercise: it
is a stand-in for the day the column changed and the types still said what they
said last quarter. The answer schema caught what the type could not.

**`invalid-params` never reached the adapter at all.** `fail.params` has a
perfectly working `fetch` that would have returned a list; the tree asked with
`limit: "six"`, and the request stopped at the schema. That is the allowlist
being an allowlist rather than a suggestion.

And one thing that is *not* in that output, which is the point of the two
exercises at the end of this section. Six reasons appear there and the union has
seven. Before reading on, go back to the registry above and try to write an
eighth source that produces the seventh — you have `defineSource`, a schema, an
adapter and a tree, and none of them can do it. `fail.unavailable` is worth a
second look too: its adapter *reported* a timeout, which is an adapter noticing
its own clock and coming back to say so. Exercise G is the other route to that
same reason, and it is the one the runtime owns.

### Exercise D — one good binding and one typo

```ts
describe("D", () => {
  it("refuses a malformed map whole", async () => {
    const registry = registryOf(
      defineSource({
        id: "catalogue.services",
        description: "the services this profile offers",
        params: z.object({}).passthrough(),
        answers: z.array(z.string()),
        adapter: { fetch: () => Promise.resolve(ok(["Coaching", "Advising"])) },
      })
    )

    const good = pageAsking({ services: { source: "catalogue.services" } })
    const halfBad = pageAsking({
      services: { source: "catalogue.services" },
      bio: { source: "NOT A SOURCE ID" },
    })

    for (const [label, tree] of [
      ["one good binding", good],
      ["one good, one misspelled", halfBad],
    ] as const) {
      const plan = planTreeData(tree)
      const data = await resolveTreeData(tree, { registry })
      const out = renderLoomTree(tree, { resolver, data })

      console.log(
        `${label}: requests=${plan.requests.length} problems=${plan.problems.length} markup=${renderToStaticMarkup(out.element)}`
      )
      say(label, out)
    }
  })
})
```

Predict, before running: the second tree's node declares two bindings, one
valid and one naming something that is not a source id at all. **What does the
valid one get?** Commit, and rate your confidence 1–5.

The output:

```
one good binding: requests=1 problems=0 markup=<main><section data-state="ready">Coaching, Advising</section></main>
one good binding: 0 diagnostic(s)
one good, one misspelled: requests=0 problems=1 markup=<main><section data-state="unbound"></section></main>
one good, one misspelled: 1 diagnostic(s)
  - data-misdeclared — node n_1 declares data that is not a map of binding names to sources, so it rendered with none — bio.source: expected dot-namespaced kebab-case, like "commerce.products"
```

**`requests=0`.** The valid binding was not asked. It was not asked *and* it was
not silently dropped — the node is reported as misdeclared and renders with no
data at all, which is the `unbound` branch of the primitive finally showing up.

This is the design decision most worth arguing with, so argue with it before
reading the defence. Answering the half that parsed is obviously more helpful.

The parser's own comment gives the reason:

> Answering half of a malformed declaration would hand a primitive a bag that
> satisfies neither what the author wrote nor what the schema says, and "some of
> your bindings silently did not happen" is the hardest kind of failure to
> notice.

Think about the node this actually happens to. An `about` block binds a name, a
photo and a bio; one of the three is misspelled. Partial resolution renders a
profile card with a name and a photo and no bio — which looks *exactly* like a
person who has not written a bio yet. The page is plausible, nobody's page is
broken, and the fault is invisible until somebody goes looking. Refusing the map
whole makes the block visibly unbound, which is a thing somebody notices in the
first minute.

The general form, and it is one you have met three times now: **a failure that
produces a plausible page is worse than one that produces an obviously broken
one.** Lesson 14 rejected promoting an unknown primitive's children for this
reason ("it looks like a layout bug"), and this seam rejects "empty" as a
failure state for it too.

One note about that diagnostic's last clause. When this lesson was written it
ended `bio.source: Invalid` — Zod's default message for a failed pattern, which
told a reader nothing about what a source id is meant to look like, while the
registry's own error for the same mistake already said "expected dot-namespaced
kebab-case, like `commerce.products`". This lesson's report filed the gap, and on
12 September the parser started saying what it expected, in the registry's words.
The output above is today's.

### Exercise E — everything at once, or one page's latency is a sum

```ts
describe("E", () => {
  it("asks everything at once", async () => {
    const log: string[] = []

    const after = (id: string, ms: number): SourceEntry =>
      defineSource({
        id,
        description: `answers after ${ms}ms`,
        params: z.object({}).passthrough(),
        answers: z.array(z.string()),
        adapter: {
          fetch: async () => {
            log.push(`ask ${id}`)
            await new Promise((resolve) => setTimeout(resolve, ms))
            log.push(`answer ${id}`)

            return ok([id])
          },
        },
      })

    const tree = pageAsking(
      { services: { source: "slow.one" } },
      { services: { source: "slow.two" } },
      { services: { source: "slow.three" } }
    )

    await resolveTreeData(tree, {
      registry: registryOf(after("slow.one", 60), after("slow.two", 40), after("slow.three", 20)),
    })

    for (const line of log) console.log(line)
  })
})
```

Predict, before running: write down the six lines in order.

The output:

```
ask slow.one
ask slow.two
ask slow.three
answer slow.three
answer slow.two
answer slow.one
```

Every ask happens before any answer, and the answers come back in the reverse of
the order they were asked, because the reverse is the order they finished in.

That is one `Promise.all` and it is worth stating what it buys as a property
rather than as a speed-up: **a page's latency is the slowest of its
integrations, not the sum of them.** A serial version would have printed the
lines in pairs, and a page with six bindings would have been six round trips
deep — the same cost the async-walk alternative pays, arriving by a different
route.

And it is safe to do only because the plan is a *set* with no ordering in it. A
binding cannot depend on another binding's answer, because the answers do not
exist yet when the plan is made. What looks like a performance decision is
downstream of the plan being pure.

### Exercise F — one tree, two deployments

```ts
describe("F", () => {
  it("keeps the answer out of the tree", async () => {
    const of = (...items: readonly string[]): DataRegistry =>
      registryOf(
        defineSource({
          id: "catalogue.services",
          description: "the services this profile offers",
          params: z.object({}).passthrough(),
          answers: z.array(z.string()),
          adapter: { fetch: () => Promise.resolve(ok([...items])) },
        })
      )

    const tree = pageAsking({ services: { source: "catalogue.services", params: { limit: 6 } } })

    const london = await resolveTreeData(tree, { registry: of("Coaching", "Advising") })
    const berlin = await resolveTreeData(tree, { registry: of("Beratung") })

    console.log(renderToStaticMarkup(renderLoomTree(tree, { resolver, data: london }).element))
    console.log(renderToStaticMarkup(renderLoomTree(tree, { resolver, data: berlin }).element))

    const node = tree.root.kind === "element" ? tree.root.children[0] : undefined
    console.log("the node, after both renders:", JSON.stringify(node))
  })
})
```

Predict, before running: what is in the node after two renders that produced two
different pages.

The output:

```
<main><section data-state="ready">Coaching, Advising</section></main>
<main><section data-state="ready">Beratung</section></main>
the node, after both renders: {"kind":"element","id":"n_1","type":"loom.services","props":{"loom:data":{"services":{"source":"catalogue.services","params":{"limit":6}}}},"children":[]}
```

One revision, two pages, and the node is byte-identical to what it was before
either render. The question is in it; neither answer is.

Hold that against lesson 14's Exercise D, which produced the same headline —
*the same tree, two validators, two different pages* — and which lesson 14 told
you to be uncomfortable about. Here it is not a cost, it is the feature, and the
difference between the two cases is the thing to be able to state:

- A validator changing the page means the **deployment's schema version** is
  deciding what the tree describes. The tree stops describing the page it
  produces.
- A registry changing the page means the **host's data** is deciding what fills
  a named hole the tree deliberately left. The tree still describes the page: it
  says there is a services list here and where to get one.

Same observable, opposite verdicts, and the axis is *what varies* — a decision
about the document, or a fact about the world.

### Exercise G — the source that never comes back

This is Predict 4. Take out what you wrote for it before you read the code.

```ts
describe("G", () => {
  it("stops waiting for a source that never answers", async () => {
    const heard: string[] = []

    /** Takes the request, and that is the last anybody hears of it. */
    const silent = (id: string, listens: boolean): SourceEntry =>
      defineSource({
        id,
        description: "never comes back",
        params: z.object({}).passthrough(),
        answers: z.array(z.string()),
        adapter: {
          fetch: ({ signal }) =>
            new Promise(() => {
              if (listens) signal?.addEventListener("abort", () => heard.push(id))
            }),
        },
      })

    const quick = defineSource({
      id: "quick.fine",
      description: "answers at once",
      params: z.object({}).passthrough(),
      answers: z.array(z.string()),
      adapter: { fetch: () => Promise.resolve(ok(["Coaching"])) },
    })

    const tree = pageAsking(
      { services: { source: "hang.listening" } },
      { services: { source: "hang.deaf" } },
      { services: { source: "quick.fine" } }
    )

    const data = await resolveTreeData(tree, {
      registry: registryOf(silent("hang.listening", true), silent("hang.deaf", false), quick),
      ceilingMs: 20,
    })

    for (const binding of planTreeData(tree).bindings) {
      const outcome = data.lookup(binding.nodeId)["services"]
      console.log(
        outcome?.status === "ready"
          ? `ready — ${JSON.stringify(outcome.value)}`
          : `unavailable — ${outcome ? describeDataUnavailable(outcome.unavailable) : "?"}`
      )
    }

    console.log("adapters told to stop:", heard.length === 0 ? "none" : heard.join(", "))
    console.log("the ceiling nobody named:", describeCeiling(DEFAULT_SOURCE_CEILING_MS))
  })
})
```

Two of these three adapters return a promise that is never settled by anybody —
not slowly, not eventually: the executor registers a listener and returns, and no
`resolve` is ever called. One of them listens for the abort and one ignores it.

Predict, before running, and commit to all four: **does this test finish?** What
does the third node show? Which of the two silent adapters is slower? And what
does `describeCeiling(DEFAULT_SOURCE_CEILING_MS)` print — a number a reader would
say out loud, so give the units.

The output:

```
unavailable — the source could not be reached — no answer in 20ms
unavailable — the source could not be reached — no answer in 20ms
ready — ["Coaching"]
adapters told to stop: hang.listening
the ceiling nobody named: 10s
```

**The test finishes**, which is the whole of it. Before 13 September this
program hangs until vitest's own timeout kills it, and the three lines above do
not exist, because nothing in the runtime was the thing that stopped waiting.

**The third node has its answer.** Not "the page failed", not "two of three":
`quick.fine` was asked at the same instant as the other two and answered at once,
and the ceiling it was under expired against a promise that had already settled.
The ceiling is per source for exactly this reason — the questions are
independent, so one dead integration costs one region.

**The two silent adapters are indistinguishable from the page's side**, and that
is the sentence to carry out of here. `hang.deaf` never learns it was abandoned.
It cannot delay the page by ignoring the signal; what it can do is keep holding
whatever it was holding — a connection out of a pool, a transaction, a file
handle — for a result nobody will ever read. `hang.listening` is told, once, at
the moment the runtime gave up. The difference between them is invisible in the
markup and shows up in a deployment under load, which is the worst possible
place to find out about it and the reason the signal is in the adapter's
signature rather than optional advice.

**`10s`**, from `describeCeiling`, which formats a duration the way somebody
would say it. A deployment that names nothing gets that, and `undefined` is not
an option anywhere in this seam, because "forever" is not a length of time a
reviewer can read off a call site.

### Exercise H — the seventh reason

The one you could not build in Exercise C. Everything here is a working source
in a working registry, and nothing in the tree is malformed.

```ts
describe("H", () => {
  it("names the one reason no tree and no source can cause", async () => {
    const registry = registryOf(
      defineSource({
        id: "catalogue.services",
        description: "the services this profile offers",
        params: z.object({}).passthrough(),
        answers: z.array(z.string()),
        adapter: { fetch: () => Promise.resolve(ok(["Coaching", "Advising"])) },
      })
    )

    const asksFor = (limit: number) => ({
      services: { source: "catalogue.services", params: { limit } },
    })

    /** What the composition root planned, asked, and kept the answers to. */
    const planned = planTreeData(pageAsking(asksFor(6)))
    const answers = new Map<RequestKey, Result<JsonValue, DataUnavailable>>([
      [planned.requests[0]!.key, ok(["Coaching", "Advising"])],
    ])

    /** What it rendered: the same page, with a second card that asks for more. */
    const rendering = pageAsking(asksFor(6), asksFor(12))
    const data = buildDataResolution(planTreeData(rendering), answers)
    const out = renderLoomTree(rendering, { resolver, data })

    for (const binding of planTreeData(rendering).bindings) {
      const outcome = data.lookup(binding.nodeId)["services"]
      console.log(
        `${binding.nodeId}: ${
          outcome?.status === "ready"
            ? `ready — ${JSON.stringify(outcome.value)}`
            : `${outcome?.unavailable.reason} — ${describeDataUnavailable(outcome!.unavailable)}`
        }`
      )
    }

    console.log(renderToStaticMarkup(out.element))
    say("planned one, rendered two", out)
    console.log("registry, untouched:", registry.sources.length, "source")
  })
})
```

Predict, before running: `n_2` asks the same registered source as `n_1`, with
`limit: 12` rather than `limit: 6`. **What does it get, and whose fault is it?**
Rate your confidence 1–5.

The output:

```
n_1: ready — ["Coaching","Advising"]
n_2: not-resolved — nothing resolved it — the answers came from resolving a different plan than this tree
<main><section data-state="ready">Coaching, Advising</section><section data-state="unavailable">not-resolved</section></main>
planned one, rendered two: 1 diagnostic(s)
  - data-unavailable — node n_2 binds "services" to "catalogue.services" and it could not be answered — nothing resolved it — the answers came from resolving a different plan than this tree
registry, untouched: 1 source
```

Notice what you had to reach for to produce this. Every other reason in this
lesson comes out of `resolveTreeData`, the one call an ordinary caller makes.
This one needed `buildDataResolution` — the pure half, underneath — and an
answers map built by hand that does not cover the plan it is handed. There is no
tree you can write that causes it and no adapter you can register that causes
it. **The fault is between two calls, and both calls are correct.**

Which is why it is reported rather than ignored, and the comment in
`resolution.ts` says so in one line: *a page silently missing the data it asked
for is the failure mode this whole module is arranged to prevent.* The easy
implementation treats a binding with no answer as a binding with no data — and
that is Exercise D's lesson arriving from a different direction, because a page
that quietly drops the answers nobody fetched is the plausible page, and a
plausible page is worse than a broken one.

**`registry, untouched: 1 source`** is in the transcript to be read against
`no-such-source` in Exercise C, whose detail is a list of what *was* registered.
Both faults produce a node with no data. One is fixed by whoever owns the data,
by registering something. The other is fixed by whoever wired the render, and
nothing they do to the registry will help. That is the whole argument for the
seventh code, printed.

Now go back to Exercise C's transcript and read its first line, which is
`no-such-source`. Until 12 September the fault you just produced printed that
same opening clause, at a deployment whose registry was fine, and the whole
sentence read *"no source is registered for it — this binding was never
resolved"*: a reason and a detail disagreeing with each other inside one line,
because one code was doing the work of two. If that sentence sounds familiar it
is because you read it earlier in this lesson, and the reason it is here twice
is that it is the cheapest example in the course of a defect you can see by
reading one line of output and cannot see by reading any of the code.

---

## It could have been otherwise

Seven, and the last one is the one most systems ship.

**Resolve inside the walk, and make rendering async.** The obvious shape, and it
is one `await` away in `renderElement`. It gives up what makes the renderer what
it is: a synchronous pure function has no ordering between nodes, cannot
deadlock, and cannot make a page's latency depend on its depth. Rejected for
that, not for difficulty.

**Put the answer in the props.** Then a primitive's own Zod schema validates its
data and primitives need no second bag — a real simplification. It makes the
tree a cache: a `configure` against a node whose props were last filled by a
database write is a proposal against content nobody authored, its inverse
restores data rather than a decision, and the Gate ends up weighing the stakes
of an overnight sync. The tree stops being a document.

**A binding as a new node kind** — `{ kind: "binding", source, params }` beside
`element`, `text` and `slot`. Honest about it being a distinct thing, and it
puts the resolution point where a reader can see it in the structure. It changes
the tree schema, so every built tree, every delta, every stored snapshot and the
model-facing reply schema migrate — for a thing that is a property *of* a node
rather than a node. Lesson 02's "three node kinds and no more" was not a
slogan; this is what defending it costs and what it saves.

**Let the adapter take the params uninterpreted.** Less registration ceremony,
and each host validates its own. It hands a model whatever query language sits
behind the adapter, and the deployment that forgets does not find out until a
proposal asks for a column nobody meant to publish.

**Report unavailability as an absent key**, letting a primitive write
`loom.data.services ?? []`. Much the nicest to write, and it makes the mistake
above *unavoidable* rather than merely possible. The verbose shape is the one
that cannot lie.

**Leave the waiting to the host.** Every deployment can wrap its own adapters,
and a framework that bounds things on your behalf is a framework you end up
arguing with. Rejected on evidence rather than on principle, which is what makes
it worth reading: three surfaces in this repository construct a client and hand
it over, all three were written by people who had read the seam, **none of them
bounded anything**, and the one that hit it had to go and find out why. A
default that can be changed beats a promise nobody keeps. Now read that against
the alternative directly below, which hands caching *to* the host and is decided
the other way. The axis is not how reliable hosts are. It is whether the host
knows something the runtime cannot: about when its own data goes stale it does,
and about how long a page may hang before a reader leaves it does not.

**Cache answers across requests inside the seam.** Tempting, and every host will
want it. It belongs behind the adapter, where a host can key and invalidate it
deliberately — the same argument `TreeSource` makes about the tree cache in
lesson 14. A cache inside the seam would be a second source of truth about data
the runtime does not own.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections while
you write. Then compare.

1. **Derive this lesson from lesson 05.** Lesson 05's argument was about a clock:
   a pure function that needs the time is handed the time. Write the paragraph
   that shows this seam is the same decision, and then find where the analogy
   *breaks* — because it does, in one specific place, and naming it is the point
   of the exercise. Hint for after you have tried: a clock has no failure modes
   and cannot refuse you.
2. **Say what the tree gave up and what it kept**, in one paragraph, with both
   halves stated as concretely as each other. Then apply your sentence to a case
   this lesson did not cover: a deployment wants a page whose heading text comes
   from the host's CMS rather than from the tree. Is that a binding? Say what it
   would cost if the answer is yes, and what a reviewer would be approving.

Predict, before writing (1): if your paragraph's punchline is "both move IO out
of a pure function", you have described the mechanism and not yet found the
argument. The argument is about what the pure function is allowed to *be* once
the impurity is gone.

---

## Self-check

Eight questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. State what a binding contains and what it is forbidden from containing. Then
   give the reason for the second half as a property of the tree — not as an
   argument about staleness, which is true and is not the reason.
2. Name the seven reasons a binding can be `unavailable`. Then say which two of
   the seven could not be discovered without calling the adapter, which one is
   the only one that says the adapter behaved correctly and still gave a wrong
   answer, and which one cannot be caused by any tree or any adapter at all.
   For that last one, say which file the person who has to fix it opens.
3. A node declares three bindings and one names a source id with a space in it.
   Say what the other two get and give the argument for it. Then give the
   strongest case *against* the decision, and say what would have to be true
   about how people read pages for that case to win.
4. "The page is a function of the tree alone" was true before this seam and is
   not true now. State precisely what replaced it, and then say what that weaker
   claim still lets a reviewer do that they could not do without it.
5. `planTreeData` is pure and `resolveDataPlan` is not. Say what the purity of
   the first one buys that is not "it is easier to test", and name one thing a
   host could build with a plan that it could not build with a resolution.
6. Predict 3 asked whether a card showing an unreviewed answer is a bug. Give
   the resolution in two sentences: one saying what an approval covers, one
   saying what would have to be stored for it to cover more — and name the
   lesson whose subject that storage would belong to.
7. `unavailable` was in this union, documented, handled, and rendered by a
   branch of a primitive for a month before anything in the runtime could
   produce one for the failure it names. Say what would have had to be true for
   a test to catch that, and then say why no test in this repository was ever
   going to. Then give the general form as a rule about unions, in one sentence
   that does not contain the word "timeout".
8. A source takes the request and never answers. Say what the reader sees, what
   the log says, and who eventually gives up — first under the design this
   lesson originally described, then under the one it describes now. Then say
   what the abort signal changes about that answer, and be precise: name the
   thing it does *not* change.

Question 3 is the one to be least satisfied with a short answer to. Question 6
is the one that matters most, and question 7 is the one whose answer transfers
furthest outside this system.

---

## Reflect

Write for two minutes, then move on.

- Which prediction were you most confidently wrong about? If it was Predict 2,
  say what you had been counting — nodes, or questions — and where else in this
  course you have counted the wrong one of two things that usually match.
- This lesson removed something from the tree for the second time in the course.
  Find the first (Warm-up 3 is the door in), and say what the two removals have
  in common about *who* ends up owning the removed thing. Then say whether you
  expect a third, and what it would be.
- The seam has exactly one `try` in it, and the runtime has no others. Name what
  is on the far side of it, and then name one other place in this course where
  Loom treats something as foreign that a less careful library would have
  treated as its own. Say what the two have in common.
- What did you write for Predict 4, and what confidence did you give it? If you
  named a function, you invented one — there was nothing there. If you wrote
  "I cannot find it, and I expect I am missing something", you were right twice.
  Either way, the useful question is the one underneath: you had just read that
  a reason exists and that its meaning is documented. Say what you took that to
  imply, and say why it does not.

---

## Come back to this

Set W in [`review-schedule.md`](review-schedule.md), two days after this lesson.
Interleaved with 02, 05, 09, 12, 14, 15 and 16 — and it is the first set that
can ask you to compare two seams rather than to recall one, which is what the
course has been spacing towards.

**What this lesson guessed about Part V, and what happened.** When it was
written it was the only lesson in its part, and it closed by guessing where the
part would go: *what the tree cannot hold* — a submission's destination and a
frame's origin being, like a binding, a name in the tree pointing at something a
deployment owns.

That guess was right about the next two seams and stopped being the whole story
at the fourth. Part V has seven lessons now, and the interesting thing is where
they disagree: [22](22-reach.md) is a fact that belongs to two nodes and so has
nothing to resolve, and [24](24-silence.md) is a reader that can see the whole of
what it is asked about and still cannot answer. Worth knowing *before* you read
them, because a pattern confirmed three times and then broken teaches more than
one confirmed six times, and you can only watch that happen if you know it is
coming.

This lesson is also the one Part V has had to come back and correct, twice. If
you are wondering what it is like to learn a system that is still moving: you
have just read the repaired version, the two things it got wrong were both about
what a named failure means, and both were found by somebody printing what the
code did rather than by anybody rereading what the lesson said.
