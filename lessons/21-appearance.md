# 21 — Appearance: the look a tree names and cannot check

**After this lesson you will be able to** say why letting a model write a colour
fails for a reason that has nothing to do with colour, and give that reason as a
property of the *value space* rather than as a ranking of dangers; state what a
tree carries when it wears a theme and why it is exactly three ids; explain why
there is no default theme and connect that refusal to what lesson 18 said a page
stops being a function of; predict the stakes level and the disposition of a
change that repaints every pixel on the page, and defend the answer; explain why
"can a reader read this" is a question neither the tree nor the palette can
answer alone, and name the two things that have to be declared before it can be
asked at all; say what separates a `painted` failure from a `composed` one and
why the second is reported rather than asserted; say what a check does when it
cannot measure something, and why that is a third answer rather than a pass; and
state, in one sentence you could apply to a design system that has never heard of
Loom, what a design token does and does not promise.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md), [08](08-two-axes.md), [09](09-the-gate.md),
[10](10-the-pipeline.md), [11](11-the-model-seam.md), [12](12-projection.md),
[13](13-refusal-and-repair.md), [14](14-rendering.md),
[15](15-primitives-and-the-registry.md), [16](16-persistence.md),
[17](17-telemetry.md), [18](18-data.md), [19](19-destinations.md),
[20](20-origins.md).

Lesson 20 ended by saying that the next Part V seam, if there was one, would be
found by applying the pattern and watching where it did not fit.

This one fits. **A name in the tree, a document in a registry, resolved before
the walk** — all three clauses, exactly, with none of lesson 20's exceptions.
And it was built before any of the three seams that produced the pattern.

So the first question this lesson asks is not "how does theming work". It is:
*why did a seam that fits the pattern perfectly not feel like the same thing for
three lessons?* The answer is that the three earlier seams all keep a **value**
away from a model, and this one keeps away a **value space** — which turns out to
be a different argument that arrives at the same shape.

And the second half is what makes it worth a lesson rather than a paragraph. The
property this seam exists to guarantee — that a reader can read the page —
belongs to neither side of the seam. The tree does not hold it. The palette does
not hold it. The primitive holds, at most, half of it. Working out where a
property like that can possibly be checked, and what it costs to check it there,
is the actual subject.

---

## Warm-up

Closed book, five minutes, mixed across six lessons. Write something for all
five before you look anything up.

1. `loom:submit` and `loom:theme` are both keys the runtime owns rather than
   keys a primitive declared. Say what the runtime does with a reserved key
   *before* the props validator runs, and then say what would break if it did
   not. *(15, 19)*
2. Lesson 07 separated measurement from judgment. State the separation as a rule
   about what each half is *allowed to do*, and name one place in Part IV where
   the same separation appears under a different name. *(07, 15, 17)*
3. A three-node tree — a page, a card inside it, a line of text inside that —
   is built by the fixtures. Give the id of the **root**, and say why. *(04)*
4. The model is shown a catalogue rather than the registry. Name two things the
   catalogue leaves out and, for each, give the rule that decides it is left
   out. *(12, 15)*
5. `resolveFrame` returns a refusal for a value it cannot use rather than
   throwing. Name the discipline, name where it was established, and say what it
   means for a caller who has no idea what to do with the failure. *(05, 14, 20)*

Question 3 is the one to be exact about rather than approximately right about —
the exact answer comes back in Try it, and the two versions of "roughly the top
one" are not the same claim.

---

## Predict

**In writing, before reading on.** Four questions. Question 2 is the one to have
a confidence number against, and question 4 is the one nobody gets from first
principles.

1. A deployment asks its model: *"make this page warmer."* You have lessons
   18–20 in hand, so you already know the answer will involve a registry. Write
   down two things:

   **(a)** what the deployment registers and what the tree carries; and

   **(b)** the delta the model emits — how many operations, against how many
   nodes, and what each one does. Be exact about the counts. A page with sixty
   nodes in it is the case to answer for.

2. A host registers its own palette. Their brand blue is a light, friendly blue,
   and their secondary text is a soft grey; put on the white card they also
   specified, that grey measures **3.0:1**, well under the 4.5:1 that body text
   is meant to meet. **Which part of Loom stops them?** Choose from: the palette
   schema, the theme registry, the Gate, the renderer, or something else. Write
   your answer and **rate your confidence 1–5**.

3. Two proposals arrive against the same page. One swaps the entire colour
   scheme — every background, every text colour, the accent, the borders. The
   other rewrites the page's title from "Home" to "Home page". **Which one does
   the Gate route more carefully?** Give the stakes level you expect for each
   and the disposition each gets under the default policy.

4. A contrast ratio tells you whether text is legible against the ground behind
   it. **Name a different property a palette owes its reader that a contrast
   ratio cannot detect at all** — not "detects poorly", cannot detect. Then, to
   prove it, describe a pair of colours where the ratio gives the most reassuring
   possible answer and the reader's actual experience is the opposite. If you
   can name the property but not construct the pair, write the property down
   anyway and say what you would need to know to build the example.

Do not read on until all four are written. Question 1 is the one most readers
get wrong in an interesting way — the registry half is usually right and the
delta half is usually off by fifty-nine operations, and the gap between those two
answers is most of this lesson.

---

## The problem

### The obvious answer, and the four ways it fails

Let the model write colours. It is what every code-generating assistant does,
and it is what a design tool exports:

```json
{ "op": "configure", "nodeId": "n_17", "set": { "color": "#8b96a3" } }
```

Start with why this is not merely inelegant.

**It puts an unbounded value space inside the one part of the system built to
bound one.** Everything from lesson 01 onward is the same trade: AI produces a
`TreeDelta`, and a `TreeDelta` is short, ordered, discrete, and drawn from a
closed vocabulary — four operations, registered primitive types, declared props.
A colour written as a string has sixteen million values and no wrong ones. There
is nothing for a reviewer to disagree with, nothing for a policy to be about, and
no sense in which one proposal's `#8b96a3` is more or less correct than another's
`#8b96a4`. The Gate can weigh a change to a *protected prop key*; it cannot weigh
a change to a colour, because "which colour" is not the kind of question it is
built to have an opinion about.

**A re-theme becomes sixty operations against sixty nodes.** This is the half of
Predict 1 that separates the answers. "Make it warmer" is one intent and one
decision, and if colour lives on nodes then it arrives as a delta the length of
the page. Everything the earlier lessons built then degrades at once: the
analysis in lesson 07 reports a broad change touching every node in the tree; the
stakes assessment in lesson 08 sees the breadth factor fire; the Gate in lesson
09 escalates; and the reviewer in lesson 10 is handed sixty operations to approve
as one act. None of that is wrong — the machinery is correctly reporting what it
was given. It was given the wrong shape of change.

**Nothing can be checked.** Whether a page is legible would become a property of
which nodes happen to be in this tree today. There would be no artefact anybody
could audit, because the "palette" would exist only as the distribution of hex
strings across a particular document. A deployment could not answer "are our
pages readable" except by rendering all of them and looking.

**Two deployments of the same library could not disagree about their look.** Or
rather, they could only disagree by having different trees — so a tree could not
be moved between them, and "the same page in our dark theme" would be a fork
rather than a setting.

### The second obvious answer, which is worse in a more interesting way

