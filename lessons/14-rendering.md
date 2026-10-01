# 14 — Rendering: the tree as a total, pure projection

**After this lesson you will be able to** say what "total" means for a renderer
and why it is not the same discipline as `Result`; name the three grades of
failure a render has and give the one question that decides which grade a
fault gets; say why an unknown primitive takes its whole subtree with it, and
what each of the three rejected alternatives would have cost; explain what node
ids being React keys buys, and name the lesson that paid for it; say what
`TreeSource.load` returning `unknown` is claiming; and say what a render is
forbidden from doing that every other framework's component may do freely, and
where that work has to go instead.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md), [08](08-two-axes.md), [09](09-the-gate.md),
[10](10-the-pipeline.md), [11](11-the-model-seam.md),
[12](12-projection.md), [13](13-refusal-and-repair.md).

Part IV starts here, and it starts by making something real. Parts I to III
built a tree, a way to change it, a way to judge the change, and a way to ask a
model for one. None of that has yet produced a page anybody can look at.

This is the fourth projection in a course that has used the word in three
lessons — and the first whose consumer is a person.

---

## Warm-up

Closed book, five minutes, mixed across six lessons. Write something for all
five before you look anything up.

1. Why is `slot` a distinct node kind rather than an element with a special
   type? *(02)*
2. What does a node id tell you about that node's position — and what do you
   *observe*, concretely, when a positional address goes stale? *(04)*
3. Lesson 12 gave one sentence that says what a projection is. Write it from
   memory, then name the three projections it was about. *(12)*
4. `applyDelta` returns a `Result`. Name the failure that shape exists for, and
   name the party who does something about it. *(03, 05)*
5. Name the two axes the Gate weighs. Then say which of the two an argument of
   the form "we can always put it back" belongs to, and which of the two it is
   most often mistaken for. *(07, 08)*

Question 4 is this lesson's scaffolding, and it is scaffolding by *contrast*.
The function you are about to read does not return a `Result`, and lesson 05 is
the reason.

---

## Predict

In writing, before reading on.

> 1. A tree names `loom.carousel` on a node that has two children. This
>    deployment has no primitive registered for that type — an accepted
>    proposal named it, or the code rolled back and the tree did not. Write
>    down what renders, what the caller is told, and — the part that separates
>    the answers — what happens to the **two children**. Give a reason for the
>    children that is not "it is simpler".
>
> 2. `renderLoomTree` returns `RenderOutput`. Not `Result<RenderOutput,
>    RenderError>`. Lesson 05 spent itself on the argument that failures are
>    values and nothing throws. Argue, as strongly as you can, that this is a
>    violation of lesson 05. Then argue that it is *required* by lesson 05.
>    **Rate your confidence 1–5 in each argument before you check**, separately.
>
> 3. `sampleTree()` has four element nodes, and there is a primitive registered
>    for each of the four. You call `renderLoomTree(tree, { resolver })` and it
>    returns. **How many times has it called those four components?** Commit to
>    a number before you go on.

Predict 3 has an exact answer and most readers write down the wrong one. It is
not a trick — the wrong answer is what "render" means in every other
framework.

---

## The problem

§1 and §2 produce a validated tree. §3 has to turn one into React, per request,
on an edge runtime or inside a Server Component.

Two questions decide the shape of everything after them.

### What may the renderer depend on?

That question sounds like an architecture-diagram question and it is a
deployment question. A renderer that reads a module-level cache cannot run at
the edge, because there are many edges and they do not share one. A renderer
that reads a clock produces a page that two requests for the same revision can
disagree about. A renderer that fetches decides *when* the page is allowed to
be slow, on behalf of a host that knows more about that than the library does.

Every one of those is a dependency that migrates from the renderer into the
deployment, quietly, and is discovered by someone in an incident.

### What happens when the tree names something that cannot be rendered?

This is the question that is specific to Loom, and it is worth being precise
about why.

In a framework where a person writes the JSX, an unknown component is a **build
error**. It never ships. There is no runtime story for it because the compiler
already told somebody, at a moment when the somebody was sitting at a keyboard
and could fix it.

Here the tree is data that changes without a deploy. So:

- AI proposed `loom.carousel`, the Gate weighed it against the registry of the
  day, it was accepted and applied, and three weeks later a deployment is
  serving that tree with a library that no longer has one.
- A deployment rolled the code back after a bad release and did not — could
  not — roll the tree back with it, because the tree is not in the release.
- Two deployments serve the same tree and one of them registers a smaller
  library than the other, on purpose.

A tree naming a primitive this deployment does not have is a **normal Tuesday**.
It is not an exception, it is a state, and states get designed for.

---

## The idea

### Rendering is a pure function of tree, resolver, and options

No hooks. No state. No IO. No module-level cache. No clock.

`renderLoomTree(tree, options)` returns the same element for the same inputs.
That is what lets it run per request at the edge and inside an RSC **without
the runtime being the thing that decides where it runs** — which is the whole
value of the property. Purity here is not hygiene. It is the difference between
a library the host deploys where it likes and a library that has opinions about
the host's infrastructure.

Say it once more in the form lesson 12 gave you:

> **A projection is a total, deterministic function from a source of truth to a
> view built for one consumer's job — and the source of truth is untouched.**

The reply schema's consumer is a model. The catalogue's consumer is a model.
The tree outline's consumer is a model. **This one's consumer is a person**, and
that changes exactly one thing — but it changes it completely.

A model can be handed a diagnostic. It reads text; a sentence explaining that
something went wrong is the same kind of thing as the rest of its input. A
person cannot be handed a diagnostic. A person gets a page, or gets nothing.

So totality has to mean something stronger here than it meant there.

### Rendering is total, and total is not `Result`

Lesson 05's discipline was: nothing throws, failures are values, the caller
decides. `renderLoomTree` returns no `Result` at all. It has no failure case.

That looks like the one place the discipline was dropped. It is the opposite,
and getting the difference right is most of this lesson.

`Result` is the right shape for a function with a failure **the caller can do
something better with than the function could**. `applyDelta` returns one
because a delta that does not apply is a real fork in the road — the caller
refuses the proposal, reports it, asks for a repair. There is a decision there
and it is not the tree module's to make.

Now ask the same question of a render. The tree names one card this deployment
cannot draw. What is the caller supposed to do with `err(unknown-primitive)`?
There is exactly one sensible thing — serve the page with a gap where the card
was — and returning an error makes every host implement that themselves, badly,
in a catch block, at the worst possible moment.

So the failures are still values, exactly as lesson 05 demands. They just
arrive **beside the answer instead of instead of it**:

```ts
type RenderOutput = {
  readonly element: ReactNode
  readonly diagnostics: readonly RenderDiagnostic[]
  readonly theme?: ResolvedTheme
}
```

`diagnostics` is the `Result`'s error channel, kept open while the success
channel is also open. That is what "total" buys and it is why the two
disciplines are not in conflict: **`Result` is for a failure that replaces the
answer; a diagnostic is for a failure the answer survives.**

And `Result` does come back — one layer out. `renderRequest` returns
`Result<RenderedRequest, RenderRequestError>`, with three codes:

| code | what happened |
| --- | --- |
| `source-failed` | the host's `TreeSource` could not produce a document |
| `invalid-tree` | what it produced is not a tree |
| `tree-id-mismatch` | it is a tree, and it is not the one that was asked for |

Those are failures where **there is no page to serve at all**. The line falls
exactly where you would draw it if you drew it from first principles: *the
boundary can fail; the projection cannot.*

### Three grades of failure, and the question that grades them

Since a render never fails, "something went wrong" has to be *graded*, and this
is the part of the design worth carrying out of this lesson.

| Grade | What the reader gets | Codes |
| --- | --- | --- |
| **Omit** | the node and its whole subtree are not there | `unknown-primitive`, `invalid-props` |
| **Degrade** | the node renders, without the thing it asked for | `theme-unresolved`, `theme-unregistered`, `data-unavailable`, `data-misdeclared`, `data-unresolved`, `submit-unavailable`, `submit-misdeclared`, `submit-unresolved` |
| **Report** | the node renders exactly as written; something was ignored or went unchecked | `props-undeclared`, `theme-misplaced`, `reserved-prop-unrecognised` |

Thirteen codes, three behaviors. The rule that assigns them is one question:

> **Would rendering this node hand a primitive something its own types say
> cannot occur?**

If yes — **omit**. A primitive whose schema requires a `variant` and is given a
bag without one has been handed a value its types deny. Rendering it anyway
does not make the problem go away; it moves the problem inside somebody else's
component, and pushes an unchecked cast into every primitive author's lap
forever. Refusing the one node and saying why keeps the failure where the
mismatch is.

If the missing thing is **the host's answer** rather than the tree's content —
**degrade**. A binding that could not be reached, a form whose endpoint gave no
target, a theme nobody registered: none of these make the node unrenderable.
Each is a state a well-written primitive already has a path for, because
"we could not reach your services" is a thing a page has to be able to say.
Omitting the node would delete a section over an integration being down.

If nothing is missing and something was merely **meaningless** — **report**. A
theme named below the root is mounted by nothing (§4's variables are mounted
once, at the render root), a reserved `loom:` key nobody reads is dropped, a
type the validator has no schema for renders with props that went unchecked.
The page is exactly what the tree said. Somebody should still hear about it.

Notice that this is an argument you have already seen, in a different costume.
Lesson 12: *two failures that would produce different downstream answers must
not be one code.* Here it is applied to **actions** rather than to codes — two
faults that should produce different pages must not produce the same
behavior — and the same reasoning gives you thirteen codes rather than one
"render failed".

### The unknown primitive takes its subtree with it

The single most-argued line in 0008, and the alternatives are more interesting
than the decision.

An unknown primitive omits the node **and everything under it**, and records
one diagnostic naming the node and the type. Three other things could have
happened:

**Fail the whole render.** One stale card blanks the page. For a runtime whose
entire premise is that the tree changes independently of the code, that turns
every registry drift into an outage. Note where the information goes under this
rejection: nowhere. It is not lost by choosing the diagnostic — it *moves*,
from an error to a diagnostic, and the page still renders.

