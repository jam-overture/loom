# 24 — Silence: what a system says when nobody has told it

**After this lesson you will be able to** say why the words a page shows are
knowable by exactly one party, and name the four places a consumer would look
for them and why each fails; say what a reading owes a caller about the party
that has not spoken yet, give the shape an answer needs in order to say it, and
name what goes wrong in the one direction nobody checks; say how many fields
that shape has, what decides the number, and why the smallest available fix to it
was the wrong one; explain why a declaration is trusted about what it leaves out
but never about what it leaves unsaid; say why a misspelled declaration is refused at registration rather than
read as an absence; derive why a closed vocabulary should ship with one member in
it and state the bar for a second; explain why a fact about a primitive and a fact
about a tree are kept in different places even when one consumer wants both; and
say what it costs a seam to be correct, tested, and declared by nobody — which,
for the second lesson running, is the state this one is in.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md), [08](08-two-axes.md), [09](09-the-gate.md),
[10](10-the-pipeline.md), [11](11-the-model-seam.md), [12](12-projection.md),
[13](13-refusal-and-repair.md), [14](14-rendering.md),
[15](15-primitives-and-the-registry.md), [16](16-persistence.md),
[17](17-telemetry.md), [18](18-data.md), [19](19-destinations.md),
[20](20-origins.md), [21](21-appearance.md), [22](22-reach.md),
[23](23-anchors.md).

Lesson 23 ended with a question to carry into a seventh Part V seam: **what is
the scope of the thing you just named, and is the checker allowed to see all of
it?** Every seam so far had an answer, and lesson 23's was the first honest *no*.

This lesson's seam answers it differently, and the difference is the reason it is
here. The scope is **one node**. The reader is allowed to see **all of it** —
every prop, every child, nothing withheld, nothing in another party's registry.
And it still cannot answer the question, because what is missing is not a piece of
the tree. It is the knowledge of what a piece of the tree *is*.

That is a new axis for Part V. The first six seams are about a checker that
cannot see enough. This one is about a checker that sees everything and cannot
interpret it — and about what such a checker should say, given that the correct
answer is *I don't know* and the tempting one is *nothing*.

---

## Warm-up

Closed book, five minutes, mixed across eight lessons. Write something for all
five before you look anything up.

1. The conformance probe answers three ways rather than two, and lesson 15's
   exercise on it gave a different answer the second time it was run. State what
   the third answer is, and say precisely what a host asserting that
   `notDecorated` is empty has and has not asserted. *(15)*
2. The catalogue is a projection of the registry. Say what it keeps and what it
   drops, then give the rule for deciding whether a new field on a primitive's
   definition belongs in it. *(12, 15)*
3. A tree names an anchor the runtime refuses. Say what the primitive is handed,
   what the page gets, and where the fault is recorded — then contrast that with
   a frame whose origin the registry refused. *(20, 23)*
4. `applyDelta` returns a `Result` and the renderer is total. Name the property
   of each seam that makes its choice the right one, and say what a render would
   have to do differently to deserve the other. *(05, 14)*
5. A change is measured before it is judged. Say why those are two steps rather
   than one, and name what the analysis is forbidden from knowing. *(07, 09)*

Question 1 is the one to be exact about. This lesson is that same three-valued
design arriving as a general rule rather than as one probe's quirk, and a rough
answer here will let you nod along with something you have not actually
retrieved.

---

## Predict

**In writing, before reading on.** Four questions. Question 2 is the lesson.
Question 4 is the one to rate your confidence on — it is about a one-line change
somebody could make to this repository this afternoon.

1. A reviewer is looking at a proposal that deletes a band. The queue summarises
   it: *3 pieces, no words.* The page it deletes says **3,400 · appointments ·
   last year** and two more figures like it. The summary is computed by walking
   the subtree and collecting its text nodes, and that code is correct. **Where
   are those words, if they are not in text nodes?** Then: you have the node, all
   of its props, and the whole registry. **Which of them can tell you that
   `value` is a word a reader reads and `align` is not?** List every candidate
   you can think of before reading on, and mark the one you would ship.

2. Suppose the answer is that a primitive *declares* which of its props are
   words. The seam ships today. **What should a reading report for a primitive
   that has declared nothing?** Write the rule. Then write the *shape* of the
   answer — the actual type the function returns — and be specific, because the
   whole of this lesson is in the difference between two shapes that both look
   reasonable.

   Then one more, kept separate from the rest of your answer: **your shape has
   some number of fields in it. Write down the rule you used to decide how
   many.** What would have to be true for a reading like this to need another
   one? A rule you could apply to a seam you have not seen — not a description of
   the one you have just drawn.

3. A second declaration, unrelated: *what part this primitive plays*, so a host
   can ask the registry "which of these is a heading?" rather than hard-coding a
   list of type names. It is a closed vocabulary. **How many members would you
   open it with, and which?** Write your list. Then say what the registry should
   answer when asked for a role that nothing in it declares.

4. The portal derives a page's name from the first heading in the tree, using a
   hard-coded `TITLE_TYPES = ["loom.heading"]`. The registry can now be asked
   instead, which is strictly better and is one line. **You make that change this
   afternoon, on this repository, and deploy it. What are pages called
   afterwards?** Write the answer, **rate your confidence 1–5**, and then write
   what you would have had to check to be sure.

Do not read on until all four are written. Question 2's is the one to leave
exactly as you first wrote it, whatever you think of it afterwards: if it turns
out to be the design that produces question 1's bug one level along, that is the
most useful sentence you will write today, and tidying it up later costs you the
only evidence of what you actually believed.

---

## The problem

A reviewer approved a deletion against a description of it that left out what was
being deleted.

That is the whole of it, and it was not a bug in the code that produced the
description. The portal's review queue summarises the node a proposal is about by
walking the subtree and collecting its text nodes:

```ts
const textIn = (node: LoomNode): readonly string[] =>
  Array.from(walkTree(node))
    .filter((candidate) => candidate.kind === "text")
    .map((candidate) => truncate(collapse(candidate.value)))
```

Correct. It does exactly what it says. And for a band of figures it returns
nothing at all, because **most copy in a Loom page is not in a text node.**

The reason is a rule this course has not needed until now.
[0052](../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)
settles what earns a node: **a repeated item is a node; a fixed field is a prop.**
A stat has exactly one figure and exactly one label, and changing the label is
exactly a `configure` — so `value`, `label` and `caption` are props. Three stats
in a grid are three nodes, because there are three of them. Making the label a
child would mean a stat whose label had been deleted was still a valid tree,
which is the thing the schema exists to prevent.

That rule is the library's direction rather than an accident, so the gap widens
with every primitive somebody adds. `loom.stat` keeps its figure, its label and
its caption in props. `loom.quote` keeps the quote, the author and the author's
role in props. A page can say a great deal while containing almost no text nodes.

So: ask the node what words it shows. Here is the node.

```ts
{ type: "loom.stat", props: { value: "3,400", label: "appointments", caption: "last year", align: "center" } }
```

Three of those four strings are words a reader reads. One is a layout token. They
are the same shape of JSON, and finding a party that can tell them apart is the
whole problem. There are four candidates and all four fail:

- **The props schema.** It types `value` and `align` identically — both are
  `z.string()`. A schema's question is *may this value be here*, which is a
  different question from *does a reader read it*, and no amount of care at the
  schema will turn one into the other.
- **The prop names.** `value`, `label`, `caption` read like copy; `align`,
  `stature`, `backdrop` read like configuration. That is a convention, and a
  convention is a thing that is true until somebody registers `acme.hero` with a
  prop called `strapline`. A reading built on it is wrong silently, which is the
  worst way to be wrong.
