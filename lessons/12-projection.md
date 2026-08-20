# 12 — Projection: what the model is shown, and why not the AST

**After this lesson you will be able to** name the three things a model sees —
schema, catalogue, outline — and say what each is a projection *of*; give the
argument for why the reply schema is hand-written rather than derived; explain
what a compiled-grammar budget is, why it exists, and why depth is not what
consumes it; say what the catalogue projects and what it deliberately leaves
out; and give the one property every projection in this system shares.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md), [08](08-two-axes.md), [09](09-the-gate.md),
[10](10-the-pipeline.md), [11](11-the-model-seam.md).

Lesson 11 said what does not cross the seam. This one says what does, and how
it has to be reshaped before it can.

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Write something for all
five before you look anything up.

1. Why is text a node rather than a prop? *(02)*
2. `TreeDelta` carries `NodeId`s. A model may not name what it inserts. Say the
   consequence for the seam's return type, in one sentence. *(04, 11)*
3. Two things about `applyDelta` make it *deterministic*, and one of the two is
   the reason `revertInterpreter` can exist. Name both. *(05, 06)*
4. What does `promptHash` establish about two records, and what does it
   deliberately not? *(07, 11)*
5. Which composition outcome carries no disposition and *was* interpreted
   successfully — as opposed to the one that carries none because interpretation
   failed? *(10)*

Question 3 is the one this lesson uses as scaffolding. Determinism is what a
projection buys, and it is why you can hand a model a schema whose bytes you
know in advance.

---

## Predict

In writing, before reading on.

> 1. A model returns a `TreeDelta`. Sketch the JSON Schema you would send. Just
>    the shape: what would `LoomNode.children` be? What would `props` be? Now say
>    which of those two your schema is going to have to fight the transport for,
>    and **rate your confidence 1–5 before you check**.
>
> 2. You are going to describe *the tree* to a model — the one in `sampleTree()`,
>    seven nodes deep. Write the smallest description that lets the model pick a
>    node and say something about it. Now write down how many bytes you think it
>    will be if the tree is serialised as JSON, and how many if it is not.
>    Commit to two numbers.
>
> 3. The model needs to know what primitives it may create. You have a registry
>    of Zod schemas describing every prop of every primitive. Write the thing you
>    would send. Then look at what you wrote and answer: does it describe prop
>    *types* or only prop *names*? Argue that the answer you gave is the wrong
>    one, as strongly as you can, before you go on.

Predict 1 asks you to guess a fight. There is one and it is not the one people
guess.

---

## The problem

Lesson 11 stopped at the argument that a model must not name the nodes it
inserts, and got a return type for the seam by taking `id` off. That is one
projection and it settled one thing. This is where the rest of the argument
lives.

Three things about a `TreeDelta` are inconvenient for a model to produce, and
each of them forces a decision.

### The AST is not a JSON Schema

The tempting first attempt is to describe `TreeDelta` faithfully. Structured
output — the thing that makes a reply constrained to a schema in the first
place — accepts a subset of JSON Schema, and the subset rules out two things a
faithful description would need:

- **Recursive definitions.** `LoomNode.children` is a list of `LoomNode`. There
  is no way to write that in the accepted subset. The subset unrolls: you write
  the *n*th level yourself, or you do not describe the *n*th level at all.
- **Open objects.** Every object must declare every property and close with
  `additionalProperties: false`. `LoomNode`'s `props` is an arbitrary JSON
  object whose keys are decided by the primitive being instanced. It cannot be
  described that way at all.

There is a way out for each. Recursion becomes an unrolled schema that bottoms
out at a leaf; open props become *something*, and the choice of *something* is
where most of this lesson lives.

Both routes give up something. What is untouched is the AST itself: the schema
that goes on the wire is a *projection* of the AST, and the tree schema stays
recursive and open with no bending to fit a transport. `materializeDelta`
sits between the two and does the inverse projection.

### The compiled grammar has a size

The subset the service accepts is not the only limit. There is a second one,
and it is the one that broke a real interpreter in this project's history:

