# 31 — Behaviour: the thing a page does, which no tree can name

**After this lesson you will be able to** say why a copy button on a code panel
cannot be a prop, and make that a sentence about the thesis of this whole system
rather than about JSON; name the three shapes the answer could have taken and
give the concrete page each of the two rejected ones breaks; state what a
control is handed, who names it, and what part of it is left for the primitive;
give the four things a registry can check about a behaviour and say why all four
happen at *registration* rather than on a page; explain why the control that
hands back a boolean writes it in one place and the control that hands back a
number writes it in another, in a form that mentions inheritance and not CSS
trivia; say what it means that two controls of one primitive agree through the
**DOM** rather than through the seam that built them; and — the part this
lesson found by running rather than by reading — say what a static render of a
page with a copy button on it actually contains, and what follows for every
check in this course.

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
[29](29-readership.md), [30](30-rendezvous.md).

Every seam in Part V so far has been about a **fact**. A fact in a scope the
checker may not see; a fact it can see and cannot interpret; a fact it is asked a
narrower question about than the one in your head; a fact two stores hold and
neither may read the other's; a fact one level down behind a promise the system
made about itself; a fact that exists exactly once and so has nothing to be
compared to; a fact written for six readers and audited against one; a fact two
parties spell and nobody holds a copy of.

This one is not a fact. A code panel with a copy button on it is not missing a
piece of information — it is missing a **verb**. And a tree of JSON has no verbs
in it, in the specific sense that there is no value you could put in a node's
props that would make the panel copy, no value the Gate could refuse for being
the wrong one, and no declaration anywhere that a checker could hold against
anything, because nothing has been said.

So the interesting question is not *how do we express it*. It is what you do
when the thing that is missing cannot be added to the medium at all — and the
answer Loom gives is the opposite of the last four lessons' answers. It does not
reach further, derive a second copy, or ask an author to write something down.
It **closes a set**.

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Write something for all
five before you look anything up.

1. There is no `if` in the AST and no expression anywhere in a node. Give the
   reason, and make it a sentence about what a reviewer of a change has to be
   able to do. *(02)*
2. The renderer is a **total, pure** projection. Those are two properties, not
   one. Say what each buys, separately, and name something the system could still
   do if it had only one of them. *(14)*
3. A model may not write a colour. State the rule and then state the reason,
   and check that your reason does not mention colour. *(21)*
4. A `loom.card` holding a `loom.action` is fine; a *linked* `loom.card` holding
   one is not. Say what a primitive is allowed to declare about itself here, what
   it is not, and who derives the rest. *(22)*
5. A container cannot read the six numbers in its own children. Name the machine
   the work was handed to instead, and one ordinary chart feature that machine's
   data model forbids. *(27)*

Question 4 is the one this lesson leans on hardest and question 2 is the one it
ends on. If question 5's answer came out as "the browser", push it one step: the
useful half is *which* faculty of the browser, and what its data model can carry.

---

## Predict

**In writing, before reading on.** Four questions. Question 2 is the one to rate
your confidence on. Question 4 is the one that decides whether the second half
of this lesson tells you anything.

1. A code panel needs a copy button — the `npx create-next-app` line under a
   hero, with a small **Copy** beside it. Every reference site a developer reads
   has one.

   You have: a tree of JSON, a registry of primitives a human approved, a Gate
   that weighs proposed changes, and React. Write down **three** designs that
   would deliver the button. Then pick one, and for each of the other two write
   the specific page on which it goes wrong. Not "it's less clean" — a page, and
   what a visitor sees on it.

2. A primitive is registered. It declares the copy behaviour, it declares both
   of the strings the control needs, the registry accepted it, and its component
   places the control in its markup. You render its page with
   `renderToStaticMarkup`. Nothing is wrong, nothing is missing, no diagnostic
   fires.

   Write down the markup you expect where the button is. **Rate your confidence
   1–5.**

3. One control stamps a boolean and the primitive's stylesheet reads it:

   ```css
   [data-loom-disclosed="false"] ~ .my-links { display: none }
   ```

   A second control hands back a **number** instead — a percentage the primitive
   puts into a `clip-path`. Write down where that control should publish the
   number, and then write the one line of CSS the primitive would use to read it.

   If your answer to the first half is "the same place as the boolean", you have
   the mistake this lesson is built around, and writing the CSS line is what will
   show you.

4. A deployment has told its Gate policy which primitive types exist and has
   wired nothing else. A model proposes a `configure` on an existing
   `loom.code`, setting `copyable: true`.

   Two separate answers, and keep them separate: **(a)** what does the Gate do
   with the change? **(b)** what does the page do afterwards?

Do not read on until all four are written. Question 1's three designs are all
reasonable and two of them ship in real systems; question 4(a) is where most
readers put the thing that sounds safe.

---

## The problem

### A copy button is four lines, and there is nowhere to put them

`Loom primitives` filed this on 21 August. `loom.code` renders a snippet on a
tinted surface, and it cannot offer a copy control. The reason is not that it is
hard. The whole of it is one handler calling `navigator.clipboard.writeText` and
a label that changes for two seconds.

The reason is that there is nowhere for it to come from.

A primitive receives its props as a bag of JSON
([0009](../decisions/0009-primitives-receive-props-in-a-bag.md)), and a function
is not expressible in JSON. That sentence looks like a fact about a serialisation
format and it is not. Go back to lesson 01: the reason a Loom page is data is
that a change to it has to be something a human can **read, weigh, refuse and
undo**. A prop is a value; a value can be diffed, printed in a proposal, put in a
log, and inverted. A handler cannot be any of those things. So "props are JSON"
is the thesis, in its smallest possible form — and the copy button is the first
thing anybody has wanted that the thesis forbids.

The closest thing already in the primitive contract is `interactive`, from lesson
22, and it is worth being precise about why it is not this. `interactive`
*describes* a target so the Gate can refuse a button inside an anchor. Describing
a target does not create one. A `loom.code` that declared itself interactive
would still render exactly what it renders now, and the Gate would refuse
perfectly good pages on the strength of a button that does not exist.

### Three shapes, and the two that break a page you can name

Predict 1 asked you for three. These are the three that were weighed.

**A prop.** `copyable: true`, or a `behaviour: "copy"` string in the node. It is
the obvious one and it is expressible — JSON holds booleans and strings, the
Gate can weigh it, the analysis can diff it. It fails on
[0055](../decisions/0055-motion-is-a-static-stylesheet-the-primitive-emits.md)'s
argument, which was made about motion and applies here word for word: **a prop
is a thing a model writes and the Gate weighs as a small reversible change.**
Adding a caption is a small reversible change. *This button now puts something
different on your clipboard* is not, and there is no stakes model that can tell
the two apart from the shape of the delta, because the shape of the delta is
identical — one string, on one node, set by one `configure`.