- **`description`.** One line of prose, written for a model to choose a primitive
  by (lesson 12). It is not a structure, cannot be matched on, and was never
  promised to be either.
- **Rendering the node and reading the markup back.** This one is worth taking
  seriously, because it is the answer that actually works — for a caller that has
  a DOM. The callers asking here are a queue row on a server and a preview of a
  proposal nobody has approved, and neither has a DOM or wants a render. It also
  gives back the component's own chrome — its units, its *Read more*, a label the
  tree never said — mixed into the tree's words with no way to separate them.

Which leaves exactly one party: **the author of the component.** They know
because they wrote the render. Nobody else can know, and no amount of inference
from outside will get there.

Now the turn, and it is the part that makes this a lesson rather than a feature.
Suppose we add the declaration. The day it ships, **nothing declares it.** Not one
primitive in the starter library, because the lane that owns them has not had a
chance yet. So the reading is no better than it was — and the
design question is not *how does a primitive say* at all. It is:

> **What does a reading say about a primitive that has not said?**

Answer that with *no words*, and you have rebuilt the original bug one level
further along, with a mechanism in front of it making it look answered.

---

## The idea

Two records, decided three days apart, that turn out to be the same decision made
twice.
[0122](../decisions/0122-a-primitive-says-which-of-its-props-a-reader-reads.md)
adds `copy`: the props whose values a reader reads as words.
[0114](../decisions/0114-a-primitive-declares-what-part-it-plays-and-the-registry-is-asked.md)
adds `role`: what part the primitive plays, from a closed vocabulary. Both are
facts only the author has. Both are read by nothing in the runtime. And both are
shaped, at every decision point, by the same worry: *what happens when nobody has
said*.

### The declaration goes where the knowledge is

```ts
definePrimitive({ type: "loom.stat", copy: ["value", "label", "caption"], /* … */ })
definePrimitive({ type: "acme.hero", role: "heading", /* … */ })
```

The alternative is a table the consumer keeps: the portal's
`TITLE_TYPES = ["loom.heading"]`, which is one line, correct, and in the codebase
today. It is worth being precise about what is wrong with it, because "hard-coded
is bad" is not an argument.

The array is correct for a deployment that registered `loom.heading`. It is wrong
for one that registered `acme.hero` — and *that is every real host*, because a
host that only ever uses the starter library has not built anything yet. The
deployment the array is wrong on is the deployment that matters, it is wrong
without failing, and the host has no way to notice: pages just come out called
*Untitled page*.

A declaration inverts that. The author of `acme.hero` is the one person who knows
it is a heading, and they say so once, at the place they already are.

### Empty is not silence

This is the load-bearing clause of both records, and it is one distinction:

- `copy: []` says **this primitive shows no words of its own.** It is a claim. It
  is believed.
- No `copy` at all says **nobody has said.** It is not a claim about anything.

There is deliberately **no default**, and no way to spell one. A default would
collapse the two, and the collapse is precisely the failure that produced the
queue row: a reading that returns nothing for a stat is indistinguishable from a
stat that says nothing.

Keeping them apart costs the answer its shape. `copyIn` does not return a list of
words; it returns the words **and what it could not classify**:

```ts
copyIn(node, registry)
// → { words: ["3,400", "appointments", "last year"], unread: [], unspoken: [] }
```

`unread` names the node, its type, and the string-valued props nobody has spoken
for. A consumer reading a node whose type declared nothing gets no words and a
list saying exactly why — so it *knows it is under-reporting* instead of quietly
doing it.

There is a third field in that answer and this section is not going to explain
it. It is in neither record above; it was not in the seam when this lesson was
first written; and it is in almost nobody's answer to Predict 2. Before you
scroll — **what else could a reading like this one fail at, on a node whose type
has already spoken?** Four sections down is where it came from, and where it came
from is the better half of the story.

You have met this shape before. Lesson 15's conformance probe answers three ways
rather than two, and
[0090](../decisions/0090-a-probe-that-declines-says-whether-it-got-as-far-as-calling.md)
exists because its second answer had been rounding *I could not tell* into *it is
fine*. The pairings probe does the same thing one seam along
([0113](../decisions/0113-the-pairings-probe-reports-where-it-stops-looking-rather-than-inventing-a-price.md)):
it reports where it stopped looking rather than inventing a price to measure a
contrast against. Three seams, three shapes, one rule — **a measurement that
cannot be taken is not a measurement of zero.**

### A declaration is trusted about its exclusions, and only about those

A primitive that declares `["headline"]` and also holds `backdrop` has said
`backdrop` is not copy. `unread` stays empty for it. Only *silence* is reported,
never a considered omission.

That asymmetry is not politeness. If declaring `["headline"]` still produced
complaints about `backdrop`, then declaring would be worse than not declaring —
you would get the same noise plus the work — and a seam that punishes the people
who adopt it does not get adopted.

### A wrong word is worse than a missing one

A declared copy prop whose value is not a string is **skipped, never coerced**. A
component renders `3400` as *3,400*; it owns that formatting, and the runtime
knows the number but not the separator. `String(value)` would put a figure on a
reviewer's screen that the page does not show.

The principle is worth saying in general, because it decides the next case too:
**a missing word is a gap and a wrong one is a lie**, and this seam exists
because somebody is approving a change against what it says.

Now hold that beside the rule one section up — *a declaration is trusted about
its exclusions* — and notice the two are about the same node. The next section is
what happened when they met.

### Three ways to have no word, and only one of them is a gap

Two rules, each argued for above, each right on its own.

- A declared copy prop holding something that is not a string is **skipped**,
  because the runtime knows the number and not the separator.
- `unread` carries only types that declared **nothing**, because a declaration is
  believed about what it leaves out.

Compose them on one node — a stat that has declared `value` as copy and holds the
number `3400`:

```
  value: 3400, declared
    words:  ["appointments"]
    unread: none
```

The figure is gone, and `unread: none` is not silence — it is a positive claim,
and a caller is entitled to read it as *`words` is complete*. Here it was false.
**So the one reading built to stop a missing word being invisible made this one
invisible**, on the seam whose entire return shape exists for that and nothing
else.

One precision while you are in here, because this lesson is about exactly this
kind of sentence. An empty `unread` does **not** say *every type under this node
declared*. That is how the record states it, and it is one clause too strong: a
type that has declared nothing and holds no candidate word — a divider carrying
`weight: 2`, and nothing else — comes back with an empty `unread` as well. What an
empty `unread` says is the narrower thing, which is also the thing a caller needs:
**no node under here was left holding a word this reading could not classify.**
That is the claim the case above broke, and it is the one to be able to state.

Sit with that for a moment before the fix, because it is the more useful half.
The seam had been wrong since the day it shipped. Every test it had was green —
including the one for this exact case, which asserted `words` and nothing else,
so the silence was pinned in rather than overlooked. And what found it was a
worked example: this lesson's exercise C, printing the case in front of somebody
who had just spent four sections arguing that a reading has to be able to say *I
cannot tell you*. It was filed on 13 September and closed on 18 September by
[0169](../decisions/0169-a-declaration-is-what-makes-a-value-a-missing-word.md).

**The fix is a third field**, `unspoken`: the declared copy props on a node that
hold something which is not a string, named per node, in declaration order.
Nothing is coerced — what changed is that the gap is handed back instead of
dropped. Three cases on the declared side, and only the third is one:

| the prop | the reading |
| --- | --- |
| not set | nothing — a `caption` nobody wrote is not a word this reading lost |
| a blank or whitespace-only string | nothing — the page shows nothing there, so the reading and the page agree |
| set, and not a string | **`unspoken`** — a word is owed and cannot be given |

### Why a third field rather than a third meaning