So put the colours in the deployment. The host configures a theme, the renderer
mounts it, and the tree says nothing about appearance at all. Clean separation;
the model never touches a colour.

This is the one to think about, because it is what most systems do and because
the reason it is rejected is a sentence you already met in lesson 18.

Lesson 18 was about a page that stops being a function of the tree alone. When a
node names a query and the answer arrives from somewhere else, a reviewer who
approved the tree has approved a *shape* and not a *page*, and lesson 18 spent
its length on what that costs and what has to be true for it to be worth paying.
A host-supplied default theme is the same trade, made for something that does not
need it. The comment in `render/theme.ts` says so directly:

> There is no fallback theme, deliberately. A host-supplied default would mount
> a look the tree does not name, which makes the page a function of deployment
> config as well as of the tree.

Read the distinction carefully, because it is finer than "the deployment owns
nothing". The deployment absolutely owns what the names mean — it registers the
palettes, and the same tree renders in different colours on two deployments. What
it may not own is **whether the tree said anything**. A tree that names no theme
does not get one. It renders unstyled, which looks broken, and looking broken is
the intended behaviour: the alternative is a page that renders differently on two
deployments while the tree that was reviewed is identical and silent about it.

The difference between the seams, in one line: **a query's answer cannot be in
the tree, and a look can be named there.** So the answer is fetched and the look
is named, and Part V's four seams are not four instances of one rule but two
different answers to "who owns this", sorted by whether naming is possible.

### The half nobody finds on their own

Now the part that is not about registries.

Suppose you have solved everything above. The tree names a palette, the
deployment registers one, and the model chooses from a list. Here is the question
that matters to the person reading the page:

**Can they read it?**

Contrast is not a property of a colour. It is a property of a *pair* — an ink and
the ground behind it. So ask who holds the pair:

- **The tree** holds a palette id and a structure. It holds no colours at all.
- **The palette** holds seventeen colours and has no idea which of them are read
  as text on which others. It is a bag of slots; nothing in it says `fg-subtle`
  is ever printed on `bg-surface-muted`.
- **The primitive** holds, at most, one end. `loom.callout` paints a muted well
  and puts default ink on it, so it holds both. But `loom.perk` writes its
  excluded-item note in `fg-subtle` and paints no ground at all — the ground is
  whatever it was placed inside, and [0008](../decisions/0008-the-renderer-is-a-total-pure-projection.md)
  forbids the renderer from enforcing parentage, so *any* surface is a legal
  parent.

Three parties, none of whom holds the question. That is the actual problem this
half of the seam solves, and it is worth sitting with before reading the answer,
because "add a contrast check" is an answer to a question nobody has managed to
ask yet.

---

## The idea

### The tree carries three ids

A theme is three registered documents, addressed by id: a **palette** (colour), a
**font pack** (type), and a **style preset** (radii, spacing, motion, density).
Three rather than one because they vary independently in practice — a dark mode
swaps the palette and nothing else; a rebrand swaps the type ramp and keeps the
radii.

What the tree carries is the selection, on the root node, under a reserved key:

```json
{
  "loom:theme": {
    "palette": "editorial",
    "fontPack": "editorial-serif",
    "stylePreset": "comfortable"
  }
}
```

`loom:` is a **reserved namespace**. Keys under it belong to the runtime: they
are read by the render root and removed from the props bag before either the
props validator or the primitive sees it. That is not tidiness. A root primitive
declaring a strict schema would reject a key it never asked for — blanking the
page over the theme rather than wearing it — and, more importantly, it is what
lets the system make this promise:

> a primitive reads `var(--loom-accent)` and never learns which palette is
> mounted

A primitive that could read the palette id could branch on it. One that cannot is
one you can re-theme without reading it. The prompt sent to the model says the
same thing from the other side: this is *"the one prop that is not declared by a
primitive."*

Two normalisations make the rest work, and both are worth stating as rules
rather than as facts about this codebase.

**Every palette declares every slot.** Not "may declare"; must. The refinement on
`paletteSchema` fails a palette missing one. The consequence is the whole point:
a tree themed with one palette can be re-themed with **any** other, because there
is no slot a primitive might read that some palette leaves undefined.

**The ramps have a fixed number of steps** — eight, for both the type scale and
the spacing scale. Same reason: a primitive asking for `--loom-spacing-7` must
get a length from any registered preset, or a re-theme silently unstyles it. A
ramp whose length varied would make "renders under both palettes" a property of
which two you happened to pick.

Notice what both rules buy. They make *substitutability* a property of the
vocabulary rather than a property of the particular pair you tested.

### Resolved once, at the root, before the walk

The registry is the same shape as the primitive resolver from lesson 15: three
ids in, three documents or a refusal out. It has a `catalogue()` for the model
and a `resolve()` for the renderer, and it refuses four ways — unknown palette,
unknown font pack, unknown style preset, malformed selection — with the
registered ids in the error, because *an id it was never told about is an id it
can only guess.*

Resolution happens once, from the root, before the walk begins. There are four
outcomes and it is worth knowing all of them, because three of them are ways of
not being themed and they are deliberately distinguishable:

| Outcome | When | What the page does |
| --- | --- | --- |
| `themed` | the root named a selection and it resolved | the variables mount on the root element |
| `unthemed` | no node named a theme | renders unstyled, and reports nothing |
| `unresolved` | named, and the registry refused it | renders unstyled, reports `theme-unresolved` |
| `unregistered` | named, and this render was given no registry | renders unstyled, reports `theme-unregistered` |

And a fifth case that is not an outcome of resolution at all: a node **below** the
root carrying `loom:theme` is reported as `theme-misplaced` and ignored. One tree
wears one theme; the variables cascade.

The resolved theme is flattened into CSS custom properties by `themeVariables` —
a pure function, like the renderer it feeds, so two requests for one revision
cannot disagree about what the page looks like any more than they can disagree
about what it contains. Custom properties rather than class names or inline
styles on every node, for the reason above: a primitive reads `var(--loom-accent)`
without knowing which palette is mounted, so re-theming a tree changes nothing
about the tree and touches no primitive.

### So a re-theme is one operation — and the Gate weighs it as one

This is where Predict 1 and Predict 3 come back together.

"Make it warmer" is a `configure` on the root node setting three ids. One
operation, one node, whatever the size of the page. It is gated, attributed,
logged and reversed by exactly the machinery of Parts II and III — nothing new
was built for it, which is the argument for the shape rather than a happy side
effect.

Predict 3 asked which the Gate routes more carefully: repainting the page, or
rewriting its title. Run it (Exercise D) and both come back `low`, no stake
factors, reversible, `accepted`.

Most readers find that wrong on first reading, and the disagreement is worth
having explicitly, because it is lesson 08 arriving in a place where it feels
uncomfortable. The two axes are **stakes** and **reversibility**, and stakes are
about *damage*, not about *visibility*. A re-theme:

- touches one node, at depth 0, and adds and removes nothing structural;
- discards no work, redirects no submission, removes no protected type;
- is exactly reversible, and the inverse delta is the three previous ids.

Every axis the system measures says this is a small change. And it is right. The
page looks completely different and **nothing is lost** — the content is
identical, the structure is identical, and one operation puts it back. A system
that escalated on visual magnitude would be measuring how surprising a change
looks rather than what it costs to be wrong about, and lesson 07 is the lesson
that says why those are different questions and which one belongs in the
analysis.

