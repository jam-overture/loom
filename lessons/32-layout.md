# 32 — Layout: the fault that exists only after a browser has made it

**After this lesson you will be able to** say why *does this page overflow* is
not a question about the page; name the inputs a visual fault is a function of and
say how many of them anybody in Loom owns; explain why the one check in this
repository that catches a visual defect without a person looking at a picture
goes blind in a `loom.backdrop`, and why the backdrop is right and the check is
right; state where the line falls between the half of an instrument that needs a
laid-out page and the half that is arithmetic, and give the two exclusions that
can live on each side of it; say why `scrollWidth` is the obvious reading and
wrong twice over, with the two features it reports as defects; explain why a
measurement that had never been taken was deliberately kept out of the exit code
in the change that first took it; and — the part this lesson found by running
rather than by reading — say which of the functions this harness hands to a
browser a test in this repository can run, and what decides that.

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
[29](29-readership.md), [30](30-rendezvous.md), [31](31-behaviour.md).

Lesson 31 ended on a question: **what is the last moment at which this is still
visible, and is anything checking it there?** For a behaviour the answer was
*registration*, because a behaviour leaves no trace in a pure function of the
tree and registration is the last place anything that is not a browser can see
it.

This seam answers the same question and the answer comes out backwards. There is
no earlier moment to lose. A heading whose longest word paints past the edge of a
phone is not in the tree, not in the registry, not in a declaration, and not in
the markup — it does not exist *yet*. It comes into being when a layout engine is
handed that markup, a viewport width, and whichever font actually loaded, and it
stops existing again when the reader turns the phone sideways.

So the last moment at which it is visible is also the **first**, and nothing that
runs before it could have caught it however far it reached. That makes the remedy
the sixth one Part V has used: not reach further, not manufacture a second copy,
not instrument a place in the code, not ask an author, not close a set — **stand
where the fact is and measure it.** Which sounds like the end of the problem and
is the beginning of it, because the moment your checker is a measurement rather
than a comparison, the hard question stops being *can I see it* and becomes *which
of the things I can see are defects*.

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Write something for all
five before you look anything up.

1. A node holds no expressions and the renderer evaluates nothing. Say what that
   buys the person reviewing a change, in a sentence that does not use the word
   "simple". *(02)*
2. The renderer is a **total, pure** projection of the tree. Name something that
   is therefore true of two renders of the same tree on two different machines,
   and then name something that is *not* true of the two pages those renders
   produce. *(14)*
3. A check is bounded by the population of values that pass through the place it
   runs. Give the worked case from lesson 25 — the fault that survived the fix —
   and say in one sentence what the general rule is. *(25)*
4. A `loom.stat-chart` hands its arithmetic to a different machine. Name the
   machine, and then name one ordinary chart feature its data model forbids.
   *(27)*
5. A page with a copy button on it, rendered to static markup, contains no
   button. Say why, and then say what that forced about *where* the registry
   checks a behaviour. *(31)*

Question 3 is the one this lesson leans on hardest, and question 2 is the one it
is built out of: if your second answer came out as "nothing — they are the same
page", that is the belief this lesson is about to take away from you.

---

## Predict

**In writing, before reading on.** Four questions. Question 2 is the one to rate
your confidence on. Question 4 decides whether the second half of this lesson
tells you anything you did not already know.

1. A documentation band has a level-2 heading naming an export —
   `themeSelectionSchema`, twenty characters with nowhere to break. On a
   390-pixel phone, at a display step, the word is wider than the band.

   Write down **where in Loom that fault is**. Be specific: name the node, the
   prop, the declaration, or the file. If your answer is that it is in none of
   them, write down what it *is* a function of — list every input, and then mark
   the ones somebody in this system owns.

2. The repository has one check that catches a visual defect without a person
   looking at a picture: after every screenshot it compares
   `document.documentElement.scrollWidth` against `window.innerWidth` and exits
   non-zero if the first is bigger.

   The band above is wrapped in a `loom.backdrop`, which sets `overflow: hidden`
   and has to, because its paints reach the element's edges. Write down what that
   check reports for this page at 390. **Rate your confidence 1–5.**

3. You decide to look inside the clip. For every box on the page that clips
   horizontally, you want *how far its own content reaches*. The browser already
   has a property for this: `element.scrollWidth`.

   Write down two things in the starter primitive library that `scrollWidth`
   would report as hiding content, and that are the library working exactly as
   designed. Then say what each one would cost the person reading the report.

4. The measurement in question 3 gets built. It has never been taken before, so
   nobody knows how many boxes on the repository's existing pages it will name.

   Write down whether the new reading should fail the run — same exit code as the
   document measurement — and give the reason. Then write down what the *other*
   answer costs.

Do not read on until all four are written. Question 1 is the one where nearly
everybody's first list is one input short; question 4 is the one where the
principled answer and the right answer are not the same.

---

## The problem

### One word, and nothing in the system is wrong

A reference page's heading is the name of a thing: `themeSelectionSchema`,
`renderLoomTree`, `createStarterPrimitiveRegistry`. That is not a contrived
string — a heading naming a symbol is most of what a documentation site is made
of.

Twenty characters with no break opportunity in them, set at a heading's display
step, is wider than a 390-pixel phone. Nothing in the chain that produced it did
anything wrong:

- The **tree** is valid. A `loom.heading` at level 2 with one text child.
- The **primitive** is correct. It sets the type scale a heading is supposed to
  set, and it has no business knowing how wide the reader's phone is.
- The **Gate** has nothing to weigh. Exercise B runs it: the delta that inserts
  the word that fits and the delta that inserts a two-hundred-character word
  neither of them could fit are indistinguishable in every number the analysis
  takes.
- The **render** is total and pure, exactly as lesson 14 promised, and the markup
  it produces is the same markup on every machine.

Warm-up 2 is where this starts to bite. Two renders of one tree are identical;
the two **pages** they produce are not, because a page is the markup *and* a
layout, and the layout is computed by somebody else's software out of inputs
nobody in this system has ever been handed:

| input | who owns it |
| --- | --- |
| the markup | Loom — all of it, and it is pure |
| the viewport | the reader's device, and the reader, who may rotate it |
| the font that actually loaded | the network, and then the font stack's fallback |
| the reader's minimum text size | the reader, in their operating system |
| the layout algorithm | a browser engine, three of which disagree |

Predict 1 asked where the fault is. It is in none of the five rows alone. It is a
property of the whole row set, and four of the five rows belong to somebody else.

### The one check that catches this without a person, and the four bands it cannot see through

Four routine briefs in this repository ask a run for a screenshot, so there is
one harness that takes one ([0116](../decisions/0116-a-screenshot-is-taken-by-the-repository-and-playwright-is-never-a-dependency.md),
[0117](../decisions/0117-one-harness-two-subjects-a-tree-it-renders-and-an-address-you-serve.md)).
Beside every shot it prints one measurement:

```
example-editorial-phone  390x844@2x touch  scrollWidth 390 / innerWidth 390
```