**Render a visible placeholder.** Rejected as a *default*, which is the
important qualifier. A placeholder is a design decision inside someone else's
product, and Loom does not get to put an "unknown component" box in a
customer's checkout. A host that wants one registers a primitive for the type —
the same mechanism, with the choice in the right hands.

**Promote the children into the parent.** This is the one that looks generous
and is the worst of the three. A card's contents spilling into the page body
does not look like a missing component; it looks like a **layout bug**, which
is a much harder thing to diagnose, and it will be diagnosed by someone
staring at CSS. A gap is legible. A gap plus a diagnostic is legible and
recorded.

The trade being made is real and 0008 says so plainly: a partially rendered
page can be served. The diagnostic is what makes that visible rather than
quiet, and inspecting it is deliberately the **host's** obligation. A host that
wants strictness reads `diagnostics` and chooses a status code. Nothing in the
library will do it for them, because "is this page good enough to serve" is not
a question a library can answer.

### Node ids are React keys

Lesson 04 argued that identity is minted and position is derived, and spent a
lesson on it. This is where the bill gets paid.

React reconciles a list by key. Give it stable keys and a subtree that moved is
reconciled **as a move**: the component instance survives, and so does
everything in it — a video mid-playback, a form half-typed, a scroll position,
an open menu. Give it positional keys and an insert at the top remounts
everything below, throwing away exactly the state that a "move this section up"
edit had no business touching.

§1 mints an id once and never changes it on move or configure. So the key
material was already there, minted three lessons ago for a reason that had
nothing to do with React, and the renderer picks it up for free.

This is worth sitting with for one paragraph longer than it seems to deserve.
The argument in lesson 04 was about **addressing** — a delta has to name a node
and a position cannot be a name. The payoff arrives in a different subsystem,
about a different problem, phrased in a vocabulary lesson 04 never used. That
is what it looks like when a foundational decision is the right one: you keep
finding you already paid for things.

### Storage is a boundary, and it is parsed here

```ts
export interface TreeSource {
  readonly load: (request: RenderRequest) => Promise<Result<unknown, TreeSourceError>>
}
```

`unknown`. Not `LoomTree`.

That is the type saying out loud what lesson 05 said in prose. Storage holds
documents written by older schema versions and, in principle, by anything with
write access. So `renderRequest` runs `parseTree` on whatever comes back,
before anything reaches the projection — here, rather than as something every
host is trusted to remember.

And then one more check that costs nothing and is worth having:

```ts
if (tree.treeId !== request.treeId) {
  return err({ code: "tree-id-mismatch", requested: request.treeId, received: tree.treeId })
}
```

A source that answers with a different document than the one asked for is a
cache-key fault or a routing fault. Serving it renders **one tenant's page
under another's request**. It is two lines, and the failure it catches is the
kind that ends up in a write-up.

### A resolver is one lookup

```ts
resolve: (type: PrimitiveType) => LoomPrimitive | undefined
```

That is the renderer's entire dependency on the registry. §4 owns
registration — declared prop schemas, packaging, scaffolding, the SDK — and
whatever §4 becomes has to satisfy no more than this to be renderable.

One detail in the shipped implementation is worth a second look, because it is
the same hazard twice:

```ts
resolve: (type) => (Object.hasOwn(primitives, type) ? primitives[type] : undefined)
```

Own-property only. A plain object inherits from `Object.prototype`, so a tree
naming `toString` or `constructor` would otherwise resolve to a function that
is emphatically not a primitive. The type in a tree is AI-authored and arrives
from storage; treating it as an untrusted key is not paranoia, it is the same
rule as every other boundary in this system. The slot lookup does it too, and
`NO_SLOTS` is a frozen null-prototype object for the identical reason.

### Rendering cannot fetch — and where that work went

The purity rule has a price, and paying it visibly is what the last two seams
in §4 are about.

A node may declare `loom:data` (a question the tree asks the host) or
`loom:submit` (where a form posts). Answering either can require IO. The walk
cannot wait for anything, so **both are resolved before the walk begins**, and
the answers arrive at the walk as a map read.

That is why `renderRequest` is `async` and `renderLoomTree` is not. There is
exactly one `await` in the whole path — a `Promise.all` of the two
resolutions — and it sits after the parse, because a plan is read off a tree
that has been proved to be one, and before the walk, because the walk cannot
wait.

The general form, which is the shape to take away: **when a pure function needs
something impure, the impurity moves outward to a point where it can happen
once, and arrives as a value.** That is the same move `Clock` made in lesson 05,
one layer up.

---

## In the code

**`src/render/render.ts`** — `renderLoomTree`, and the walk. Read
`renderElement` top to bottom in one sitting: it is forty lines and every
branch in it is one of the three grades. Note the *order* of the checks —
resolve, partition reserved props, validate, resolve data, resolve submit,
build the body — because the order is observable in the diagnostics, and
Exercise D makes you look at it.

**`src/render/diagnostics.ts`** — the thirteen codes as one union, each with the
fields a consumer needs and no more. `describeRenderDiagnostic` turns one into
the sentence a human reads. Read the doc comments on the union members rather
than the codes: each one says which grade it is and why, and the reasoning is
the part that transfers.