If you want a re-theme held for review at your deployment, the composition
already exists and does not need a new axis: name `loom:theme` in the policy's
protected prop keys and it becomes a stake factor like any other.

### What the model is told

The catalogue is ids, names and one-line descriptions. No hex, no font stacks, no
numbers:

```json
{ "id": "editorial", "name": "Editorial",
  "description": "Restrained, high-contrast magazine palette with a single muted accent." }
```

This is lesson 12's rule with a new subject: a projection contains what the model
needs to make its decision and nothing else. The decision is *which registered
look best answers "warmer"*, and that decision is made from the description. The
hex values would be sixteen more tokens per palette and would introduce exactly
one new capability — the ability to reason about a colour it may not write.

The prompt block adds one instruction that is pure operations, and it is there
because of a schema rule rather than a style preference:

> Give all three every time, even when only one changes — a selection missing a
> key does not resolve and the page renders unthemed.

`themeSelectionSchema` requires all three keys. A model that emitted only the
changed one would produce a page that renders unstyled with a
`theme-unresolved` diagnostic, which is a worse answer than "I did not
understand". The strictness is right — a partial selection has no sensible
default, and merging one into the current selection would mean resolution
depended on the tree's previous state — so the cost is paid where it is cheapest,
in one sentence of the prompt.

### The property nobody owns, and the only place it could go

Back to the question with no owner: can a reader read this?

The answer has three parts, and each one is a thing that had to be **declared**
because nothing could derive it.

**First, the pairings.** Which ink lands on which ground is a fact about the
component library, and it is now derived from the components rather than listed
by hand — `registryPairings` probes every registered primitive and reports what
each one paints. That derivation exists because the hand-written list had a
comment claiming it was read off the primitives, and it was: *once, by a person,
and then five primitives landed.* The failure mode is the quiet one — the audit
reports no failures because it never looked, and a host asserting the failure
list empty gets a green tick for a pairing nobody measured.

**Second, the split between painted and composed.** A pairing where one primitive
sets both the ink and the ground beneath it is `painted`: both ends are the
component's own, no container can change either, and a palette that fails one has
a page in it nobody can read and no tree can avoid. A pairing where the primitive
sets an ink and paints no ground is `composed`: the ground comes from whatever it
was placed in, and since any surface is a legal parent, the composed set is
strictly larger than the set anybody was maintaining by hand.

**Third, and this is the one that cannot be derived at all: which grounds the
text ramp is *meant* to work on.** The probe can see that `loom.action` puts
children on `accent` and that `loom.page` puts them on `bg-canvas`. Nothing in
either component says the first is a filled control that has already answered
what colour its text is, while the second is a page surface where a child brings
whichever ink it likes. **Both set an ink beside a ground and only one of them
means it.** So five grounds are declared — `bg-canvas`, `bg-surface`,
`bg-surface-muted`, `accent-subtle`, `bg-overlay` — and a ground on that list is
one where a palette owes the reader every ink in the ramp. There were four until
21 September; the fifth arrived when the probe learned to follow a ground painted
by a stacked sibling and found that `loom.overlay` had been writing on one all
along.

Get the shape of that argument, because it generalises past colour. A probe can
observe what a component *does*. It cannot observe what the component *means* by
doing it, and a check whose correctness depends on meaning needs the meaning
declared next to it, with a test that the declaration still matches what the
components actually render.

### It reports; it does not decide

Now the part that surprises people who expected a guarantee.

`auditPalette` is a function a host runs against its own palettes. It is not a
refusal at registration. `createThemeRegistry({ palettes })` *replaces* the
starter list, and a host supplying its own gets `paletteSchema` — which checks
that every slot holds a colour and has no idea which slots are read as text on
which — and nothing else. **A host palette with a 2:1 subtle registers, resolves,
re-themes and renders.** Exercise E is that sentence, executed.

The reasons are worth separating from the mechanism.

It is the cheap half of the answer, and deliberately the whole of it. The
expensive half would decide whether Loom *enforces* accessibility on a host or
merely meets it itself — and it would reject palettes that are legal today, which
is a thing a library may not quietly start doing to its hosts.

And it is the same bargain you have already met three times: `analyzeDelta`
measures and the Gate judges (lesson 07); `auditRegistry` reports on a primitive
and refuses nothing (lesson 15); the confidence calibrator measures and is not
allowed to act on what it finds (lesson 17). Each time, the argument was that
whoever *imposes* has to be the party who owns the consequences. A library that
refused a host's brand colours at startup would be making an accessibility policy
decision on behalf of an organisation whose legal obligations it does not know.

What keeps the reporting honest is the split, and one rule about it: **nothing may
be demoted.** A pairing any primitive paints is `painted` whatever else also
composes it, and a test fails if the declared basis is softer than the
derivation's. A second, softer list is exactly where an inconvenient failure would
go to be forgotten, so the door into it is nailed shut from the derivation side.

The starter library's own two composed failures are listed rather than omitted —
`accent` on `accent-subtle` is 4.43:1 in `plum`, `fg-subtle` on `accent-subtle`
is 3.76:1 in `carbon` — because *an audit that is silent about the pairings it
would fail is the exact fault the derivation was built to fix.* Which to move,
the panel or the ink, costs something either way. Until that is decided, the
failures are carried in the open.

### A check that cannot answer says so

`colourSchema` accepts more than hex: `rgb()`, `hsl()`, a named colour,
eight-digit hex with an alpha. The contrast module measures three- and six-digit
hex and answers `undefined` for everything else, and an unmeasurable pairing goes
into its own list — neither a pass nor a failure.

The reasons for declining are worth reading as three different reasons rather
than one:

- a **named colour** needs the CSS colour table, which is 148 entries of
  vocabulary this module would then own;
- **`hsl()` and modern `rgb()`** are a parser, and *a parser that is subtly wrong
  reports a passing ratio for a failing pair*, which is worse than reporting
  nothing;
- an **alpha** composites against whatever is behind it, so its contrast is not a
  property of the two slots at all.

Only the third is a fact about colour. The first is about scope and the second is
about which direction an error runs in — and the second is the one to carry
forward, because "it might be wrong" is a bad reason to omit a check and "it
would be wrong in the direction of reassurance" is a very good one.

Separate lists rather than counting unmeasured as failures, for the reason
`notProbeable` is separate in the registry audit: a host that wants the guarantee
asserts both empty, and a host whose palette is written in `hsl()` can tell
*unreadable* from *unmeasurable*.

### And then the half that was missing for months

Everything above checks whether an ink can be read on its ground. Here is what it
does not check.

On 23 August, `loom.emphasis` asked for `weight("heading")`, got a font pack that
declares the same weight for headings and body, and rendered a stressed word
identical to the words either side of it. Every test passed. **Every test asked
whether the token was real.**

The general form is the sentence this lesson exists to leave you with:

> **A token is a promise about provenance, not about difference.**

`weight("heading")` promises that the value came from the font pack's heading
weight. It promises nothing whatsoever about that value being different from the
body weight — and "this word is stressed" is a claim about difference. The same
hole exists for colour: a link inside a paragraph, a quiet note under a less
quiet one, a card's fill against the page behind it. Both halves are the
palette's promise and only one of them was being checked.