The document against the viewport. *The page is wider than the phone* is the
single most-reported visual defect in this repository, and eyeballing a
screenshot is exactly how it gets missed — a picture of a page with a word off
the right edge looks, at thumbnail size, like a picture of a page.

On 27 September `Loom primitives` rendered one tree twice and measured it:

| | document measurement |
| --- | --- |
| wrapped in a `loom.backdrop` | **390 / 390** |
| the identical content, unwrapped | **401 / 390 ← overflows** |

That is Predict 2. The wrapper is the whole difference, and the wrapper is right:
`loom.backdrop` sets `overflow: hidden` because its paints reach the element's
edges, and one that did not clip would paint over the band beside it. So the
check is right, the backdrop is right, and together they are silent on a page
with a word cut in half inside it.

The reach of that silence is the part worth sitting with. It is not four bands.
Four bands in the starter catalogue are rooted in a backdrop or carry a hero's
own paint — and a page a model proposes a backdrop onto is the product working as
designed. So it is *any page, at any time, silently, with nothing red*.

---

## The idea

### The instrument goes where the fact is, and that is all the easy part

Everything above is a description of a fact that lives in a browser. The remedy
is therefore not available to any of the five things this course has reached for
before. There is nothing to compare, because the fact exists once. There is
nothing to interpret, because there is no value. There is nobody to ask, because
no author of anything knows how wide the reader's phone is. There is no set to
close, because the set of strings a heading may contain is the set of strings.

So: put the measurement in the browser.
[0202](../decisions/0202-the-harness-measures-the-content-a-clip-hides-and-it-is-not-scrollwidth.md)
does that, and the decision it actually had to make is not *whether* — it is
**what counts**.

### `scrollWidth` is one property access and is wrong twice over

Predict 3. Having decided to measure how far a clipping box's content reaches,
the obvious reading is `element.scrollWidth`. It is the browser's own answer to
the question. It is one property access. It was measured on the first run of the
instrument and it is wrong in both directions this library actually produces:

- **A `loom.halo` is an absolutely positioned rim at a negative inset**, drawn
  four pixels outside the box it lights, on purpose, and clipped by a backdrop on
  purpose. `scrollWidth` counts it. Two of eighteen committed specimens reported
  four pixels of clipped rim, and neither was hiding anything a reader wanted.
  **Decoration that is clipped is decoration working.**
- **A box that scrolls sideways inside a clipping box is wide by design** and says
  so with a scrollbar. The documentation site's quickstart reported its code block
  as hiding 905 pixels in a 348-pixel box, which is the feature.

What that costs the reader of the report is the thing worth naming, because it is
not *two wrong lines*. A report with two false lines in it is a report nobody
reads the true lines of. An instrument that cries wolf gets switched off, and an
instrument that is switched off is worse than one that was never built, because
the second does not make anybody feel covered.

So the reading is **walked** rather than read off. Start at the clipping box's
children and, for each one: count its own rectangle; stop if it clips or scrolls
on its own account; measure the **ink of its text** with a range; then descend.

Two of those four clauses are the lesson:

**Stop at anything that handles its own overflow.** A scroller's own box is in
this box's flow and has been counted; what is inside it is that scroller's
business, and it gets measured on its own account when the outer loop reaches it.
The line that does this was once *above* the two measurements rather than below
them, and the documentation site's quickstart reported a code block as hiding 905
pixels — one statement's position in a loop, and the difference between an
instrument and a nuisance.

**Measure the words, not the box that holds them.** A heading is a block: its box
is the width it was given, and one long word painting past that edge is invisible
to every rectangle on the way down. That is the commonest shape of this defect —
it is the shape of the opening example — so the text itself is measured with a
range over each run of characters, which is the only thing that reports where the
ink actually ends.

### The line: a laid-out page on one side, arithmetic on the other

Here is the structural move, and it is the one to take away from this lesson even
if you never measure a page.

Reading *which elements clip, and how far their content reaches* needs a laid-out
page and a computed style. Deciding *which of those readings is a defect* is
arithmetic. So they are two functions in two files:

- `readClippingBoxes` runs **in the page**, and returns every reading it can
  take, unfiltered.
- `clippedFrom` runs **in Node**, over an array of numbers, and decides.

The payoff is that the second half can be tested without a browser — and exercise
D tests it, at both of its boundaries, in a file you can run in two seconds.
Before the split, the only way to check the rule that drops a visually-hidden
label was to take a photograph and read the output.

The cost is the honest half, and exercise G is it: **the rules that decide whether
this instrument is any good are checkable by nothing.** Not by a weaker test. By
nothing. The walk, the stop condition, the text range, the out-of-flow skip all
live inside `readClippingBoxes`, which reaches for `document` itself — so there is
nothing a test can hand it and nothing for a test to call. The suite that drives
the code path *around* it, which is real and does exist, is handed a reading
somebody typed into the test instead.

And then the part of that sentence which was too strong, discovered by a test
somebody else wrote two days after this lesson shipped. *In the page* against *in
Node* is not where the line falls. **What a function reaches for** is: one that
fetches its own subject can only run in a page, and one that is *handed* its
subject can be run anywhere, including against six numbers on an object literal in
Node. `readBoxes` is the second kind and a test does now run it. That is the same
move as the injected clock in lesson 05 and it buys the same thing, and exercise G
is where it is worth following — including which of the two kinds every rule above
turns out to be in.

None of which is a defect, and there is nothing here to fix. It is what it costs to
have an instrument at all, stated out loud, in the place where somebody would
otherwise discover it by trusting a green suite.

### Four exclusions, and only two of them could be arithmetic

`clippedFrom` applies two filters, and both are numbers with a reason:

- **`CLIP_TOLERANCE`.** Layout is fractional and these readings are not, so a box
  whose content is a third of a pixel too wide reports a shortfall of one.
  Nothing is hidden at that size and every page has a dozen of them.
- **`CLIP_VISIBLE_MINIMUM`.** `position:absolute; width:1px; height:1px;
  overflow:hidden` is how a visually-hidden announcement is written, here and
  everywhere else, and it is a clipping box holding a sentence *by construction*.
  It is the pattern working. This is the one exclusion that is about **intent**
  rather than about arithmetic, and the first page the instrument was pointed at
  found one: `sr-only` with `px-3 py-2` on top of it, reported as a 142-pixel
  reach in a 24-pixel box until the rule was measured on the **content** box
  instead of the client box. Twenty-four by seventeen says nothing; one by one
  says what it is.

The other two exclusions — the halo and the sideways scroller — are not here and
could not be. Exercise E hands both of their readings to `clippedFrom` and it
reports both as defects, correctly, because the three fields it is given carry no
position and no overflow. **A filter can only be arithmetic if the number it
needs survived the trip.**

### Two readings, and deliberately not one verdict

A page is either wider than its viewport or it is not. Separately, some boxes
inside it are hiding content they could not fit. These are independent — a page
can be clean on both, clean on one, or clean on neither — so they are two fields
on the measurement and not one verdict, and the two have different remedies,
often in different lanes.