The one-line version of that fix is to put the prop name in `unread`. No new
type, no new field, the node gets named, and every caller already handling
`unread` picks it up for nothing. It was rejected, and the reason is the most
portable thing in this section.

`unread` means **nobody has told me whether these are words.** The new case means
**somebody told me these are words, and what is in them is not one.** Those are
not two flavours of one thing — and the test for that is not how similar they
sound, it is what a caller *does*:

- The remedy for `unread` is a declaration, and it is **per type**. The portal
  groups that list by type for exactly this reason: *declare `copy` on
  `loom.stat`* is one action that fixes every stat on every page.
- The remedy for the new case is a formatted string, or a note on the card, and
  it is **per node**. There is nothing to declare. The declaration already exists
  and is already correct.

Two lists that are grouped differently and acted on differently are two lists.
Folding them would make one field mean two things — which is this seam's own
complaint about defaults, one level up — and it would quietly change what an
empty `unread` asserts to a caller that ships today. So:

> **A reading needs one field per distinct thing it can fail at — and "distinct"
> is decided by whether the caller would do something different about it, not by
> whether the two failures feel alike.**

That is the rule Predict 2 asked you for. Check yours against it rather than
against the field count, because the two commonest answers — *one field per
failure* and *one field with a reason on each entry* — are each wrong in a way
the other one is not.

### The same value, on the other side, is not a missing word

One asymmetry survived the fix, and it looks like the identical hole from the
other direction until you ask who has been told what.

`UnreadCopy.props` names only a node's **non-blank string-valued** props — the
blank rule is the same on both sides, and only the non-string rule differs. So a
`loom.divider` holding `weight: 2`, from a type that has declared nothing,
reports nothing about `weight` — a number sitting where a word could go, which is
precisely the case we have just given a field to. Widening it would be symmetric.
It was considered and rejected: where nothing has been declared, a non-string
value is not a candidate word at all, and every layout primitive in the library
would arrive on a reviewer's screen as words a change might be taking away.

The difference is not in the value, and it is worth working out rather than
taking, because the short version of it is wrong. The short version says *on the
undeclared side the node is already named in `unread`, so the caller knows not to
trust `words` for it* — which is true of a divider holding `weight: 2` **and** a
non-blank string, and false of one holding `weight: 2` and nothing else. That node
is in no list at all.

It does not need to be. Take the two cases apart:

- **An undeclared node with at least one candidate word.** It is named in
  `unread`, the caller is told not to trust `words` for it, and `weight` is
  covered by that whether or not it is listed.
- **An undeclared node with no candidate word at all** — only numbers, only
  blanks. It is in no list, and `words` really is complete for it: a value nobody
  has claimed is a word is a setting, and a setting is not missing from a sentence
  about the page.

In neither case is the caller told something false. On the declared side it was:
a word was owed, `words` did not have it, and no list said so. That is the
record's title, and it is the sentence to keep:

> **A declaration is what makes a non-string value a missing word.** Absent one,
> it is a setting.

### A misspelling is refused rather than read as silence

```ts
definePrimitive({ type: "acme.hero", role: "title" })  // refused at registration
```

TypeScript stops that at the declaration site. A host writing JavaScript has only
the registry — and an unknown string accepted there would read, to every consumer,
as *a primitive that declares no role*. Silence, arrived at by typo.

So `unknown-role` refuses it, beside `undeclared-copy-prop` (a `copy` naming a
prop the schema does not have), `undeclared-frame-prop` and `unknown-behaviour`.
The general rule, which is the most portable thing in this lesson:

> **Any channel with a "nobody said" value has to make it impossible to reach
> that value by accident.** Otherwise the silence means two things, and the second
> one is a mistake wearing the first one's clothes.

### A role is not a position

"The page's title" is the **first** heading in reading order, and that is two
facts, not one:

- **Which types are headings** — a fact about primitives. The author knows it. It
  goes in the registry.
- **Which heading leads** — a fact about a tree. Only a tree knows it. It stays
  with whoever holds the tree.

Keeping them apart is what lets one declaration serve a page name, an outline and
a table of contents, instead of only the first of them. A `typesWithRole` that
returned "the leading heading" would have answered one consumer and shut the door
on the other two.

### The vocabulary has one member

`PrimitiveRole` is `"heading"`. That is the whole list, and it is not an oversight
to be corrected on the next pass.

A page root, a body text and a byline were all considered and left out, and the
reason each was left out is the same: each came from *what the portal happens to
register*, rather than from a consumer that could not answer its question. **A
vocabulary invented ahead of its readers is wrong in a way nobody can measure** —
nothing fails, the members simply mean slightly different things to each host
that reads them, and there is no test for that.

The bar for a second member is the bar this one cleared: a consumer that cannot
answer its question from the registry, written down as a finding. One string plus
a sentence.

One collision to know about before you go looking, because it will cost you a
minute otherwise. `loom.quote` declares a **prop** called `role` — the author's
job title, "Head of Design, Acme" — and `loom.code` declares a **behaviour**
called `copy`, the button that puts a snippet on your clipboard. Neither has
anything to do with the two declarations in this lesson, which sit *beside*
`props` on a definition rather than inside it. Both words were spoken for before
either seam existed, and a search for either one in `src/primitives/` finds the
other meaning first.

### Nothing in the runtime reads either of them

No render changes. No validation changes. No Gate judgement changes. Both
declarations are facts carried from the author who knows to the consumer who
needs, and nowhere in between — the same shape as `submits` (lesson 19), which is
read only by an audit.

That is a clean design and it has a cost this lesson is going to make you look
at: **when nothing reads a declaration, nothing fails while nobody writes one.**
A seam like this cannot go red. It can only go unused, quietly, for as long as
everyone is busy — which is exactly what lesson 23 found at the other end of the
render seam, and what exercise F finds here.

---

## In the code

| What | Where |
| --- | --- |
| `copyIn`, `NodeCopy`, `UnreadCopy`, `UnspokenCopy`, `CopyDeclarations` | `src/sdk/copy.ts` |
| The three cases on the declared side | `readDeclared` in `src/sdk/copy.ts`, and one test each in `src/sdk/copy.test.ts` |
| `copy` and `role` on a definition | `src/sdk/definition.ts` |
| `copyFor`, `typesWithRole`, `undeclared-copy-prop`, `unknown-role` | `src/sdk/registry.ts` |
| The vocabulary, and the sentence a host shows an author | `src/role.ts` |
| The reading that only sees text children | `textOf` in `src/tree/navigation.ts` |
| The queue row this is all about | `textIn` in `apps/loom/app/(portal)/_lib/proposal-effect.ts` |
| The records | [0122](../decisions/0122-a-primitive-says-which-of-its-props-a-reader-reads.md), [0114](../decisions/0114-a-primitive-declares-what-part-it-plays-and-the-registry-is-asked.md), [0169](../decisions/0169-a-declaration-is-what-makes-a-value-a-missing-word.md) |
| Why the copy is in props at all | [0052](../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md) |

Read `copyIn` before the exercises, and read `readDeclared` underneath it.
Between them there are **three** branches worth stopping on, and everything this
lesson is about is which one a case falls into: `declared === undefined` pushes to
`unread`; a declared prop holding a string pushes to `words`; a declared prop
holding anything else pushes to `unspoken`. There is a fourth case that pushes
nowhere — a declared prop that is not set at all — and working out why that one is
not a gap is the quickest way to check you have the distinction rather than the
field names.

One line to notice while you are there. `CopyDeclarations` is a two-line
structural type — one method, `copyFor` — rather than the registry itself. A
caller with a table and no registry satisfies it, and so does a test with an
arrow function. The seam asks for the narrowest thing it could possibly need,
which is why exercise A can put three different answers in front of the same
node without building three registries.