Put concretely, the page it breaks is any page where a proposal that reads
*"tidy up the install block"* also changes what a control does, and the change is
weighed as a prop edit because it is one.

**A script the host installs.** The library ships the markup and a
`loom-behaviours.js` the deployment is told to link. This is how a great many
component libraries actually work. It fails on the other half of 0055's
argument: a primitive that works only where somebody remembered to link something
fails **silently, in somebody else's deployment**, with nothing in the render to
say why. The page it breaks is the one where the button renders, looks exactly
right, and does nothing, on a site whose author never read the installation note.

**A client boundary opened by each primitive.** `loom.code` writes `"use client"`
at the top of its own module and implements its own button. This is the one that
is hardest to argue against, because it works. A run proved it works before the
record was written: TypeScript emits the prologue at line 1 of the compiled
module, and a Next build resolves the boundary through the registry.

It is rejected for the reason that runs through this entire course. **A library
where any component may open a boundary has no list of what its pages can do.**
The primitives a page may name is a list. The URL schemes a link may use is a
list ([0053](../decisions/0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md)).
The operations a delta may contain is a list of four. If the things a page may
*do* are whatever ninety-nine component authors each decided, then there is
nothing to read, nothing to check against, and no answer to *what can a Loom page
do* other than "go and look".

---

## The idea

### A control the runtime builds, and a primitive places

[0086](../decisions/0086-a-behaviour-is-a-control-the-runtime-builds-and-a-primitive-places.md)
settles it in one sentence: **a behaviour is a control this package implements, a
primitive declares by name, and the renderer hands over already built.**

```ts
definePrimitive({
  type: "loom.code",
  behaviours: ["copy"],
  text: { copy: "Copy", copied: "Copied" },
  interactive: "always",
  component: ({ loom, children }) =>
    createElement(
      "figure",
      null,
      loom.behaviours.copy,
      createElement("pre", null, children)
    ),
})
```

`src/primitives/` **declares and never implements.** Nothing in the library of
ninety-nine primitives opens a client boundary of its own; the whole library
contains no `"use client"`. What arrives in `loom.behaviours.copy` is a
`ReactNode` — not a component — and that is deliberate rather than convenient.
There is nothing left for the primitive to configure, because the strings came
from its own declarations and the content came from the tree. A component here
would be a component with no props anybody could get right or wrong. **Placing it
is the whole of the primitive's part, and where it goes is the whole of its
discretion.**

Three consequences follow, and each of them is the answer to a question the
rejected shapes could not answer.

**What a control acts on comes from the tree.** `copy` is handed `textOf(node)`,
read off the same tree the page was projected from — not off the DOM. That is
right before the browser has laid anything out, needs no ref into markup the
primitive owns, and copies what the page *says* rather than whatever text
happened to render beside it. A primitive that renders a language label next to
its snippet would otherwise put `bash` on somebody's clipboard.

**The control's strings are the primitive's declared text.** `copy` requires the
keys `copy` and `copied`, resolved through the ordinary text seam
([0063](../decisions/0063-a-declared-string-travels-with-the-primitive.md)), so a
German deployment translates the button with the dictionary it already has and
no new machinery.

**A model is never shown any of this.** Behaviours are not in the catalogue. A
proposal cannot author one, and a vocabulary a model cannot use is prompt you pay
for and cannot spend. Exercise A asks the catalogue what it says about
`loom.code` and the answer is five prop names, no slots, and no mention of a
behaviour at all.

### The set is closed, and the closure is the design

The behaviour vocabulary has five members. They live in one file, one entry each,
and **adding one is a change to this package** — a name, an implementation, its
strings, and a line in a decision record.

That friction is not a cost the design is paying reluctantly. It is the feature.
It is what keeps the set of things a Loom page may *do* a list somebody can read,
in the same way the primitives it may name and the schemes a URL may use are
lists. A reviewer who wants to know what a Loom deployment's pages can do reads
five entries, not ninety-nine modules.

And it is what makes Predict 4 come out the way it does. Nothing in a tree names
a behaviour. There is no prop to gate, nothing for the analysis to weigh, and no
way to phrase a proposal that makes something copy. **The Gate is not what stops
a model adding a behaviour. The medium is** — and exercise C is that sentence
executed, including the part where the Gate cheerfully accepts `copyable: true`
at low stakes and the page goes on doing exactly nothing.

### Four checks at registration, and one by probe

A behaviour is declared by a name in a list, which is the weakest kind of
statement a system can accept. So the registry checks four things, and the
interesting part is that all four are checkable **without calling the
component**:

| check | what it catches |
| --- | --- |
| the name is in the vocabulary | `behaviours: ["fold"]` — a behaviour nobody implemented |
| the strings its control needs are strings this primitive declares | a control with no accessible name |
| a primitive taking a control declares itself `interactive` | lesson 22's fault: a button inside an anchor, one of which a browser silently drops |
| a behaviour that needs another is declared with it | a dismiss control asking a region nothing opens to close |

The fifth is not a check but a **probe**: a declared behaviour the component
never places is reported as `unplacedBehaviours`, exactly as a declared slot
nobody rendered is reported as `unplacedSlots`. That is lesson 29's instrument,
and it is on the other side of the line from the four above — you cannot know
whether a component placed something without running it.

Why the split matters is the sentence to keep. The first four are the registry's
because registration is the last moment at which anything about a behaviour is
visible at all. Read the next section before deciding whether that sounds like an
overstatement.

### The second axis: what a control hands back

`copy` was the only member for three days. Two more followed and between them
they set a pattern nobody had stated —
[0096](../decisions/0096-a-behaviour-publishes-a-value-on-the-element-the-primitive-placed-it-in.md)
is where it gets stated: **each control reaches the layout it affects by the
smallest means that reaches it.**

- `copy` reaches **nothing**. What it acts on is in the tree, so it is handed a
  string and the page is never consulted.
- `disclose` reaches **sideways**. What it acts on is a region of the render,
  which is not in the tree and is the primitive's to lay out, so the control
  stamps `data-loom-disclosed` on its own button and leaves the meaning to the
  primitive's stylesheet — an ordinary sibling or `:has()` selector, in whatever
  media query the primitive wants.
- `adjust` reaches **downwards**, and this is Predict 3.

`loom.before-after` draws two images with a divider between them. Dragging that
divider is a pointer handler, which is a function, which props are not — that
much is 0086. What is new is what the handler produces: a **number**, which the
primitive spends in a `clip-path`.