Which brings us to Predict 4, and the decision I would defend hardest in this
whole seam: **the new reading does not change the exit code.**

The principled answer is that it should. A page hiding a word is broken, the
repository has a gate, gates are for broken things. And on the day the
measurement shipped, that answer would have turned a reading nobody had ever
taken into a merge-gate failure on every page it happened to find one on — *in
the same change that first made it visible*.

That is how an instrument gets switched off rather than fixed. Somebody adds
`--no-verify`, or deletes the four lines, or wraps the band in something, and the
measurement that took a week to get right is gone in an afternoon with a
plausible commit message. So the verdict a run exits on is still the document
measurement alone, and the clip lines are printed, worst first, five at most and
then a count.

The rule underneath it generalises past this repository: **a new check and a new
gate are two changes, and shipping them as one is how you lose both.** First make
the thing visible and let people look at what it says. Make it fail the build
when you know what it finds.

### The other direction: say what you could not show

One more thing, for contrast, because it is the same problem answered the other
way round and it is in `src/` rather than in a tool.

A primitive can be handed an answer it cannot draw — twelve rows of which it can
read eleven. That fault has the same shape as this lesson's: it is knowable at a
moment nobody outside is standing at. Loom's answer there is not an instrument.
The primitive **returns a reading** and the runtime decides whether to report it
([0206](../decisions/0206-a-primitive-declares-what-it-could-not-show-and-the-runtime-decides-whether-to-say-so.md),
accepted the day before this lesson was written, which is why this lesson points
at it rather than teaching it).

The distinction is worth having, and it is the test to apply to any fault of this
family: **is there a party inside the system who knows?** For a row a primitive
declined, yes — the primitive knows, so the remedy is a declaration and a
reporting decision. For a word that does not fit a phone, no. Nobody inside knows,
because knowing requires a layout engine. When a party inside knows, make them
say it. When nobody does, go and measure.

---

## In the code

| What | Where |
| --- | --- |
| the document reading, in the page | `measureDocument` in `tools/specimen/playwright.ts` |
| the per-box reading, in the page | `readClippingBoxes` in the same file — unexported, and run by `page.evaluate` |
| the per-element reading, in the page | `readBoxes` in the same file — **handed** its elements rather than fetching them, which is the whole reason a test can run it |
| what a reading is, as data | `ClippedOverflow` and `ClippingBox` in `tools/specimen/capture.ts` |
| which readings are defects | `clippedFrom`, with `CLIP_TOLERANCE` and `CLIP_VISIBLE_MINIMUM` |
| the two verdicts | `overflows` and `clips`, separate on purpose |
| the line a report quotes | `describeShot`, with `CLIPPED_SHOWN` |
| the exit code | `tools/specimen/main.ts` — `results.some((result) => result.overflowed)` |
| the committed subject | `tools/specimen/a-clip-hides-an-overflow.specimen.ts` |
| the harness, explained | [`tools/specimen/README.md`](../tools/specimen/README.md) |
| the decision | [0202](../decisions/0202-the-harness-measures-the-content-a-clip-hides-and-it-is-not-scrollwidth.md) |
| where the reading stops and the judgement starts | [0213](../decisions/0213-the-harness-reads-a-box-it-prints-the-number-and-the-judgement-stays-in-the-report.md) |
| a paint measured the same way | [0196](../decisions/0196-a-paint-is-sized-by-the-box-it-is-given-and-says-so-when-it-cannot-be.md) |
| why an instrument may not assert | [0159](../decisions/0159-an-instrument-may-reach-a-state-and-may-never-assert-one.md) |

One thing to notice about that table before the exercises: **not one row of it is
in `src/`**, and that is not an accident of where somebody put a file. Every other
lesson in this course points mostly at `src/`, because everything a pure function
can know about a Loom page is there. What is only knowable after a browser has
done its work cannot be: `src/` is the thing that ships, and a browser is not a
dependency of it
([0116](../decisions/0116-a-screenshot-is-taken-by-the-repository-and-playwright-is-never-a-dependency.md)).
The directory boundary *is* the line this lesson is about.

---

## Try it

Seven exercises. **Predict every output in writing, then run.** Exercise B is
Predict 2's other half and is the one to commit to hardest; in exercise G the lines
to predict hardest are the four that say what each function handed to the page
takes as an argument.

Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

The shared preamble for all seven:

```ts
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"

import { renderToStaticMarkup } from "react-dom/server"
import { describe, it } from "vitest"

import { sequentialIdFactory } from "./ids.js"
import { createStarterPrimitiveRegistry } from "./primitives/index.js"
import { renderLoomTree } from "./render/render.js"
import { THEME_PROP_KEY } from "./reserved-props.js"
import { assessChange } from "./runtime/assessment.js"
import { gate } from "./runtime/gate.js"
import { defaultGatePolicy } from "./runtime/policy.js"
import { registeredTypesFor } from "./sdk/index.js"
import { createThemeRegistry } from "./theme/index.js"
import { themeSelectionSchema } from "./theme/theme.js"
import { buildElement, buildText } from "./tree/builders.js"
import type { TreeDelta } from "./tree/delta.js"
import { createTree, type LoomTree } from "./tree/tree.js"

import {
  CLIP_TOLERANCE,
  CLIP_VISIBLE_MINIMUM,
  clippedFrom,
  clips,
  describeShot,
  overflows,
  type ClippingBox,
  type Overflow,
} from "../tools/specimen/capture.js"
import { PHONE, WIDE } from "../tools/specimen/specimen.js"

const registry = (() => {
  const built = createStarterPrimitiveRegistry()
  if (!built.ok) throw new Error(JSON.stringify(built.error))

  return built.value
})()

const themes = createThemeRegistry()
const spare = sequentialIdFactory("x")

const THEME = themeSelectionSchema.parse({
  palette: "bold",
  fontPack: "bold-sans",
  stylePreset: "airy-modern",
})

/** The committed specimen's tree, with its backdrop wrapper optional. */
const page = (wrapped: boolean): LoomTree => {
  const ids = sequentialIdFactory()
  const heading = buildElement(ids, {
    type: "loom.heading",
    props: { level: 2 },
    children: [buildText(ids, "themeSelectionSchema")],
  })
  const section = buildElement(ids, {
    type: "loom.section",
    props: { eyebrow: "Reference", width: "wide" },
    children: [heading],
  })
  const band = wrapped
    ? buildElement(ids, { type: "loom.backdrop", props: { paint: "grid" }, children: [section] })
    : section
  const root = buildElement(ids, {
    type: "loom.page",
    props: { [THEME_PROP_KEY]: THEME, width: "wide" },
    children: [band],
  })

  return createTree(root, ids)
}

const render = (tree: LoomTree) => {
  const out = renderLoomTree(tree, { resolver: registry, themes, validator: registry })

  return { markup: renderToStaticMarkup(out.element), diagnostics: out.diagnostics }
}

/** What the browser will lay out, with the remarks people left in it taken off. */
const withoutComments = (markup: string): string => markup.replace(/\/\*[\s\S]*?\*\//g, "")

/** The checkout, found by walking up until the harness is underfoot. */
const ROOT = (() => {
  let at = process.cwd()

  for (;;) {
    if (existsSync(join(at, "tools", "specimen", "README.md"))) return at

    const up = dirname(at)
    if (up === at) throw new Error(`loom: no tools/specimen/ above ${process.cwd()}`)
    at = up
  }
})()

/** The box the harness named on the committed specimen, at 390. */
const BAND: ClippingBox = {
  element: 'div > div > div  "ReferencethemeSelectionSchemaThe heading above …"',
  reach: 370,
  width: 346,
  contentWidth: 346,
  contentHeight: 212,
}

const shot = (name: string, clipped: readonly { element: string; reach: number; width: number }[]) => {
  const overflow: Overflow = { scrollWidth: 390, innerWidth: 390, clipped }

  return {
    name,
    file: `${name}.png`,
    viewport: PHONE,
    overflow,
    overflowed: overflows(overflow),
    clipped: clips(overflow),
  }
}
```

