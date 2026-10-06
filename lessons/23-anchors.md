# 23 — Anchors: the name a page gives a place inside itself

**After this lesson you will be able to** say which half of an in-page link was
missing and why the other half never was; give the three questions that come
with naming a place in a document, and say exactly which of them a per-node
schema can answer and which two it structurally cannot; state the grammar an
anchor is held to and defend it as a claim about a round trip rather than about
HTML; say which of two nodes naming the same slug keeps it, what "first" is
measured in, and why that is a fact about the tree rather than about the
renderer; explain why this seam hands a primitive an attribute or nothing at all,
when the frame seam two lessons ago handed one a refusal it could render; name
the one party in this story that the check cannot see, and say why the answer was
to state the limit rather than to close it; and say what it costs a system when
a mechanism is built, correct, tested, and asked for by nobody.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md), [08](08-two-axes.md), [09](09-the-gate.md),
[10](10-the-pipeline.md), [11](11-the-model-seam.md), [12](12-projection.md),
[13](13-refusal-and-repair.md), [14](14-rendering.md),
[15](15-primitives-and-the-registry.md), [16](16-persistence.md),
[17](17-telemetry.md), [18](18-data.md), [19](19-destinations.md),
[20](20-origins.md), [21](21-appearance.md), [22](22-reach.md).

Lesson 22 ended with an instruction for finding a sixth Part V seam: look for
another fact that exists only between two things, and ask **who is allowed to
declare it, and what happens when they are wrong.**

This is one, and it is the first in Part V where the answer to *who declares it*
is the tree itself — both ends of the relation are nodes, both are written by a
proposal, and nothing has to be registered by anybody. That sounds like the easy
case. It is the case where the system's own unit of judgement turns out to be
the wrong size, which is a different problem from the four before it and has a
different answer.

It is also the lesson where an exercise finds the opposite of the failure lesson
22 found. That one had a check firing on a page that was fine. This one has a
check that is correct, complete, covered by its own tests, shipped a fortnight
ago — and reaches nothing at all.

---

## Warm-up

Closed book, five minutes, mixed across six lessons. Write something for all five
before you look anything up.

1. Node ids are minted rather than derived. State what an id promises, then say
   what it deliberately tells you nothing about — and give the one-sentence
   version of why a fixture's `n_4` is not the fourth thing on the page. *(04)*
2. A form names an endpoint instead of carrying an address. Give the reason in
   terms of what a proposal is allowed to author, and then say what a host
   registers in order to make the name mean something. *(19)*
3. The renderer is total and `applyDelta` returns a `Result`. Both are
   disciplines about failure and they are not the same discipline. Say what each
   one guarantees, and name the property of the render seam that makes totality
   the right choice there and the wrong one for a delta. *(05, 14)*
4. A change is assessed on two axes. Name them, then say precisely what
   *reversible* is measured over — and, since the answer is a structure rather
   than the world, name one harm that is reversible by that measure and not
   reversible in any other sense. *(06, 08)*
5. The catalogue is a projection of the registry. Say what it keeps, what it
   throws away, and the consequence for a model of something being absent from
   it. *(12, 15)*

Question 4 is the one to be exact about. This lesson's last exercise turns on the
difference between a change a system can undo and a harm a system can undo, and
a rough answer here will let you predict it wrongly with confidence.

---

## Predict

**In writing, before reading on.** Four questions. Question 2 has a second half
almost everybody gets backwards, and question 4 is the one to put a number
against — it is a question about this repository today, and you can check it
yourself in about fifteen lines.

1. A page has a claim at the top and the panel that backs it up twelve hundred
   pixels further down. It wants a control saying *read the whole record*, which
   scrolls rather than navigates. Loom could not do this until a fortnight ago.
   **Which half was missing — the address, or the thing the address points at?**
   Say which, and why the other half needed nothing. Then design it: you have a
   library of ninety-odd primitives and a runtime that walks the tree. **Where do
   you put the name?** Write your choice, and then write the one thing your
   choice cannot check.

2. Two nodes in the same tree name the same anchor. **What should the system do,
   and which of the two keeps it?** Give the rule. Then the half that matters:
   say what "first" is measured *in*, and — given a fixture whose builders run
   leaves before parents, as lesson 04's did — say whether the winner's node id
   will be numerically higher or lower than the loser's.

3. Renaming an anchor breaks every link to it that anybody ever shared. Lesson 19
   had a harm of the same family — moving a form's destination — and that one got
   a stake factor of its own and a rule in the Gate. **What does a rename of an
   anchor get?** Name the stakes level and the disposition under the default
   policy, and then say what a deployment that disagrees can actually do about
   it.

4. The runtime hands a node that carries a usable anchor an attribute bundle to
   spread — `{...loom.anchor}` — exactly as it hands one the attributes that make
   it editable. **How many primitives in the starter library spread it?** Write a
   number, **rate your confidence 1–5**, and then write what a page gets when a
   primitive does not.

Do not read on until all four are written. Question 4 is this lesson's question,
and the useful thing is not the number — it is whether your estimate came from
the design you would expect or from the repository you have read.

---

## The problem

A Loom page can hold a link to any document on the web except itself.

The marketing front door is where this stopped being theoretical. Its opening
band answers a visitor's request, and the panel holding the full record of that
change sits about twelve hundred pixels below it on the same page. The band
wanted one more control — *read the whole record* — pointing at the panel
underneath. There was nothing to point at, so what shipped was a link back to
the published front door replaying the same request: a better destination for
something you want to *share*, and no substitute at all for *it is below you,
here it is*.

An in-page link has two halves, and only one of them was missing.

**The address half already worked, and had from the beginning.** `linkUrlSchema`
parses with `URL` and allowlists schemes, so `https://host/?ask=problem#see-it-happen`
has always passed every check the library makes. A fragment is part of a URL;
nothing ever objected to one.