So there is a second audit, and it is not a second contrast bar. Two colours can
differ in hue while matching exactly in luminance — a contrast ratio of 1.00:1
between two colours a reader tells apart instantly. Exercise G runs that pair.
Asking WCAG's question about *difference* would report as identical a pair anybody
can distinguish, and would miss a pair that differs in luminance alone by less
than an eye can resolve.

It measures CIELAB ΔE instead, against a threshold that is **borrowed rather than
invented**: the just-noticeable difference is a published property of human
vision, not a number chosen to fit these palettes. That distinction is the
defence against the failure mode of every such check — a bar quietly set where
the current values happen to sit.

Three details of how it is built are each a small argument:

- **CIE76 rather than CIEDE2000**, knowing CIE76 is the cruder metric. It is
  twelve lines a reviewer can check against the formula, where CIEDE2000 is a
  page of rotation terms nobody reviewing a palette would verify — and the error
  runs in the safe direction for the one thing asserted: *a pair CIE76 calls
  collapsed is collapsed under any metric.*
- **`colour-only` versus `also-marked`**, as a discriminated union rather than an
  optional field, so a pair cannot be declared as carried by something else
  without naming what that something is. A claim that a border does the work is
  only worth making if the border can be measured too — and it is, against
  whichever of the two colours it is *nearer* to, because a rule that disappears
  into one side of the boundary it draws has stopped drawing it.
- **The starter palettes are not asserted clean.** The test pins the collapses
  *exactly* — nine of them, by name, including `minimal`, which is the palette all
  four Loom surfaces wear. `minimal`'s links are the paragraph's own colour at
  rest with no underline, and fixing that is another lane's file. Pinning rather
  than asserting empty is the honest move when you have found something you are
  not the one to fix: what the assertion buys is that a **tenth cannot join them
  quietly.**

### Where the colours came from in the first place

One last piece, because it explains a constraint the rest of the module works
under. The palettes are literals. They were derived — there is a solver that
takes three hues and a mode and searches for lightnesses that clear the bar with
a margin — but the derivation is a **build-time tool**: *derive, look, paste.*

> a palette is reviewed by seeing it and diffed by reading it, and a page whose
> colours are computed at import time is a page whose colours nobody approved.

That is 0077, and it is the same instinct as the rest of this course pointed at a
build step: a value nobody looked at is a value nobody approved, and a diff you
cannot read is not a review. It is also why Exercise E's house palette is a
plausible thing for a real host to write. Solving seventeen slots against
twenty-one simultaneous contrast constraints by hand is genuinely hard, and *the
usual outcome is that somebody lightens a background until the warning goes away
and ships a page nobody looked at.*

---

## In the code

| File | What is in it |
| --- | --- |
| [`src/theme/theme.ts`](../src/theme/theme.ts) | The vocabulary: seventeen slots, the ramps, the three schemas, and `themeSelectionSchema` — the three ids a tree carries. |
| [`src/theme/registry.ts`](../src/theme/registry.ts) | `createThemeRegistry`: three ids in, three documents or a `ThemeError` out, plus the `catalogue()` a model is shown. |
| [`src/theme/apply.ts`](../src/theme/apply.ts) | `themeVariables`: a resolved theme flattened into the custom properties a stylesheet reads. Pure. |
| [`src/render/theme.ts`](../src/render/theme.ts) | The seam: reserved-prop partition, the four resolution outcomes, and the argument for having no fallback. |
| [`src/render/render.ts`](../src/render/render.ts) | Where it is mounted — once, from the root, before the walk — and where `theme-misplaced` is raised. |
| [`src/theme/contrast.ts`](../src/theme/contrast.ts) | The bar: the declared grounds, the pairings, `painted` versus `composed`, and `auditPalette`. |
| [`src/sdk/pairings.ts`](../src/sdk/pairings.ts) | `registryPairings`: what the components actually paint, probed rather than listed. |
| [`src/theme/separation.ts`](../src/theme/separation.ts) | The other half: ΔE, the peers a reader must tell apart, and the borrowed threshold. |
| [`src/theme/derive.ts`](../src/theme/derive.ts) | The build-time solver. Read the module comment for what it will not do for you. |
| [`src/theme/library.ts`](../src/theme/library.ts), [`palettes.ts`](../src/theme/palettes.ts) | Twenty-one palettes as literals, derived once and committed. |
| [`0049`](../decisions/0049-a-theme-is-three-ids-in-the-tree.md), [`0074`](../decisions/0074-a-palette-slot-that-carries-text-meets-aa.md), [`0076`](../decisions/0076-loom-offers-a-host-the-contrast-bar-and-does-not-impose-it.md), [`0077`](../decisions/0077-a-palette-is-derived-once-and-committed-as-literals.md), [`0089`](../decisions/0089-the-text-ramp-is-held-to-four-grounds.md) | The decisions, in the order the argument was made. |

---

## Try it

Seven exercises. **Predict every output in writing, then run.** Exercises D and E
are the ones to commit to hardest: D because most readers expect a different
number, and E because it is a claim about what the system does *not* do.

Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

The shared preamble for all seven:

```ts
import { renderToStaticMarkup } from "react-dom/server"
import { describe, it } from "vitest"

import { sequentialIdFactory } from "./ids.js"
import type { JsonObject } from "./json.js"
import { renderLoomTree } from "./render/render.js"
import { THEME_PROP_KEY } from "./render/theme.js"
import { analyzeDelta } from "./runtime/analysis.js"
import { assessChange } from "./runtime/assessment.js"
import { gate } from "./runtime/gate.js"
import { defaultGatePolicy } from "./runtime/policy.js"
import type { ProposedChange } from "./runtime/proposal.js"
import { testPrimitiveResolver } from "./testing/primitives.js"
import {
  auditPalette,
  auditSeparation,
  colourDifference,
  contrastRatio,
  createThemeRegistry,
  describePaletteAudit,
  describeSeparationAudit,
  describeThemeError,
  editorialPalette,
  paletteSchema,
  themeVariables,
  JUST_NOTICEABLE_DIFFERENCE,
  PALETTE_SLOTS,
  TEXT_CONTRAST_MINIMUM,
  type Palette,
} from "./theme/index.js"
import { carbonPalette, plumPalette } from "./theme/palettes.js"
import { buildElement, buildText } from "./tree/builders.js"
import type { TreeDelta, TreeOperation } from "./tree/delta.js"
import { createTree, type LoomTree } from "./tree/tree.js"

/** Two themes, as a tree carries them: three registered ids and nothing else. */
const editorial = { palette: "editorial", fontPack: "editorial-serif", stylePreset: "comfortable" }
const bold = { palette: "bold", fontPack: "bold-sans", stylePreset: "airy-modern" }

const themes = createThemeRegistry()
const spare = sequentialIdFactory("x")

/** A page with one card in it, wearing whatever is handed to it. */
const treeWearing = (rootProps: JsonObject, cardProps: JsonObject = {}): LoomTree => {
  const idFactory = sequentialIdFactory()
  const card = buildElement(idFactory, {
    type: "loom.card",
    props: cardProps,
    children: [buildText(idFactory, "Body copy")],
  })
  const page = buildElement(idFactory, {
    type: "loom.page",
    props: { title: "Home", ...rootProps },
    children: [card],
  })

  return createTree(page, idFactory)
}

const render = (tree: LoomTree, registry = themes) =>
  renderLoomTree(tree, { resolver: testPrimitiveResolver, themes: registry })

/** A host's own palette. Every slot declared, straight out of a brand book. */
const houseStyle: Palette = paletteSchema.parse({
  id: "house",
  name: "House",
  description: "Our brand colours: white paper, our blue, grey secondary text.",
  slots: {
    "bg-canvas": "#ffffff",
    "bg-surface": "#ffffff",
    "bg-surface-muted": "#f4f6f8",
    "bg-overlay": "#ffffff",
    "fg-default": "#1b1f24",
    "fg-muted": "#8b96a3",
    "fg-subtle": "#aab4c0",
    "fg-on-accent": "#ffffff",
    accent: "#5aa9e6",
    "accent-strong": "#3d8fd0",
    "accent-subtle": "#eaf4fc",
    "brand-secondary": "#5aa9e6",
    "brand-secondary-strong": "#3d8fd0",
    "border-default": "#dde3ea",
    "border-strong": "#c3ccd6",
    "border-subtle": "#eef2f6",
    "border-accent": "#5aa9e6",
  },
})
```