**`src/render/request.ts`** — the boundary. `TreeSource`, the parse, the
`treeId` check, the one `await`. Also the place to look if you want to see what
"optional registries, failing closed with a diagnostic" adds up to: `themes`,
`sources`, `endpoints` and `text` are all absent-able, and every absence has a
named consequence rather than a silent one.

**`src/render/primitive.ts`** — the contract. `LoomRenderContext` is what a
registered component receives, and the doc comment on it is the best short
statement in the codebase of why props arrive **in a bag** rather than spread:
props in a Loom tree are AI-authored and arrive from storage, and spreading
them would let a proposal reach `dangerouslySetInnerHTML`, `ref`, or any other
React-reserved name a primitive forwards to a DOM element.

**`src/render/props.ts`** — the validation seam, and one sentence in it that
decides more than it looks like it does: *validation is a predicate, not a
codec.* A schema that defaulted or coerced would make the rendered page a
function of the deployment's schema version as well as of the tree — and a tree
that no longer describes the page it produces is the one thing Loom cannot
afford.

---

## Try it

Six exercises. Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

**Predict every output in writing, then run.** Two of the six have answers that
almost nobody writes down correctly, and those two are the exercises.

The shared preamble for all six:

```ts
import { createElement, isValidElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, it } from "vitest"

import {
  describeRenderDiagnostic,
  renderLoomTree,
  staticPrimitiveResolver,
} from "./render/index.js"
import { sampleTree } from "./testing/fixtures.js"
import { testPrimitives, testPrimitiveResolver } from "./testing/primitives.js"

const markup = (element: ReactNode): string => renderToStaticMarkup(element)

const say = (label: string, output: { diagnostics: readonly unknown[] }): void => {
  console.log(`${label}: ${output.diagnostics.length} diagnostic(s)`)
  for (const d of output.diagnostics) {
    console.log("  -", (d as { code: string }).code, "—", describeRenderDiagnostic(d as never))
  }
}
```

### Exercise A — the missing component

```ts
describe("A", () => {
  it("omits the node and its subtree", () => {
    const { tree } = sampleTree()
    const withoutCard = staticPrimitiveResolver({
      "loom.page": testPrimitives["loom.page"]!,
      "loom.header": testPrimitives["loom.header"]!,
      "loom.footer": testPrimitives["loom.footer"]!,
    })

    const full = renderLoomTree(tree, { resolver: testPrimitiveResolver })
    const gapped = renderLoomTree(tree, { resolver: withoutCard })

    console.log(markup(full.element))
    say("full", full)
    console.log(markup(gapped.element))
    say("gapped", gapped)
    console.log('"Body copy" still on the page?', markup(gapped.element).includes("Body copy"))
  })
})
```

Predict, before running: what is in the gapped markup, and what is not? And
write down the order the four rendered tags appear in — that is the second
question, and it is the one with the surprise in it.

The output:

```
<main data-props="{&quot;title&quot;:&quot;Home&quot;}"><header data-props="{}">Welcome</header><footer data-props="{}"></footer><article data-props="{&quot;variant&quot;:&quot;outlined&quot;,&quot;elevation&quot;:1}">Body copy</article></main>
full: 0 diagnostic(s)
<main data-props="{&quot;title&quot;:&quot;Home&quot;}"><header data-props="{}">Welcome</header><footer data-props="{}"></footer></main>
gapped: 1 diagnostic(s)
  - unknown-primitive — no primitive is registered for "loom.card", so node n_4 and its subtree were omitted
"Body copy" still on the page? false
```

**"Body copy" is gone.** It is a text node, it is perfectly renderable, no
primitive was needed for it, and it is not on the page — because it was inside
the card. That is the subtree rule with a face on it: the text did nothing
wrong and it goes anyway, because a paragraph that was inside a card and is now
loose in the page body is the layout bug the third rejected alternative
describes.

**Now the order.** The tree is `page → [header, main(slot → card), footer]`, and
the markup is `header, footer, article`. The card renders *after* the footer.

That is not the renderer reordering anything. `loom.card` sits inside a `slot`,
and a slot is a **region**, not a position — the renderer routes slot children
out of `children` and hands them to the primitive as `loom.slots.main`, and the
test primitive in `testing/primitives.ts` happens to place its regions after its
children. Where a region goes is the primitive's decision, and this one decided
"last". If you predicted `header, article, footer` you were reading the tree as
a document; the answer to Warm-up 1 is the reason you cannot.

### Exercise B — nothing is registered at all

```ts
describe("B", () => {
  it("still returns", () => {
    const { tree } = sampleTree()
    const out = renderLoomTree(tree, { resolver: staticPrimitiveResolver({}) })

    console.log("typeof:", typeof out.element, "| isValidElement:", isValidElement(out.element))
    console.log("markup:", JSON.stringify(markup(out.element)))
    say("diagnostics", out)
  })
})
```

Predict, before running: **how many diagnostics?** Four element nodes, none of
them registered. Commit to a number, and rate your confidence 1–5.

The output:

```
typeof: object | isValidElement: false
markup: ""
diagnostics: 1 diagnostic(s)
  - unknown-primitive — no primitive is registered for "loom.page", so node n_7 and its subtree were omitted
```

**One.** Not four. The root is unknown, so the root and its subtree are
omitted — and the other three nodes are *in* that subtree. They are never
reached, never resolved, and never reported. The count is not "how many things
are broken", it is "how many places the walk stopped", and those are different
numbers whenever a fault is above another fault.

That matters for anyone consuming diagnostics as telemetry, which is §6's whole
job: *diagnostic count is not fault count.* A deployment that lost its entire
primitive library reports exactly one diagnostic per page.

And the return value: `isValidElement` is **false**, the markup is the empty
string. The element is `null`. Totality does not promise a non-empty page — it
promises that the function returns, always, with no failure case and nothing
thrown. `null` is a legal `ReactNode` and it renders as nothing at all. A page
that is completely empty and a page that is completely fine come back through
the same channel, with the same type, and the only thing that tells them apart
is the diagnostics array.

If that feels uncomfortable — good. It is the trade, stated as sharply as it
goes, and the discomfort is what the host's obligation to read `diagnostics` is
built out of.

### Exercise C — the id is the key

```ts
import { applyDelta } from "./tree/apply.js"
import type { DeltaId } from "./ids.js"
import type { TreeDelta } from "./tree/delta.js"

describe("C", () => {
  it("keeps the key across a move", () => {
    const { tree, ids } = sampleTree()

    const keysOf = (node: ReactNode, depth = 0, into: string[] = []): string[] => {
      if (Array.isArray(node)) {
        for (const child of node) keysOf(child, depth, into)
        return into
      }
      if (!isValidElement(node)) {
        if (typeof node === "string") into.push(`${"  ".repeat(depth)}"${node}"`)
        return into
      }
      const type = node.type
      const name =
        typeof type === "function"
          ? ((type as { displayName?: string }).displayName ?? "fn")
          : String((type as { name?: string }).name ?? type)
      into.push(`${"  ".repeat(depth)}key=${String(node.key)} ${name}`)
      const props = node.props as {
        children?: ReactNode
        loom?: { slots?: Record<string, ReactNode> }
      }
      if (props.children !== undefined) keysOf(props.children, depth + 1, into)
      for (const [name_, region] of Object.entries(props.loom?.slots ?? {})) {
        into.push(`${"  ".repeat(depth + 1)}(region "${name_}")`)
        keysOf(region, depth + 2, into)
      }
      return into
    }

    const before = renderLoomTree(tree, { resolver: testPrimitiveResolver })
    console.log(keysOf(before.element).join("\n"))

    const delta: TreeDelta = {
      deltaId: "d_1" as DeltaId,
      treeId: tree.treeId,
      baseRevision: tree.revision,
      operations: [{ op: "move", nodeId: ids.header, parentId: ids.page, index: 2 }],
    }
    const moved = applyDelta(tree, delta)
    if (!moved.ok) throw new Error("move failed")

    console.log(keysOf(renderLoomTree(moved.value, { resolver: testPrimitiveResolver }).element).join("\n"))
  })
})
```

Predict, before running: the header's key before the move, and after it. Then
predict what a keyed-by-index renderer would have printed for the same two
walks.

The output:

```
key=n_7 host(main)
  key=n_2 host(header)
    "Welcome"
  key=n_6 host(footer)
  (region "main")
    key=n_5 Symbol(react.fragment)
      key=n_4 host(article)
        "Body copy"
key=n_7 host(main)
  key=n_6 host(footer)
  key=n_2 host(header)
    "Welcome"
  (region "main")
    key=n_5 Symbol(react.fragment)
      key=n_4 host(article)
        "Body copy"
```

`n_2` before, `n_2` after. **The position changed and the name did not**, which
is lesson 04's sentence, arriving in React's vocabulary. Under index keys the
header would have been `key=0` and then `key=2`, and React — which has no way
to know those are the same header — would have unmounted the first and mounted
a new one. Anything with state inside it starts over.

Two things in that output are worth not skimming past.

**`n_5` is the slot and `n_4` is the card**, which is the id ordering lesson 04
had to correct itself about: the fixture builds leaves before their parents, so
the card gets a lower number than the slot that contains it. If you read that
ordering as "the slot was created first", re-read lesson 04's argument. It is
the same trap and it is worth falling into twice.

**The slot renders as a `Fragment` with a key and no element of its own.** A
slot is a projection point: it renders its projected content, or its own
children as the fallback when the host projected nothing, and adds no box in
either case. The key is still the node's id, because a fragment in a list needs
one exactly as much as anything else does.

### Exercise D — three grades, in one render