---

## Try it

Seven exercises. **Predict every output in writing, then run.** Exercise C is
where the three cases get tested against the implementation — including one page
that reaches two of them at once, by two different routes, with two different
remedies — and exercise G is Predict 4 executed; commit to your answer before you
run it.

Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

The shared preamble for all seven. Two primitives with identical schemas, one of
which has said which of its props are words.

One line in it to read rather than skim: `report` prints **all three fields of
the reading, always, including when they are empty.** A helper that printed the
words and left the gaps off the bottom would be committing this lesson's own
failure inside this lesson's own fixture — and you would never catch it, because
what it hides is exactly the thing that prints nothing.

```ts
import { createElement } from "react"
import { describe, it } from "vitest"
import { z } from "zod"

import { sequentialIdFactory } from "./ids.js"
import type { JsonObject } from "./json.js"
import { createStarterPrimitiveRegistry } from "./primitives/index.js"
import { compositionById, metricsBand } from "./primitives/compositions/index.js"
import type { LoomPrimitiveProps } from "./render/primitive.js"
import { PRIMITIVE_ROLES, describePrimitiveRole, type PrimitiveRole } from "./role.js"
import { copyIn, type CopyDeclarations, type NodeCopy } from "./sdk/copy.js"
import { definePrimitive, type PrimitiveEntry } from "./sdk/definition.js"
import { createPrimitiveRegistry, describeRegistryError } from "./sdk/registry.js"
import { buildElement, buildText } from "./tree/builders.js"
import { textOf } from "./tree/navigation.js"
import type { LoomNode } from "./tree/node.js"

/** A stat that has said which of its props a reader reads, and one that has not. */
const statProps = z
  .object({
    value: z.string(),
    label: z.string(),
    caption: z.string().optional(),
    align: z.string().optional(),
  })
  .strict()

type StatProps = z.infer<typeof statProps>

const render = ({ props: given }: LoomPrimitiveProps<StatProps>) =>
  createElement("div", null, given.value, given.label)

const speaking = definePrimitive({
  type: "demo.stat",
  description: "A figure and what it counts.",
  props: statProps,
  copy: ["value", "label", "caption"],
  component: render,
})

const silent = definePrimitive({
  type: "demo.quiet-stat",
  description: "The same figure, from a primitive that has not said.",
  props: statProps,
  component: render,
})

const registryOf = (entries: readonly PrimitiveEntry[]) => {
  const built = createPrimitiveRegistry(entries)
  if (!built.ok) throw new Error(JSON.stringify(built.error))

  return built.value
}

const starter = (() => {
  const built = createStarterPrimitiveRegistry()
  if (!built.ok) throw new Error(JSON.stringify(built.error))

  return built.value
})()

/** Where a node and its props go, for either of the two lists that name them. */
const listed = (entries: readonly { nodeId: string; type: string; props: readonly string[] }[]): string =>
  entries.length === 0
    ? "none"
    : entries.map((one) => `${one.nodeId} (${one.type}) ${JSON.stringify(one.props)}`).join(" | ")

/** A reading, printed as the words it found and both of the gaps it is admitting to. */
const report = (label: string, reading: NodeCopy) => {
  console.log(`  ${label}`)
  console.log(`    words:    ${JSON.stringify(reading.words)}`)
  console.log(`    unread:   ${listed(reading.unread)}`)
  console.log(`    unspoken: ${listed(reading.unspoken)}`)
}

/** One stat node, with whatever props the exercise gives it. */
const stat = (type: string, props: JsonObject): LoomNode => {
  const ids = sequentialIdFactory()

  return buildElement(ids, { type, props })
}
```

### Exercise A — one node, three declarations

The same node read three ways. Predict `words` and `unread` for each, and be
exact about the third: it is the one whose answer looks like a failure and is
not.

```ts
describe("A", () => {
  it("reads one node against three different declarations", () => {
    const node = stat("demo.stat", {
      value: "3,400",
      label: "appointments",
      caption: "last year",
      align: "center",
    })

    const nobodySaid: CopyDeclarations = { copyFor: () => undefined }
    const said: CopyDeclarations = { copyFor: () => ["value", "label", "caption"] }
    const noWordsOfItsOwn: CopyDeclarations = { copyFor: () => [] }

    report("nobody has said", copyIn(node, nobodySaid))
    report("copy: value, label, caption", copyIn(node, said))
    report("copy: []", copyIn(node, noWordsOfItsOwn))
  })
})
```

The output:

```
  nobody has said
    words:    []
    unread:   n_1 (demo.stat) ["value","label","caption","align"]
    unspoken: none
  copy: value, label, caption
    words:    ["3,400","appointments","last year"]
    unread:   none
    unspoken: none
  copy: []
    words:    []
    unread:   none
    unspoken: none
```

The first and third readings have the same `words` and mean opposite things,
which is the entire lesson in twelve lines of output. A consumer looking only at
`words` cannot tell them apart; a consumer that also reads `unread` can.

`unspoken` is `none` three times, and that is the right answer three times: every
prop here holds a string, so there is nothing anybody was told to read and could
not. A field that says nothing in the exercise introducing the seam is a field
doing its job — exercise C is where it speaks.

Two details in the first reading are decisions rather than accidents.

**`align` is in the list.** `unread` reports *every non-blank string-valued prop*
on a node whose type said nothing, not a guess at which ones are probably copy. Guessing
which of the four are words is the thing nobody outside the component can do —
that is what the whole seam is for — so the report does not start doing it at the
last moment. It names what it could not classify, and `align` is genuinely one of
those.

**The declarations are three arrow functions.** No registry was built. `copyFor`
is the whole of the interface a reading needs, which is why the same function
works for a registry, a table, and a test.

### Exercise B — the queue row, then and now

Three figures under an arrangement, read against a registry where the stat has
declared and one where it has not. Predict `textOf` first — it is the reading the
portal has today — and then both `copyIn` results. The grid itself declares
`copy: []`; predict what that does to `unread`.

```ts
const arrangement = definePrimitive({
  type: "demo.grid",
  description: "Three figures in a row, and no words of its own.",
  props: z.object({ columns: z.string() }).strict(),
  copy: [],
  component: ({ children }: LoomPrimitiveProps<{ columns: string }>) => createElement("div", null, children),
})

const FIGURES = [
  { value: "3,400", label: "appointments" },
  { value: "96%", label: "seen on time" },
  { value: "11", label: "clinicians" },
] as const

/** The same three figures, under a primitive that has said and one that has not. */
const gridOf = (type: string): LoomNode => {
  const ids = sequentialIdFactory()

  return buildElement(ids, {
    type: "demo.grid",
    props: { columns: "three" },
    children: FIGURES.map((figure) => buildElement(ids, { type, props: { ...figure } })),
  })
}

describe("B", () => {
  it("is the reading the queue had, beside the one it has now", () => {
    const registry = registryOf([speaking, silent, arrangement])
    const said = gridOf("demo.stat")
    const quiet = gridOf("demo.quiet-stat")

    console.log(`  textOf, either grid: ${JSON.stringify(textOf(said))} ${JSON.stringify(textOf(quiet))}`)
    console.log(`  pieces, either grid: ${said.children.length}`)
    report("three stats that declared", copyIn(said, registry))
    report("three stats that have not", copyIn(quiet, registry))
  })
})
```

The output:

```
  textOf, either grid: "" ""
  pieces, either grid: 3
  three stats that declared
    words:    ["3,400","appointments","96%","seen on time","11","clinicians"]
    unread:   none
    unspoken: none
  three stats that have not
    words:    []
    unread:   n_1 (demo.quiet-stat) ["value","label"] | n_2 (demo.quiet-stat) ["value","label"] | n_3 (demo.quiet-stat) ["value","label"]
    unspoken: none
```