`BAND`'s first two numbers are the harness's own, off the run quoted under
exercise F. Its content box is a stand-in — a band that size — and it is only
there because one of the two filters reads it; exercise D is where that number
earns its place, over a box where it decides the answer.

### Exercise A — the page rendered both ways, and what the markup can be asked

```ts
describe("A", () => {
  it("renders the page both ways and asks the markup which one hides a word", () => {
    for (const wrapped of [true, false]) {
      const { markup, diagnostics } = render(page(wrapped))
      const laidOut = withoutComments(markup)
      console.log(`  ${wrapped ? "the band inside a backdrop" : "the same nodes, unwrapped"}`)
      console.log(`    diagnostics: ${diagnostics.length}`)
      console.log(`    "overflow:hidden" declarations: ${(markup.match(/overflow:hidden/g) ?? []).length}`)
      console.log(`    the heading's word is in the document: ${markup.includes("themeSelectionSchema")}`)
      console.log(`    the word's width is in the document: ${/\b(370|346)\b/.test(laidOut)}`)
      console.log(`    a viewport width is in what the browser lays out: ${/\b(390|1280)\b/.test(laidOut)}`)
      console.log(`    a viewport width is in a remark somebody left in it: ${/\b(390|1280)\b/.test(markup)}`)
    }
  })
})
```

```
  the band inside a backdrop
    diagnostics: 0
    "overflow:hidden" declarations: 1
    the heading's word is in the document: true
    the word's width is in the document: false
    a viewport width is in what the browser lays out: false
    a viewport width is in a remark somebody left in it: true
  the same nodes, unwrapped
    diagnostics: 0
    "overflow:hidden" declarations: 0
    the heading's word is in the document: true
    the word's width is in the document: false
    a viewport width is in what the browser lays out: false
    a viewport width is in a remark somebody left in it: false
```

**The markup contains the clip and not the overflow.** That is the whole seam in
one line of output. `overflow:hidden` is right there, in a style attribute, where
any string search would find it — so the half of the fact that belongs to Loom is
present and inspectable, and the half that decides whether anything is wrong is
not in the document at all.

The last row is the one to go and look at. A viewport width *is* in the wrapped
page, and it is in a `/* */` comment inside the stylesheet the library emits — a
developer's sentence about what a 390-pixel reader sees, shipped to the browser
as a remark. The number is in the document as somebody's prose about the problem
and in no other form. Nothing was wrong with the first draft of this exercise
except that it did not strip comments, and it printed `true` for a page that
knows nothing.

### Exercise B — the Gate, asked about the word that will not fit

```ts
describe("B", () => {
  it("asks the Gate about the word that will not fit", () => {
    const policy = { ...defaultGatePolicy, registeredPrimitiveTypes: registeredTypesFor(registry) }

    for (const [label, word] of [
      ["a word that fits", "Schema"],
      ["themeSelectionSchema", "themeSelectionSchema"],
      ["a word nothing could fit", "a".repeat(200)],
    ] as const) {
      const ids = sequentialIdFactory(`b${word.length}`)
      const section = buildElement(ids, { type: "loom.section", props: {}, children: [] })
      const base = createTree(buildElement(ids, { type: "loom.page", children: [section] }), ids)

      const delta: TreeDelta = {
        deltaId: spare.deltaId(),
        treeId: base.treeId,
        baseRevision: 0,
        operations: [
          {
            op: "insert",
            parentId: section.id,
            index: 0,
            node: buildElement(ids, {
              type: "loom.heading",
              props: { level: 2 },
              children: [buildText(ids, word)],
            }),
          },
        ],
      }

      const assessed = assessChange(
        base,
        {
          proposalId: spare.proposalId(),
          intentId: spare.intentId(),
          delta,
          rationale: "name the export this section documents",
          provenance: {
            origin: "developer",
            interpreter: "scratch",
            authoredBy: "model",
            confidence: 0.98,
            interpretedAt: "2026-10-01T00:00:00.000Z",
          },
        },
        policy,
        spare.deltaId()
      )
      if (!assessed.ok) throw new Error("loom: the delta would not apply")

      const verdict = gate(assessed.value, policy)
      console.log(`  ${label} (${word.length} characters)`)
      console.log(
        `    operations: ${assessed.value.analysis.operationCount}` +
          `  inserted: ${assessed.value.analysis.insertedNodeCount}` +
          `  reversible: ${assessed.value.reversibility.reversible}`
      )
      console.log(`    stakes: ${assessed.value.stakes.level}  gate: ${verdict.kind}  ${verdict.reason.code}`)
    }
  })
})
```

```
  a word that fits (6 characters)
    operations: 1  inserted: 2  reversible: true
    stakes: low  gate: accepted  within-policy
  themeSelectionSchema (20 characters)
    operations: 1  inserted: 2  reversible: true
    stakes: low  gate: accepted  within-policy
  a word nothing could fit (200 characters)
    operations: 1  inserted: 2  reversible: true
    stakes: low  gate: accepted  within-policy
```

Three identical rows, and that is the finding. The delta that puts a word on a
page where it fits and the delta that puts a word on a page where nothing could
fit it are **the same change** by every number the analysis takes, because they
are the same change: one insert, one element, one text node, reversible.

Set this beside lesson 31's exercise C and notice the difference. There, the Gate
accepted `copyable: true` and the right reading was *there is no rule, and there
does not need to be, because the medium forbids the dangerous version*. Here
there is no rule and the medium forbids nothing — a page with a word off the edge
of it is a perfectly expressible page. What makes it safe is not the Gate and not
the medium. It is that somebody is going to look, and the only question worth
asking is whether a machine can do the looking.

### Exercise C — the two readings, on the numbers the browser actually reported

```ts
describe("C", () => {
  it("takes the two readings on the numbers the browser actually reported", () => {
    const clipped = clippedFrom([BAND])
    const measurement: Overflow = { scrollWidth: 390, innerWidth: 390, clipped }

    console.log(`  document: ${measurement.scrollWidth} / ${measurement.innerWidth}`)
    console.log(`  overflows(): ${overflows(measurement)}`)
    console.log(`  clips():     ${clips(measurement)}`)
    console.log(`  boxes named: ${clipped.length}`)
    for (const box of clipped) console.log(`    reaches ${box.reach} in ${box.width}`)
  })
})
```

```
  document: 390 / 390
  overflows(): false
  clips():     true
  boxes named: 1
    reaches 370 in 346