```ts
import type { JsonObject } from "./json.js"
import type { PropsValidator } from "./render/index.js"
import { sequentialIdFactory } from "./ids.js"
import { buildElement, buildText } from "./tree/builders.js"
import { createTree } from "./tree/tree.js"

describe("D", () => {
  it("omits, degrades, or merely reports", () => {
    const cardNeedsVariant: PropsValidator = {
      validateProps: (type, props: JsonObject) => {
        if (type !== "loom.card") return { outcome: "undeclared" }
        return typeof props.variant === "string"
          ? { outcome: "valid" }
          : { outcome: "invalid", issues: [{ path: "variant", message: "Required" }] }
      },
    }

    const good = sampleTree()
    say("valid card, no schema for the rest", renderLoomTree(good.tree, {
      resolver: testPrimitiveResolver,
      validator: cardNeedsVariant,
    }))

    const idFactory = sequentialIdFactory("g")
    const body = buildText(idFactory, "Body copy")
    const card = buildElement(idFactory, {
      type: "loom.card",
      props: { elevation: 1, "loom:theme": { palette: "dusk" }, "loom:nonsense": true },
      children: [body],
    })
    const page = buildElement(idFactory, { type: "loom.page", children: [card] })
    const tree = createTree(page, idFactory)

    const out = renderLoomTree(tree, { resolver: testPrimitiveResolver, validator: cardNeedsVariant })
    console.log(markup(out.element))
    say("strict", out)

    const lenient: PropsValidator = { validateProps: () => ({ outcome: "valid" }) }
    const survives = renderLoomTree(tree, { resolver: testPrimitiveResolver, validator: lenient })
    console.log(markup(survives.element))
    say("lenient", survives)
  })
})
```

Predict, before running: for the second tree — a card with no `variant`, a
`loom:theme` that is not on the root, and a `loom:nonsense` nobody reads — how
many diagnostics, and **in what order**? The order is the question.

The output:

```
valid card, no schema for the rest: 3 diagnostic(s)
  - props-undeclared — no prop schema is registered for "loom.page", so node n_7 rendered with unchecked props
  - props-undeclared — no prop schema is registered for "loom.header", so node n_2 rendered with unchecked props
  - props-undeclared — no prop schema is registered for "loom.footer", so node n_6 rendered with unchecked props
<main data-props="{}"></main>
strict: 4 diagnostic(s)
  - props-undeclared — no prop schema is registered for "loom.page", so node n_g3 rendered with unchecked props
  - theme-misplaced — node n_g2 names a theme and is not the root, so it was ignored — a theme is mounted once, at the render root
  - reserved-prop-unrecognised — node n_g2 carries "loom:nonsense", which is in the runtime's reserved namespace and is read by nothing, so it was dropped
  - invalid-props — node n_g2 does not satisfy the props declared by "loom.card", so it and its subtree were omitted — variant: Required
<main data-props="{}"><article data-props="{&quot;elevation&quot;:1}">Body copy</article></main>
lenient: 2 diagnostic(s)
  - theme-misplaced — node n_g2 names a theme and is not the root, so it was ignored — a theme is mounted once, at the render root
  - reserved-prop-unrecognised — node n_g2 carries "loom:nonsense", which is in the runtime's reserved namespace and is read by nothing, so it was dropped
```

Four things here, in ascending order of how long they are worth thinking about.

**The first render shows the third grade doing its job.** Three
`props-undeclared` diagnostics, and a page that is byte-identical to the page
you would get with no validator at all. Nothing is wrong with the tree; what is
wrong is the composition root, which wired a validator that knows one of the
four types. The node renders — one seam not recognising a type the other
resolved is no reason to blank anything — and the fact that its props went
unchecked is said out loud rather than assumed.

**`elevation: 1` survives into `data-props` and the two `loom:` keys do not.**
Reserved keys are partitioned out of every node's props before anything else
happens, whether or not the runtime reads them. A key that reaches a primitive
is a key that primitive has to know about, and the `loom:` namespace is not the
primitive's.

**Three diagnostics about one node, and the node is not on the page.**
`theme-misplaced` and `reserved-prop-unrecognised` are reported for `n_g2`, and
then `n_g2` is omitted for invalid props. The reserved-prop pass runs before
validation, so a node can be scored for two faults nobody will ever see the
consequence of. Read that as what the ordering *tells* you rather than as a
defect: the checks are independent, each reports what it found, and nothing
suppresses a finding because a later finding turned out to be fatal. Whether
that is the right call is a judgement — it is cheap, it is honest, and it does
make "count the diagnostics" a worse proxy for "count the broken nodes" than it
already was in Exercise B.

**The same tree, two validators, two different pages.** That is the sentence to
be uncomfortable about, and it is the price of the seam being optional. With
`cardNeedsVariant` the card is gone; with `lenient` it renders. The tree did not
change. This is why `props.ts` insists validation is a *predicate and not a
codec*: a validator may decide whether a node renders, and it may never decide
*what* a node renders. If it could coerce or default, the page would be a
function of the deployment's schema version as well as of the tree, and the
tree would stop describing the page it produces — which is the property
everything since lesson 01 exists to protect.

### Exercise E — the boundary fails, the projection does not