> `400 invalid_request_error` — "The compiled grammar is too large, which would
> cause performance issues. Simplify your tool schemas."

That error arrived the first day the interpreter ran against a real key. Every
offline test had passed, because every offline test was asserting our beliefs
about what the API accepted, not the thing itself.

The service takes your JSON Schema and *compiles* it into a grammar that
constrains the model's output. Grammars have a size; this one has an
undocumented ceiling, and the ceiling turned out to track the serialised size
of the input schema closely enough that byte-count is a usable proxy. The
number to have in your head, measured on 2026-07-30: **everything at or below
3681 bytes was accepted; everything at or above 4136 was rejected.** The band
between the two is where you do not know.

That is why "the schema is a projection" grows a second half: **the projection
has a budget**, and how you spend it is what the budget's argument is about.
The first draft of this schema, with a typed prop union, weighed 15,890 bytes
compiled — nearly four times the ceiling — and it never worked once.

### Two schemas that can drift

Structured output requires JSON Schema; the runtime's own validation uses Zod.
So the reply is validated *twice*: once at generation (JSON Schema, by the
API), once on return (Zod, on our side). Two schemas describing the same reply
is one schema too many, and the standard fix — derive one from the other —
does not work here because the generated JSON Schema would then have to be
edited into the accepted subset anyway, defeating the point.

So there are two, they are hand-written to fit, and the guard is a test that
runs every recorded reply through both — because the way you notice they have
drifted is by the pair disagreeing on something real.

---

## The idea

Every place a model sees data in this system, it sees a **projection** — a
deterministic, lossy view built for the model's job, not the runtime's. Three
of them, and the sentence that follows every one of them is the same: *the
source is untouched*.

| Projection | Of | Where |
| --- | --- | --- |
| **Reply schema** | The `TreeDelta` type | `schema.ts` (JSON Schema for the API), `draft.ts` (Zod on return) |
| **Catalogue** | The `PrimitiveRegistry` | `catalogue.ts` |
| **Tree outline** | The `LoomTree` | `render.ts` |

Each is a compression under a constraint, and each one throws something away
on purpose.

### The reply schema throws away structure

The schema in `schema.ts` unrolls nesting to **depth 4**, encodes props as a
**JSON string**, and offers **two insertable kinds** (element and text — slot
is dropped). The three choices spend the byte budget on the axes worth having,
and 0014 is the record of the measurement that decided which axes those are.

The one that will surprise you when you look at the numbers is that **depth is
not what consumes the budget** — the prop representation is. A typed prop
union is repeated at every element at every level. Five variants times depth
four is twenty positions for prop typing, plus their descriptions, plus their
required lists, plus their close markers. Replacing that union with `{"type":
"string"}` collapses twenty productions into one and buys back the depth. That
is not obvious from the outside and it is why the first attempt failed.

The prop *types* still get enforced — but not in the grammar. `materialize.ts`
parses the string and requires an object; `§4`'s registry then validates it
against the primitive's declared Zod schema. What the tagged union enforced at
generation is enforced strictly later, and reported as `malformed-proposal`
rather than being unsayable.

The three outcomes are on the outer `anyOf`: `change`, `no-change`,
`not-understood`. That is the composition-outcome discipline of lesson 10
mirrored one level up — a proposal that fails to be a proposal is a *kind of
answer*, not a caller-facing error.

### The catalogue throws away code

The registry holds React components and Zod closures. Neither of them can be
serialised, sent to a model, or recorded in telemetry. So the catalogue is
what a registry looks like when everything unsendable is taken out: for each
primitive, one type, one description, a list of prop names with `?` marking
optional, and a list of slot names.

It is deliberately shallower than the schemas it comes from. Prop *types* are
not in it. Describing arbitrary Zod to a model means maintaining a second
schema language for the exercise, and the model already sees concrete prop
values in the tree outline it is looking at.

