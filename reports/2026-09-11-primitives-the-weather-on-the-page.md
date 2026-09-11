# The weather on the page

**Routine:** `Loom primitives` · **Date:** 2026-09-11 · **Branch:**
`primitives-26-five-units-one-tree` · **Section:** §4b

## What this run built, and why this rather than anything else

**Two primitives — `loom.backdrop` and `loom.overlay` — and the five paints they
share with `loom.hero`.** The library is **91**. Pushed onto this branch, which
is the fifth consecutive run following the #216 finding rather than step 3 of the
brief.

The reason this is two primitives after three runs of none is not that the
breadth mandate was re-read more charitably. It is that **the thing being used to
measure breadth was the wrong instrument, and this run found what it was
hiding.**

`docs/hermes-port-map.md` counts Hermes blocks. Its "to build" tables emptied on
8 September, and the three runs since each read that as *the range is finished*,
went looking for a ninetieth content model, and came back with a definition list.
That reading is wrong in a way the document itself already warns about in its own
words — *"it is a measure of the port, not of the library"* — and here is what it
was hiding:

| | Before this run |
| --- | --- |
| Primitives that could paint anything behind their content | **1 of 89** — `loom.hero` |
| Primitives that could put a word on top of a picture | **0 of 89** |

Every band on a Loom page that was not the hero got `loom.section`'s `tone`:
three flat washes. So a page's first screen looked like a product and the eight
bands under it looked like a document. Against the maintainer's one sentence for
this library — *"when we demo this it really needs to pop"* — that is the defect,
and it is worth more than a ninetieth card shape.

Neither gap has a row in the port map, and neither ever could: Hermes' eleven
hero variants each baked their own background into a registered block, so
atmosphere was never a thing that existed separately from a block, and
superimposition never had to be an arrangement. **A port ledger cannot show you
what the source product never had to name.**

## The two primitives

### `loom.backdrop` — atmosphere behind anything

Five paints: `aurora` (two drifting colour fields), `grid` (a ruled blueprint),
`dots` (a lattice of points), `rays` (beams from above), `spotlight` (one pool of
light). Wraps anything, draws nothing of its own, and comes off with a `remove`.

**It is a wrapper because [0110](../decisions/0110-an-entrance-the-reader-drives-is-a-wrapper-not-a-prop-on-every-band.md)
asked for it to be argued that way.** That record's consequences say the library
gained its first primitive that renders no content, that this is a category, and
that the next member should be argued against it rather than invented beside it.
The argument transfers unchanged — a `backdrop` prop on `loom.section`,
`loom.split`, `loom.mosaic` and everything else a band can be is a prop on
seventy schemas to say one thing, and still unreachable for the band nobody
thought to give it to, **including every primitive a host registers itself**. It
adds one reason 0110 did not have: a page rarely wants atmosphere around exactly
one band, and a wrapper can hold three sections so the light runs behind all of
them. No prop on a band can say that.

**`loom.hero` keeps its own `backdrop` prop, and that is a decision rather than
compatibility.** A hero's paint sits inside the hero's padding and is clipped by
the hero's own edges; a wrapper is outside both. What changed is that the paints
moved to `src/primitives/backdrop.ts` and both read them, so the hero's enum went
from two paints to five without a second implementation — and there is a test
that renders each paint through both primitives and fails if the two ever differ
by a byte.

### `loom.overlay` — content over a ground

The ground is a **slot**; the children are what sits on top. "The first child is
the background" is a rule no schema states and every edit can break —
`loom.section` makes the same argument about its heading, and it is sharper here,
because getting it wrong does not misplace a title, it puts the photograph over
the words.

The two are laid in **one grid cell**, not by absolute positioning, so the box is
as tall as whichever is taller. Absolute content over a sized ground is the
obvious way and it silently clips: a headline that grows on a phone runs out of
the bottom of the picture with nothing to push.

## The scrim, and the palette slot it is honestly allowed to use

Text on a photograph needs something between it and the photograph, and the first
instinct — a dark wash with light text — **cannot be expressed in this theme
model.** No palette slot means "dark whatever the palette is". `bg-overlay` is a
*surface*: `#ffffff` under the light palettes and `#1a1a1a` under the dark ones.
Reading it as a dark wash would give white-on-white under nine of the starter
palettes.

So the scrim is `bg-overlay` used as what it is, and the content takes
`fg-default`, the foreground that slot is guaranteed to pair with. Under a light
palette that is a bright veil with dark type; under a dark one a dark veil with
light type. Both re-theme correctly. **What it costs is a genuinely dark
cinematic scrim under a light palette**, which wants a slot the palette does not
have — filed rather than faked with a literal.