A number cannot be an attribute. There is no portable way to read an attribute's
value into a length — `attr()` outside `content` is not something a library may
rely on today, and the quantised alternative is a hundred CSS rules to say what
one `calc()` says. So the value is published as a **custom property**, read with
`var()`.

And that one choice decides the answer to *where*. `var()` resolves by
**inheritance**, and inheritance runs downwards only. A property the control set
on its own element would be readable by nothing at all — least of all the sibling
region the control exists to drive. So `adjust` writes `--loom-adjust` on **the
element the primitive placed it in**: its parent, chosen rather than discovered,
and the first time the runtime writes to an element it did not create.

```css
.after { clip-path: inset(0 calc(100% - var(--loom-adjust, 50) * 1%) 0 0) }
```

If your Predict 3 said "on its own element", the CSS line is what would have
caught you: there is no selector you can write from that element to its sibling
that *inherits* anything, because inheritance is not a selector.

**The second argument to `var()` is not decoration.** The property is absent
until the control has mounted and absent again the moment it unmounts, so the
fallback is what a page served with scripting off renders — and it should be the
position the primitive's own props declared. The still comparison is what ships;
the drag is what arrives if it can.

### The third axis: a control answerable to another control

Four of the five members are complete on their own. `present` and `dismiss` are
the first **pair**, and
[0176](../decisions/0176-a-control-may-be-answerable-to-another-control-and-they-agree-through-the-dom.md)
is about why a pair is a different shape.

A disclosure is closed by the button that opened it. An overlay is not: a dialog
is closed by a cross inside the panel, by Escape, and by a press on the page
behind it. The first of those is a **second control**, and a click handler is a
function whichever button it is on.

So two controls of one primitive have to agree about one boolean — and nothing in
the seam lets them. A behaviour is built as an independent node the primitive
places where it likes, so the two have no common React ancestor to hold state, no
provider between them, and no way to be handed a shared object: `build` runs on
the server and a control's props cross the client boundary, so anything passed
between them has to be serialisable.

What they *do* share is the **DOM**, because the primitive placed both of them in
it. `dismiss` dispatches a bubbling event from its own button; `present` listens
on the element it was placed in. If the primitive laid the region out inside that
element — which is what presenting a region means — the event arrives. If it did
not, nothing happens.

This is lesson 30's shape, one floor down, with the opposite verdict. Lesson 30
had two parties spelling a name with nobody holding a copy, and the remedy was to
make somebody hold one. Here the remedy is to **accept the rendezvous and bound
where it can happen**. A module-level store keyed by node id was the alternative,
and it is worse in exactly the way that matters: it would make two controls that
are not in each other's subtree agree anyway, which reads as a feature and is
really a guarantee that the first primitive to place them apart gets a dialog
closed by a button somewhere else on the page.

The DOM is not a shortcut here. It is the only channel that needs no common
ancestor named in advance, no key to agree on, and nothing to clean up — and it
fails by *not reaching*, which is the direction you want a failure to go.

`dismiss` is also the reason the fourth registration check exists. Declared
without `present`, it renders a button that dispatches an event nothing listens
for, on a region nothing opens. That is a **dead** control rather than a wrong
one, so it is refused at registration rather than reported by the audit — the
same judgement the seam already makes about a control with no accessible name.

---

## In the code

| What | Where |
| --- | --- |
| The vocabulary, and one entry per member | `src/render/behaviour.ts` |
| `BEHAVIOUR_NAMES`, the closed list | `src/render/behaviour.ts` |
| `resolveBehaviours` — builds the controls for one node | `src/render/behaviour.ts` |
| The five controls, each behind `"use client"` | `src/render/behaviour-copy.ts`, `-disclose.ts`, `-adjust.ts`, `-present.ts` |
| `DISCLOSED_ATTRIBUTE`, in a module with nothing else in it | `src/render/disclosed.ts` |
| `PRESENTED_ATTRIBUTE` and `DISMISS_EVENT`, likewise | `src/render/presented.ts` |
| The class a primitive aims a rule at, and the property that wins | `src/render/control.ts` |
| The four checks | `registeredBehaviours` in `src/sdk/registry.ts` |
| The probe that reports an unplaced control | `probePlacement` in `src/sdk/conformance.ts` |
| Where a declaration is written | `behaviours` in `src/sdk/definition.ts` |

One declaration is worth printing whole, because the three axes above are its
last three fields:

```ts
type Behaviour = {
  readonly description: string
  readonly text: readonly string[]
  readonly rendersControl: boolean
  readonly requires?: BehaviourName
  readonly build: (
    content: string,
    text: PrimitiveText<string>,
    name: string | undefined
  ) => ReactNode
}
```

`text` is the strings the primitive must declare. `rendersControl` is whether
this puts a target on the page, which is what drives the `interactive` check —
and it is a field rather than a constant because the first behaviour that renders
nothing is a question of *when*, not *if*. `requires` is the pair. `build` is the
whole of the implementation seam, and its three arguments are the three things a
control may be given: the node's own text, the primitive's resolved strings, and
the word this node named its control with — `undefined` wherever the primitive
named no prop for it, which is almost everywhere. There is no fourth argument,
and the absence is the design — a control cannot be handed the node's props, the
tree, or the page. The third one is a *string the runtime resolved*, read off the
one prop the primitive declared as its control's name, and keeping it a string is
what keeps that true.

---

## Try it

Seven exercises. **Predict every output in writing, then run.** Exercise D is
Predict 2 executed and is the one to commit to hardest. Exercise C is Predict 4,
and both halves of it are surprising for different reasons.

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

import { sequentialIdFactory } from "./ids.js"
import { createStarterPrimitiveRegistry } from "./primitives/index.js"
import { ANCHOR_PROP_KEY, DATA_PROP_KEY, SUBMIT_PROP_KEY, THEME_PROP_KEY } from "./reserved-props.js"
import {
  BEHAVIOURS,
  BEHAVIOUR_NAMES,
  CONTROL_CLASS,
  describeRenderDiagnostic,
  renderLoomTree,
  resolveBehaviours,
  type LoomPrimitiveProps,
} from "./render/index.js"
import { assessChange } from "./runtime/assessment.js"
import { gate } from "./runtime/gate.js"
import { defaultGatePolicy } from "./runtime/policy.js"
import type { ProposedChange } from "./runtime/proposal.js"
import { definePrimitive } from "./sdk/definition.js"
import { catalogueOf, interactiveTypesFor, propsVocabularyFor, registeredTypesFor } from "./sdk/index.js"
import { createPrimitiveRegistry, describeRegistryError } from "./sdk/registry.js"
import { buildElement, buildText } from "./tree/builders.js"
import type { TreeDelta } from "./tree/delta.js"
import { createTree } from "./tree/tree.js"