`""` and `3` are the queue row from the top of this lesson, reproduced in two
lines: **3 pieces, no words**, about a band that says six things. Nothing is
broken in `textOf`. It walked the text children and there were none.

The grid is the detail to sit with. It carries `columns: "three"`, a
string-valued prop — and it is **absent from `unread` in both readings**, because
it declared `copy: []` and was believed. An arrangement that says *I show no
words of my own* is telling the truth and gets to stop being asked. That is the
sentence `copy: []` exists to let a primitive say, and it is why the failing
reading's `unread` has exactly three entries rather than four: the three that
were silent.

### Exercise C — a value that is not a string

Four readings. The first three put a *number* where a word goes — once on a type
that declared, once on a type that has not — and then a caption that is three
spaces. The fourth puts a declared node that cannot say its figure over a child
whose type has said nothing at all.

Predict all three fields for all four. The principle from The idea says a missing
word is a gap and a wrong one is a lie, so predict what the seam does with a value
it cannot read — and **be specific about which list it says so in, and about which
node that list names.** For the fourth reading, predict the two node ids as well.

```ts
describe("C", () => {
  it("hands back a declared prop whose value it will not turn into a word", () => {
    const declared = registryOf([speaking])

    report(
      "value: 3400, declared",
      copyIn(stat("demo.stat", { value: 3400, label: "appointments" } as unknown as JsonObject), declared)
    )
    report(
      "value: 3400, nobody said",
      copyIn(stat("demo.quiet-stat", { value: 3400, label: "appointments" } as unknown as JsonObject), declared)
    )
    report(
      "caption: \"   \", declared",
      copyIn(stat("demo.stat", { value: "3,400", label: "appointments", caption: "   " }), declared)
    )

    const ids = sequentialIdFactory()
    const both = buildElement(ids, {
      type: "demo.stat",
      props: { value: 3400, label: "appointments" } as unknown as JsonObject,
      children: [buildElement(ids, { type: "demo.quiet-stat", props: { value: "96%", label: "seen on time" } })],
    })

    report("one declared figure it cannot say, over one type nobody spoke for", copyIn(both, declared))
  })
})
```

The output:

```
  value: 3400, declared
    words:    ["appointments"]
    unread:   none
    unspoken: n_1 (demo.stat) ["value"]
```

```
  value: 3400, nobody said
    words:    []
    unread:   n_1 (demo.quiet-stat) ["label"]
    unspoken: none
  caption: "   ", declared
    words:    ["3,400","appointments"]
    unread:   none
    unspoken: none
  one declared figure it cannot say, over one type nobody spoke for
    words:    ["appointments"]
    unread:   n_1 (demo.quiet-stat) ["value","label"]
    unspoken: n_2 (demo.stat) ["value"]
```

The figure is gone from `words`, and it is **not** gone from the reading.

Work through the first one, because every step is something this lesson has
defended. `value` is declared, so the node does not go in `unread` — that list is
for types which said *nothing*, and this one spoke. The declared value is not a
string, so it is not coerced — coercing would print `3400` where the page shows
*3,400*, which is the lie. Both of those rules are exactly what they always were.
The third line is what changed on 18 September: the prop is named, on its node, in
a list that exists to carry it. A caller that reads all three fields now knows a
word is owed and missing, which is the promise the shape was built to make and
did not keep for this case.

The second reading shows it is the **declaration** doing the work rather than the
number. With nobody having said, `unread` names `["label"]` and not `value` — that
list carries non-blank string-valued props only — and `unspoken` is empty,
because nothing was told to read anything. Same node, same number, and the reading reports it or
does not depending entirely on whether somebody declared. That is the record's
title, printed.

The third reading is the machinery declining to invent a gap. `"   "` is not a
word, does not become one, and is not reported as a word that went missing —
because the page really does show nothing there, so the reading and the page
agree. It is the case people most often get wrong in the other direction after
learning about `unspoken`.

The fourth is the one to check your predictions against hardest, and it has three
things in it.

**Both lists are populated, and they name different nodes.** `n_2` is the parent:
declared, and holding one prop it was told to read and cannot. `n_1` is the child:
a type nobody has spoken for. Three words are missing from that page's reading, by
two different routes, and the two routes have different remedies — *declare `copy`
on `demo.quiet-stat`* fixes one of them and does nothing at all for the other.
That is the argument from The idea arriving as output rather than as prose.

**`words` has one entry.** The parent's `label` is in it. The child's `"96%"` and
`"seen on time"` are real words on a real page, and they are not in `words` and
never were, because the child's type has not declared and `copyIn` will not guess.
Look at how little of that page's copy `words` actually holds — and then at how
completely the other two fields account for the rest. A caller that reads one
field sees a page with one word on it and no reason to doubt that.

**The child is `n_1` and the parent is `n_2`.** Children are built before the
parent that takes them, so the ancestor is minted last. Lesson 23's exercise C and
exercise F below say the same thing; if it still surprises you, write it in
Reflect rather than nodding at it.

How reachable is any of this? `loom.stat`'s schema requires strings, so a
validated tree cannot hold that node. But the callers this seam was built for are
reading **a proposal nobody has approved** and a queue row about one — which is
exactly where props have not been through a schema yet, and exactly the argument
lesson 23's `resolveAnchor` makes when it answers `42` and `null` with readings
instead of throwing.

Last, what this exercise used to say, because it is worth more than what it says
now. Until 18 September the third line of the first reading read `unread: none`
and the paragraph under it ended *this is filed rather than fixed* — a lessons
change that also changes behaviour is a lessons change nobody can review, so the
gap was written up and handed to the lane that owns the seam. That cost five days
and bought a record which rejected the one-line version of the fix on exactly the
grounds this lesson spends four sections building.

**Writing the worked example is what found it.** Nothing else was going to:
`copy.test.ts` had a test for this precise case, and it asserted `words` and
nothing else, so the silence was pinned in rather than overlooked. A green suite
and a printed transcript disagreed, and the transcript was right.

### Exercise D — the order words come back in

A node with copy props of its own, a text child, and a child node with copy props.
Predict the order of all five words before running.

```ts
describe("D", () => {
  it("reads a node's own words before its children's", () => {
    const ids = sequentialIdFactory()
    const card = buildElement(ids, {
      type: "demo.stat",
      props: { value: "Our clinic", label: "since 1998" },
      children: [
        buildText(ids, "Open six days a week"),
        buildElement(ids, { type: "demo.stat", props: { value: "3,400", label: "appointments" } }),
      ],
    })

    report("a node with props, a text child and a child node", copyIn(card, registryOf([speaking])))
  })
})
```

The output:

```
  a node with props, a text child and a child node
    words:    ["Our clinic","since 1998","Open six days a week","3,400","appointments"]
    unread:   none
    unspoken: none
```

Reading order, with one rule that is not obvious and is stated in the source: **an
element's own declared copy comes before its children's**. A stat's label is above
the things under it; a card's title is above its body. The alternative — props
after children, or props sorted by name — would produce a sentence no reader of
the page would recognise, and the callers here are composing sentences for
reviewers.

Note also that declared props come back **in the order the declaration names
them**, not in the order the node's JSON happens to carry them. The declaration is
the author saying how their component reads.

### Exercise E — two declarations that will not register

A primitive whose `copy` names a prop its schema does not have, and one whose role
is a spelling the runtime has never heard of. Predict whether each registers, and
what the registry says.