One distinction that reads like a small thing and is not: a schema whose keys
cannot be enumerated (a union of shapes, a refined record) projects `props:
undefined`, and renders as **`not declared`** — different from `none`. "I
cannot tell you" leads a model to different actions than "there are none", so
they are different values. That is 0013's version of an argument you have seen
under a different name: two failures that would produce different downstream
answers must not be one code.

### The tree outline throws away everything the model does not have to name

The tree, on the wire, is an indented outline — every line starts with a node
id, followed by kind, type, and props. Not the JSON document; the outline
costs a fraction of the tokens, and it puts each id at the start of a line,
which is the thing a model has to copy verbatim to address anything.

Rendering is deterministic — props are key-sorted, text values JSON-escaped so
a newline cannot forge an outline row — so the same tree always renders to
the same bytes. Deterministic renders are what let the whole prompt be a
value that can be hashed, cached, and compared.

### The one property they share

The pattern is worth writing down as one sentence, because it is the same
sentence three times:

> **A projection is a total, deterministic function from a source of truth to
> a view built for one consumer's job — and the source of truth is untouched.**

That is what `renderTree`, `catalogueFields` and `interpretationReplyJsonSchema`
have in common, and it is why *the runtime holds only one AST*, *one
registry*, and *one tree at any revision*, no matter how many things need to
look at them differently.

---

## In the code

**`src/interpretation/schema.ts`** — the hand-written JSON Schema. `nodeSchema`
recurses in TypeScript to unroll in the emitted schema; `DEFAULT_DRAFT_DEPTH`
is 4; `GRAMMAR_BUDGET_BYTES` is 3500, and `draftSchemaByteSize()` is the
function the offline guard asserts against. Read the file top to bottom in one
go — it is short, and every choice in it is there because the alternative was
measured and rejected.

**`src/interpretation/draft.ts`** — the Zod schema the reply is validated
against on return. Fully recursive (unlike its JSON Schema twin), because a
deeper reply that somehow arrives should still validate rather than fail
here. `draftPropsSchema` is `z.string()`, deliberately; the parse happens in
`materialize.ts`.

**`src/interpretation/materialize.ts`** — the inverse projection. Parses the
prop string, requires an object, validates every value against the JSON value
space, and mints the runtime's node ids. This is the trust boundary for
props: what the schema does not enforce at generation, `decodeProps` enforces
on return.

**`src/catalogue.ts`** — `PrimitiveCatalogue` and `catalogueFields`. Read the
`objectSchemaWithin` helper — that a `.refine()` around an object schema still
enumerates its fields is the kind of detail a catalogue that shrugged would
have gotten wrong. `props: undefined` versus `props: []` is the distinction
worth remembering.

**`src/interpretation/render.ts`** — `renderTree`, `renderCatalogue`,
`renderThemeCatalogue`, `renderDelta`. Four projections in one file, all with
the same shape: source of truth in, deterministic string out.

**`src/interpretation/prompt.ts`** — where the three projections come together
into one string. `buildUserMessage` puts the catalogue block first, then the
theme block, then the tree outline, then the request. The order is not
alphabetical: the most stable thing goes first, so a prompt cache can hold
across intents.

---

## Try it

Six exercises. Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

**Predict every output in writing, then run.** The unexpected numbers are the
whole point — write them down before you look.

### Exercise A — the budget is real, and so is the ceiling

```ts
import { describe, it } from "vitest"
import { DEFAULT_DRAFT_DEPTH, GRAMMAR_BUDGET_BYTES, draftSchemaByteSize } from "./interpretation/index.js"

describe("A", () => {
  it("prints the schema size at every depth", () => {
    console.log("DEFAULT_DRAFT_DEPTH:", DEFAULT_DRAFT_DEPTH)
    console.log("GRAMMAR_BUDGET_BYTES:", GRAMMAR_BUDGET_BYTES)
    for (const depth of [1, 2, 3, 4, 5, 6]) {
      console.log(`depth ${depth}: ${draftSchemaByteSize(depth)} bytes`)
    }
  })
})
```

Predict, before running: **what is the cost of one extra level of nesting?**
Write a number. Then predict the smallest depth that would fail the *offline*
budget of 3500, and the smallest depth that would fail the *measured live*
boundary of 4136.