const registry = (() => {
  const built = createStarterPrimitiveRegistry()
  if (!built.ok) throw new Error(describeRegistryError(built.error))

  return built.value
})()

const spare = sequentialIdFactory("x")

/** The four keys a tree may carry that are the runtime's rather than a primitive's. */
const RESERVED = [THEME_PROP_KEY, DATA_PROP_KEY, SUBMIT_PROP_KEY, ANCHOR_PROP_KEY]

/** A primitive that places whatever controls it declared, above its own content. */
const takes = (
  type: string,
  behaviours: readonly string[],
  text: Readonly<Record<string, string>>,
  interactive: "always" | undefined
) =>
  definePrimitive({
    type,
    description: "A slab that places the controls it was given.",
    props: z.object({}).strict(),
    text: text as never,
    behaviours: behaviours as never,
    interactive,
    component: ({ loom, children }: LoomPrimitiveProps<Record<string, never>, string, never>) =>
      createElement(
        "div",
        { ...loom.editable },
        ...BEHAVIOUR_NAMES.map((name) => (loom.behaviours as Record<string, unknown>)[name] ?? null),
        children
      ),
  })

/** The page's own words, with the markup taken off. */
const words = (markup: string): string =>
  markup
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
```

`takes` places **every** member of the vocabulary, not just the one it declared.
That is not laziness — it is the type bargain from lesson 15 being deliberately
stepped around with a cast so that one helper can serve seven exercises. In real
code `loom.behaviours` is typed to the union of names the primitive declared, so
reading one it did not ask for does not compile.

### Exercise A — the vocabulary, and everything a tree could say about it

```ts
describe("A", () => {
  it("prints the vocabulary, and asks what a tree could say about it", () => {
    console.log(`  behaviours in the vocabulary: ${BEHAVIOUR_NAMES.length}`)
    for (const name of BEHAVIOUR_NAMES) {
      const behaviour = BEHAVIOURS[name]
      console.log(
        `    ${name.padEnd(9)} text ${JSON.stringify(behaviour.text).padEnd(20)} renders a control ${
          behaviour.rendersControl
        }  needs ${behaviour.requires ?? "nothing"}`
      )
    }
    console.log(`  reserved keys a tree may carry: ${JSON.stringify(RESERVED)}`)
    console.log(`  one of them naming a behaviour: ${RESERVED.some((key) => /behaviour/i.test(key))}`)

    const code = catalogueOf(registry).find((entry) => entry.type === "loom.code")
    console.log(`  what a model is told loom.code has`)
    console.log(`    props: ${JSON.stringify(code?.props.map((prop) => prop.name))}`)
    console.log(`    slots: ${JSON.stringify(code?.slots)}`)
    console.log(`    a behaviours field: ${Object.hasOwn(code ?? {}, "behaviours")}`)
  })
})
```

```
  behaviours in the vocabulary: 5
    copy      text ["copy","copied"]    renders a control true  needs nothing
    disclose  text ["disclose"]         renders a control true  needs nothing
    adjust    text ["adjust"]           renders a control true  needs nothing
    present   text ["present"]          renders a control true  needs nothing
    dismiss   text ["dismiss"]          renders a control true  needs present
  reserved keys a tree may carry: ["loom:theme","loom:data","loom:submit","loom:anchor"]
  one of them naming a behaviour: false
  what a model is told loom.code has
    props: ["caption","density","language","tone","wrap"]
    slots: []
    a behaviours field: false
```

The last three lines are the ones to sit with. `loom.code` is the primitive that
has a copy button. What a model is told about it is five prop names and no slots.
The behaviour is not withheld from the model as a precaution — there is simply no
field in a catalogue entry where it could go, because there is no proposal a
model could write that would use it.

The reserved keys are the other half of the same point. Four things in a tree
belong to the runtime rather than to a primitive — a theme, a data binding, a
submission, an anchor — and every one of them is a **fact**: a palette, a
question, an address, a name. None of them is a verb.

### Exercise B — five primitives, four of which the registry refuses

```ts
describe("B", () => {
  it("asks the registry to accept five primitives that each take a control", () => {
    const attempts = [
      ["a behaviour the runtime does not have", takes("x.a", ["fold"], { fold: "Fold" }, "always")],
      ["copy, with only one of its two strings", takes("x.b", ["copy"], { copy: "Copy" }, "always")],
      ["copy, both strings, no interactive", takes("x.c", ["copy"], { copy: "Copy", copied: "Copied" }, undefined)],
      ["dismiss on its own", takes("x.d", ["dismiss"], { dismiss: "Close" }, "always")],
      ["copy, both strings, interactive", takes("x.e", ["copy"], { copy: "Copy", copied: "Copied" }, "always")],
    ] as const

    for (const [label, entry] of attempts) {
      const built = createPrimitiveRegistry([entry])
      console.log(`  ${label}`)
      console.log(`    ${built.ok ? "registered" : `${built.error.code} — ${describeRegistryError(built.error)}`}`)
    }
  })
})
```

```
  a behaviour the runtime does not have
    unknown-behaviour — "x.a" takes a behaviour called "fold" and the runtime has none; a behaviour is implemented here, not registered, so the vocabulary is the list in `render/behaviour.ts`
  copy, with only one of its two strings
    unnamed-behaviour — "x.b" takes the "copy" behaviour and declares no "copied" text; a control whose name a deployment cannot translate is the failure the text seam exists to prevent
  copy, both strings, no interactive
    undeclared-interactive-behaviour — "x.c" takes the "copy" behaviour, which renders a target, and declares no `interactive`; the Gate would then allow one inside an anchor, where a browser silently drops one of the two
  dismiss on its own
    unpaired-behaviour — "x.d" takes the "dismiss" behaviour and not "present", which it does nothing without; it would render a control that asks a region nothing opens to close
  copy, both strings, interactive
    registered