```

**One reading says the page is fine and the other says it is not, and both are
correct.** The document is exactly the width of the phone, because the backdrop
put a lid on it; the box inside the lid wanted 370 pixels and was given 346.

Nothing derives either verdict from the other, and the type says so: `Overflow`
carries the two document numbers and the list of boxes as three fields, not as one
summary. Lesson 26 spent a whole lesson on a fact that needed two stores to judge;
this is a cheaper neighbour of the same shape — two measurements of one page that
answer different questions, kept apart because the remedies are different and
often belong to different people.

### Exercise D — the two filters, walked over their boundaries

```ts
describe("D", () => {
  it("walks clippedFrom's two arithmetic exclusions over their boundaries", () => {
    console.log(`  CLIP_TOLERANCE ${CLIP_TOLERANCE}  CLIP_VISIBLE_MINIMUM ${CLIP_VISIBLE_MINIMUM}`)

    console.log(`  a band 346 wide, by how far its content reaches:`)
    for (const reach of [346, 347, 348, 370]) {
      console.log(`    ${reach}: ${clippedFrom([{ ...BAND, reach }]).length}`)
    }

    console.log(`  a sentence in a visually-hidden box, by the room it has for content:`)
    for (const [contentWidth, contentHeight] of [
      [1, 1],
      [1, 17],
      [2, 1],
      [2, 2],
    ] as const) {
      const box = { ...BAND, reach: 142, width: 24, contentWidth, contentHeight }
      console.log(`    ${contentWidth} x ${contentHeight}: ${clippedFrom([box]).length}`)
    }
  })
})
```

```
  CLIP_TOLERANCE 1  CLIP_VISIBLE_MINIMUM 2
  a band 346 wide, by how far its content reaches:
    346: 0
    347: 0
    348: 1
    370: 1
  a sentence in a visually-hidden box, by the room it has for content:
    1 x 1: 0
    1 x 17: 0
    2 x 1: 0
    2 x 2: 1
```

The tolerance is a strict `>`, so a shortfall of exactly one is dropped and two is
kept. Worth one sentence on why that boundary is where it is and not at three or
at zero: it is the smallest number that absorbs a fractional layout rounded to an
integer, and anything larger would start hiding real single-pixel overlaps.

The second block is the more interesting one, and it is the row `1 x 17` that
earns the design. A visually-hidden announcement is `width: 1px; height: 1px`
until a stylesheet puts padding back on it — and the first page this instrument
was pointed at had exactly that: `24 x 17` as a client box, `1 x 1` as a content
box, reported as a 142-pixel reach in a 24-pixel box. **Both dimensions have to
be under the minimum**, because a one-pixel-wide box a reader could see is a
different thing from the hiding pattern, and `2 x 1` being dropped is that rule
being symmetric rather than special-cased.

### Exercise E — the two readings the browser throws away, handed to the arithmetic

```ts
describe("E", () => {
  it("hands clippedFrom the two readings the browser throws away", () => {
    const halo: ClippingBox = { ...BAND, element: "the rim of a lit card", reach: 350, width: 346 }
    const scroller: ClippingBox = {
      ...BAND,
      element: "a code block that scrolls sideways",
      reach: 1253,
      width: 348,
    }

    for (const box of [halo, scroller]) {
      const verdict = clippedFrom([box])
      console.log(`  ${box.element}`)
      console.log(`    reaches ${box.reach} in ${box.width} — reported: ${verdict.length === 1}`)
    }

    console.log(`  fields clippedFrom is given: ${Object.keys(halo).sort().join(", ")}`)
    console.log(`  of those, any naming position or overflow: ${Object.keys(halo).some((key) => /position|overflow/i.test(key))}`)
  })
})
```

```
  the rim of a lit card
    reaches 350 in 346 — reported: true
  a code block that scrolls sideways
    reaches 1253 in 348 — reported: true
  fields clippedFrom is given: contentHeight, contentWidth, element, reach, width
  of those, any naming position or overflow: false
```

Both reported, and `clippedFrom` is right to report them. Predict 3's two
features arrive here as a four-pixel shortfall and a 905-pixel one, and nothing
in the five fields it is handed could tell either of them from the band in
exercise C.

So the two exclusions that matter most are **not filters at all**. They are the
walk refusing to take the reading: `position: absolute` and `position: fixed` are
skipped, and anything whose own `overflow-x` is not `visible` stops the descent.
The general rule is the one to carry: **a filter downstream can only be arithmetic
if the fact it needs survived the trip.** Decide what to exclude at the point
where you still know why.

### Exercise F — the line a report quotes, and what the exit code is a function of

```ts
describe("F", () => {
  it("prints the line a report quotes, and what the exit code is a function of", () => {
    const many = Array.from({ length: 7 }, (_, index) => ({
      element: `box ${index + 1}`,
      reach: 500 - index * 10,
      width: 346,
    }))

    for (const result of [
      shot("a-clip-hides-an-overflow-bold-phone", clippedFrom([BAND])),
      shot("a-page-with-nothing-wrong-with-it", []),
      shot("seven-boxes", many),
    ]) {
      console.log(`  ${describeShot(result)}`)
      console.log(`    exit code would be: ${result.overflowed ? 1 : 0}`)
    }
  })
})
```

```
  a-clip-hides-an-overflow-bold-phone  390x844@2x touch  scrollWidth 390 / innerWidth 390  ← 1 clipping box hides content
    div > div > div  "ReferencethemeSelectionSchemaThe heading above …"  content reaches 370 in 346
    exit code would be: 0
  a-page-with-nothing-wrong-with-it  390x844@2x touch  scrollWidth 390 / innerWidth 390
    exit code would be: 0
  seven-boxes  390x844@2x touch  scrollWidth 390 / innerWidth 390  ← 7 clipping boxes hide content
    box 1  content reaches 500 in 346
    box 2  content reaches 490 in 346
    box 3  content reaches 480 in 346
    box 4  content reaches 470 in 346
    box 5  content reaches 460 in 346
    …and 2 more
    exit code would be: 0