The output:

```
DEFAULT_DRAFT_DEPTH: 4
GRAMMAR_BUDGET_BYTES: 3500
depth 1: 2070 bytes
depth 2: 2507 bytes
depth 3: 2944 bytes
depth 4: 3381 bytes
depth 5: 3818 bytes
depth 6: 4255 bytes
```

Three things to sit with, because the middle one only shows up when you list
them.

**Depth costs a constant.** +437 bytes per level, every time. That is not
because the runtime charges you 437 per level; it is because the unrolled
element sub-schema — `{ kind: "element", type: {...}, props: {...}, children:
[...] }` with three properties, a `required` array and an `additionalProperties:
false` — is exactly 437 bytes and gets repeated once per level. If you wanted
that number smaller you would go after the sub-schema, not the depth.

**Depth 5 is a bug you cannot catch offline.** 3818 bytes fails the guard
(3500) but is below the measured live boundary (4136). If someone raised the
guard "just this once" to ship a depth-5 schema, the offline suite would
pass, the ship would look green, and there is a real chance the live call
would work — for a while, until the service tightens the number and every
running deployment starts returning 400s. The offline guard sits below the
observed boundary on purpose, and *keeping* it there — the second assertion
in `schema.test.ts` — is what stops a well-meaning bump from getting shipped.

**Depth 6 is over the boundary too.** 4255 > 4136. So even if the offline
guard were disabled, depth 6 would ship and immediately break — which is the
case the offline guard exists for.

### Exercise B — the tree the model sees, not the tree the runtime holds

```ts
import { describe, it } from "vitest"
import { renderTree } from "./interpretation/index.js"
import { sampleTree } from "./testing/fixtures.js"

describe("B", () => {
  it("outline versus JSON", () => {
    const { tree } = sampleTree()
    const outline = renderTree(tree)
    console.log(outline)
    console.log("outline bytes:", new TextEncoder().encode(outline).length)
    console.log("json bytes:", new TextEncoder().encode(JSON.stringify(tree, null, 2)).length)
  })
})
```

Predict, before running: how many bytes is the outline? How many bytes is the
JSON? What is the ratio?

The output:

```
tree t_1 revision 0
n_7 element loom.page title="Home"
  n_2 element loom.header
    n_1 text "Welcome"
  n_5 slot main
    n_4 element loom.card elevation=1 variant="outlined"
      n_3 text "Body copy"
  n_6 element loom.footer
outline bytes: 229
json bytes: 1111
```

The outline is **4.9× smaller** than the JSON — and this is a seven-node tree.
On a real one, that factor is what stands between the prompt and the context
window. The JSON version would repeat `"kind"`, `"type"`, `"props"`,
`"children"` at every node; the outline names each thing once per row and lets
whitespace carry the rest.

The other thing worth noticing is where the ids are. They are at the *start*
of each line, before anything else. The one thing a model has to copy
character-perfect is the id it uses to address any node, and putting it at
the front of a line makes it visually the first token — no seeking, no
disambiguating from a similar-looking string later on the line.

Compare that with a JSON view where the id would be somewhere in the middle
of a nested object: the model could still copy it, but every extraction is
now a small parse. This is the same argument as the reply schema's, at a
different level: **the projection is shaped for what the consumer has to do
with it.**

### Exercise C — props are one string, and that is where the budget went

```ts
import { describe, it } from "vitest"
import { interpretationReplyJsonSchema } from "./interpretation/index.js"

describe("C", () => {
  it("counts the string that replaced a union", () => {
    const serialised = JSON.stringify(interpretationReplyJsonSchema())
    const propsPositions = (serialised.match(/"props":\{"type":"string"\}/g) ?? []).length
    const elementPositions = (serialised.match(/"const":"element"/g) ?? []).length
    console.log("props positions:", propsPositions)
    console.log("element positions:", elementPositions)
  })
})
```

Predict, before running: **how many places does the schema declare props?**
And how many element positions are in the unrolled schema at depth 4?