```

Four refusals, and the first one's message is the one to read twice: *a behaviour
is implemented here, not registered.* Everything else a primitive declares is a
claim about itself that the registry records. A behaviour name is a **reference**
into a list the primitive did not write and cannot extend — lesson 30's
vocabulary, and the reason this half of the seam is loud.

The third refusal is lesson 22 arriving from an unexpected direction. `x.c` has
no `href` and no link anywhere in it; what makes it a target is a control it did
not write, cannot see, and receives already built. So `interactive` — a
primitive's declaration about *itself* — turns out to be partly a declaration
about something the runtime hands it, and the registry is what holds the two
together.

### Exercise C — the write path, asked to make a code panel copy

Predict 4. Three `configure` operations on a `loom.code` that is already on the
page, each run twice: once on a deployment that has told the Gate which
primitives exist, and once on one that has also wired the props floor from
[0179](../decisions/0179-what-a-primitive-accepts-is-a-vocabulary-the-write-path-is-handed-not-a-field-on-a-policy.md).

```ts
describe("C", () => {
  it("asks the write path to make an existing code panel copy", () => {
    const ids = sequentialIdFactory("c")
    const panel = buildElement(ids, {
      type: "loom.code",
      props: { language: "bash" },
      children: [buildText(ids, "pnpm add loom")],
    })
    const base = createTree(buildElement(ids, { type: "loom.page", children: [panel] }), ids)
    const policy = { ...defaultGatePolicy, registeredPrimitiveTypes: registeredTypesFor(registry) }

    const configure = (set: Record<string, unknown>): TreeDelta => ({
      deltaId: spare.deltaId(),
      treeId: base.treeId,
      baseRevision: 0,
      operations: [{ op: "configure", nodeId: panel.id, set: set as never, unset: [] }],
    })

    const proposalOf = (delta: TreeDelta): ProposedChange => ({
      proposalId: spare.proposalId(),
      intentId: spare.intentId(),
      delta,
      rationale: "let people copy the install line",
      provenance: {
        origin: "developer",
        interpreter: "scratch",
        authoredBy: "model",
        confidence: 0.98,
        interpretedAt: "2026-09-29T00:00:00.000Z",
      },
    })

    const changes = [
      ["copyable: true", configure({ copyable: true })],
      ["behaviours: [copy]", configure({ behaviours: ["copy"] })],
      ["caption: Install", configure({ caption: "Install" })],
    ] as const

    for (const [wiring, checkProps] of [
      ["the registered types wired, and nothing checking props", undefined],
      ["and propsVocabularyFor(registry) wired as well", propsVocabularyFor(registry)],
    ] as const) {
      console.log(`  ${wiring}`)
      for (const [label, delta] of changes) {
        const assessed = checkProps
          ? assessChange(base, proposalOf(delta), policy, spare.deltaId(), checkProps)
          : assessChange(base, proposalOf(delta), policy, spare.deltaId())
        if (!assessed.ok) throw new Error("loom: the delta would not apply")

        const { analysis, stakes } = assessed.value
        console.log(
          `    ${label.padEnd(18)} invalid props: ${analysis.invalidProps.length}  stakes: ${stakes.level.padEnd(
            8
          )} gate: ${gate(assessed.value, policy).kind}`
        )
      }
    }
  })
})
```

```
  the registered types wired, and nothing checking props
    copyable: true     invalid props: 0  stakes: low      gate: accepted
    behaviours: [copy] invalid props: 0  stakes: low      gate: accepted
    caption: Install   invalid props: 0  stakes: low      gate: accepted
  and propsVocabularyFor(registry) wired as well
    copyable: true     invalid props: 1  stakes: critical gate: rejected
    behaviours: [copy] invalid props: 1  stakes: critical gate: rejected
    caption: Install   invalid props: 0  stakes: low      gate: accepted
```

**The first block is the answer to Predict 4(a), and it is not the answer most
people write.** On a deployment that has not wired a props vocabulary, a model
can set `copyable: true` on a code panel and the Gate accepts it at **low**
stakes, because setting a prop on a node is a small reversible change and that is
exactly what this is.

And the answer to 4(b) is: the page does nothing at all. The prop is in the tree,
it is in the log, it is attributed to the model that wrote it, it survives a
reload, and no component will ever look at it.

That pair is the whole section above, executed. The system's protection against a
model giving a page a new capability is **not** a rule in the Gate. There is no
rule in the Gate. It is that a capability is not the kind of thing the medium
carries, so a proposal claiming to add one is a proposal that adds a string.

The second block is the props floor from lesson 15 doing its ordinary job — a key
no schema declares is refused at critical stakes — and it is worth noticing that
it refuses `copyable` for exactly the same reason it would refuse `capton`. It
has no idea a behaviour was being attempted. Nothing in this system does, because
nothing was.

### Exercise D — the render, and the button that is not in it

Predict 2. A primitive that declares `copy`, is registered without complaint,
places the control in its markup, and renders with no diagnostics.

```ts
const slabRegistry = (() => {
  const built = createPrimitiveRegistry([takes("x.slab", ["copy"], { copy: "Copy", copied: "Copied" }, "always")])
  if (!built.ok) throw new Error(describeRegistryError(built.error))

  return built.value
})()

const slabTree = () => {
  const ids = sequentialIdFactory("s")

  return createTree(
    buildElement(ids, {
      type: "x.slab",
      props: {},
      children: [buildText(ids, "pnpm add loom")],
    }),
    ids
  )
}

describe("D", () => {
  it("renders a primitive that takes a copy control, and looks for the button", () => {
    const out = renderLoomTree(slabTree(), { resolver: slabRegistry })
    const markup = renderToStaticMarkup(out.element)

    console.log(`  render diagnostics: ${out.diagnostics.length}`)
    console.log(`  the markup: ${markup}`)
    console.log(`  a <button> anywhere in it: ${markup.includes("<button")}`)
    console.log(`  the control's class anywhere in it: ${markup.includes(CONTROL_CLASS)}`)

    const resolved = resolveBehaviours(["copy"], "pnpm add loom", { copy: "Copy", copied: "Copied" })
    console.log(`  the seam built a control: ${resolved.behaviours.copy !== undefined}`)
    console.log(`  left out for want of a name: ${resolved.unnamed.length}`)
    console.log(
      `  that control, rendered on its own: ${JSON.stringify(
        renderToStaticMarkup(resolved.behaviours.copy as never)
      )}`
    )
  })
})
```

```
  render diagnostics: 0
  the markup: <div>pnpm add loom</div>
  a <button> anywhere in it: false
  the control's class anywhere in it: false
  the seam built a control: true
  left out for want of a name: 0
  that control, rendered on its own: ""