### Exercise A — three ids in, three documents out

```ts
describe("A", () => {
  it("resolves three ids, or refuses", () => {
    const attempts: readonly unknown[] = [
      editorial,
      { ...editorial, palette: "warmer" },
      { palette: "editorial", fontPack: "editorial-serif" },
      { ...editorial, stylePreset: "#f5f2ec" },
    ]

    for (const selection of attempts) {
      const resolved = themes.resolve(selection)
      console.log(
        resolved.ok
          ? `  resolved  ${JSON.stringify(selection)}\n            ${resolved.value.palette.name} / ${resolved.value.fontPack.name} / ${resolved.value.stylePreset.name}`
          : `  refused   ${JSON.stringify(selection)}\n            ${describeThemeError(resolved.error)}`
      )
    }

    const catalogue = themes.catalogue()
    console.log(
      `  catalogue: ${catalogue.palettes.length} palettes, ${catalogue.fontPacks.length} font packs, ${catalogue.stylePresets.length} style presets`
    )
    console.log(`  one entry: ${JSON.stringify(catalogue.palettes[1])}`)
  })
})
```

Predict: three refusals and three different *kinds* of refusal. Say which of the
three tells the caller the most, and — before you look — what a catalogue entry
contains.

The output:

```
  resolved  {"palette":"editorial","fontPack":"editorial-serif","stylePreset":"comfortable"}
            Editorial / Editorial Serif / Comfortable
  refused   {"palette":"warmer","fontPack":"editorial-serif","stylePreset":"comfortable"}
            No palette "warmer". Registered: minimal, editorial, bold, paper, slate, sage, blush, harbour, citrus, lilac, graphite, clay, linen, midnight, carbon, plum, forest, ember, dusk, obsidian, tide.
  refused   {"palette":"editorial","fontPack":"editorial-serif"}
            Theme selection is malformed: stylePreset: Required
  refused   {"palette":"editorial","fontPack":"editorial-serif","stylePreset":"#f5f2ec"}
            Theme selection is malformed: stylePreset: Invalid
  catalogue: 21 palettes, 20 font packs, 10 style presets
  one entry: {"id":"editorial","name":"Editorial","description":"Restrained, high-contrast magazine palette with a single muted accent."}
```

Three things.

The unknown-id error carries **the whole registered list**, which is the same
move `describeRegistryError` makes for primitives — a model or a host that got
the id wrong is told what the right ones are, in the failure, rather than being
asked to go and look.

The second refusal is the operational fact from the prompt block, executed: a
selection with two of three keys does not resolve. Not "resolves partially", not
"keeps the old preset" — a refusal.

The fourth is the one to notice. `#f5f2ec` is a perfectly good colour, and it is
refused as a *malformed selection* rather than as a bad colour, because
`themeIdSchema` accepts lower-case dash-separated identifiers and a hex string is
not one. **The value space closed one layer earlier than you might look for it:**
there is no point at which a colour is checked and rejected, because there is no
point at which a colour is expected.

### Exercise B — one id, fifty-two variables, one attribute

```ts
describe("B", () => {
  it("turns three ids into variables, and a page into one attribute", () => {
    const variablesOf = (selection: unknown) => {
      const resolved = themes.resolve(selection)
      if (!resolved.ok) throw new Error(describeThemeError(resolved.error))

      return themeVariables(resolved.value)
    }

    const one = variablesOf(editorial)
    const other = variablesOf({ ...editorial, palette: "bold" })

    console.log(`  variables from three ids:  ${Object.keys(one).length}`)
    console.log(`  palette slots:             ${PALETTE_SLOTS.length}`)
    console.log(`  changed by the palette id: ${Object.keys(one).filter((key) => one[key] !== other[key]).length}`)
    console.log(`  --loom-accent:             ${one["--loom-accent"]} -> ${other["--loom-accent"]}`)
    console.log(`  --loom-scale-5:            ${one["--loom-scale-5"]} -> ${other["--loom-scale-5"]}`)

    const inEditorial = renderToStaticMarkup(render(treeWearing({ [THEME_PROP_KEY]: editorial })).element)
    const inBold = renderToStaticMarkup(render(treeWearing({ [THEME_PROP_KEY]: bold })).element)

    console.log(`  the two documents are identical:          ${inEditorial === inBold}`)
    console.log(
      `  ... once one style attribute is removed: ${
        inEditorial.replace(/ style="[^"]*"/, "") === inBold.replace(/ style="[^"]*"/, "")
      }`
    )
    console.log(`  occurrences of --loom-accent in a page:   ${inEditorial.match(/--loom-accent:/g)?.length}`)
  })
})
```

Predict: how many variables three ids produce, how many of them a *palette* swap
changes, and — the one to commit to — how many characters have to be deleted from
one of these two documents to turn it into the other.

The output:

```
  variables from three ids:  52
  palette slots:             17
  changed by the palette id: 23
  --loom-accent:             #4a5b78 -> #ffd400
  --loom-scale-5:            24px -> 24px
  the two documents are identical:          false
  ... once one style attribute is removed: true
  occurrences of --loom-accent in a page:   1
```

Twenty-three of fifty-two, which is the orthogonality claim in numbers: the
palette id moves every colour and no type or spacing value, so `--loom-scale-5` is
24px in both. Twenty-three rather than seventeen because a palette's variables are
not only its seventeen slots — the runtime also measures a chroma for five of them
and derives a scrim pair from its body copy
([0131](../decisions/0131-what-a-palette-cannot-say-about-itself-is-measured-from-it.md)),
and those move with the palette too. (The scrim's ground happens to measure the
same under these two palettes, so six of the seven change here.) Swapping *one* of
the three ids changes exactly the variables that id owns.

The last two lines are the load-bearing ones. Two pages in wildly different
colour schemes are **the same document with one attribute different**, and
`--loom-accent` appears once in the whole page. That is what "re-theming touches
no node and no primitive" means concretely — not that it is cheap, but that there
is precisely one place in the output where the change lives.

### Exercise C — where it mounts, and what it says when it cannot