**The target half did not exist.** No primitive in the library rendered an `id`.
`loom.editable` spreads `data-loom-node`, which is identity for the renderer and
the portal — not something a browser will scroll to. There was no element in any
Loom page that a fragment could find.

So: add a name. The obvious shape, and the one the finding itself recommended, is
a prop on the three primitives that a page's own navigation ever points at —
`loom.section`, `loom.hero`, `loom.callout`:

```ts
props: z.object({
  anchor: z.string().optional(),
  …
})
```

That is four lines, it is in the lane that owns the library, and it needs nothing
from the runtime. It is also the answer this lesson exists to take apart, and the
way to see why is to write down the three questions that arrive with it. The
finding wrote them down itself, which is the reason it was a good finding:

1. **Is the name validated?** An `id` may be very nearly anything since HTML5, so
   the document will accept whatever is written. Is that the standard?
2. **May two nodes carry the same one?**
3. **Does a decorative copy of a band carry the original's name?**

Now answer them with the prop in front of you. A prop schema is a function from
*one node's props* to a verdict about that node. It can answer question 1 — a
regex is exactly the kind of thing a schema is for.

It cannot answer question 2, and not because nobody wrote the code. Duplication
is not a property of a node; it is a property of a *pair*, and the schema
validating the second node has never seen the first. There is no argument to the
function that could carry the answer.

It cannot answer question 3 either, and this one is worse, because the copy is
not in the tree at all. A decorative copy is something the *render* makes —
[0093](../decisions/0093-a-decorative-copy-is-the-same-children-without-identity.md),
the same children with identity switched off, so that a marquee can say its
contents twice without putting one node's id on two elements. The tree contains
one band. The document contains two. No function of the tree can see the second
one.

So the obvious mechanism can answer one of the three questions it raises, and is
structurally blind to the other two — and both of the two are the same failure in
different clothes: **two elements in one document carrying the same `id`.** That
is not a node that is wrong. It is a document that is wrong, resolved by the
browser's own rule rather than by the tree's, so a link lands on whichever of
the two the parser preferred.

Notice what has happened here, because it is the Part V shape arriving from a new
direction. In lessons 18 to 21 the fact the tree could not hold was somewhere
else entirely — an answer on a server, an address in a registry, a set of origins
a deployment owns, a palette. Here **both ends are in the tree**. The page names
the anchor and the page names the link. Nothing is missing. What is wrong is the
size of the thing the checker is allowed to look at.

---

## The idea

**An anchor is `loom:anchor` — a reserved key on any node, checked by the runtime
during the walk and placed by the primitive on its own root element.**

[0098](../decisions/0098-an-anchor-is-a-reserved-key-the-runtime-checks-and-a-primitive-places.md)
is the record. Six parts, and each one answers something the prop could not.

### The check moves to the thing that sees the whole render

This is the whole of it, and everything else follows. A prop schema's unit of
judgement is a node, because that is what a props schema *is*. The walk's unit
of judgement is a render. Two of the three questions are about a render, so the
check goes where a render is visible.

`loom:` is not new machinery invented for this.
[0050](../decisions/0050-the-runtimes-props-are-namespaced-and-the-root-mounts-the-theme.md)
reserved the prefix and priced the next key at "a key and a diagnostic rather
than another record" — `loom:theme` mounts a theme on the root, `loom:data` asks
a question (lesson 18), `loom:submit` names an endpoint (lesson 19). An anchor is
the fourth. A reserved key is split off a node's props before validation, so the
primitive never sees it and the primitive's schema never has to know it exists.

The consequence is the part worth keeping: **any primitive can be anchored, and
none had to be changed to allow it.** The prop version would have made the
anchorable set a list somebody maintains in the library lane, and a fourth
primitive wanting one would be a schema change and a review in another lane.

### The grammar is about a round trip, not about HTML

```
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

Lowercase letters and digits, in words joined by single hyphens, at most 64
characters. It is much narrower than an `id` attribute permits, and the reason is
not tidiness. It is what survives the journey from the tree, through a URL
somebody copies out of an address bar, into a message, and back to an element:

- **Capitals fail.** Fragment matching is case-sensitive. A tree that anchors
  `Pricing` and links to `#pricing` scrolls nowhere at all, and the two strings
  look identical in a diff read at speed.
- **Spaces and anything else needing encoding fail.** `#see it happen` arrives as
  `#see%20it%20happen` and matches an element whose id contains a space, so it
  works — until one link in the chain normalises one spelling and not the other,
  and then it works in some places and not others, which is worse.
- **Leading, trailing and doubled hyphens fail.** Not wrong exactly; they are the
  visible residue of a slug generated from a heading with punctuation in it,
  which is a bug somewhere upstream wearing a costume.

And a refusal here is *reported*, never repaired. A sanitiser that quietly
rewrote `The Caveat` to `the-caveat` would leave every link anybody wrote to
`#The Caveat` pointing at a name nobody chose. The seam's job is to say that the
tree cannot have what it asked for.

### First claim in document order, and the loser is named

Two nodes, one slug: **the first in document order keeps it**, and the second is
reported with the id of the node that beat it.

Two things about that rule are choices rather than consequences.

*Why not refuse both?* Because one band that cannot be linked to is a smaller
harm than a page with no anchor where the author asked for one, and because
refusing both makes the fault harder to find, not easier — the diagnostic that
says *n_2 wanted this and n_3 has it* points at both nodes, and a "nobody gets
it" rule points at neither.

*Why document order rather than "whoever the walk reached first"?* Those are the
same thing only because the walk is made to make them the same thing. A node is
claimed **before its children are walked** — you can see the ordering decision in
`renderElement`, where the anchor is resolved above the line that renders the
body. Get that backwards and a descendant would claim the slug while its ancestor
was still mid-render, and "first" would become a fact about the renderer's
recursion instead of a fact about the tree. Exercise C is that, executed, and the
node ids in its output are worth reading twice.