```

**There is no button.** Nothing is wrong. The seam built the control — the sixth
line says so — and rendering that control by itself produces the empty string.

Every control in the vocabulary renders nothing until it knows it will work. The
server render and the first client render are both empty, and the button appears
from an effect once `navigator.clipboard.writeText` is actually there. An
insecure origin, an old browser and a page served with scripting off are three
ordinary ways to get a button that looks like it copies and does not — and the
finding that asked for this seam was explicit that such a button is **worse for a
visitor than no button**, which is a strong claim the design took at face value.

For `disclose` the stakes are higher rather than lower, and it is worth following
why. The stylesheet hides the region when the attribute says closed. Ship the
button in the server's markup and a page served with scripting off gets a dead
button with every link in the menu hidden behind it and no way to reach one.
Rendering late inverts that into a safe failure: no button means no attribute,
no attribute means no rule matches, and the region is simply visible. The cost is
a paint — on a phone the menu is briefly open and then collapses — and that is
the honest price of not hiding something before you know it can be got back.

Now the consequence for this course, which is the part to carry out of this
lesson. Every claim in the previous thirty lessons has been checkable by running
a program and printing what it said. This one is not. **A behaviour has no
observable trace in a pure function of the tree.** That is why the four checks
are at registration: registration is the last moment at which anything about a
behaviour is visible to anything that is not a browser.

### Exercise E — the Gate, asked about a page holding that same invisible button

The one thing that *is* observable, and what the system does with it.

```ts
describe("E", () => {
  it("asks the Gate about a page holding that same invisible button", () => {
    const full = createStarterPrimitiveRegistry([
      takes("x.slab", ["copy"], { copy: "Copy", copied: "Copied" }, "always"),
    ])
    if (!full.ok) throw new Error(describeRegistryError(full.error))

    const policy = {
      ...defaultGatePolicy,
      registeredPrimitiveTypes: registeredTypesFor(full.value),
      interactiveTypes: interactiveTypesFor(full.value),
    }

    console.log(`  what the policy was told about the two types:`)
    console.log(`    loom.card ${JSON.stringify(policy.interactiveTypes["loom.card"])}`)
    console.log(`    x.slab    ${JSON.stringify(policy.interactiveTypes["x.slab"])}`)

    for (const [label, cardProps] of [
      ["a card with no href", {}],
      ["a card with an href", { href: "/install" }],
    ] as const) {
      const ids = sequentialIdFactory(label.includes("no") ? "e1" : "e2")
      const card = buildElement(ids, { type: "loom.card", props: cardProps as never, children: [] })
      const base = createTree(buildElement(ids, { type: "loom.page", children: [card] }), ids)

      const delta: TreeDelta = {
        deltaId: spare.deltaId(),
        treeId: base.treeId,
        baseRevision: 0,
        operations: [
          {
            op: "insert",
            parentId: card.id,
            index: 0,
            node: buildElement(ids, { type: "x.slab", props: {}, children: [buildText(ids, "pnpm add loom")] }),
          },
        ],
      }

      const assessed = assessChange(
        base,
        {
          proposalId: spare.proposalId(),
          intentId: spare.intentId(),
          delta,
          rationale: "put the install line in the card",
          provenance: {
            origin: "developer",
            interpreter: "scratch",
            authoredBy: "model",
            confidence: 0.98,
            interpretedAt: "2026-09-29T00:00:00.000Z",
          },
        },
        policy,
        spare.deltaId()
      )
      if (!assessed.ok) throw new Error("loom: the delta would not apply")

      const verdict = gate(assessed.value, policy)
      console.log(`  ${label}`)
      console.log(`    nesting faults: ${assessed.value.analysis.nestedTargets.length}`)
      console.log(`    stakes: ${assessed.value.stakes.level}  gate: ${verdict.kind}`)
      console.log(`    ${verdict.reason.code} — ${verdict.reason.detail}`)
    }
  })
})
```

```
  what the policy was told about the two types:
    loom.card {"whenProps":["href"]}
    x.slab    "always"
  a card with no href
    nesting faults: 0
    stakes: low  gate: accepted
    within-policy — reversible, within the stakes ceiling, and confidently interpreted
  a card with an href
    nesting faults: 1
    stakes: critical  gate: rejected
    stakes-at-refusal-floor — puts a target where the reader cannot reach it: x.slab n_e24 inside loom.card n_e21
```

Put this beside exercise D and the pair is the lesson's sharpest single fact.
**The Gate refuses this page on account of a button that no render produces.**
The markup in exercise D has no `<button>` in it, the static page is a `div` and
a line of text, and the Gate is correct to refuse anyway — because what it is
reasoning about is the primitive's *declaration*, and the declaration is the only
part of a behaviour that exists outside a browser.

That is also why the registry refuses `x.c` in exercise B. A primitive that takes
a control and does not say it is `interactive` has removed the only evidence the
write path had.

### Exercise F — the same primitive, with one of its two strings blanked

```ts
describe("F", () => {
  it("hands the same primitive a dictionary that blanks one of its two strings", () => {
    const pages: string[] = []

    for (const [label, supplied] of [
      ["a dictionary that answers both", { copy: "Kopieren", copied: "Kopiert" }],
      ["a dictionary that answers one of them with a space", { copy: " ", copied: "Kopiert" }],
    ] as const) {
      const out = renderLoomTree(slabTree(), { resolver: slabRegistry, text: { textFor: () => supplied } })
      const markup = renderToStaticMarkup(out.element)
      pages.push(markup)

      console.log(`  ${label}`)
      console.log(`    diagnostics: ${out.diagnostics.length}`)
      for (const diagnostic of out.diagnostics) {
        console.log(`      ${(diagnostic as { code: string }).code} — ${describeRenderDiagnostic(diagnostic as never)}`)
      }
      console.log(`    the page says: ${JSON.stringify(words(markup))}`)
    }

    console.log(`  the two pages, character for character: ${pages[0] === pages[1] ? "the same" : "different"}`)
  })
})
```

```
  a dictionary that answers both
    diagnostics: 0
    the page says: "pnpm add loom"
  a dictionary that answers one of them with a space
    diagnostics: 1
      behaviour-unnamed — node n_s2 takes the "copy" behaviour and "copy" resolved to nothing, so the control was left out rather than rendered with no accessible name
    the page says: "pnpm add loom"
```
```
  the two pages, character for character: the same