```ts
describe("E", () => {
  it("refuses a declaration that drifted and a role it does not know", () => {
    const drifted = definePrimitive({
      type: "demo.drifted",
      description: "Declares copy the schema does not have.",
      props: z.object({ heading: z.string() }).strict(),
      copy: ["headline"],
      component: ({ props: given }: LoomPrimitiveProps<{ heading: string }>) =>
        createElement("h2", null, given.heading),
    })

    const misspelled = definePrimitive({
      type: "demo.misspelled",
      description: "Declares a role the runtime has never heard of.",
      props: z.object({ heading: z.string() }).strict(),
      role: "title" as PrimitiveRole,
      component: ({ props: given }: LoomPrimitiveProps<{ heading: string }>) =>
        createElement("h2", null, given.heading),
    })

    for (const entry of [drifted, misspelled]) {
      const built = createPrimitiveRegistry([entry])
      console.log(`  ${entry.type}`)
      console.log(`    ${built.ok ? "registered" : describeRegistryError(built.error)}`)
    }

    console.log(`  the vocabulary: ${JSON.stringify(PRIMITIVE_ROLES)}`)
    console.log(`  "heading" is: ${describePrimitiveRole("heading")}`)
  })
})
```

The output:

```
  demo.drifted
    "demo.drifted" says a reader reads "headline", which its props schema does not declare; a preview built on that declaration would report a word the page never shows, and go on reporting it after the prop was renamed
  demo.misspelled
    "demo.misspelled" declares the role "title", which the runtime has none of; the vocabulary is closed and its members are "heading" — and a misspelling accepted here would read to every consumer as a primitive that declares no role at all
  the vocabulary: ["heading"]
  "heading" is: names the section it heads — the text a reader takes as the title of what follows
```

Both refusals carry their own argument, which is worth more than the refusal.

`as PrimitiveRole` in the second definition is a cast, and it is there on purpose:
TypeScript refuses `role: "title"` outright, so a lesson that wanted to show the
registry's check had to go around the type to reach it. **That cast is standing in
for a host writing JavaScript**, which is the only way this arrives in a real
deployment — and is exactly why the runtime check exists even though the type
already prevents it.

The last line is a small thing with a clear purpose: the vocabulary ships with a
sentence per member, written *for the author choosing a declaration* rather than
for the consumer reading one. The question at the declaration site is "is my
component this?", and it has to be answerable without reading the runtime.

### Exercise F — the same questions, asked of the library

A whole library — the first line will say how big — against two seams that each
shipped with nothing declaring anything: `copy`, three days old when this lesson
was written, and `role`, six. Predict the two counts as fractions of that first
number, **for today rather than for the day this was written**, and the difference
between those two predictions is worth writing down on its own. Then predict what
`copyIn` says about a band taken straight out of the starter catalogue, and what it
says about the one starting composition in that catalogue with something *unspoken*
in it.

```ts
describe("F", () => {
  it("asks the starter library the same questions", () => {
    const declaring = starter.primitives.filter((one) => one.copy !== undefined)
    const withRole = starter.primitives.filter((one) => one.role !== undefined)

    console.log(`  primitives registered:     ${starter.primitives.length}`)
    console.log(`  declaring copy:            ${declaring.length}`)
    console.log(`  declaring any role:        ${withRole.length}`)
    console.log(`  typesWithRole("heading"):  ${JSON.stringify(starter.typesWithRole("heading"))}`)
    console.log(`  copyFor("loom.stat"):      ${JSON.stringify(starter.copyFor("loom.stat"))}`)
    console.log(`  declaring copy as []:      ${starter.primitives.filter((one) => one.copy?.length === 0).length}`)

    const band = metricsBand.build(sequentialIdFactory())

    console.log(`  textOf(metrics band):      ${JSON.stringify(textOf(band))}`)
    report("copyIn(metrics band, starter registry)", copyIn(band, starter))

    const faces = compositionById("proof-faces")?.build(sequentialIdFactory())

    if (faces !== undefined) report("copyIn(proof-faces, starter registry)", copyIn(faces, starter))
  })
})
```

The output:

<!-- moves: every line of this fence is a second copy of a fact about
     src/primitives/, which is Loom primitives'. A primitive added, a copy or role
     declaration made or withdrawn, or a change to the proof-faces or metrics-band
     composition moves it, and the right response is to re-run F and paste in what
     it prints now. Then say so on the pull request, because the paragraphs under
     it are prose about these lines and no check reads prose: on 4 October the
     declaration pass moved seven of them, the numbers were corrected from outside
     this lane exactly as the convention asks, and three paragraphs were left
     saying "Zero and zero" under a transcript saying 102. -->

```
  primitives registered:     103
  declaring copy:            103
  declaring any role:        1
  typesWithRole("heading"):  ["loom.heading"]
  copyFor("loom.stat"):      ["value","label","caption"]
  declaring copy as []:      59
  textOf(metrics band):      ""
  copyIn(metrics band, starter registry)
    words:    ["12k+","Teams shipping weekly","99.98%","Uptime last quarter","4 min","Median time to first board","40+","Tools it reads and writes"]
    unread:   none
    unspoken: none
  copyIn(proof-faces, starter registry)
    words:    ["Ada Okonkwo","Rui Tavares","Martine Lefèvre","Jonas Kirk","Priya Raman","Tom Hedlund","on G2, from 214 reviews","Two thousand teams have shipped a change through Loom this month."]
    unread:   none
    unspoken: n_8 (loom.rating) ["score"]
```

**Both of those counts were zero when this lesson was written, and the day they
stopped being zero is the better half of what the exercise now teaches.** Then,
`loom.heading` was registered without declaring that it was a heading and
`loom.stat` held three words in props without having said which. Now every
primitive in the library has answered for `copy` — and the figure worth your
attention is not that one, it is the line below it. More than half of those
declarations are `copy: []`, a primitive saying **I show no words of my own**, and
that is the half that pays for the rest: a reading cannot tell an arrangement that
holds no words from one that forgot to declare, so one undeclared `loom.stack` puts
a whole page's reading in doubt. Declaring the absence is what makes the presence
worth anything.

`role` has not moved the same way, and the transcript says how far it has. The two
seams were filed three days apart on the same argument, and only one of them has
had its pass — because 0114's bar for widening that vocabulary is a consumer that
cannot answer its question, and nobody has brought one. One seam was waiting on a
library and the other is waiting on a reason, which are different kinds of empty.

The readings under them are the whole argument for the shape, printed by the system
they are an argument about — and they now print it from the opposite direction. On
the day the seam landed, `words` was empty, `unread` named every node and every prop
involved, and the reading was *exactly as ignorant as it had been before any of this
existed and was saying so.* That difference was the only thing the seam had bought.
Today `words` is the eight words the band shows and `unread` is `none`.

**Those are the same return shape, unchanged, and that is the thing to take from
it.** The fields were designed for a library that had told them nothing, and on the
day the library spoke, nothing about them had to move: the honest gap became the
answer, in place. A shape that is only right once the data arrives is a shape
somebody has to replace on the day it arrives — and that somebody is whoever
happens to be doing the pass, under a deadline, in a lane that does not own the
seam.

`unspoken` is empty **for this band**, and it is no longer empty for every tree
there is, which is why there is a second reading. `proof-faces` comes out of the
same catalogue, and its `loom.rating` declares `score` as copy while its component
prints that number itself. So the reading hands over the sentence beside the rating
— *on G2, from 214 reviews* — and declines the rating: *there is a figure here and I
am not going to guess the formatting of it*, one node, one prop, named. That is the
third field doing the only job it was added for, and it took sixteen days from
[0169](../decisions/0169-a-declaration-is-what-makes-a-value-a-missing-word.md)
adding it to anything in this repository being able to produce it. Which is worth
sitting with: it was argued for, had its cheaper one-line form rejected, and was
built, tested and shipped for a day that had not arrived.