```ts
import { renderRequest, type RenderRequest, type TreeSource } from "./render/index.js"
import { ok } from "./result.js"
import type { TreeId } from "./ids.js"

describe("E", () => {
  it("shows where a Result appears", async () => {
    const { tree } = sampleTree()
    const request: RenderRequest = { treeId: tree.treeId, editMode: false }
    const sourceOf = (document: unknown): TreeSource => ({ load: async () => ok(document) })
    const deps = { resolver: testPrimitiveResolver }

    const good = await renderRequest(request, { ...deps, source: sourceOf(tree) })
    console.log("the tree asked for:", good.ok ? "ok" : good.error.code)

    const junk = await renderRequest(request, { ...deps, source: sourceOf({ hello: "world" }) })
    console.log("not a tree:", junk.ok ? "ok" : junk.error.code)

    const other = await renderRequest(
      { ...request, treeId: "t_999" as TreeId },
      { ...deps, source: sourceOf(tree) }
    )
    console.log("a different tree:", other.ok ? "ok" : JSON.stringify(other.error))

    const missing = await renderRequest(request, {
      source: sourceOf(tree),
      resolver: staticPrimitiveResolver({}),
    })
    console.log(
      "a tree nothing is registered for:",
      missing.ok ? `ok, ${missing.value.diagnostics.length} diagnostic(s)` : missing.error.code
    )
  })
})
```

Predict, before running: which of the four are `ok` and which are errors. The
fourth is the one to commit to hardest.

The output:

```
the tree asked for: ok
not a tree: invalid-tree
a different tree: {"code":"tree-id-mismatch","requested":"t_999","received":"t_1"}
a tree nothing is registered for: ok, 1 diagnostic(s)
```

The fourth is `ok`. **A render that produced a completely empty page is a
success**, and the only thing that says otherwise is a diagnostic the host has
to go and read. Meanwhile a document that is merely the wrong tree is an
outright error, because there is no honest page to serve at all.

If you ranked those two the other way round — and the ranking is genuinely
counter-intuitive — the thing to correct is not the ordering, it is the axis.
The question is never "how bad is this?"; it is "is there something to serve?".
`tree-id-mismatch` says no. An empty page says yes, technically, and hands you
the reason it is empty.

### Exercise F — how many times did it call your components?

```ts
import type { LoomPrimitive, LoomPrimitiveProps } from "./render/index.js"

describe("F", () => {
  it("counts the calls", () => {
    const { tree } = sampleTree()
    const first = renderLoomTree(tree, { resolver: testPrimitiveResolver })
    const second = renderLoomTree(tree, { resolver: testPrimitiveResolver })
    console.log("same markup:", markup(first.element) === markup(second.element))
    console.log("same object:", first.element === second.element)

    const counted = (place: boolean): { primitive: LoomPrimitive; calls: () => number } => {
      let calls = 0
      const Primitive = ({ loom, children }: LoomPrimitiveProps) => {
        calls += 1
        return place
          ? createElement("div", null, children, Object.keys(loom.slots).map((n) => loom.slots[n]))
          : createElement("div", null, children)
      }
      return { primitive: Primitive, calls: () => calls }
    }

    const ignoring = counted(false)
    const resolverOf = (p: LoomPrimitive) =>
      staticPrimitiveResolver({
        "loom.page": p, "loom.header": p, "loom.card": p, "loom.footer": p,
      })

    const out = renderLoomTree(tree, { resolver: resolverOf(ignoring.primitive) })
    console.log("calls when renderLoomTree returned:", ignoring.calls())
    markup(out.element)
    console.log("calls after the element became markup:", ignoring.calls())

    const placing = counted(true)
    markup(renderLoomTree(tree, { resolver: resolverOf(placing.primitive) }).element)
    console.log("calls when every primitive places its regions:", placing.calls())
  })
})
```

This is Predict 3, run. Commit to your number again before you look.

The output:

```
same markup: true
same object: false
calls when renderLoomTree returned: 0
calls after the element became markup: 3
calls when every primitive places its regions: 4
```

**Zero.** `renderLoomTree` does not render anything, in the sense the word has
in every other framework. It builds a tree of `createElement` descriptors —
plain objects saying *what should be rendered by whom, with what* — and returns
it. Not one component function has run. They run later, when React is handed
the tree, at whatever moment the host chose: a `renderToStaticMarkup`, a
streamed RSC response, a hydration.

Which means the purity claim is stronger than it first sounds. It is not "the
walk carefully avoids doing IO". It is that **the walk does not execute
anybody's code at all**, so there is nothing there that could do IO. Purity is
not a discipline the renderer maintains; it is a consequence of what the
renderer produces.

Then: **three, not four.** The primitive that ignores `loom.slots` never places
the region the card is in, so the card is never rendered — not omitted, not
diagnosed, simply never asked for. Compare the last line: the same tree, the
same registry, a primitive that places its regions, four calls.

That is 0051's rule with its consequence attached — *a slot the primitive does
not place renders nothing* — and it is the one failure in this lesson that
produces **no diagnostic at all**. The renderer did its whole job: it routed
the region, it handed it over, and what happens to it is the primitive's
business. There is nothing for the render seam to report, because from where it
stands nothing went wrong.

Sit with that against the three grades. A missing primitive is a diagnostic. A
missing prop is a diagnostic. A primitive that quietly drops a region you gave
it is invisible here — and catching *that* is what §4's `auditRegistry` exists
for, which is where lesson 15 goes.

---

## It could have been otherwise

Six, and the last two are not from 0008.