**Which way the gradient runs is derived, not declared.** `scrim: "gradient"`
fades from behind the content towards the far side, and nobody says which edge:
it follows `justify`, because the answer is already in the tree. A `scrimFrom`
prop would be a second way to say a thing already said, and the two would drift
apart the first time somebody moved the content.

## Which fields became nodes, and which stayed props

Neither primitive ports a Hermes block, so 0052's question is asked of the
arrangement rather than of a record:

| | Node | Prop | Why |
| --- | --- | --- | --- |
| what is painted | | `paint` | Five renderings of the same region. Changing it adds, drops and reorders nothing — the granularity doc's sharper question, answered. |
| what a backdrop holds | **children** | | Anything, any number. This is the whole reason it is a wrapper. |
| the ground | **slot** | | A region the primitive places, which is [0051](../decisions/0051-a-slot-is-a-region-the-primitive-places.md) exactly. Not a `src` prop: a ground may be a picture, a painted panel, or a card, and a prop would have picked one forever. |
| what sits over it | **children** | | Same. |
| where the content sits | | `align`, `justify` | No operation reorders a placement. `loom.stack`'s names and `loom.stack`'s axes, because the content region *is* a column. |
| the wash | | `scrim` | Three different renderings — nothing, an even veil, a wash that clears — not three strengths of one. |
| how far off the edges | | `padding` | `loom.card`'s vocabulary. |
| how it is cornered | | `corners` | `loom.media`'s vocabulary. Needed on both, because the scrim and the paint are *this* element's, and a rounded picture under a square wash shows four bright corners no parent can reach. |

**There is deliberately no `none` paint.** A backdrop painting nothing is a node
that draws nothing, and `remove` says that better than `configure` — the same
reason the paint list has no "subtle aurora" beside its aurora.

**Nothing is parameterised beyond a closed set.** No opacity, no duration, no
colour, no angle. An opacity number is the "tune it a bit" prop that turns a
reviewable choice into a value nobody reads in a proposal, and a colour would
break [0049](../decisions/0049-a-theme-is-three-ids-in-the-tree.md) the first
time a page was re-themed.

## Three defects a picture found and no assertion could. Ninth consecutive run.

All three are valid CSS, render without a diagnostic, and overflow nothing at any
width. **Two of them are in code that has shipped since the first week.**

- **Every one of the hero's paints carried a hero-only assumption, and each
  produced a visible defect the first time a short band used one.** They were
  written for a band that is 78vh tall and first on the page, so they were all
  anchored to the top edge and brightest there. In a band three hundred pixels
  tall, a field masked by the default *ellipse* is not a glow — it is a
  horizontal smear with a hard top edge, drawn straight through the heading; a
  pool anchored `at 50% 0%` is a bright bar ruled across the band's top. The rule
  now stated in `backdrop.ts` is that **a paint is brightest at the middle of its
  band and reaches nothing at every edge**, because a backdrop cannot know
  whether its band is the top of a page or the fifth thing down. `circle
  closest-side` rather than the default ellipse is the same rule for the fields:
  a circle sized by the *shorter* side stays a glow at any aspect, where an
  ellipse becomes the box.

- **A third of an opacity is a hero value and it is wrong for a band.** The same
  paint over a smaller area is a concentrated tint, and under a low-chroma
  palette — `editorial`'s accent is a slate `#34425a` — a concentrated tint is
  not light behind the band, it is a grey blob on it. This is the 20 August
  finding's **unresolved half**: moving to `accent-strong` fixed the *slot*, and
  nothing fixed the fact that a palette may have very little chroma to give and
  no primitive can know that it does. `0.26` and a softer pool are a mitigation,
  not a fix. Filed.

- **`scrim: "none"` over a photograph is illegible in one palette or the other,
  whichever image you choose.** The specimen's fourth tile was a pale picture
  with `fg-default` text: fine under `editorial`, invisible under `bold`. Swap
  the picture for a dark one and the two palettes trade places. The primitive
  cannot fix this — the text colour is the *page's* and the ground is the
  *author's* — so what changed is the specimen, which now shows `scrim: "none"`
  over a ground that comes from the palette rather than from a photograph, which
  is the only use of it that survives a re-theme. Stated in the file and filed.