### The ledger lives for exactly one render

The record of who holds what is created inside `renderLoomTree` and dies when the
render returns. No module-scope map, no cache across calls.

The reason is the one lesson 05 gives about the clock and lesson 14 gives about
purity at the render seam: two renders of the same tree must not be able to
disagree about which node holds a slug because one of them happened to run first.
A ledger at module scope would make the second render of a page report a
collision with *itself*.

It also means a refused slug is never claimed. `Pricing` fails the grammar, so
nothing is recorded — and a later node spelling it `pricing` gets it. The check
never spends a name on a value nobody could use.

### The primitive is handed the attributes or nothing at all

```tsx
createElement("section", { ...loom.anchor, ...loom.editable }, children)
```

That is the entire contract. `loom.anchor` is present when the tree named an
anchor that was usable and unclaimed, and absent otherwise — and *absent* covers
both "the tree said nothing" and "the tree said something and it was refused".

Every other seam on the render context is careful to keep those two apart. A
frame that was refused (lesson 20) is handed to the primitive as a refusal,
because a primitive can render one: a placeholder saying this embed is not
permitted is a real thing to put on a page. A binding that could not be answered
(lesson 18) is a state a primitive renders differently.

An anchor has no such rendering. There is no way to draw a refused `id`. A shape
that offered a primitive a choice it cannot act on would invite one to be
invented, so what is left is a diagnostic — which is where a fault with no
behaviour belongs.

### The name is emitted verbatim, and the limit is stated rather than fixed

The obvious hardening is a prefix: emit `loom-pricing`, and the runtime's ids can
never collide with the host page's own markup. It was rejected, for two reasons
that are both about the same thing.

A fragment is **user-visible content that outlives the page** — it is in every
link anybody ever shared. And a mangled slug means the tree can no longer name
its own destination: the model writing `href="#pricing"` would have to know the
runtime's prefix and reproduce it.

So the limit stays, and 0098 writes it down instead of pretending: the ledger
covers **one render of one tree**. A Loom tree that anchors `main`, mounted into a
host page whose own layout already has `id="main"`, produces a duplicate that
nothing here can notice. That is the party this seam cannot see — not a registry,
not another node, but the document the page is mounted into, which is not in the
system at all.

This is the honest version of a pattern this course has met four times. Part V's
other seams could name the thing they could not hold and make a host register it.
This one cannot: you cannot ask a deployment to enumerate the ids in its own
static HTML and keep that list true. So the seam covers what it can see and says
where its knowledge ends, which is a better answer than a guarantee that is true
most of the time.

---

## In the code

| What | Where |
| --- | --- |
| The grammar, the ledger, `resolveAnchor`, the three readings | `src/render/anchor.ts` |
| `loom:anchor`, and splitting reserved keys off a node's props | `src/reserved-props.ts` |
| `nodeAnchorFor`, and where the claim sits in the walk | `src/render/render.ts` |
| `anchor-unusable`, `anchor-claimed` | `src/render/diagnostics.ts` |
| `loom.anchor` on what a primitive receives | `src/render/primitive.ts` |
| The record | [0098](../decisions/0098-an-anchor-is-a-reserved-key-the-runtime-checks-and-a-primitive-places.md) |
| Why a copy carries no identity | [0093](../decisions/0093-a-decorative-copy-is-the-same-children-without-identity.md) |

Read `resolveAnchor` before the exercises. It is forty lines and it is the whole
seam: four refusals, one claim, three possible readings, and no way to throw.

One line in it is worth stopping on. The claim happens *inside* `resolveAnchor`
rather than in the caller — so there is no order of operations, anywhere, in
which a node is told it is anchored and the ledger does not know. A check and the
record of having checked cannot come apart when they are the same function call.

---

## Try it

Seven exercises. **Predict every output in writing, then run.** Exercise C's
first line is where most readers discover they answered Predict 2's second half
backwards, and exercise F is Predict 4 executed — commit to a number before you
run it.

Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

The shared preamble for all seven. Three of the primitives are defined here
rather than taken from the library, for a reason exercise F will make clear:

```ts
import { createElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, it } from "vitest"

import { sequentialIdFactory } from "./ids.js"
import type { JsonObject } from "./json.js"
import { createStarterPrimitiveRegistry } from "./primitives/index.js"
import { createAnchorLedger, resolveAnchor } from "./render/anchor.js"
import { describeRenderDiagnostic } from "./render/diagnostics.js"
import { staticPrimitiveResolver, type LoomPrimitiveProps } from "./render/primitive.js"
import { renderLoomTree } from "./render/render.js"
import { analyzeDelta } from "./runtime/analysis.js"
import { assessChange } from "./runtime/assessment.js"
import { gate } from "./runtime/gate.js"
import { interactivePredicateFor } from "./runtime/nesting.js"
import { defaultGatePolicy, gatePolicySchema, type GatePolicy } from "./runtime/policy.js"
import type { ProposedChange } from "./runtime/proposal.js"
import { catalogueOf } from "./sdk/catalogue.js"
import { createThemeRegistry } from "./theme/index.js"
import { buildElement, buildText } from "./tree/builders.js"
import type { TreeDelta, TreeOperation } from "./tree/delta.js"
import { createTree, type LoomTree } from "./tree/tree.js"

/** Three bands: one that places what the runtime hands it, one that drops it, one that echoes. */
const placing = ({ loom, children }: LoomPrimitiveProps): ReactNode =>
  createElement("section", { ...loom.anchor, ...loom.editable }, children)

const dropping = ({ children }: LoomPrimitiveProps): ReactNode =>
  createElement("section", null, children)

const echoing = ({ loom, children }: LoomPrimitiveProps): ReactNode =>
  createElement(
    "div",
    { ...loom.anchor },
    createElement("div", { key: "run" }, children),
    createElement("div", { key: "echo", "aria-hidden": true }, loom.decorative())
  )

const resolver = staticPrimitiveResolver({
  "demo.band": placing,
  "demo.plain": dropping,
  "demo.marquee": echoing,
})

const registry = (() => {
  const built = createStarterPrimitiveRegistry()
  if (!built.ok) throw new Error(JSON.stringify(built.error))

  return built.value
})()

const themes = createThemeRegistry()

/** Every `id` the page ends up with, and everything the render seam had to say. */
const report = (label: string, markup: string, diagnostics: readonly unknown[]) => {
  const ids = [...markup.matchAll(/\sid="([^"]*)"/g)].map(([, value]) => value)

  console.log(`  ${label}`)
  console.log(`    ids:         ${JSON.stringify(ids)}`)
  console.log(
    `    diagnostics: ${
      diagnostics.length === 0
        ? "none"
        : diagnostics.map((one) => describeRenderDiagnostic(one as never)).join(" | ")
    }`
  )
}

const show = (label: string, tree: LoomTree) => {
  const out = renderLoomTree(tree, { resolver })

  report(label, renderToStaticMarkup(out.element), out.diagnostics)
}

const showStarter = (label: string, tree: LoomTree) => {
  const out = renderLoomTree(tree, { resolver: registry, themes })

  report(label, renderToStaticMarkup(out.element), out.diagnostics)
}

/** A page of bands, each with whatever props the exercise gives it. */
const page = (bands: readonly { readonly type?: string; readonly props?: JsonObject }[]) => {
  const ids = sequentialIdFactory()
  const children = bands.map((band) =>
    buildElement(ids, {
      type: band.type ?? "demo.band",
      props: band.props ?? {},
      children: [buildText(ids, "The plans, in full")],
    })
  )
  const root = buildElement(ids, { type: "demo.plain", children })

  return { tree: createTree(root, ids), ids: children.map((child) => child.id) }
}
```

### Exercise A — the whole check, one value at a time

Twelve values against one ledger. Predict each reading before you run: which of
the three statuses, and for the refusals, whether the detail names the value.
The last one is the same string as the first.

```ts
describe("A", () => {
  it("reads a declared anchor against a grammar and against what is taken", () => {
    const ledger = createAnchorLedger()
    const ids = sequentialIdFactory()
    const node = () => buildElement(ids, { type: "demo.band", children: [] }).id

    for (const declared of [
      "pricing",
      "see-it-happen",
      "plan-2",
      "Pricing",
      "see it happen",
      "the-caveat-",
      "how--it-works",
      "",
      "a".repeat(65),
      42,
      null,
      "pricing",
    ] as const) {
      const reading = resolveAnchor(declared, node(), ledger)
      console.log(`  ${JSON.stringify(declared).padEnd(20)} ${JSON.stringify(reading)}`)
    }
  })
})
```

The output:

```
  "pricing"            {"status":"anchored","attributes":{"id":"pricing"}}
  "see-it-happen"      {"status":"anchored","attributes":{"id":"see-it-happen"}}
  "plan-2"             {"status":"anchored","attributes":{"id":"plan-2"}}
  "Pricing"            {"status":"unusable","detail":"\"Pricing\" is not lowercase letters, digits and single hyphens"}
  "see it happen"      {"status":"unusable","detail":"\"see it happen\" is not lowercase letters, digits and single hyphens"}
  "the-caveat-"        {"status":"unusable","detail":"\"the-caveat-\" is not lowercase letters, digits and single hyphens"}
  "how--it-works"      {"status":"unusable","detail":"\"how--it-works\" is not lowercase letters, digits and single hyphens"}
  ""                   {"status":"unusable","detail":"it is empty"}
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" {"status":"unusable","detail":"it is 65 characters and the most an anchor may be is 64"}
  42                   {"status":"unusable","detail":"got number"}
  null                 {"status":"unusable","detail":"got object"}
  "pricing"            {"status":"claimed","anchor":"pricing","holder":"n_1"}
```

Four things in that transcript are decisions rather than accidents.

**`42` and `null` come back as readings, not as thrown errors.** This function
reads something a model wrote, and lesson 05's rule applies without exception: a
page is not lost because a proposal put a number where a slug goes. `null`
reporting `got object` is JavaScript's `typeof` being what it has always been,
surfacing in a diagnostic — slightly ugly, honest, and not worth a special case.

**The three refusals have three different details.** Empty, too long, and
misspelled are separate sentences rather than one "invalid anchor". Somebody has
to fix it, and the fix is different in each case.

**`plan-2` passes and `how--it-works` does not.** Digits are words; a doubled
hyphen is not a word boundary.

**The last line is the ledger, not the grammar.** `"pricing"` is a perfectly good
anchor, refused because `n_1` got there first — and the reading names `n_1`
rather than saying no. A diagnostic that named only the loser would send you
looking at the wrong node.

### Exercise B — what reaches the document

Three renders. Predict the `ids` array and the diagnostics for each, and be
careful with the third: it uses `demo.plain`, the band that does not spread what
it was handed.

```ts
describe("B", () => {
  it("puts the id on the element the primitive placed it in", () => {
    const one = page([{ props: { "loom:anchor": "pricing" } }])
    show(`one band, anchored (${one.ids.join(", ")})`, one.tree)

    const two = page([{ props: { "loom:anchor": "Pricing" } }])
    show(`one band, capitalised (${two.ids.join(", ")})`, two.tree)

    const three = page([{ type: "demo.plain", props: { "loom:anchor": "pricing" } }])
    show(`one band that drops what it was handed (${three.ids.join(", ")})`, three.tree)
  })
})
```

