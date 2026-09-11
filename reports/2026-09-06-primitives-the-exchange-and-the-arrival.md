# The exchange, and the way a band arrives

**Routine:** `Loom primitives` · **Date:** 2026-09-06 · **Branch:**
`primitives-25-the-exchange-on-the-page` · **Section:** §4b

## What shipped

Three primitives. The library is **73**.

| Primitive | What it is |
| --- | --- |
| `loom.message-list` | A conversation in order — an `<ol>` of turns, at one of two densities |
| `loom.message` | One turn: which side, who, when, a portrait, and a body of nodes |
| `loom.reveal` | A wrapper that brings whatever is inside it in as the reader scrolls to it |

One unit: **what a page about a product that answers you has to show, and the
one thing that makes any band read as a product rather than a document.**

## Why these

**No maintainer comments were outstanding** on #222, #229, #235 or #241 — every
comment on all four is this lane's own or Vercel's — so the choice was the
lane's.

**The exchange is the largest gap left that the demo actually stands on.** The
port map's remaining Hermes rows are a book shelf and a property listing, and
#241 already argued why neither is what this demo needs. What *is* missing is the
band Hermes could never have had: it sold a person's services, so nothing in the
seventy is a conversation. Loom's own claim is that you **ask** and the page
changes — and the library could not draw the asking. The marketing site's
strongest pages are already an ask and an answer, built out of `loom.card`s that
carry no side, no voice and no attribution.

**The reveal is the highest-leverage thing in the library per line of code**,
because it applies to bands that already exist. `.loom-rise` has been in
`stylesheet.ts` since 0055 and fires **on load**: every band below the fold
finishes animating before anybody scrolls to it, so the page a visitor reads is
static. One wrapper makes any band — including one a host registered itself —
arrive when it is reached.

## Which Hermes fields became nodes, and which stayed props

There is no Hermes block behind either of these, so the granularity question was
answered from the content model rather than from a field list. Applying 0052 and
[0094](../decisions/0094-a-cards-prose-is-a-child-when-the-card-has-a-flow.md):

| Part of a turn | Verdict | Why |
| --- | --- | --- |
| the body | **children** | A reply is routinely two paragraphs, a list and a snippet. That is a flow, so a sentence in it is a `loom.prose` node among the others, and "put the code above the explanation" is one `move`. |
| `speaker` | prop | Selects among three renderings and changes no node. The same turn on either side is the same turn. |
| `name`, `stamp` | props | One per record. A name that outlived its turn would be a valid tree saying nothing. |
| `avatar` | prop | One portrait per record, and `loom.quote` set the precedent for exactly this field. |
| `pending` | prop | A variant of a motion, which is the only thing 0055 lets a tree say about motion. |
| the turns themselves | **nodes** | 0052 unchanged: adding one is an `insert` a reviewer can weigh alone. |

And what a container may **not** hold: there is no `speaker`, `name` or `avatar`
on `loom.message-list`. The renderer does not inject props into children (0009),
so a default on the list would give a model two places to say one thing and *n*
chances to leave them disagreeing.

`loom.reveal` takes one prop, `motion: "rise" | "fade"`. No duration, delay,
easing or distance — 0055.

## The record

[0110](../decisions/0110-an-entrance-the-reader-drives-is-a-wrapper-not-a-prop-on-every-band.md)
— *an entrance the reader drives is a wrapper primitive, not a prop on every
band.* `Accepted`; it applies 0055 and 0014 rather than contradicting anything,
so it is not an escalation. It is worth a record because it is expensive to
reverse — trees will store `loom.reveal` nodes — and because it opens a
**category**: the first registered primitive that renders no content of its own.
The next one that wants to pin, parallax or hold should be argued against it.

The alternative it refuses, for the file: `reveal: true` on every band. That is a
prop on seventy schemas to say one thing, and it is permanently incomplete —
the band nobody thought to give it to cannot have it, and no host's own primitive
can have it at all.

## What a picture found and eighty assertions could not, again

**The seventh consecutive run in this lane where the screenshot was the test.**
Two defects, both invisible to every assertion that could have been written:

**1. The entrance completed while the band was still off-screen.** The first
range shipped was `entry 4% entry 58%`. The `entry` phase of a view timeline
begins the moment an element's top edge crosses the *bottom* of the viewport, and
for a 166px card it spans 166px of scrolling — so at `58%` the card was fully
opaque while still poking in at the bottom edge. Chromium's own numbers, probed
at eight scroll offsets: opacity `0` at 500px of scroll, `1` at 700px, with
nothing in between. An animation nobody would ever see.

The range is now the whole entry phase, `entry 0% entry 92%`, and the mid-scroll
frame in this report is the proof — the bottom row of cards sits at 56% while the
band above it has arrived.

**2. `entry` is not merely nicer than `cover`, it is the only correct phase**,
and this is the part worth reading twice. A range that ends in `cover` finishes
when the band is comfortably up the screen, which looks better — and is
**unreachable for the last band on a page**, which has no scroll left to give. It
would sit at half opacity forever, and only ever on the final band of a real page
where nobody's test fixture looks. `entry 92%` is always reached, because at the
foot of a document a band's end edge does cross the scrollport's.