**A fourth, found by re-reading my own diff rather than by a picture, and worth
naming because the file it was in warns against it in as many words.** The
spotlight shipped its first draft as a gradient ending at `transparent` — the
exact trap the top of `backdrop.ts` documents. A gradient to `transparent`
interpolates towards transparent *black*, so a pool of light turns grey on its
way out, and it does that most visibly in the palettes whose accent has least
chroma to start with: the two failures compound. It is now a flat palette colour
under an elliptical mask, like the other four, which means **every paint in the
file now fades the one way the file says to.** Writing the rule down at the top
is what made the exception legible on a re-read; it did not stop the exception
being written.

## The harness lied in a fifth new way, and this one is the dangerous direction

**`loom.media` writes `loading="lazy"`, so a `fullPage: true` screenshot taken
without scrolling captures every image below the first viewport as an empty
box.** Two of four overlay tiles photographed as flat grey panels with text
floating on them, under both palettes, consistently — which reads exactly like
*`loom.overlay` drops its ground below the fold*. It was one step from being
written up as a defect in a primitive that is correct.

That is the sixth variant of *the picture lied* recorded by this lane and the
second in the direction that costs a fix rather than a cycle. The rule that works
is the same shape as the reduced-motion one: **scroll the whole page and wait for
every image to report complete before shooting**, unconditionally, because any
primitive may hold an image. Filed for #250's harness.

## Records

**One: [0130](../decisions/0130-atmosphere-is-a-wrapper-and-the-paints-are-one-vocabulary.md),
`Accepted`.** It decides where a thing that did not exist lives, what it is
called, and which existing record governs it. It refines no `Accepted` record,
changes no schema, and touches neither the tree nor the delta model — it is 0110
applied to its second member, which that record asked for by name. Numbered 0130
with 0126–0129 left as holes, for the reason 0120 gives at length: thirty-odd
branches are open and a clash is fatal to every lane's `pnpm verify` where a hole
costs one line in the index.

## Test numbers

`pnpm verify` **green**. **Eight tests added** to `src/primitives/library.test.ts`
(255 → 263), and one fixture, `atmospherePage`, which joins both the
every-primitive coverage set and 0125's geometric invariant. **Nothing was
weakened.**

The three worth naming, because each states a property rather than an output:

- **No paint reaches the reader** — every layer all five paints emit is
  `aria-hidden` with `pointer-events: none`, asserted over all five rather than
  over the one that happened to be rendered.
- **Five paints are five different things** — the rendered layers are pairwise
  distinct, which is the claim made for the enum. A sixth member that was an
  existing paint at a different opacity fails it.
- **One implementation, not two** — each paint is rendered through `loom.hero`
  and through `loom.backdrop` and the layers must be byte-identical. This is the
  test the extraction exists for, and it fails the moment anybody re-implements a
  paint in either file.

## The specimens

`reports/2026-09-11-primitives-the-weather-on-the-page-{editorial,bold}-{wide,phone}.png`
— both palettes at 1280px and a true 390px, taken with `reducedMotion: "reduce"`
and with every image proven loaded. Each shot carries a measurement: **`scrollWidth
=== innerWidth` at both widths, and zero elements overflowing their parent on
either axis** — the 0125 invariant checked in the browser as well as in the
assertion.

## The cross-lane line

`apps/loom/app/(marketing)/_lib/copy.ts` — `FACTS.primitives` `"89"` → `"91"`.
One line in the marketing lane's file, and it is the whole diff outside
`src/primitives/` apart from `reference.generated.json`, which is regenerated by
`pnpm --filter @loom/app docs:api`. `FACTS.decisions` is now a floor rather than a
count, so for the second run running the sixteen-times-recurring decision-count
line does not bite.

## What the library still cannot express

- **A dark scrim under a light palette.** No palette slot means "dark whatever
  the palette is", so a cinematic wash with light type over a photograph is
  unreachable. The theme lane's, and it is one slot.
- **A paint that bleeds wider than its own box.** A backdrop clips to itself, so
  the full-width glow behind a `width: "readable"` section is a backdrop around
  that section's *parent*. Nothing in a render reads a viewport
  ([0008](../decisions/0008-the-renderer-is-a-total-pure-projection.md)), so
  there is no honest way to say "wider than me" from inside.
- **A backdrop that knows how much chroma its palette has.** Every paint is one
  opacity for every palette, and a slate accent and a gold one do not want the
  same one.
- **A tab strip** and **a feed**, unchanged: the first wants a `select` member in
  the behaviour vocabulary, the second the binding seam and a live source. Both
  are the framework lane's.