The output:

```
props positions: 3
element positions: 3
```

Three positions, three strings. Now do the counterfactual arithmetic. Under
0004's tagged union, `props` was an array of objects each of shape

```
{ "kind": "string" | "number" | "boolean" | "null" | "json", ...one value key... }
```

— five variants, at every element position. Three element positions times
five variants is fifteen tagged schemas, each with a `const`, a value type, a
`required` list, an `additionalProperties: false`, and a description that
was — as the record notes — printed four times over. That is not a small
difference. That is the difference between 3381 bytes and 15,890.

**The lesson buried in that arithmetic** is worth taking out: when you are
choosing between two schema shapes, count *positions × cost per position*,
not just cost per position. The typed union is not expensive in isolation.
It is expensive because it appears everywhere a node can, and the number of
places a node can appear is the depth of the schema.

### Exercise D — the catalogue, or "what the model may build"

```ts
import { describe, it } from "vitest"
import { renderCatalogue } from "./interpretation/index.js"
import type { PrimitiveCatalogue } from "./catalogue.js"

describe("D", () => {
  it("renders a small catalogue three different ways", () => {
    const catalogue: PrimitiveCatalogue = [
      {
        type: "loom.card",
        description: "A framed group of content",
        props: [
          { name: "elevation", required: false },
          { name: "variant", required: false },
        ],
        slots: ["body"],
      },
      {
        type: "loom.note",
        description: "A small piece of ancillary text",
        props: [
          { name: "tone", required: false },
          { name: "dismissible", required: false },
        ],
        slots: [],
      },
      {
        type: "loom.grid",
        description: "A grid whose column count adapts",
        props: undefined,
        slots: [],
      },
    ]
    console.log(renderCatalogue(catalogue))
  })
})
```

Predict, before running: what will the three lines look like? Which of the
three primitives will render `props: none`, which will render `props: not
declared`, and how do those two differ in what they tell a model?

The output:

```
- loom.card — A framed group of content. props: elevation?, variant? slots: body
- loom.note — A small piece of ancillary text. props: tone?, dismissible?
- loom.grid — A grid whose column count adapts. props: not declared
```

`loom.note` has an empty prop list — `none` would be a fine word for that,
but the format simply omits the noun. `loom.grid` has `undefined` props
because the schema is a union of shapes and its keys cannot be enumerated,
and that renders as `not declared`, which is a promise about what *the
catalogue can tell you*, not a promise about what the primitive accepts.

Sit with the difference for one exercise longer than it feels worth. A model
told `props: none` would set no props on a `loom.grid`; a model told `props:
not declared` might reasonably try — because "I do not know" is not "there
are none". The catalogue is the difference between those two answers, in one
word.

### Exercise E — one string, cached where it can be

```ts
import { describe, it } from "vitest"
import { buildUserMessage, hashPrompt } from "./interpretation/index.js"
import { sampleTree } from "./testing/fixtures.js"
import type { PrimitiveCatalogue } from "./catalogue.js"

describe("E", () => {
  it("measures the common prefix of two prompts with different utterances", async () => {
    const { tree } = sampleTree()
    const catalogue: PrimitiveCatalogue = [
      { type: "loom.note", description: "A small piece of ancillary text", props: [], slots: [] },
    ]

    const a = buildUserMessage({ origin: "chat", utterance: "add a footer note" }, tree, catalogue)
    const b = buildUserMessage({ origin: "chat", utterance: "add a header note" }, tree, catalogue)

    let i = 0
    while (i < a.length && i < b.length && a[i] === b[i]) i++
    console.log("common prefix:", i, "of", a.length, "bytes —", ((i / a.length) * 100).toFixed(1) + "%")

    console.log("hash A:", (await hashPrompt("SYSTEM", a)).slice(0, 12))
    console.log("hash B:", (await hashPrompt("SYSTEM", b)).slice(0, 12))
  })
})
```

Predict, before running: what fraction of two prompts, differing only in
utterance, is the same string? Where does the difference *start*, in terms
of the four blocks `buildUserMessage` assembles? And **rate your confidence
1–5 that the two hashes will differ**.