The output:

```
  one band, anchored (n_2)
    ids:         ["pricing"]
    diagnostics: none
  one band, capitalised (n_2)
    ids:         []
    diagnostics: node n_2 names an anchor a link could not carry, so it is not a fragment target — "Pricing" is not lowercase letters, digits and single hyphens
  one band that drops what it was handed (n_2)
    ids:         []
    diagnostics: none
```

The third case is the one to sit with, and it is the shape of this lesson's
ending. The tree named a usable anchor. The runtime checked it, claimed it, and
handed the primitive an `id` to place. The primitive did not place it, and **the
page has no anchor and no diagnostic** — because as far as the render seam is
concerned nothing went wrong. It answered the question it was asked.

Nothing in the system can tell case one from case three by looking at the tree.
The difference is in a component, and a component is code.

### Exercise C — who gets the slug

A section inside a section inside a page, plus a sibling — all three naming
`pricing`. Predict the winner **by node id**, not by description, and predict how
many diagnostics come back.

```ts
describe("C", () => {
  it("gives the slug to the first node in document order", () => {
    const ids = sequentialIdFactory()
    const inner = buildElement(ids, {
      type: "demo.band",
      props: { "loom:anchor": "pricing" },
      children: [buildText(ids, "inner")],
    })
    const outer = buildElement(ids, {
      type: "demo.band",
      props: { "loom:anchor": "pricing" },
      children: [inner],
    })
    const sibling = buildElement(ids, {
      type: "demo.band",
      props: { "loom:anchor": "pricing" },
      children: [buildText(ids, "sibling")],
    })
    const root = buildElement(ids, { type: "demo.plain", children: [outer, sibling] })

    console.log(`  outer=${outer.id}  inner=${inner.id}  sibling=${sibling.id}`)
    show("three nodes, one slug", createTree(root, ids))
  })
})
```

The output:

```
  outer=n_3  inner=n_2  sibling=n_5
  three nodes, one slug
    ids:         ["pricing"]
    diagnostics: node n_2 names the anchor "pricing" and node n_3 already holds it, so only the first one is a fragment target | node n_5 names the anchor "pricing" and node n_3 already holds it, so only the first one is a fragment target
```

**The winner is `n_3`, and it has a higher id than the node it beat.** `inner`
had to be built before `outer` could take it as a child, so it was minted first —
and it is *second* in document order, because document order is an ancestor
before its descendants. This is lesson 04 arriving from a new angle: an id is
minted, carries no position, and the one time you are tempted to read position
out of it is the one time the reading is inverted.

If you predicted `n_2` because the number is smaller, that is the prediction
worth writing down in Reflect. It is not a careless answer; it is the answer you
get by assuming two orderings agree.

The sibling losing is the ordinary case. The ancestor winning is the case the
implementation had to be arranged for: the claim is made before the node's
children are rendered, which is why "first" means the tree's order and not the
recursion's.

### Exercise D — one render, and nothing between renders

Two renders of the same tree, then a tree where a refused spelling comes before
a usable one. Predict whether the second render reports a collision with the
first, and whether the refused `Pricing` costs the later `pricing` its slug.

```ts
describe("D", () => {
  it("is a fact about one render and not about the tree", () => {
    const { tree } = page([{ props: { "loom:anchor": "pricing" } }])

    show("first render", tree)
    show("second render of the same tree", tree)

    const refused = page([
      { props: { "loom:anchor": "Pricing" } },
      { props: { "loom:anchor": "pricing" } },
    ])
    show("a refused slug, then the same slug spelled correctly", refused.tree)
  })
})
```

The output:

```
  first render
    ids:         ["pricing"]
    diagnostics: none
  second render of the same tree
    ids:         ["pricing"]
    diagnostics: none
  a refused slug, then the same slug spelled correctly
    ids:         ["pricing"]
    diagnostics: node n_2 names an anchor a link could not carry, so it is not a fragment target — "Pricing" is not lowercase letters, digits and single hyphens
```

The third case is two facts in one line, and the second is easy to miss because
it is a thing that did *not* happen. The refusal is reported — and the slug is
not spent. The second band gets `pricing`, because nothing is recorded for a
value nobody could have used. A check that consumed names on invalid input would
let a typo above the fold silently break the correct anchor below it, and the
diagnostic you would get would name the wrong problem at the wrong node.

The first two lines are the property that makes this seam safe to call twice:
the ledger is created inside `renderLoomTree` and dies with it. Had it been a
module-scope map, the second render of that page would have reported the page
colliding with itself — which is the same class of bug as a clock read from
`Date.now()` in a function that is supposed to be pure (lesson 05).

### Exercise E — the copy that carries no name

`demo.marquee` says its children twice: once as content, once as a decorative
copy. The marquee itself is anchored `the-marquee`, and the band inside it is
anchored `in-the-run`. Predict how many times the text appears, and predict the
`ids` array exactly — its length is the question.

```ts
describe("E", () => {
  it("says the children twice and the identity once", () => {
    const ids = sequentialIdFactory()
    const band = buildElement(ids, {
      type: "demo.band",
      props: { "loom:anchor": "in-the-run" },
      children: [buildText(ids, "on the track")],
    })
    const marquee = buildElement(ids, {
      type: "demo.marquee",
      props: { "loom:anchor": "the-marquee" },
      children: [band],
    })
    const root = buildElement(ids, { type: "demo.plain", children: [marquee] })
    const out = renderLoomTree(createTree(root, ids), { resolver })
    const markup = renderToStaticMarkup(out.element)

    console.log(`  "on the track" appears ${markup.split("on the track").length - 1} times`)
    report("a marquee, its run, and its echo", markup, out.diagnostics)
  })
})
```

The output:

```
  "on the track" appears 2 times
  a marquee, its run, and its echo
    ids:         ["the-marquee","in-the-run"]
    diagnostics: none
```

**Two copies of the content, one copy of each name, and nothing reported.** The
decorative walk does not read the key at all — it is the first line of
`nodeAnchorFor`, before the value is even looked at.

The alternative that looks more principled is to let the copy go through the
ledger and be refused as a collision. It produces the same document and a
diagnostic saying node `n_2` collided with node `n_2`, which is not information.
The copy is not a second node making a claim; it is the same node rendered again,
and the seam treats it as what it is.

Note also what the *absence* of a diagnostic means here versus in exercise B's
third case. Here nothing is reported because nothing is wrong. There nothing was
reported because nothing was visible. The channel cannot tell you which kind of
silence you are looking at, and that is a real limit of reporting as a mechanism.

### Exercise F — the same questions, asked of the library

Now the starter library instead of three hand-written primitives. A `loom.section`
carrying the reserved key; a `loom.section` carrying an `anchor` prop; two
sections carrying the same `anchor` prop. Then the catalogue.

**Predict all four before running**, and put a confidence number on the first.

```ts
describe("F", () => {
  it("asks the library the same question", () => {
    const band = (props: JsonObject, type = "loom.section"): LoomTree => {
      const ids = sequentialIdFactory()
      const node = buildElement(ids, {
        type,
        props,
        children: [buildText(ids, "The plans, in full")],
      })
      const root = buildElement(ids, {
        type: "loom.page",
        props: { title: "Home" },
        children: [node],
      })

      return createTree(root, ids)
    }

    showStarter("loom:anchor, the reserved key", band({ "loom:anchor": "pricing" }))
    showStarter("anchor, the prop", band({ anchor: "pricing" }))
    showStarter("the prop, on two bands", (() => {
      const ids = sequentialIdFactory()
      const one = buildElement(ids, {
        type: "loom.section",
        props: { anchor: "pricing" },
        children: [buildText(ids, "first")],
      })
      const two = buildElement(ids, {
        type: "loom.section",
        props: { anchor: "pricing" },
        children: [buildText(ids, "second")],
      })
      const root = buildElement(ids, {
        type: "loom.page",
        props: { title: "Home" },
        children: [one, two],
      })

      return createTree(root, ids)
    })())

    const catalogue = catalogueOf(registry)
    const named = catalogue.filter((entry) =>
      (entry.props ?? []).some((prop) => prop.name === "anchor")
    )

    console.log(`  primitives registered: ${catalogue.length}`)
    console.log(`  declaring an "anchor" prop: ${named.map((entry) => entry.type).join(", ")}`)
    console.log(
      `  "loom:anchor" anywhere in the catalogue: ${JSON.stringify(catalogue).includes("loom:anchor")}`
    )
  })
})
```

The output:

```
  loom:anchor, the reserved key
    ids:         []
    diagnostics: none
  anchor, the prop
    ids:         ["pricing"]
    diagnostics: none
  the prop, on two bands
    ids:         ["pricing","pricing"]
    diagnostics: none
  primitives registered: 106
  declaring an "anchor" prop: loom.section, loom.hero, loom.callout
  "loom:anchor" anywhere in the catalogue: false
```

Read those six lines together, because each one is ordinary and the set is not.

**The reserved key reaches nothing.** Not one primitive in the starter library
spreads `loom.anchor`. The runtime checked the slug, claimed it in
the ledger, built an attribute bundle and offered it, and the section dropped it —
exercise B's third case, shipping. The answer to Predict 4 is **zero**.

**The prop works.** `loom.section`, `loom.hero` and `loom.callout` each declare an
`anchor` prop of their own and each emit an `id` from it. That is the mechanism
0098 examined and rejected by name, built in the same pull request as the one it
chose, and it is the one a page actually gets.

**And two bands with the same prop produce two `id="pricing"` and no diagnostic
at all** — precisely the document 0098 exists to prevent, arrived at by the route
it warned would arrive at it. The prop cannot see the pair; that was the whole
argument.

**The model is told about the prop and not about the key.** The catalogue is what
a model may build with (lesson 12), and `anchor` is in three of its entries
because it is in three schemas. `loom:anchor` is a reserved key, split off props
before any of this, and appears nowhere — so a model asked to link a page to its
own second screen will reach for the prop, correctly, because it is the only one
it has been shown.

Nothing here is a mistake anybody made twice. Each half is defensible alone: a
library lane built the thing its own finding asked for, and a runtime lane built
the thing the record settled on. What nobody had was a check that the two met,
and neither lane's tests could have been it — the library's tests assert the prop
emits an id, and the runtime's assert that a primitive spreading `loom.anchor`
gets one. **Both suites pass. Both describe a system that works. They are not
describing the same system.**

This is the mirror image of lesson 22's exercise F. There, two correct records
combined into a check that fired on a page that was fine. Here, two correct
implementations combine into a check that fires on nothing at all — and the
failure mode is quieter, because a false alarm gets filed by whoever it annoys
and an unreachable check gets filed by nobody.

### Exercise G — what it costs to rename one

An anchor is a name people share. Renaming it breaks every inbound link that was
ever written. Predict the stakes level and the disposition for four cases before
running — and note that the last one is lesson 19's harm, for comparison.