```

The first line is the real one — it is what the harness printed on the committed
specimen, which you can reproduce with the command in
[`tools/specimen/README.md`](../tools/specimen/README.md).

**All three exit zero**, and the middle one is a page with nothing wrong with it.
The specimen whose entire reason for existing is to be a page with a word off the
edge of it passes the run. Predict 4, executed: that is the decision, it looks
like a bug every single time you read it, and it is the reason the measurement
still exists to be read at all.

The seventh box is the other half of the line's design. The count is always
exact — *7 clipping boxes* — and the list is the worst five, because a page with
forty is a page with one cause and forty lines is a wall a lane scrolls past.

### Exercise G — which half of the instrument a test in this repository can reach

```ts
describe("G", () => {
  it("asks which half of the instrument a test in this repository can reach", () => {
    const read = (file: string) => readFileSync(join(ROOT, "tools", "specimen", file), "utf8")
    const files = { "capture.ts": read("capture.ts"), "playwright.ts": read("playwright.ts") }
    const suite = read("specimen.test.ts")
    const browser = files["playwright.ts"]

    /** Present as something that runs, present only in a sentence about it, or absent. */
    const how = (src: string, api: string): string =>
      withoutComments(src).includes(api) ? "in code" : src.includes(api) ? "in prose" : "no"

    for (const api of ["getComputedStyle", "getBoundingClientRect", "createRange", "clientWidth", "querySelectorAll"]) {
      const where = Object.entries({ ...files, "specimen.test.ts": suite })
      console.log(
        `  ${api.padEnd(22)} ${where.map(([file, src]) => `${file} ${how(src, api).padEnd(8)}`).join(" ").trimEnd()}`
      )
    }

    const declared = [...browser.matchAll(/^(export )?const (\w+) = /gm)]
    const shipped = declared.flatMap(([, , name]) => {
      const sent = ["evaluate", "evaluateAll"].find((one) =>
        new RegExp(`\\b${one}\\(${name}\\)`).test(browser)
      )
      const took = new RegExp(`const ${name} = \\(([\\s\\S]*?)\\)(: [^\\n]*)? =>`).exec(browser)?.[1]

      return sent === undefined ? [] : [{ name, sent, took: took === "" ? "nothing" : (took ?? "?") }]
    })

    console.log(`  top-level consts in playwright.ts: ${declared.length}`)
    console.log(`  of those, handed to the page: ${shipped.length}`)
    for (const { name, sent, took } of shipped) {
      console.log(
        `    ${name.padEnd(18)} ${sent.padEnd(12)} takes ${took.padEnd(24)}` +
          ` named in the suite ${withoutComments(suite).includes(name)}`
      )
    }

    console.log(`  what the suite's two doubles do with the function they are handed:`)
    for (const double of ["evaluate", "evaluateAll"]) {
      const answer = new RegExp(`${double}: async <TValue,>[\\s\\S]*?\\n\\s*return ([^\\n]*)`).exec(suite)
      console.log(`    ${double.padEnd(12)} return ${answer?.[1] ?? "(nothing matched)"}`)
    }
  })
})
```

<!-- moves: this fence is a second copy of facts about tools/specimen/, which is
     Loom daily build's. A function added to playwright.ts, a sixth faculty, or a
     change to either of the suite's two doubles moves it, and the right response
     is to re-run the exercise and paste in what it prints now. Then say so on
     the pull request, because the paragraphs under it are prose about these lines
     and no check reads prose: on 2 October a test for readBoxes moved
     three of them, the numbers were corrected from outside this lane and the
     paragraph was left asserting the opposite, and the lesson contradicted its
     own transcript on main for two days. -->

```
  getComputedStyle       capture.ts no       playwright.ts in code  specimen.test.ts no
  getBoundingClientRect  capture.ts in prose playwright.ts in code  specimen.test.ts in code
  createRange            capture.ts no       playwright.ts in code  specimen.test.ts no
  clientWidth            capture.ts in prose playwright.ts in code  specimen.test.ts no
  querySelectorAll       capture.ts no       playwright.ts in code  specimen.test.ts in prose
  top-level consts in playwright.ts: 11
  of those, handed to the page: 4
    measureDocument    evaluate     takes nothing                  named in the suite false
    readClippingBoxes  evaluate     takes nothing                  named in the suite false
    readBoxes          evaluateAll  takes elements: Element[]      named in the suite false
    pinNavigation      evaluate     takes nothing                  named in the suite true
  what the suite's two doubles do with the function they are handed:
    evaluate     return { scrollWidth: 390, innerWidth: 390, clipped: [] } as TValue
    evaluateAll  return body((matched[where] ?? []).map(elementOf))