Two smaller things in that transcript are worth a second look.

`textOf` is `""` for a band the catalogue ships as one of nine starting
compositions. This is not a contrived fixture — it is `metricsBand`, built by
`metricsBand.build`, exactly as a surface offering a starting composition would
build it.

And the node ids run `n_6, n_5, n_1 … n_4`: the section has the **highest** id and
comes first. Lesson 23's exercise C for the third time — children are built before
the parent that takes them, so the ancestor is minted last and read first. If that
still surprises you, it is worth writing down in Reflect rather than nodding at.

### Exercise G — the one-line improvement that makes it worse

Predict 4, executed. A host registers its own heading primitive and declares the
role. The page name is derived three ways: from the hard-coded array the portal
has today, from the registry against that host, and from the registry against the
starter library.

```ts
describe("G", () => {
  it("derives a page name from a hard-coded array and from the registry", () => {
    const hostHeading = definePrimitive({
      type: "acme.hero",
      description: "A host's own opening band, which is where its page's title lives.",
      props: z.object({ headline: z.string() }).strict(),
      role: "heading",
      copy: ["headline"],
      component: ({ props: given }: LoomPrimitiveProps<{ headline: string }>) =>
        createElement("h1", null, given.headline),
    })

    const hosts = registryOf([speaking, hostHeading])

    const ids = sequentialIdFactory()
    const page = buildElement(ids, {
      type: "demo.grid",
      props: {},
      children: [
        buildElement(ids, { type: "acme.hero", props: { headline: "Bright Lane Clinic" } }),
        buildElement(ids, { type: "demo.stat", props: { value: "3,400", label: "appointments" } }),
      ],
    })

    const nameFrom = (types: readonly string[]): string => {
      const leading = page.children.find((child) => child.kind === "element" && types.includes(child.type))

      return leading === undefined ? "Untitled page" : copyIn(leading, hosts).words.join(" ")
    }

    const TITLE_TYPES: readonly string[] = ["loom.heading"]

    console.log(`  hard-coded ${JSON.stringify(TITLE_TYPES)}: ${JSON.stringify(nameFrom(TITLE_TYPES))}`)
    console.log(
      `  typesWithRole("heading") ${JSON.stringify(hosts.typesWithRole("heading"))}: ${JSON.stringify(
        nameFrom(hosts.typesWithRole("heading"))
      )}`
    )
    console.log(
      `  the same, against the starter library ${JSON.stringify(starter.typesWithRole("heading"))}: ${JSON.stringify(
        nameFrom(starter.typesWithRole("heading"))
      )}`
    )
  })
})
```

The output:

```
  hard-coded ["loom.heading"]: "Untitled page"
  typesWithRole("heading") ["acme.hero"]: "Bright Lane Clinic"
  the same, against the starter library ["loom.heading"]: "Untitled page"
```

Line one is the failure 0114 was filed about: a host that registered its own
heading gets *Untitled page*, silently, for ever.

Line two is the seam working, and notice that it took **two declarations to
produce one sentence** — `role: "heading"` to find the node, `copy: ["headline"]`
to get words out of it. The two records were filed by different lanes three days
apart and compose without either having planned for the other, because both put
the fact where the author is.

Line three is the answer to Predict 4, and what it means has changed since this
lesson was written — which is the most useful thing that could have happened to it.
When this was written the starter library's answer was the **empty array**, so
making the improvement then — swapping a correct hard-coded array for a correct
registry question — would have named every page in this repository *Untitled page*.
The declaration has since landed, in exactly the order the finding behind 0114
insisted on: the declaration first, the question second, or neither. The array holds
`loom.heading` now and the swap is finally the improvement it always looked like.

**The line still prints *Untitled page*, and the reason underneath it has moved.**
This page's heading is `acme.hero`, a type the starter library has never heard of,
so asking the starter library about somebody else's page gets a correct answer to
the wrong question. That is line one's failure in line two's clothes: **a registry
question is only as good as the registry you ask it of**, and the hard-coded array
was never wrong about `loom.heading` either. If your prediction for this line was
*Untitled page*, check your reason against that one before you count it right.

**The general form is worth more than the instance.** Replacing a local guess with
an authoritative source is not an improvement on its own. It is an improvement
*once the authority has been told*, and in between it is a regression — with the
particular nastiness that the guess was right and the authority is merely empty.
This instance is now out the other side of that *in between*, which is the only way
a rule like that ever gets confirmed rather than merely believed.

---

## It could have been otherwise

Eight from the records, and one that is not in any record.

**Rendering the node and reading the markup back.** The finding that started it
raised this itself — *it may well be that rendering is the answer* — and
[0121](../decisions/0121-part-of-a-tree-is-rendered-by-the-seam-and-the-seam-mounts-the-theme.md)
had just made it possible. Rejected on three counts: it needs a DOM, a render pass
and a string parse to recover something the tree already holds; it cannot run
where the callers ask from, which is a server and an unapproved proposal; and it
returns the component's own chrome mixed into the tree's words with no way to tell
them apart.

**Inferring copy from the schema** — every `z.string()` that is not an enum, a URL
or a token. Right for `loom.stat`, wrong for `loom.hero`'s `backdrop`, which is a
path, and wrong for every `id`, `href` and `name` in the library. And wrong
*silently*, which is the thing already on the shelf.

**A map keyed by purpose** — `{ heading: "value", detail: "label" }` — so a
consumer could ask for the leading word rather than all of them. A better answer
to a question nobody has asked. Both filings wanted *the words, in order*, and a
list can grow into a map later without a consumer changing what it asks.

**Widening `textOf` to take a registry.** Fewer concepts, one function instead of
two. Rejected because it would make a pure tree function depend on a deployment's
registry: `tree/` knows nothing about `sdk/`, and the direction of that arrow is
worth more than the saved export.

**Naming the unreadable prop in `unread`.** The smallest possible fix to the gap
exercise C used to print, and the one this lesson's own finding named and rejected
in the same breath. Rejected because it makes one field mean *nobody has said* and
*said, and I could not read it* — a field that means two things being what this
seam exists to complain about — and because it silently changes what an empty
`unread` asserts to a caller that ships today. `(portal)` is one such caller.

**Giving `UnreadCopy` a reason, so one list carries both.** More faithful to the
idea that both are *the reading fell short here*, and it is one list to iterate
rather than two to remember. Rejected on the grouping a caller actually does:
`unread` is grouped by **type**, because a declaration is what answers it, and the
other case is per **node** and answered by a formatted string. Two lists grouped
differently and acted on differently are two lists — and this is the rejection to
be able to reproduce, because it is the one whose reasoning transfers.

**A free-form `role: string`.** Every consumer would match on a string again, one
level further from the type, and two hosts would spell the same part `heading` and
`title`. The whole value of the declaration is that a consumer and an author agree
without meeting.

**A boolean per part — `isHeading`, `isByline`.** That is one more field on every
definition there is, per question anybody ever asks. `submits` is a boolean
because a primitive either posts or does not and there is no second question of
that shape; this is the opposite, a family whose members arrive one filed consumer
at a time. One optional field carrying a closed vocabulary grows by a string.

**Defaulting `copy` to every string prop, and reporting the guess.** Not in any
record, and the one a reasonable engineer reaches for after reading exercise F: if
nothing declares, guess, and put the guess in the answer so nobody is misled. It
is tempting because it makes the seam useful on day one instead of on the day the
library lane gets to it.

It is wrong for a reason worth keeping. A guess in the `words` list is a word a
reviewer reads in a sentence about a change they are approving, and a flag beside
it does not travel — the sentence gets rendered, quoted, pasted into a message,
read aloud. **The failure mode of an honest gap is a reviewer who asks. The
failure mode of a flagged guess is a reviewer who reads the guess.** And the guess
would be wrong in the direction of *more* text rather than less, so `align: "center"`
and `tone: "surface"` would appear as words on a clinic's deletion notice.