```ts
describe("C", () => {
  it("mounts at the root, or says why not", () => {
    const cases: readonly (readonly [string, ReturnType<typeof render>])[] = [
      ["the root wears it", render(treeWearing({ [THEME_PROP_KEY]: editorial }))],
      ["the card wears it", render(treeWearing({}, { [THEME_PROP_KEY]: editorial }))],
      ["nobody wears it", render(treeWearing({}))],
      [
        "no registry was passed",
        renderLoomTree(treeWearing({ [THEME_PROP_KEY]: editorial }), { resolver: testPrimitiveResolver }),
      ],
      ["a palette nobody registered", render(treeWearing({ [THEME_PROP_KEY]: { ...editorial, palette: "warmer" } }))],
    ]

    for (const [label, rendered] of cases) {
      const markup = renderToStaticMarkup(rendered.element)
      console.log(
        `  ${label.padEnd(28)} mounted=${(rendered.theme?.palette.id ?? "nothing").padEnd(9)} styled=${String(
          markup.includes("--loom-")
        ).padEnd(5)} ${JSON.stringify(rendered.diagnostics.map((diagnostic) => diagnostic.code))}`
      )
    }
  })
})
```

Predict all five rows. The third is the one to be exact about: a tree that names
no theme at all — what does it render, and what does it *report*?

The output:

```
  the root wears it            mounted=editorial styled=true  []
  the card wears it            mounted=nothing   styled=false ["theme-misplaced"]
  nobody wears it              mounted=nothing   styled=false []
  no registry was passed       mounted=nothing   styled=false ["theme-unregistered"]
  a palette nobody registered  mounted=nothing   styled=false ["theme-unresolved"]
```

Four of the five rows produce an unstyled page and only three of them say
anything. The silent one is the tree that named nothing, and the silence is
correct: naming no theme is not an error, it is a tree that has not been themed.
The other three are all "you asked for a theme and did not get one", separated
because the fixes are different — move the key, pass a registry, register the
palette — and lesson 14 is where the discipline of a diagnostic that names its
own repair was established.

Row two is worth a second look. The card's theme is not merged, not inherited,
not partially applied: it is dropped with a report. One tree wears one theme, and
the reason is the cascade — nested themes would mean a primitive's colour
depended on where it sat, which is precisely the property `var(--loom-accent)`
was chosen to avoid.

### Exercise D — the change that repaints the page, weighed

```ts
describe("D", () => {
  it("weighs the change that repaints the page", () => {
    const tree = treeWearing({ [THEME_PROP_KEY]: editorial })

    const deltaOf = (operations: TreeOperation[]): TreeDelta => ({
      deltaId: spare.deltaId(),
      treeId: tree.treeId,
      baseRevision: 0,
      operations,
    })
    const proposalOf = (delta: TreeDelta): ProposedChange => ({
      proposalId: spare.proposalId(),
      intentId: spare.intentId(),
      delta,
      rationale: "teaching",
      provenance: {
        origin: "developer",
        interpreter: "scratch",
        authoredBy: "model",
        confidence: 0.99,
        interpretedAt: "2026-09-09T00:00:00.000Z",
      },
    })

    const weigh = (label: string, operations: TreeOperation[]) => {
      const delta = deltaOf(operations)
      const analysis = analyzeDelta(tree, delta)
      if (!analysis.ok) throw new Error(JSON.stringify(analysis.error))

      const assessed = assessChange(tree, proposalOf(delta), defaultGatePolicy, spare.deltaId())
      if (!assessed.ok) throw new Error(JSON.stringify(assessed.error))

      console.log(
        `  ${label.padEnd(14)} touches=${JSON.stringify(analysis.value.affectedNodeIds)} depth=${
          analysis.value.shallowestAffectedDepth
        } stakes=${assessed.value.stakes.level} factors=${assessed.value.stakes.factors.length} reversible=${
          assessed.value.reversibility.reversible
        } gate=${gate(assessed.value, defaultGatePolicy).kind}`
      )

      return assessed.value
    }

    const rootId = tree.root.id
    const retheme = weigh("every colour", [
      { op: "configure", nodeId: rootId, set: { [THEME_PROP_KEY]: bold }, unset: [] },
    ])
    weigh("the title", [{ op: "configure", nodeId: rootId, set: { title: "Home page" }, unset: [] }])

    console.log(`  the undo: ${JSON.stringify(retheme.reversibility.inverse?.operations)}`)
  })
})
```

Predict both rows before running, including the node id — Warm-up 3 asked you for
it.

The output:

```
  every colour   touches=["n_3"] depth=0 stakes=low factors=0 reversible=true gate=accepted
  the title      touches=["n_3"] depth=0 stakes=low factors=0 reversible=true gate=accepted
  the undo: [{"op":"configure","nodeId":"n_3","set":{"loom:theme":{"palette":"editorial","fontPack":"editorial-serif","stylePreset":"comfortable"}},"unset":[]}]
```

The two rows are identical in every column. Repainting the entire page and
adding five characters to its title are, by every axis this system measures,
the same size of change — and both are auto-applied.

If that still feels wrong, the useful thing to do is not to argue with the
number but to name the axis you are reaching for. It is not stakes; nothing is
damaged. It is not reversibility; the undo is right there in the third line, and
it is the three previous ids. What you are reaching for is *surprise* — how
different the result looks from what the person was expecting — and the system
deliberately does not measure that, because surprise is a property of the
observer and lesson 07's whole argument is that the analysis reports properties
of the change.

The node id is `n_3` and not `n_1`, for the reason lesson 04 gave: the fixture
builds leaves before their parents, so the root of a three-node tree is minted
last. If you wrote `n_1`, that is a small correction with a large lesson attached
to it — an id says nothing about position.

### Exercise E — it registers, it resolves, it renders, and it cannot be read

```ts
describe("E", () => {
  it("registers, resolves, renders — and cannot be read", () => {
    const registry = createThemeRegistry({ palettes: [houseStyle] })
    const selection = { ...editorial, palette: "house" }

    console.log(`  paletteSchema parsed it:   yes — it is the const in the preamble`)
    console.log(`  the registry resolved it:  ${registry.resolve(selection).ok}`)

    const rendered = render(treeWearing({ [THEME_PROP_KEY]: selection }), registry)
    console.log(
      `  it rendered:               ${renderToStaticMarkup(rendered.element).includes("--loom-fg-muted:#8b96a3")}`
    )
    console.log(`  diagnostics:               ${JSON.stringify(rendered.diagnostics)}`)

    const audit = auditPalette(houseStyle)
    console.log(`  pairings measured:         ${audit.measured.length}`)
    console.log(`  painted failures:          ${audit.failures.length}`)
    console.log(describePaletteAudit(audit).split("\n").slice(0, 7).join("\n"))
  })
})
```

Predict the diagnostics array and the count of painted failures. Rate your
confidence on the diagnostics before you run it — this is the claim Predict 2
asked you to make.

The output:

```
  paletteSchema parsed it:   yes — it is the const in the preamble
  the registry resolved it:  true
  it rendered:               true
  diagnostics:               []
  pairings measured:         26
  painted failures:          8
house: fg-muted on bg-surface (loom.feature body) is 3.00:1, under 4.5:1
house: fg-muted on bg-surface-muted (loom.form hint, loom.badge neutral) is 2.77:1, under 4.5:1
house: fg-on-accent on accent (loom.action primary label) is 2.54:1, under 4.5:1
house: accent on bg-surface (loom.quote attribution) is 2.54:1, under 4.5:1
house: accent-strong on accent-subtle (loom.badge accent, loom.icon soft) is 3.12:1, under 4.5:1
house: accent-strong on bg-surface (loom.offering price, loom.field inside a card) is 3.48:1, under 4.5:1
house: fg-subtle on bg-surface (loom.footer note row) is 2.10:1, under 4.5:1
```

The program prints the first seven lines of the report; the eighth failure is
`fg-subtle` on `bg-surface-muted`, the `loom.perk` excluded marker, at 1.94:1.

**Eight painted failures and an empty diagnostics array.** Every layer this
course has taught you to expect a refusal from lets it through, and each one for
a defensible reason: the schema checked that every slot holds a colour, which it
does; the registry checked that the ids resolve, which they do; the renderer
checked nothing about colour because a colour is not a thing it has an opinion
about. There is white label text on a light blue button at 2.54:1 and nobody
objects.

Look at what the failure lines carry, because it is the difference between a
report and a warning. Not "eight contrast violations" — each one names a slot
pair, a ratio, and **the place a reader meets it**: `loom.action primary label`,
`loom.footer note row`. A host reading this fixes a page, not a number.

And note the shape of the palette that produced this. It is not a bad-faith
example: it is a white page, a friendly blue, a soft grey for secondary text, and
it is what a brand book hands you. That is why the derivation tool exists, and
why its comment says what it says about lightening a background until the warning
goes away.

### Exercise F — painted, composed, and what could not be measured

```ts
describe("F", () => {
  it("counts painted and composed apart, and declines what it cannot measure", () => {
    for (const palette of [editorialPalette, plumPalette, carbonPalette]) {
      const audit = auditPalette(palette)
      console.log(
        `  ${palette.id.padEnd(10)} painted=${audit.failures.length} composed=${audit.composedFailures.length} unmeasured=${audit.unmeasured.length}`
      )
      for (const entry of audit.composedFailures) {
        console.log(
          `             ${entry.pairing.foreground} on ${entry.pairing.background}: ${entry.ratio.toFixed(2)}:1 — ${entry.pairing.where}`
        )
      }
    }
    console.log(`  the bar: ${TEXT_CONTRAST_MINIMUM}`)

    for (const [ink, ground] of [
      ["#1b1f24", "#ffffff"],
      ["hsl(210 20% 12%)", "#ffffff"],
      ["rebeccapurple", "#ffffff"],
      ["#1b1f2480", "#ffffff"],
    ] as const) {
      const ratio = contrastRatio(ink, ground)
      console.log(`  ${ink.padEnd(18)} on ${ground} -> ${ratio === undefined ? "not measured" : `${ratio.toFixed(2)}:1`}`)
    }

    const inHsl = paletteSchema.parse({
      ...houseStyle,
      id: "house-hsl",
      slots: { ...houseStyle.slots, "fg-muted": "hsl(210 12% 60%)" },
    })
    const audit = auditPalette(inHsl)
    console.log(
      `  house-hsl: measured=${audit.measured.length} painted=${audit.failures.length} unmeasured=${audit.unmeasured.length}`
    )
  })
})
```

Predict: the three shipped palettes' painted counts, and then the last line —
`house-hsl` differs from `house` in exactly one slot, so predict all three of its
numbers against `house`'s 26 / 8.

The output:

```
  editorial  painted=0 composed=0 unmeasured=0
  plum       painted=0 composed=2 unmeasured=0
             accent on accent-subtle: 4.43:1 — loom.faq marker inside an accent section
             fg-subtle on accent-subtle: 4.42:1 — loom.perk note inside an accent section
  carbon     painted=0 composed=1 unmeasured=0
             fg-subtle on accent-subtle: 3.76:1 — loom.perk note inside an accent section
  the bar: 4.5
  #1b1f24            on #ffffff -> 16.56:1
  hsl(210 20% 12%)   on #ffffff -> not measured
  rebeccapurple      on #ffffff -> not measured
  #1b1f2480          on #ffffff -> not measured
  house-hsl: measured=21 painted=6 unmeasured=5
```

`plum` and `carbon` ship with composed failures at 4.43 and 4.42 against a bar of
4.5. They are in the library, they are in the catalogue, a model may choose them,
and the audit says so out loud every time it is run. That is what "reported, not
asserted" costs and what it buys: the number is small, the fix is contested — move
the panel or move the ink — and the alternative was an audit that stayed quiet
about pairings it would have failed.

The bottom half is the more useful half to have run. One slot written in `hsl()`
takes five pairings out of the measured set, and **two of them were painted
failures**: `house` had eight painted failures and `house-hsl` has six, with five
pairings moved into `unmeasured`. Nothing got better. If unmeasured had been folded into
"pass", a host could have made two real failures disappear by rewriting one
colour in a different notation — which is exactly why it is a third answer.

### Exercise G — the question a contrast ratio cannot ask

```ts
describe("G", () => {
  it("asks the question a contrast ratio cannot", () => {
    const ink = "#b3261e"
    const other = "#1d6a4a"
    console.log(`  contrast ${ink} / ${other}: ${contrastRatio(ink, other)?.toFixed(2)}:1`)
    console.log(`  ΔE       ${ink} / ${other}: ${colourDifference(ink, other)?.toFixed(2)}`)
    console.log(`  the floor: ${JUST_NOTICEABLE_DIFFERENCE}`)

    for (const palette of [editorialPalette, houseStyle]) {
      const separation = auditSeparation(palette)
      console.log(
        `  ${palette.id.padEnd(10)} peers=${separation.measured.length} collapsed=${separation.collapsed.length} unmarked=${separation.unmarked.length}`
      )
    }
    console.log(describeSeparationAudit(auditSeparation(houseStyle)))
    console.log(`  house's painted contrast failures: ${auditPalette(houseStyle).failures.length}`)
  })
})
```

`#b3261e` is a brick red and `#1d6a4a` is a forest green. Predict the contrast
ratio between them before you run it, and write down what that number would mean
if you read it in an accessibility report.

The output:

```
  contrast #b3261e / #1d6a4a: 1.00:1
  ΔE       #b3261e / #1d6a4a: 91.19
  the floor: 2.3
  editorial  peers=7 collapsed=0 unmarked=0
  house      peers=7 collapsed=1 unmarked=0
house: bg-canvas and bg-surface (loom.section tone surface, which paints a band and no border) differ by 0.00, under 2.3 — nothing else tells them apart
  house's painted contrast failures: 8
```

**1.00:1 between a red and a green.** In an accessibility report that number
means "these two colours are the same colour". A reader looking at them would
disagree instantly, and the ΔE of 91 — against a floor of 2.3 — is the
measurement that agrees with the reader. This is the concrete answer to Predict
4, and it is the whole argument for why separation is a different instrument and
not a lower setting on the same one.