```

The registry refuses a primitive that declares a behaviour and not its strings,
so the only way here is a **host dictionary** that answers a declared key with a
blank. The dictionary schema refuses the empty string and accepts whitespace,
which is how a space gets through.

What the seam does then is drop the control rather than render it nameless — the
same judgement the text seam makes everywhere, taken one step further because
there is a whole control to leave out rather than a string to fall back on. A
copy button a screen reader announces as "button" is worse than a page with no
copy button.

And then the last line, which is the reason this exercise exists. **The two pages
are byte-identical.** The deployment whose German dictionary is correct and the
deployment whose German dictionary has a stray space produce the same markup,
because in a static render there was never going to be a button either way. The
*only* thing that distinguishes them is a diagnostic — a fault reported in the
one place that can see it, which is lesson 24's whole subject arriving at the
one seam in this course where the render has nothing to show.

### Exercise G — who in the library takes a control

```ts
describe("G", () => {
  it("counts the primitives in the starter library that take a control", () => {
    console.log(`  primitives in the starter library: ${registry.primitives.length}`)
    const takers = registry.primitives.filter((entry) => entry.behaviours.length > 0)
    for (const entry of takers) {
      console.log(`    ${entry.type.padEnd(16)} ${JSON.stringify(entry.behaviours)}`)
    }
    console.log(`  behaviours with a declaring primitive in the library:`)
    for (const name of BEHAVIOUR_NAMES) {
      const declared = takers.filter((entry) => (entry.behaviours as readonly string[]).includes(name))
      console.log(`    ${name.padEnd(9)} ${declared.length === 0 ? "nothing declares it" : declared.map((e) => e.type).join(", ")}`)
    }
  })
})
```

```
  primitives in the starter library: 103
    loom.nav         ["disclose"]
    loom.menu        ["present"]
    loom.lightbox    ["present","dismiss"]
    loom.popover     ["present"]
    loom.code        ["copy"]
    loom.before-after ["adjust"]
  behaviours with a declaring primitive in the library:
    copy      loom.code
    disclose  loom.nav
    adjust    loom.before-after
    present   loom.menu, loom.lightbox, loom.popover
    dismiss   loom.lightbox