---

## Explain it back

Three things to write in your own words. Do not look at the earlier sections
while you write. Then compare.

1. **Explain to a colleague who has just proposed "if a primitive hasn't declared
   `copy`, treat it as having no copy" why that is the original bug.** They push
   back reasonably: *the answer is the same either way — an empty list — so what
   is actually different?* Answer them properly. Then go one further and say what
   it would take for their version to be safe, and why that condition is one no
   library can ever meet.

2. **Derive both of this lesson's declarations from lesson 15 and lesson 12
   together, without looking at either.** Lesson 15 gave you a primitive that
   declares what it promises and a registry that checks each half of it. Lesson 12
   gave you the catalogue as a projection — what the model is shown and what is
   kept from it. Show how those two produce `copy` and `role` *and* the decision
   that neither of them appears in the catalogue. Then name the one property both
   declarations have that nothing in lesson 15 predicts, and say what it costs.

3. **A colleague proposes the smallest possible fix** for the figure that used to
   vanish: put the prop name in `unread`. One field, no new type, the node gets
   named, every existing caller picks it up for free. Argue them out of it
   **without using the word `unspoken`** — say what a caller *does* about each of
   the two lists and why those are different actions, and say what an empty
   `unread` stops being able to promise on the day their version lands. Then say
   what it would take for their answer to be the right one, because there is a
   version of this seam where it is.

Predict, before writing (2): the property neither lesson predicts is not that the
declarations are optional. If that is your answer, you have found the part that is
most visible rather than the part that is new.

---

## Self-check

Eight questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. Name the four places a consumer could look for "which of this node's props are
   words", and give the reason each one fails. For the one that would actually
   work, say precisely which callers it fails for and why.
2. State the difference between `copy: []` and no `copy`, then give the shape of
   the answer that keeps them apart. Name every field of that shape and say which
   distinction each one exists for. Say what a consumer that reads only `words`
   is unable to tell, and name the seam elsewhere in this course that makes the
   same bargain for a different measurement.
3. A primitive declares `copy: ["headline"]` and also holds `backdrop`. Say what
   `unread` reports about `backdrop` and why, then state the general rule about
   what a declaration is trusted for — and the consequence for adoption if the
   rule went the other way.
4. A declared copy prop holds the number `3400`. Say what each of the three
   fields holds, and why both of the two rules producing that outcome are
   individually correct — then say what the composition of two correct rules did
   for the whole of this seam's first three weeks, and what kept it invisible to a
   green test suite. Name the caller that can reach it at all.
5. Why is an unknown `role` refused at registration rather than ignored? Give the
   failure it prevents in one sentence, and name two other refusals in the
   registry that exist for the same shape of reason.
6. "The page's title" is two facts rather than one. Name both, say which of them
   belongs in the registry and which belongs to whoever holds the tree, and give
   the consumer this separation serves that a combined answer would have shut out.
7. Nothing in the runtime reads `copy` or `role`. Say what that buys, then say what
   it costs — and use what this library had declared on the day each seam shipped
   against what it has declared since to explain why this particular kind of seam
   cannot fail loudly, and what a course, a review or a test would have to do
   instead to notice it. One of the two seams is the evidence and the other is the
   control; say which way round.
8. A `loom.divider` that has declared nothing holds `weight: 2`; a `demo.stat`
   that has declared `value` holds `value: 3400`. One of those numbers is
   reported and one is not. Say which, say why that is not one hole seen from two
   directions, and give the one-sentence rule that decides it — then say what a
   caller has in hand, in each case, telling it not to trust `words`.

Question 4 is this lesson's question. Question 2 is where a half-answer reads as
a full one: if yours does not name the *shape of the return value*, field by
field, you have described the distinction without saying how anybody gets to use
it — and if it names two fields, you have given the answer this lesson itself had
until its own exercise corrected it.

---

## Reflect

Write for two minutes, then move on.

- Predict 1 asked you to list the candidates and mark the one you would ship. If
  you marked "render it and read the markup", you picked the one that works and
  is unavailable — write down what in the question would have told you the caller
  had no DOM, and whether you would have thought to ask.
- Predict 2 is the lesson. If your answer had one list in it, write the sentence
  that would have made you add the second — not the rule, the *habit*. Something
  like: *when a function can fail to know, its answer has to be able to say so.*
- Predict 2's last part asked for the rule you used to decide **how many fields**.
  Get it out and hold it against the one in *Why a third field rather than a third
  meaning*. Most rules written here are about the failures — one field per thing
  that can go wrong, or one field with a reason attached to each entry. The rule
  that holds is about the *caller*: two failures are one field when whoever reads
  the answer would do the same thing about both. Write down which of the three you
  had. Then find a result type in your own code with a `reason` string on it, and
  decide honestly whether its reasons are acted on differently or merely logged
  differently.
- Predict 3: how many members did you give the vocabulary? Almost everybody gives
  it three or four, because they are easy to think of and all plausible. Write
  down what would have to happen for a member you invented to turn out wrong,
  given that nothing fails when it does.
- Predict 4 and your confidence. Being confident and wrong here is the interesting
  outcome, because the wrong answer is the *reasonable* one: a strictly better
  source of truth really is strictly better, once it has been told anything. Write
  down where else you have made a change that was correct in the abstract and a
  regression on the day.
- Last, take the shape out of Loom. Find a field in a system you work on that can
  be *absent*, *empty*, or *set* — a null column, a missing config key, an empty
  array from an API — and say which of the three your code currently conflates.
  Then say how you would find out whether it matters, given that nothing fails
  either way.

---

## Come back to this

Set AC in [`review-schedule.md`](review-schedule.md), two days after this lesson.
Interleaved with 04, 05, 12, 14, 15, 19, 22 and 23 — heavy on 15, because this
lesson is that lesson's registry answering a new kind of question, and heavy on 23
because the two findings are the same finding twice: a seam that is correct,
tested, and declared by nobody.

**What changed on 18 September, if you worked through this lesson before then.**
Do not reread it. Three things are new and they are the same thing three times:
*Three ways to have no word* and the two sections under it, exercise C (four
readings now, and a different transcript — predict it fresh), and a ninth
question in Set AC, which asks the new idea cold. The seam this lesson teaches gained a third field,
`unspoken`, because exercise C printed a case where two correct rules composed
into the exact silence the lesson spends four sections arguing against. The
lesson found it; [0169](../decisions/0169-a-declaration-is-what-makes-a-value-a-missing-word.md)
closed it; and the closing is a better subject than the seam was.

Part V now has seven lessons, and the shapes have stopped agreeing in a useful
way. The first four are a name in the tree and a document in a registry, resolved
before the walk. Lesson 22 had no document — a predicate over a pair. Lesson 23
had no registry either, and a scope larger than the system. This one has no
missing data at all: the reader can see the whole node and cannot interpret it,
and what a host registers is not a fact the tree lacks but a *reading* of one it
already has.

So the question to carry into an eighth seam is neither lesson 22's nor lesson
23's. It is this: **when your system cannot answer, what does it return — and who
would notice if it started returning that when it could?**

This lesson has since answered the second half of its own question, and the answer
is worth carrying too. Nobody noticed. The seam returned *there are none* where it
meant *I cannot tell you* from the day it shipped, every test was green, the one
test for the exact case asserted the one field that looked right — and what caught
it was writing the example out and reading what it printed. A shape that can say
*I don't know* is not the same thing as a shape that *does*, and the difference
between them is invisible to everything except a case that reaches it and somebody
looking at the output.