```ts
describe("G", () => {
  it("weighs a renamed anchor", () => {
    const spare = sequentialIdFactory("x")
    const ids = sequentialIdFactory()
    const band = buildElement(ids, {
      type: "demo.band",
      props: { "loom:anchor": "pricing", "loom:submit": { to: "contact.enquiry" } },
      children: [buildText(ids, "The plans, in full")],
    })
    const root = buildElement(ids, { type: "demo.plain", children: [band] })
    const tree = createTree(root, ids)

    const renameAnchor: readonly TreeOperation[] = [
      { op: "configure", nodeId: band.id, set: { "loom:anchor": "plans" }, unset: [] },
    ]
    const moveForm: readonly TreeOperation[] = [
      { op: "configure", nodeId: band.id, set: { "loom:submit": { to: "contact.sales" } }, unset: [] },
    ]

    const weigh = (
      label: string,
      policy: GatePolicy,
      operations: readonly TreeOperation[] = renameAnchor,
      origin: "developer" | "user-instruction" = "developer"
    ) => {
      const delta: TreeDelta = {
        deltaId: spare.deltaId(),
        treeId: tree.treeId,
        baseRevision: 0,
        operations,
      }
      const analysis = analyzeDelta(tree, delta, interactivePredicateFor(policy.interactiveTypes))
      if (!analysis.ok) throw new Error(JSON.stringify(analysis.error))

      const proposal: ProposedChange = {
        proposalId: spare.proposalId(),
        intentId: spare.intentId(),
        delta,
        rationale: "teaching",
        provenance: {
          origin,
          interpreter: "scratch",
          authoredBy: "model",
          confidence: 0.99,
          interpretedAt: "2026-09-12T00:00:00.000Z",
        },
      }
      const assessed = assessChange(tree, proposal, policy, spare.deltaId())
      if (!assessed.ok) throw new Error(JSON.stringify(assessed.error))

      console.log(`  ${label}`)
      console.log(`    configured prop keys: ${JSON.stringify(analysis.value.configuredPropKeys)}`)
      console.log(
        `    stakes=${assessed.value.stakes.level} gate=${gate(assessed.value, policy).kind}`
      )
      for (const factor of assessed.value.stakes.factors) {
        console.log(`      ${factor.code} (${factor.level}): ${factor.detail}`)
      }
    }

    const protecting = gatePolicySchema.parse({ protectedPropKeys: ["loom:anchor"] })

    weigh("rename the anchor, default policy", defaultGatePolicy)
    weigh("rename the anchor, key protected, developer asked", protecting)
    weigh("rename the anchor, key protected, a user asked", protecting, renameAnchor, "user-instruction")
    weigh("move the form, default policy, developer asked", defaultGatePolicy, moveForm)
  })
})
```

The output:

```
  rename the anchor, default policy
    configured prop keys: ["loom:anchor"]
    stakes=low gate=accepted
  rename the anchor, key protected, developer asked
    configured prop keys: ["loom:anchor"]
    stakes=high gate=accepted
      protected-prop-configured (high): configures protected loom:anchor
  rename the anchor, key protected, a user asked
    configured prop keys: ["loom:anchor"]
    stakes=high gate=requires-confirmation
      protected-prop-configured (high): configures protected loom:anchor
  move the form, default policy, developer asked
    configured prop keys: ["loom:submit"]
    stakes=high gate=requires-confirmation
      redirected-submission (high): redirects a submission: n_2 from contact.enquiry to contact.sales
```

**By default a rename is a `configure` of a prop key and nothing more.** No
factor, `low`, applied without asking. 0098 says so in as many words and says why
it was left there: the harm is real but smaller than a redirected form, the seam
has no consumer yet, and the cheap time to decide is after one exists.

**A deployment's only lever is `protectedPropKeys`.** One line, and it raises the
stakes to `high` — which is where the interesting part is. The same change, at
`high`, is *accepted* when a developer asked and *held* when a user's instruction
did, because ceilings are per origin ([0002](../decisions/0002-changes-are-gated-by-stakes-and-reversibility.md),
lesson 09). Lesson 19's redirected submission is `high` **plus a rule in the
Gate**, so it is held whoever asked. Where a stranger's data goes does not depend
on who requested the move; where a shared link lands, today, does.

Then the thing that makes this more than a policy table. Every case here is
`accepted` or `requires-confirmation` and never refused, and part of the reason
is that the change is perfectly reversible: a `configure` has an exact inverse,
undo restores the old slug, and the reversibility axis (lesson 06, lesson 08) is
satisfied. **But the axis measures the tree, not the world.** The links people
already sent each other are not in the tree. Restoring the anchor tomorrow does
nothing for the message someone sent last night, and the system cannot see that
because the system's idea of "undone" is "the tree is as it was".

That is not a defect in the axis. It is the limit of what a structural measure
can mean, and it is the second time in this lesson that the boundary of the
system turns out to be the boundary of the document it can see.

---

## It could have been otherwise

Five from the record, and one that is not in any record.

**An `anchor` prop on the band primitives.** The finding's own recommendation,
rejected for the two things it structurally cannot do — the collision and the
copy — and for making the anchorable set a maintained list in another lane. It is
also, per exercise F, the mechanism actually rendering an `id` in this repository
today, which is the strongest possible statement of how reasonable it is.

**A prefixed `id` — `loom-pricing`.** Guarantees no collision with the host
page's markup, which is exactly the thing the ledger cannot see. Rejected because
a fragment outlives the page in every link anybody shares, and because a mangled
slug means a model writing the `href` would have to know and reproduce the
runtime's prefix.

**Deriving the anchor from the node id.** Every node already has a stable unique
identifier, and uniqueness would be free. `#n_4f2a` is not a link anybody shares,
does not survive the node being rewritten, and says nothing about where it goes.
Uniqueness is not the only property a name has to have.

**A refusal handed to the primitive, shaped like a frame's.** Rejected because
there is nothing to render. A shape that offers a choice nobody can act on
invites one to be invented.

**Waiting for [0069](../decisions/0069-a-root-relative-path-is-a-destination-a-tree-may-name.md)**,
the unresolved question of whether a tree may write the bare `#see-it-happen`
form rather than the absolute one. The two halves are independent — the absolute
form has always parsed — so coupling them would have held a working seam behind
an architectural question nobody was ready to settle.