**3. Print.** A printed page has no scrollport, so every reveal below the first
screen printed blank. `@media print` holds them still and visible. This one had
to be found rather than reasoned about.

## Nothing here can hide a band

The property that makes a scroll-driven entrance safe to ship, asserted rather
than hoped:

- Every rule that starts at `opacity: 0` is inside
  `@supports (animation-timeline: view())`, so a browser that cannot run the
  animation never receives the starting state.
- A band on screen at load has a timeline past its range and
  `animation-fill-mode: both` holds it at the end state.
- A page too short to scroll is that same case.
- Reduced motion, print and edit mode each hold it still and visible.

Edit mode gets its own reason on top of 0091's: **a portal preview is not a page
anybody scrolls**, so a band waiting for a scroll would be a band that is never
there.

## The pairings it paints

None that the contrast audit does not already carry. A person's bubble is
`fg-default` on `accent-subtle`, which is the pairing `loom.section`'s accent
tone already paints and which fails in **no** palette; the assistant's is
`fg-default` on `bg-surface`. The composing dots are `fg-muted` **deliberately**:
`fg-subtle` on `accent-subtle` is eight of the nine composed contrast failures in
the whole library across eight of twenty-one palettes (this lane's own open
finding, 25 August), and a new primitive reaching for it would have been the
ninth palette's worth. There is a test named for this.

## Test numbers, honestly

- `src/primitives/library.test.ts` — **210 tests, all passing**, of which **10
  are new** in `the exchange, and the way a band arrives`.
- `pnpm verify` — **green, exit 0**: build, typecheck, `@loom/runtime`
  (119 files, **1870 tests**) and `@loom/app` (158 files, **2497 tests**).
  Nothing was skipped and no test was weakened.
- Nothing failed at the end of this run. Two assertions **changed** during it —
  the range value, and the count of registered primitives — and both changed
  because the code they describe changed.

Two files outside this lane changed, both because their own tests hold them
against the registry, which is the standing exception every primitives run has
recorded: `FACTS.primitives` in `(marketing)`'s `copy.ts` (70 → 73), and
`(docs)`' `reference.generated.json`, regenerated with `pnpm --filter @loom/app
docs:api`.

## Findings

**Closed:** the 27 August *anchor seam has no consumer* — three primitives place
one on `main` and have since `primitives-19`. Checked rather than done here.

**Filed:**

- **The cascade inside a band needs the arranger.** A `stagger` prop was written
  and taken out: a reveal's children are whatever it wraps, which is almost
  always one grid, so it would have staggered that grid against nothing. What
  works today is a reveal per cell, and a grid then comes in by row. The
  recommendation is to leave the diagonal until a page asks for it.
- **A page that reveals on scroll is photographed blank.** Not a defect — it is
  what "the reader drives the entrance" means — but it lands on `(marketing)`'s
  share images and on every routine that screenshots. The fix is one flag,
  `reducedMotion: "reduce"`, and it is the honest flag rather than a trick.
- **`21st.dev`, blocked for the fifteenth time**, seventh lane. The brief opens
  its quality bar with it. Nothing here depended on it.
- **The screenshot harness, written privately for the ninth time**, now with the
  full recipe attached — including the two lines that cost time this run: a
  specimen with an `avatar` cannot be rendered over `file://`, because
  `mediaUrlSchema` takes `http:`/`https:` only, so the pages must be served.

## What the library still cannot express

- **A cascade inside one band** — filed above.
- **A conversation that streams.** `pending` draws a turn that is still being
  written; nothing makes one *arrive*. That is a client seam question (0086) and
  a page showing a conversation that already happened does not need it.
- **A second arrangement of a turn.** A published interview reads flush left with
  no bubbles, which is `loom.message-…` under 0054 and a container this run did
  not write. It is cheap when somebody wants it, and that is deliberate: the
  turn's layout is four rules in `stylesheet.ts` rather than inline, so a second
  container can rearrange it without a second child type. That is
  `loom.milestone`'s lesson applied before it cost a rewrite instead of after.

## Pictures

| File | What it shows |
| --- | --- |
| `2026-09-06-primitives-exchange-editorial-wide.png` | The whole specimen, `editorial` at 1280 |
| `2026-09-06-primitives-exchange-bold-wide.png` | The same page, `bold` |
| `2026-09-06-primitives-exchange-minimal-wide.png` | The same page, `minimal` |
| `2026-09-06-primitives-exchange-editorial-phone.png` | 390px, `editorial` |
| `2026-09-06-primitives-exchange-bold-phone.png` | 390px, `bold` |
| `2026-09-06-primitives-reveal-before.png` | The first screen, motion **on** and nothing scrolled |
| `2026-09-06-primitives-reveal-during.png` | Mid-scroll: the row below sits at 56% while the band above has arrived |

The five specimen shots are taken with reduced motion, for the reason the finding
above gives; the two reveal shots are taken with motion on, which is what makes
them worth looking at.