**Return `Result<ReactNode, RenderError>` and fail the whole render on an
unknown primitive.** Rejected. One stale card blanks the page. The information
is not lost by rejecting it — it moves from an error to a diagnostic, where the
page still renders and the fault is still recorded.

**Render a visible placeholder for an unknown primitive.** Rejected as a
default. A placeholder is a design decision inside someone else's product. A
host that wants one registers a primitive for the type.

**Promote an unknown primitive's children into its parent.** Rejected. It looks
like a layout bug rather than a missing component, and is harder to diagnose
than a gap.

**Position paths as React keys instead of node ids.** Rejected: a keyed-by-index
list remounts everything below an insert, throwing away exactly the component
state a "move this section up" edit should preserve. §1 minted stable ids for
this — and notice that the alternative was *available*. Positions are perfectly
derivable. It is not that Loom could not have used them; it is that lesson 04
had already paid for something better.

**Let the renderer load the tree itself** — a default source, a fetch, a cache.
Rejected. It puts IO in the one place that must stay pure, and it makes "which
tree does this request get" a property of the library rather than of the host.
A cache belongs behind `TreeSource`, where it can be keyed and invalidated
deliberately by someone who knows what the keys mean.

**Trust the tree coming out of storage and skip `parseTree`.** Rejected.
Storage holds documents written by older schema versions and, in principle, by
anything with write access. Validating at every boundary is a standing rule,
and the renderer is the last boundary before a user sees the result.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections
while you write. Then compare.

1. **Derive this lesson from lesson 05.** Lesson 05's rule was "nothing throws;
   failures are values; the caller decides". This lesson's central function
   returns no `Result`. Write the paragraph that shows those two are the same
   rule, and make it turn on *who can act on the failure* rather than on
   "diagnostics are also values" — that second answer is true and is not the
   argument. Then take the rule you just wrote and apply it to a function you
   have not seen: something in §6 that records a telemetry event and finds the
   journal unreachable. `Result` or diagnostic? Defend it.

2. **Say what "total" bought and what it cost**, in one paragraph, with the
   cost stated as concretely as the benefit. Then answer the question the cost
   raises: a host serves a page that rendered with four `unknown-primitive`
   diagnostics and looks half-empty. Whose fault is it, and — separately —
   whose *job* is it? If your two answers are the same party, go again; the
   whole design of this seam is that they are not.

Predict, before writing (1): if your paragraph contains the phrase "because a
diagnostic is also a value", you have restated the observation rather than
found the argument. The argument is about what a caller could possibly do.

---

## Self-check

Six questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. Give the one question that decides which of the three grades a fault gets.
   Then apply it to a case that is not in the table: a node declares
   `loom:data` and the render was given no data resolution at all. Which grade,
   and why is it not the other two?
2. An unknown primitive omits its subtree. Name the three alternatives and give
   the *distinct* cost of each. If two of your three costs are the same
   sentence, you have merged two alternatives that were rejected for different
   reasons.
3. Why does `TreeSource.load` return `Promise<Result<unknown, …>>` rather than
   `Promise<Result<LoomTree, …>>`? Say what the `unknown` is claiming and what
   would have to be true for `LoomTree` to be honest there.
4. `renderLoomTree` is not `async` and `renderRequest` is. Say what forced
   that, name the two seams that made it necessary, and say where their work
   happens instead.
5. Exercise B produced one diagnostic for four unrendered nodes. State the
   general rule that explains the number, and say what it means for anyone
   using diagnostic counts as a health metric.
6. Predict 2 asked you to argue both sides of `renderLoomTree` not returning a
   `Result`. Give the resolution now, in two sentences: one saying what
   `Result` is *for*, one saying what a diagnostic is for.

Question 1 is the one to be least satisfied with a short answer to.

---

## Reflect

Write for two minutes, then move on.

- Which prediction were you most confidently wrong about? If it was Predict 3,
  say what you had been assuming the word "render" meant, and where else in
  this system you may have been assuming a function does its work at the moment
  you call it.
- This lesson used lesson 04's argument to solve a problem lesson 04 never
  mentioned. Find one more example of that pattern in Parts I–III — a decision
  made for one reason that later paid for something in a different subsystem —
  and say what the two have in common about *when* the decision was made.
- The host is obliged to read `diagnostics` and Loom will never do it for them.
  Name one other place in this course where the library deliberately stops
  short and hands a decision to whoever runs the deployment. Then say what the
  two have in common about the *kind* of decision it is. If you can only find
  one, look again at lesson 09.

---

## Come back to this

Set R in [`review-schedule.md`](review-schedule.md), two days after this
lesson. Interleaved with 02, 03, 04, 05, 09, 12 and 13 — the widest mix in the
course so far, because this is the first lesson that spends decisions made in
every earlier part, and the mixing is the exercise rather than an accident of
scheduling.

**Where lesson 15 goes next.** Primitives and the registry. This lesson leaned
on the resolver as one lookup and left everything behind it alone; 15 is what
is behind it — what a primitive promises, what a declaration is worth, and how
a library proves its own components behave before a tree ever names one. The
loose end from Exercise F is the door in: a primitive that drops a region it
was handed produces no diagnostic here, and something has to catch it.