```

Six primitives, out of whatever the first line printed, take a control at all.
That is the closed set doing what a closed set does, and it is the healthy
reading of this output.

**It read differently when this exercise was written**, and the difference is
what the next section is about. On 29 September the last three lines each said
*nothing declares it*, and this lesson shipped with that output printed above
this paragraph.

---

## Found by running it: three members with nothing to place them

> **Closed on 1 October**, by `Loom primitives`, in the run that placed all three
> — which is why the transcript above has six rows where this section describes
> two. **The section is kept as it was written**, in the present tense it was
> written in, because what it is teaching is the *measurement* rather than the
> defect: the nine lines above are a second copy of a fact nobody was doubting,
> and they are worth as much now that the answer is healthy as they were when it
> was not. Read it as of 29 September; the closing note at the end of the section
> says what each line reads today.

Exercise G was written to show the vocabulary's reach, and the number it actually
measures is the gap between a seam being built and a seam being used.

**`adjust` was built for `loom.before-after` and `loom.before-after` does not
declare it.** That is not an inference. 0096's Context names the primitive in its
second paragraph, its worked CSS is a `clip-path` on an `.after` layer, and the
primitive has a `position` prop that is exactly the `var()` fallback the record
says a primitive should supply. Twenty-eight days later the drag does not exist.

Worse, the primitive's own doc comment still argues that it *cannot*:

> A draggable wipe needs a pointer handler, and a handler is a function — not
> something a tree's JSON props can carry, and not something this library may
> implement for itself: 0086 settled that a behaviour is a control the runtime
> builds and a primitive places, and the vocabulary has one member. So this is
> filed as a second member rather than built.

Every clause of that is true except the count, and the count is what the
paragraph turns on. The vocabulary reached two members on 25 August and the third
— the one this primitive asked for — landed on 1 September.

And the `FINDINGS.md` entry that asked for it is marked **closed**, by the record
that made it possible, with a closing note that says placing it *"is three
lines"*. The three lines were never written. So the repository currently holds: a
closed finding, a built mechanism, a primitive that says the mechanism does not
exist, and no page anywhere that can be dragged.

That is lesson 28 in its plainest form, one directory over from where that lesson
looked. **"Closed" is a claim with no second copy.** Nothing compares the word
*closed* against whether any primitive in the library declares `adjust`, and
exercise G — nine lines — is the comparison nobody had written.

`present` and `dismiss` are the same shape and nine days old rather than
twenty-eight, which is why they are a smaller entry rather than none. 0176 names
four primitives it unblocks and says, in as many words, *this record settles the
first* of the three groups Tier B splits into.
`docs/primitive-gap-inventory.md`, edited five days after that record, still says
Tier B is *"blocked on the behaviour vocabulary"* and that its nine members
*"arrive together or not at all, because they are one framework decision rather
than nine"*. Four of the nine have had their decision for nine days.

Both are filed in `FINDINGS.md` for `Loom primitives` rather than fixed here.
`src/primitives/` and `docs/` are not this lane's, and a lesson that changed
behaviour while teaching it would be a lesson nobody can review.

What makes the first one worth a lesson's attention rather than a bug report is
the exercise that found it. It is nine lines, it reads two things the repository
already publishes, and it could have been written on 1 September. The reason it
was not is the reason lesson 28 gives: **nobody manufactures a second copy of a
fact they are not currently doubting.**

### What those lines read now

Two days after this section was written, all three are placed and the transcript
above is the proof. `loom.before-after` declares `adjust` and its doc comment no
longer argues that a draggable wipe is impossible; `loom.menu`, `loom.popover`
and `loom.lightbox` declare `present`, and the lightbox declares `dismiss` as
well, because a region that covers the viewport puts its own scrim inside the
element the trigger was placed in and 0176's outside-press therefore cannot reach
it. `docs/primitive-gap-inventory.md` no longer says Tier B is one decision.

**None of that makes the exercise less interesting, and this is the part worth
taking away.** A healthy output and an unhealthy one are the same nine lines; the
reason anyone knows which they are looking at is that somebody wrote the lines.
The gap lasted twenty-eight days because no instrument was pointed at it, and it
lasted two days after one was.

---

## It could have been otherwise

**A prop.** Rejected on 0055's argument, and it is worth stating what the
rejection costs, because it is not free. A deployment cannot turn a behaviour on
without a code change, and an author who wants a copy button on a primitive that
does not declare one has to edit that primitive. In exchange: nothing a model
writes can change what a page *does*, which is the property the whole system
exists to protect, and exercise C is what that property looks like when you poke
at it.

**A behaviour as its own primitive.** `loom.copy-button`, a node in the tree like
any other. It is a real design and some systems take it. It fails on what a
behaviour acts *on*: a copy control belongs to the node whose text it copies, and
a sibling node would have to be told which node that is — an id in the tree,
which lesson 04 spent a whole lesson explaining you should not be writing by
hand, and lesson 30 would then class as an agreement nobody holds a copy of.

**A control the primitive is handed as a component rather than a node.** Then the
primitive could pass props to it — a size, a position, a variant. Rejected
because there is nothing correct for it to pass: the strings are the primitive's
own declarations already resolved, the content came from the tree, and every
remaining knob would be a knob a primitive could get wrong. A node with nothing
to configure cannot be misconfigured.

**A module-level store for the `present`/`dismiss` pair**, keyed by node id,
instead of a bubbling event. Rejected in 0176 for the reason above: it would make
two controls that are *not* in each other's subtree agree anyway. The DOM's
containment is not a limitation being worked around here — it is the constraint
being borrowed, because it is exactly the constraint the feature needs.

**`attr()` instead of a custom property for `adjust`.** Not portable outside
`content`. The quantised version — one CSS rule per integer step — is a hundred
rules to say what one `calc()` says, and is the kind of answer that is technically
available and tells you the shape is wrong.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections while
you write. Then compare.

1. **A colleague says: "you've just reinvented a plugin system with extra steps.
   A registry of five things you're allowed to do is a plugin registry that
   nobody can add to."**

   They are not wrong about the mechanism. Answer them on the *purpose*: say
   what property a closed set has that an open one does not, in a sentence that
   mentions neither Loom nor AI, and then name one system outside this
   repository that makes the same trade and what it buys.

2. **Derive this lesson from lesson 01 and lesson 14, without looking at
   either.**

   Lesson 01 gave you the thesis: AI that writes UI code produces changes nobody
   can review, gate, attribute or undo, so what AI may produce is narrowed to a
   delta against a validated tree. Lesson 14 gave you the renderer as a total,
   pure projection of that tree.

   Starting from those two and nothing else, derive the constraint that makes a
   copy button hard — and then derive *why the answer had to put the
   implementation on the runtime's side of the line rather than the primitive's*.
   The second half is the one that transfers; the first is nearly a restatement.

Predict, before writing (2): the step most people skip is that "props are JSON"
is a consequence rather than a premise. If your derivation starts from JSON, you
have started one move too late.

---

## Self-check

Seven questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. State the general rule this seam is an instance of, in a form that mentions
   neither behaviours nor primitives: it should be a sentence about what you do
   when the thing you need cannot be expressed in the medium you have chosen.
   Then give one example from outside Loom.
2. A model proposes `copyable: true` on a code panel and a deployment that checks
   no props accepts it. Say what makes that *safe*, and make your answer about
   the system rather than about that particular prop name.
3. The behaviour vocabulary has five members. For three of them, say what the
   control hands back and where it writes it, and then say why the boolean and
   the number cannot go in the same place. Your answer must contain the word
   "inheritance" and must not contain the word "CSS".
4. The registry makes four checks about a declared behaviour and the conformance
   probe makes a fifth. Say which side of the line each is on and *why the line
   falls there* — the answer is one sentence about what can be known without
   running something.
5. `dismiss` is refused at registration when `present` is absent, rather than
   reported by the audit. Say what distinction that refusal is drawing, and name
   the other thing in this seam that is treated the same way for the same reason.
6. A page with a copy button on it, rendered to static markup, contains no
   button. Say what that costs and what it buys, and then say what it implies
   about where a behaviour can be checked at all.
7. Two controls of one primitive agree through the DOM. Say what was unavailable
   that forced it, say what the rejected alternative would have guaranteed, and
   then say why a channel that fails by *not reaching* is the right kind of
   failure here.

Question 1 is the one the rest of the lesson exists to support. Question 3 is
where a confident half-answer is most likely: the three answers come easily and
the *reason* the third one is on the parent is usually reconstructed as "because
the region is below it", which is true of the layout and is not the reason.

---

## Reflect

Write for two minutes, then move on.

- Predict 1 and your three designs. Nearly everybody writes the prop first. If
  you did, look at what your instinct was optimising for — almost certainly that
  the *tree* should say what the page does, which is the right instinct
  everywhere in Loom except here.
- Predict 2 and your confidence. If you wrote a `<button>` with high confidence,
  that is the most useful wrong answer in this lesson, and the thing to write
  down is what you were assuming about where a render happens. Everything else in
  this course renders the same on a server and in a browser. This does not, and
  it is the only seam in Loom for which "run it and print what it says" is not a
  complete method.
- Predict 3. If you put the number on the control's own element, write down the
  CSS line you were going to use. Most people find they were imagining a selector
  and the mechanism is not a selector — which is a good demonstration that
  knowing a rule and knowing which machine executes it are different kinds of
  knowing (lesson 27, again).
- Predict 4. Separate your two answers. If you had the Gate refusing the change,
  the thing to take is not that you were wrong about the Gate — it is that you
  expected a *rule* to be doing the work. There is no rule. The medium does it,
  and a system whose safety comes from what it cannot express needs less
  machinery than one whose safety comes from what it forbids.
- Now go and look at your own work for the same shape: something a
  configuration format cannot express, where somebody solved it by adding an
  escape hatch — a string that gets `eval`'d, a path to a script, a class name
  that gets instantiated by reflection. For one of them, write down what the set
  of possible values actually is, who could enumerate it, and what a reviewer of
  a change to that config can and cannot tell from reading the diff.
- Last, the general version. This lesson's remedy was to make a list and refuse
  to grow it except deliberately. Find a place in your own work where a list
  like that was *opened* — where an enum became a string, or a registry became a
  lookup by convention — and write down what was gained, what stopped being
  answerable, and who would notice.

---

## Come back to this

Set AJ in [`review-schedule.md`](review-schedule.md), two days after this lesson.
Interleaved with 01, 14, 15, 22, 24 and 27 — heavy on 22, because the
`interactive` check is that lesson's predicate arriving from a direction it could
not have anticipated; and on 27, because *hand the work to a different machine,
then live in that machine's data model* is what decides where `adjust` publishes
its number.

Part V has fourteen seams now, and this is the first whose missing thing is not a
fact. The thirteen before it were all a checker that could not reach, interpret,
compare, or was asked the wrong question — and every one of them had, somewhere,
a value that was either right or wrong. Here there is no value. A checker that
could see every byte of the tree, understand all of it perfectly, and ask exactly
the right question would find nothing, because nothing is there: a verb is not a
kind that JSON has.

So the remedy is not another declaration and not another comparison. It is to
decide, once, what the complete list of things a page may do is — and then to
make adding to that list an event rather than a habit. What the closure buys is
the sentence Predict 4 executes: **a model cannot give a page a capability,
because capability is not in the language a model writes.** That is a stronger
guarantee than any rule in the Gate, and it costs one list.

The thing to carry into a fifteenth seam is the other half, from exercise D. This
seam is the one place in Loom where the course's own method runs out — where the
thing being taught leaves no trace in anything a pure function can produce, and
the only evidence available outside a browser is a *declaration that it exists*.
Which is why the four checks happen at registration, and why the question to ask
of the next seam is not *where is the second copy* but **what is the last moment
at which this is still visible, and is anything checking it there?**