**A whole-tree pass before the walk, instead of a ledger during it.** Not in any
record, and the shape every other Part V seam uses: the data seam plans before it
renders, the frame seam resolves before it renders. It would let the seam refuse
*both* colliding nodes with equal information about each, which is arguably
fairer than first-past-the-post. It costs a second traversal for a fact the walk
is already in a position to compute, and it would put the check somewhere the
decorative copy is invisible — the copy does not exist until the render makes it.
So the answer is probably "no", and it is worth knowing that the reason is the
copy rather than the traversal.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections while
you write. Then compare.

1. **Explain to somebody who has just learned that a props schema validates one
   node why an anchor could not be a prop.** Get through it without using the
   word "global". Then the harder half: they reply that a schema *could* be given
   the tree as context, and that plenty of validators work that way. Answer them
   properly — say what that would do to the meaning of the word *valid*, and name
   the decision in this course that already refused a version of that trade.

2. **Derive this seam from lesson 19 and lesson 14 together, without looking at
   either.** Lesson 19 gave you a name in the tree resolved against something a
   host registered. Lesson 14 gave you a total, pure render that reports rather
   than refuses. Show how the two produce this design — a key, a grammar, a
   ledger, two diagnostics, an attribute bundle — and then name the one part of
   it that neither lesson could have predicted, and say which lesson's rule it
   bends.

Predict, before writing (2): the thing neither lesson predicts is *not* the
grammar. If that is your answer, you have found the part that is most visible
rather than the part that is new.

---

## Self-check

Seven questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. Give the three questions that arrive with naming a place in a document, say
   which one a per-node schema can answer, and for each of the other two state
   the argument it cannot see — one is about a pair, one is about something that
   is not in the tree at all.
2. State the anchor grammar, then justify each exclusion as a failure of a round
   trip rather than as a failure of HTML. Then say why a value that fails is
   reported rather than rewritten into one that passes.
3. Two nodes name the same slug. Say which keeps it and what "first" is measured
   in. Then explain how the implementation makes that ordering true — name the
   two lines of `renderElement` whose order is the guarantee — and say what
   "first" would have meant if they were the other way round.
4. Why is the ledger created per render rather than held at module scope? Give
   the failure it prevents in one sentence, then name the other two places in
   this course where the same argument is made about a different piece of state.
5. A frame the origins registry refused is handed to the primitive as a refusal;
   an anchor that was refused is not handed over at all. Both seams are careful
   about the difference between "nothing was asked" and "something was asked and
   refused". Explain why one of them keeps the distinction in the value and the
   other keeps it only in the diagnostics.
6. The ledger covers one render of one tree, and 0098 states the limit instead of
   fixing it. Name the party the seam cannot see, say why a prefix would have
   closed the hole, and give the two things a prefix would have cost. Then say
   why this seam cannot use the answer Part V's other four seams use — making a
   host register what the tree cannot hold.
7. A `loom.section` in the starter library carrying `loom:anchor: "pricing"`
   renders with no `id` and no diagnostic. Explain every step of how that happens
   without anything being broken, then say which of the two suites — the
   library's or the runtime's — *should* have caught it, and what the assertion
   would have to be able to see in order to be written at all.

Question 7 is this lesson's question. Question 5 is where a half-answer reads as
a full one: if yours does not mention what a primitive could *draw* in each case,
it is not the answer.

---

## Reflect

Write for two minutes, then move on.

- Predict 1 asked where you would put the name. Almost everybody says a prop, and
  a prop is what the library shipped. Write down whether you named the thing it
  cannot check *before* you read The problem, and if not, what would have made you
  think of it — the useful answer is a habit, not a fact.
- Predict 2's second half — whether the winning node's id is higher or lower —
  is the one to look at hardest, and it is a rerun of lesson 04's fixture
  surprise in new clothes. If you got it wrong, write down the assumption in one
  sentence. It is not "ids are sequential". It is that two orderings you know are
  both real are the same ordering.
- Predict 4: your number, and your confidence. If you guessed anything other than
  zero and rated yourself 4 or 5, that pair is worth more than the fact, and it
  is exactly what the corrections queue exists to bring back. Write down what
  would have to be true of the repository for your number to be right, and then
  what check would have told you either way.
- This lesson's defect is a mechanism that is correct, tested and unreachable.
  That is harder to notice than a bug, because nothing fails. Write down one
  thing in a system you work on that is built, correct, and used by nothing —
  then say honestly how you would find out, given that no test anywhere is going
  to tell you.
- Last, take the shape out of Loom. A name is unique within a scope, and the code
  that checks it can only see part of that scope. Name one from your own work —
  a CSS class, an environment variable, a database migration, a feature flag —
  and say where the check lives, what it cannot see, and whether anybody has ever
  written the limit down.

---

## Come back to this

Set AB in [`review-schedule.md`](review-schedule.md), two days after this lesson.
Interleaved with 04, 05, 06, 08, 12, 14, 15, 19 and 22 — heavy on 04 and 14,
because what is interesting here is not the grammar but the two orderings and
what a report can and cannot mean, and it revisits 19 directly because the
comparison between a moved destination and a renamed anchor is where the stakes
argument actually lives.

Part V now has six lessons. The first four are a name in the tree and a document
in a registry, resolved before the walk. Lesson 22 had no document and no
resolution — a predicate applied to a pair. This one has no registry either, and
both ends of the relation are in the tree: what makes it a Part V seam is that
the *scope* the name has to be unique in is larger than anything the system can
see. The host page's markup is not in the tree, cannot be registered, and could
not be kept true if it were.

So the three-clause pattern is now the minority reading, and the more useful
question to carry into a seventh is the one this lesson hands over: **what is the
scope of the thing you just named, and is the checker allowed to see all of it?**
Every seam in Part V has an answer, and for the first time here the honest answer
is no.