The output:

```
common prefix: 644 of 655 bytes — 98.3%
hash A: 78496b101a10
hash B: ecd5b060a399
```

Ninety-eight percent. Two prompts that ask for two different things share
almost their entire byte stream, because the catalogue is the same, the tree
is the same, and the difference is the twelve characters at the very end
where "footer" becomes "header". That is why the catalogue leads the message
rather than following the tree — the more stable a block, the further
forward it goes, because the further forward it goes, the more of the prompt
a cache can hold across intents.

The hashes differ, of course. Provenance records the hash of the *ask*, not
of the answer, so it establishes something about what was asked — and two
utterances asking two different things will always disagree here, whatever
the prompt cache does with the shared prefix. Those two facts do not
conflict: caching is about *what the model paid to attend to*, and hashing is
about *what the request meant*. The prompt is the same value from two angles.

### Exercise F — the projection you can write yourself

Look at `src/catalogue.ts`, at `catalogueFields`. Now imagine adding one field
to `CataloguedPrimitive`: a `since` string, which the catalogue would show
under the description as `since v1.2`. Do not implement it. Instead, answer,
in one sentence each:

1. Where would the field originate? (What does the registry know that the
   catalogue would extract?)
2. What guarantee must `catalogueFields` — or a sibling function — provide
   about that field's *value*, and where does that guarantee live?
3. If the registry has `since` and the catalogue does not, what is the
   consequence?
4. If the catalogue has `since` and the registry does not, what is the
   consequence?

The point of the exercise is not the answers. The point is that when you go
to add a field to a projection, there is always a source of truth on the
other side, and every field on the projection is either *from* it or
*derived from* it. There is no third option. That is the property the sentence
in *The idea* names, put through a real example. If you feel yourself
reaching for "I would just add it to the catalogue directly" — good, that is
where projections start decaying into second sources of truth, and noticing
the impulse is the value of doing this.

---

## It could have been otherwise

Six rejected alternatives worth knowing. The first is the mother of them all,
and the rest fall out of it.

**Send the AST as JSON Schema, unchanged.** Not available. Recursion is
disallowed, open objects are disallowed. The wire format cannot be the AST,
only a projection of it. This is not a stylistic choice — it is a constraint,
and the whole projection story is what falls out of accepting it. It is
important to notice, though, that the constraint is not "your data model has
to change"; it is "you need a second view of your data model for this
consumer".

**Ask for JSON in prose, no schema.** Rejected in 0004. It would make
malformed replies routine — every kind of "the model got the shape wrong"
would happen after generation rather than at generation, and every retry
would cost a full call rather than a token. It also gives up the strongest
tool the transport offers, in exchange for freedom on an axis nobody
wanted.

**Keep the typed prop union, drop to depth 2.** Measured (5030 bytes,
rejected) and quantified. This is the alternative that most looks like it
should work — surely if depth was the problem, less depth is the fix — and
it does not, because depth was not the problem. The tagged union at every
element position is the problem, and depth 2 with the tagged union is
already too big *and* too shallow to be worth having. A depth-2 element can
only contain text. Losing depth and props at once is not a compromise; it
is two losses.

**Drop `slot` from `insert`.** Adopted in 0014. Slot is not content an edit
adds — it is a projection region a primitive declares, and the catalogue
already tells the model which slots each primitive has. Dropping the third
insertable kind is worth roughly 300 bytes of budget at depth 4, and it also
enforces at generation what would otherwise be a rule in the prompt.

**Generate a JSON Schema per primitive and constrain the reply with all of
them at once.** Rejected in 0013, and it is the strongest rejection in the
corpus. It would make an invalid prop unrepresentable rather than merely
refused — but it requires exactly the recursive, per-primitive schema that
the grammar budget already refuses. It is on the list of things to revisit
if invalid-props diagnostics become a real problem in telemetry.