The last three lines are the two audits disagreeing about the same palette in the
other direction. `house` collapses on `bg-canvas` and `bg-surface` because both
are `#ffffff` — a brand book that says "white page, white cards" — and a
`loom.section tone="surface"` paints a band on the page with no border, so the
band is invisible. **The contrast audit is completely silent about this**, and
correctly: white on white is not a legibility question, because there is no text
in it. Text on either surface is perfectly readable. What has been lost is a
boundary the layout was relying on, and only the ΔE audit is asking about
boundaries.

Two audits, one palette, two disjoint sets of complaints. That is what it looks
like when a promise had two halves and only one of them was being checked.

---

## It could have been otherwise

Six, and the first is the one you probably wrote for Predict 1.

**Colours on nodes.** The default in every other system, and it fails four ways
at once, of which only one is aesthetic. The one that would have hurt most is the
second: a re-theme arriving as sixty operations makes every piece of machinery in
Parts II and III report a large, broad, structural-looking change, correctly, for
a change that is none of those things.

**A host-supplied default theme, with the tree silent.** Rejected because it
makes the page a function of deployment config as well as of the tree — lesson
18's trade, made for something that did not need it. Worth holding beside the
data seam rather than filing next to it: data pays that cost because an answer
*cannot* be in the tree, and a look can be named there, so it is.

**Refusing an unreadable palette at registration.** The obvious guarantee, and it
was considered and declined. It would decide, on a host's behalf, whether Loom
enforces accessibility rather than merely meeting it — and it would reject
palettes that register legally today, which is not a thing a library gets to
start doing to its hosts. The cheap half, run in the host's own tests, is the
whole of the answer on purpose.

**A contrast refinement on `paletteSchema`.** Cheaper still, and it cannot be
written. The schema sees seventeen colours and no information about which are read
on which; the pairings come from the *component library*, which the schema knows
nothing about. This is the interesting failure of the five, because it is not a
policy disagreement — it is a check that cannot be expressed where it would be
most convenient, and noticing that is what forces the audit to live where the
components are.

**A Gate rule that escalates a re-theme.** Tempting after Exercise D, and it
would encode "looks different" as "is risky". The composition already exists for
a deployment that wants it — `loom:theme` in the policy's protected prop keys, and
it becomes an ordinary stake factor — which is the difference between a knob a
host turns and an opinion a library ships.

**Deriving palettes at request time from a brand colour.** The solver exists and
would run in a render. Rejected by 0077: a palette is reviewed by seeing it and
diffed by reading it, and a page whose colours are computed at import time is a
page whose colours nobody approved. Derive, look, paste — the same instinct as
the rest of this course, pointed at a build step.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections while
you write. Then compare.

1. **Write the sentence that is true of all four Part V seams, and then say what
   it costs you.** Data, destinations, origins and appearance. Lesson 19 offered
   *a name in the tree, an address in a registry, resolved before the walk*;
   lesson 20 broke two of its clauses; this one satisfies all three. Produce a
   formulation that covers all four without the word "except" — then, and this is
   the harder half, say what your formulation has had to become *vague* about in
   order to cover four things. A rule that covers everything by saying less is a
   worse rule than one that covers three things and names the fourth as
   different, and you should be able to tell which of the two you have written.

2. **State what a design token promises, in a sentence you could say to somebody
   who has never heard of Loom.** Then derive, from your sentence, the bug that
   was found on 23 August — and find one *other* place in this course where a
   check verified provenance and was taken to have verified a property. There is
   at least one, it is not in Part V, and the phrase to search your memory for is
   "every test passed".

Predict, before writing (1): if your unified sentence is about keeping the model
away from values it should not choose, you have written the motivation and not
the rule. Three of the four seams do that; the appearance seam is not primarily
about a *value* being unsafe.

---

## Self-check

Seven questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. Give the reason a model may not write a colour, phrased as a property of the
   value space rather than as a danger. Then apply the same reasoning to a case
   this lesson did not cover: a model asked to set the number of columns in a
   grid. Same answer or different, and why?
2. There is no fallback theme. State the argument, then say what it has in common
   with lesson 18's argument about a page that stops being a function of its
   tree — and then state the difference that lets appearance refuse the trade
   that data had to accept.
3. A change that repaints every pixel is `low` stakes and auto-applied. Defend
   the answer using both axes by name, then say what a deployment does if it
   wants re-themes held for review, and why that is a composition rather than a
   new feature.
4. "Can a reader read this page" is a question no single party can answer. Name
   the three parties and say precisely what each one holds. Then name the two
   things that had to be *declared* before the question could be asked at all,
   and say why each one could not be derived.
5. Distinguish a `painted` failure from a `composed` one — not by definition, but
   by what each one lets you conclude about a deployment that ships the palette.
   Then say what rule stops the composed list becoming the place inconvenient
   failures are filed.
6. A palette written in `hsl()` produces `unmeasured` pairings rather than
   failures or passes. Give the reason it is a third answer, then say what a host
   that wants the guarantee has to assert, and then name the other place in this
   course where a check answers "I could not tell you" as a first-class result.
7. Two colours at 1.00:1 that a reader tells apart instantly. Explain how both
   facts are true at once, say what that proves about using a contrast ratio to
   check whether a link is visible in a paragraph, and give the reason the ΔE
   threshold was borrowed from published work rather than chosen.

Question 4 is the one this lesson is really about. Question 2 is the one where a
half-answer looks exactly like a full one, so keep going after your first
paragraph.

---

## Reflect

Write for two minutes, then move on.

- Predict 1 is the one to look at first, and specifically the second half of it.
  Most readers get the registry right and the delta wrong. If you wrote a delta
  with one operation per node, write down what made "colour lives on nodes" feel
  like the default — you almost certainly learned it from a tool where it was
  true, and it is worth knowing which of your instincts came from CSS rather than
  from anything about this system.
- Predict 2 asked for a confidence rating on which layer refuses an unreadable
  palette. If you rated 4 or 5 and named a layer, that belief is the interesting
  one: you expected a guarantee and got a report, and the gap between those is
  most of what this system means by "Loom offers and does not impose". Write down
  one other place where you have been assuming a guarantee, and go and check.
- Predict 3 asked you to rank two changes. If the answer still feels wrong after
  Exercise D, write the axis you are reaching for in your own words. Getting that
  axis named — even to conclude the system is right not to measure it — is worth
  more than agreeing.
- Lesson 19 gave you a pattern, lesson 20 broke it, and this lesson satisfies it
  completely while being about something else. Write down what that sequence has
  taught you about what to do with a pattern on its fourth instance — as a
  procedure, not as a disposition.
- Last: this lesson's central sentence is *a token is a promise about provenance,
  not about difference.* Take it out of Loom entirely. Name a place in your own
  work where you have a name that stands for a value, and where the thing you
  actually care about is a relationship between two of them — and say what, if
  anything, checks it.

---

## Come back to this

Set Z in [`review-schedule.md`](review-schedule.md), two days after this lesson.
Interleaved with 04, 07, 08, 12, 15, 17, 18 and 19 — and unusually heavy on Part
II, because the interesting thing about this seam is not the registry but what
the Gate did with it.

Part V now has four lessons and a pattern that has survived being broken once and
satisfied once, which is more information than four confirmations would have
been. Whether there is a fifth is open. The place to look, on the evidence of
this one, is not for another dangerous value — it is for another **property that
belongs to no single party**, since that turned out to be the thing worth a
lesson once the registry was in place.