```

Five things, in the order they should bother you. And one change to the program
before them: the first column is a classification rather than a boolean, because
the paragraph that used to sit here did that classifying by hand — *that one is in
a doc comment, a sentence rather than a call* — and a hand-written sentence under
a transcript is the one thing nothing in this course checks. The second section
after this one is the account of what that cost.

**The faculties the reading is made of are executed against a laid-out page by
nothing in this repository.** `playwright.ts` is `in code` on every row and is the
only file that is. Both of the suite's own sightings are something else:
`getBoundingClientRect` is `in code` there because the suite *stubs* it — a function
property on an object literal cast to `Element`, with the numbers `readBoxes` reads
sitting behind it and no layout anywhere near them — and `querySelectorAll` is `in
prose`, a doc comment explaining why the reading goes through a locator *instead
of* one. The two `in prose` rows on `capture.ts` are the same kind of thing: a
sentence naming which number `width` is, and a note that `getBoundingClientRect`
is fractional and so this reading is too.

**One of the functions handed to the page can now be run by a test, and what
decides that is its signature.** This is the one to sit with. `measureDocument`,
`readClippingBoxes` and `pinNavigation` take **nothing**: each reaches for
`document` or `window` itself, so a double has nothing to hand them and the only
thing it can do is answer in their place. `readBoxes` takes `elements:
Element[]`. It is handed what it reads, so a test can hand it six numbers on a
cast object literal and the real loop — the one that actually ships to the
browser — runs in Node.

That is lesson 05's injected clock, arriving in a measuring instrument eleven
lessons later and not announcing itself. Nothing was made testable by trying
harder. **A function that is handed what it reads can be run where there is
nothing to read**, and a function that fetches its own subject cannot be run
anywhere but a page. The split that mattered here was never *in the page* against
*in Node* — it is *passed in* against *reached for*, and it cuts across the
browser's side of the line rather than along it.

**So the two doubles are not two attempts at one thing.** The last two lines are
the whole difference, printed from the suite rather than described: the
`page.evaluate` double returns a reading somebody typed, discarding the function;
the `evaluateAll` double returns `body(...)`, running it. The first asserts that
the measurement was requested and nothing whatsoever about what it would return.
The second asserts the reading itself — and both are correct, because the
function the first one is handed cannot be run here and the function the second
one is handed can.

**And the function the suite names is not the function it runs.** `pinNavigation`
is the only one of them named in the suite's code, because the double's
journal records `evaluate ${body.name}` and a test can assert that the adapter
asked the page to run it. That is a real assertion and it is worth having; it is
also the whole of what is available for that function, which is a name and never
a result. `readBoxes` is named in the suite's code **nowhere** — only in a doc
comment — and it is the one the suite actually executes, through two layers of
double, under a test about selectors. *Is it named* and *is it run* are
independent here and distributed opposite ways round, which is lesson 29's
mistake in a new coat: a question about a declaration that names one reader as
*the* reader answers correctly and tells you nothing.

None of this moves the lesson's own thesis, and it is worth saying why rather
than leaving it implied. What a test can now reach is what `readBoxes` does
**with six numbers it was given**. Where those numbers come from — a real element
in a real layout, under whichever font loaded — is exactly as unreachable as it
was, which is the fault this lesson is about. The functions that reach for their own
subject are also, between them, where every rule that makes this instrument any good
lives: the walk, the stop condition, the text range, the out-of-flow skip. The one
that became testable is the shortest of them and has no rule in it at all.

---

## Found by running it: the course's own checker has a scope, and the scope is `src/`

This lesson prints no TypeScript declaration from `capture.ts`, and the first
draft did.

`declarations.test.ts` on the lessons surface holds every type a lesson prints in
a `ts` fence against the declaration in `src/` it claims to be — member by
member, and whole where the fence prints the type whole. It was written after
lesson 11 printed a network boundary taking one argument for six days after
[0140](../decisions/0140-a-model-request-carries-the-deployment-that-asked-for-it.md)
gave it a second one.

Print `ClippedOverflow` in a fence here and that check does something worse than
fail: it classifies the fence as a declaration the *lesson invented for its own
exercise*, held to nothing, and increments a pinned count of those. Which is
correct by its own rules and wrong about this fence, because `ClippedOverflow` is
not invented — it is a real declaration, in a real file, that this lesson would
be quoting. The check's population is `src/`, and the three rows of the *In the
code* table that matter most to this lesson are not in `src/`.

That is lesson 23's question — *what is the scope of the thing you just named, and
is the checker allowed to see all of it?* — arriving in this course's own
machinery, in the one lesson whose subject is a fact that lives outside the place
everything checks.

Nothing is broken, and the remedy taken here is the cheaper of the two available
and the better one on lesson 28's reasoning: **this lesson does not print the
type.** Exercise E derives the field list from the object at run time instead —
`Object.keys(halo).sort()` — which is not a second copy of the declaration and
cannot drift from it, because it *is* it. Widening the checker to a second source
root is the other remedy, it is a real one, and it is a change to the surface
rather than to a lesson.

---

## Found by being wrong for two days: the number moved and the sentence under it did not

On 2 October a change to the harness added a unit test for `readBoxes`, and this
lesson's exercise G went red within the hour — which is the course working, since
every exercise here is compiled and run against the checkout on every build. The
lane that made the change did what the convention asks: it read the new output and
corrected the three lines that had moved, from outside this lane, because leaving
a red suite for somebody else is worse.

What it did not do is rewrite the paragraph underneath, and it was right not to.
A forced cross-lane edit may move a **number**; the moment it moves a **sentence**
it is one routine quietly authoring another's teaching. So it filed the
contradiction in `FINDINGS.md` and left it visible, and `main` carried a lesson
whose transcript said `specimen.test.ts in code` directly above a paragraph that
read *no DOM reading API appears in the suite at all*. For two days this lesson's
own output was the thing that falsified it.

**Every check in this course passed throughout, and each for its own reason.** The
exercise compiled and ran. The transcript matched the run, because it had been
corrected. The claims registry holds a *counted* phrase against the list it counts,
and *no DOM reading API at all* counts nothing — it is a claim about a list with no
number in it, which is the cheapest second copy a sentence can carry and the one
this sentence declined. The declarations check holds a printed type against its
declaration, and this exercise prints none. Four mechanisms, all green, none of
them asked.

That is lesson 28 happening to the course that teaches lesson 28. A paragraph of
prose about four files has no second copy anywhere, so there is nothing to compare
it to, and *check harder* is not on the menu. Three things were done about it, in
increasing order of what they buy:

1. **The classification is printed rather than asserted.** The first column used to
   be `true` or `false` and the paragraph did the interesting work in prose — *that
   one is in a doc comment, a sentence rather than a call*. It is `in code`, `in
   prose` or `no` now, derived by stripping the comments and looking again, so the
   claim that went stale is output and drifts like any other line. This is the
   first of lesson 28's three remedies and the only one whose obligation is
   discharged by a program.
2. **The fence carries a `moves:` mark** — the third in this course, and the first
   that is not about `src/primitives/`. Its message says that the lines are a
   second copy of another lane's files, that re-running and pasting is the right
   response, and then the part that is the actual lesson of 2 October: *say so on
   the pull request, because the paragraphs under it are prose about these lines.*
3. **What the mark cannot do is written down instead of implied.** It buys a
   message and never a verdict, and a lane that pastes in a corrected line and
   says nothing leaves this paragraph exactly as stale as it was on 3 October. The
   construct is a channel between maintainers, and the value of a channel is that
   somebody reads it.

**And the derivation immediately found something the hand-classification had been
wrong about since the day it was written.** The old paragraph accounted for one
prose sighting on the `capture.ts` column — the `clientWidth` in the doc comment
naming which number `width` is. There are two: `getBoundingClientRect` is in that
file as well, in the note explaining that layout is fractional and so this reading
is too. Nobody noticed, nobody could have, and the first run of the classifier
printed it. Which is the smaller half of the same finding: a sentence that
enumerates is a sentence that can be incomplete, and the only cheap defence is to
stop enumerating by hand.

---

## It could have been otherwise

**`scrollWidth`, and accept the two false positives.** One property access instead
of a walk, and a reading the browser already has. Rejected because of what noise
does to a report rather than because it is inaccurate: four pixels of clipped halo
on two of eighteen specimens, and a code block reported as hiding 905 pixels, are
two lines that teach a reader to skim the rest. The cost of the walk is real, and
it is the whole of exercise G: a loop with four rules in it, in the one file
nothing in this repository executes.

**Re-render every page with `overflow: visible` forced, and take the document
measurement again.** This was one of the three shapes the 27 September finding
offered, and it is the one that needs no new reading at all: unclip everything,
and the existing check sees through. Rejected because it measures a page that does
not exist. A backdrop that does not clip paints over the band beside it, so the
second render's layout is not the layout of the page anybody will see, and a
reading taken off it would name boxes that are only overflowing because you broke
the page to look.

**Write the limit down in `tools/specimen/` and leave it.** The third shape the
finding offered, and the honest version of doing nothing: the document
measurement cannot see through a clip, the README says so, a lane reading it
knows to look harder at a band in a backdrop. Rejected because *look harder* is
what the whole instrument exists to replace — and because the finding measured the
reach first, which turned a documentation note into an unacceptable one.

**Fold `clips` into `overflows` and fail the run.** Argued above and in the
record. The principled answer, rejected on what it would have done on the day it
shipped. Worth being clear that this is a decision with a shelf life rather than a
principle: once the repository's pages are known to be clean, the gate is the
right place for this, and the change that moves it there is a change somebody can
reason about because the measurement will already be a year of green lines.

**Let a shot assert something.** The deeper alternative, and the one with its own
record: give the harness a way to say *this element should be 346 wide* and the
whole family of faults becomes testable.
[0159](../decisions/0159-an-instrument-may-reach-a-state-and-may-never-assert-one.md)
refuses it. The steps a shot may take — click, fill, wait, waitFor, scrollTo —
each name a state to arrive at and none of them reports what is there, because
the moment one of them reports back the harness is a test runner with a camera
attached and every lane writes its journeys there instead of in Vitest. The two
readings this lesson is about are the exception that proves the line is drawn
somewhere real: they are taken by the harness itself, about the page as a whole,
and no shot can ask for one.

**Have the primitive declare that it cannot fit.** The move
[0206](../decisions/0206-a-primitive-declares-what-it-could-not-show-and-the-runtime-decides-whether-to-say-so.md)
makes for a row a primitive declined, applied here. It is not available and the
reason is the test from the end of *The idea*: a primitive asked whether its
heading fits has no idea. Nobody inside the system does.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections while
you write. Then compare.

1. **A colleague says: "this is just a screenshot test. Every front-end project
   has one and they are all flaky and everybody deletes them."**

   They have a real point about a real failure mode. Answer them on what makes
   *this* instrument a different proposition, in a form that mentions neither
   Loom nor screenshots: say what it measures instead of comparing, what it does
   with its verdict, and why those two choices are the same choice.

2. **Derive this lesson from lesson 14 and lesson 31, without looking at either.**

   Lesson 14 gave you the renderer as a total, pure projection of the tree.
   Lesson 31 gave you a thing that leaves no trace in any such projection, and
   concluded that the last moment it is visible is registration.

   Starting from those two and nothing else, derive why this seam's answer has to
   be a measurement rather than a declaration — and then derive *why the
   measurement had to be split in two*, and where the split falls. The second half
   is the one that transfers to work that has nothing to do with browsers.

Predict, before writing (2): the step most people skip is that *purity* is what
creates this seam rather than something that mitigates it. A render that could
ask how wide the window is would have no seam here and would have given up
everything lesson 14 bought.

---

## Self-check

Seven questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. State the general rule this seam is an instance of, in a form that mentions
   neither browsers nor layout: it should be a sentence about what you do when a
   fact is a function of inputs you do not own. Then give one example from outside
   Loom.
2. *Does this page overflow* is not a question about the page. Say why, by naming
   the inputs the answer is a function of, and say which of them anybody in Loom
   owns.
3. A `loom.backdrop` clips, and the one automated visual check in this repository
   is blind inside it. Say why the backdrop is right, why the check is right, and
   what the reach of the blindness is — the last part is the one most readers
   understate by a factor of twenty.
4. `scrollWidth` is the obvious reading and is wrong twice over. Name both
   features it reports as defects, and then say what the *cost* of a false line in
   a report actually is. Your answer to the last part should not be "it is
   inaccurate".
5. The instrument is split across two files. Say what decides which side a piece
   of it goes on, name one exclusion that can live on the arithmetic side and one
   that cannot, and state the general rule about why.
6. The new reading deliberately does not change the exit code. Give the argument,
   give the counter-argument, and then say what would have to be true for the
   decision to be revisited.
7. Of the functions this harness hands to a browser, a test in this repository can
   run one and cannot run the others. Say what decides that — your answer has to be
   about the functions' own signatures and not about anybody's effort — and then say
   what the suite is left asserting about the ones it cannot run, and what it is
   still unable to assert about the one it can. Finish by saying why lesson 29's
   remedy, instrument the place the thing happens, reaches none of them.

Question 1 is the one the rest of the lesson exists to support. Question 3 is
where a confident half-answer is most likely: *four bands in the catalogue* comes
to mind quickly and is the wrong number, and working out why is the part that
matters.

---

## Reflect

Write for two minutes, then move on.

- Predict 1 and your list of inputs. Nearly every first list has the viewport and
  the markup and stops. Look at what you left out — the font that actually loaded,
  the reader's minimum text size, which engine — and write down whether you left
  them out because they are rare or because you had never counted them as inputs.
  They are not rare.
- Predict 2 and your confidence. If you wrote *401 / 390, it fails* with high
  confidence, that is the most useful wrong answer in this lesson, and what to
  write down is the assumption underneath it: that a check which has been right
  for a year is right about the page in front of you. It was right about the page
  it was looking at. The page it was looking at had a lid on.
- Predict 3. If you could not name two features that `scrollWidth` would report,
  that is not a gap in your knowledge of this library — it is the lesson's actual
  difficulty. Writing a measurement is easy and knowing which readings are the
  system working is the entire job, and it cannot be done without knowing the
  system.
- Predict 4. Separate the principled answer from the one you would ship. If you
  had the new reading failing the run, write down what you think would have
  happened on the first morning it went red on somebody else's pull request.
- Now go and look at your own work. Find a fact that only exists after something
  you do not control has run — a layout, a query plan, a GC pause, a DNS answer, a
  retry. For one of them, write down: who inside your system knows it, what you
  currently do about it, and whether what you do is *measure it*, *have somebody
  declare it*, or *hope*. The three are not interchangeable and the first step is
  knowing which one you picked.
- Last, the general version. Find a check in your own work that you added
  together with its gate. Write down whether you would still know what it finds if
  somebody had switched it off six months ago — and then find one you added
  without a gate, and ask whether anybody has looked at its output since.

---

## Come back to this

Set AK in [`review-schedule.md`](review-schedule.md), two days after this lesson.
Interleaved with 14, 17, 25, 28 and 31 — heavy on 25, because *a check is bounded
by the population of values that pass through the place it runs* is this lesson's
whole second half arriving from the other direction; and on 17, because a
measurement that is not allowed to act on its own verdict is a shape this course
has met before.

Part V has fifteen seams now, and this is the first whose missing piece is not
missing from the system. Everything in the tree is present, correct and complete;
the primitive is right; the render is pure and total; the Gate has nothing to
weigh and is not failing to. The fault is a function of five inputs and Loom owns
one of them, so no amount of reaching, interpreting, comparing, instrumenting,
asking or closing could have produced it. The only move left is to go to where the
fact is made and take a reading.

And then the part that is actually hard, which is the part worth carrying.
Measuring is the cheap half. **Deciding which readings are defects is the
expensive half, and it cannot be done without knowing the system being measured**
— a clipped rim is decoration working, a sideways scroller is a feature
announcing itself, a one-pixel box holding a sentence is an accessibility pattern.
Every one of those is indistinguishable from the real fault in the numbers alone.
Two of the four exclusions are arithmetic and live where something can test them;
the other two had to be made at the point where the reading was taken, because that
is the last place the reason was still available.

So the question to carry into a sixteenth seam is not lesson 31's *when is this
last visible*, but the one Predict 1 asks and most first answers get wrong:
**what is this fact a function of, and which of those inputs does anybody in this
system own?** A seam where the answer is *all of them* is a check waiting to be
written. A seam where the answer is *one of five* needs an instrument, a reason
for every reading it throws away, and somebody willing to read a line that does
not fail the build.