**Split into several narrower reply schemas, one per operation, and pick
first.** Not chosen; the strongest alternative if the budget tightens. It
buys a lot of headroom — each schema carries one operation — at the cost of
a classifying call, a classifier that can be wrong, and a provenance story
that has to describe two calls per proposal. It is a good move under
different conditions and a bad move under the current ones. Worth
remembering, not dismissing.

**Send the registry directly to the interpreter instead of a catalogue.**
Rejected in 0013 for a reason that sounds pedantic and is not: a registry
holds closures. Every argument for a projection between the two — testable
without React, serialisable to telemetry, hashable into a prompt — is an
argument for a value in place of a reference. This is the same argument as
"the tree cannot fit in a prompt as JSON", made once at every layer.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections
while you write. Then compare with what is there.

1. **Derive from lesson 05.** The reply schema is a pure function of a depth
   argument and nothing else — it reads nothing, has no side effects, and its
   output is a value that can be hashed. Lesson 05's argument about pure
   functions at the seams was about `applyDelta`; here it is about
   `interpretationReplyJsonSchema`. Say what the two share, and say what
   *would* stop being true about the system if this schema were computed from
   the registry or the current time. If your answer is "it would be slow" or
   "it would be flaky", you have not gone deep enough — go again.

2. **Say the shape of the argument for a projection**, in a single paragraph.
   Include: what makes something a projection rather than a copy, what makes
   it *lossy on purpose*, and how you would tell whether some new thing you
   are adding is a projection or a second source of truth. Then apply the
   shape to a projection you have not seen yet — the one the portal will need
   to hand a change to a reviewer. Say what it would extract from `TreeDelta`,
   what it would leave out, and why.

Predict, before writing (a): "the schema is pure so it can be cached" is a
consequence, not the argument. The argument is upstream. Find it.

---

## Self-check

Six questions. For each: **rate your confidence 1–5 before you write your
answer, then check.** The pair of numbers matters more than either alone.

1. What is a "compiled grammar budget", and why can it not be simulated
   offline with certainty?
2. Depth is not what consumed the budget. What was? Give the argument in
   terms of "positions times cost per position".
3. Two schemas describe the reply: one JSON Schema, one Zod. Say what each
   is for. Then say what the guard against drift is, and why generating one
   from the other was not chosen.
4. The catalogue projects `props: undefined` for a schema whose keys cannot
   be enumerated. Say what the alternative — projecting `props: []` — would
   cost, in terms of the actions a model would then take.
5. The tree outline puts ids at the start of each line, and props sorted by
   key. Give one reason for each choice. They are not the same reason.
6. Predict 1 asked you which axis your schema would have to fight the
   transport for. Which one was it, and what does "fight" mean in this
   context? Give the specific case where the fight bit.

Question 3 is the one to be least satisfied with a short answer to.

---

## Reflect

Write for two minutes, then move on.

- Which prediction were you most confidently wrong about, and what did the
  correct answer show you about the shape of the problem?
- The word "projection" appears in three lessons before this one (04 says
  ids "project" from a factory; 09 says the Gate "projects" a change into a
  refusal; 10 says the pipeline "projects" a change into a disposition), and
  it appears in three decision records (0004, 0013, and now 0014's reference
  to 0004). Say what the word carries in this codebase that "conversion"
  would not carry. If your first answer is a synonym, try again.
- You saw four projections in one file (`render.ts`). What does that tell you
  about how they are supposed to relate to each other?

---

## Come back to this

Set O in [`review-schedule.md`](review-schedule.md), two days after this
lesson. Interleaved with 01, 04, 05, 07, 10 and 11. If you skip Set O and
come back a week later, this lesson will feel much shorter than it is — the
fluency will be there and the retrieval will not. Set O is the retrieval;
the lesson was the priming.

**Where lesson 13 goes next.** Repair. A projection you have not seen: the
refused proposal, projected back into the prompt as `renderDelta`, so a
model can revise something specific rather than answer the same question
again. It is the last of Part III, and it is the second half of the argument
this lesson makes — that a projection is a view built for one consumer's
job, and the consumer here is a model that already got an answer wrong once.
