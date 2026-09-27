# The page decides what the page looks like

**Routine:** `Loom demo` · **Branch:** `demo-30-a-default-state-worth-looking-at` ·
**26 September 2026**

**Pull request:** #403 — pushed onto the open one rather than opening a second,
per step 3. **Deployed preview:** on the pull request, and the commit it is for
is this branch's head.

Every picture below is a production `next build` of a real commit — this
branch's head at `edf847b` for the *before*, this run's for the *after* — served
with `next start` and photographed at 1280 × 900 and 390 × 844 with reduced
motion.

The thirty-first run of this lane. It changes no copy, no layout and no
sentence. It removes **two copies of one decision**, and the decision is the one
the demo exists to make visible.

---

## What a stranger could not understand before this run

**What they were about to lose.**

The one press this demo invites is *Take the numbers off*. On a phone the Gate's
question carries the band it is about inside itself — there is no other way, the
band is four thousand pixels down the document — under the heading *"This is
what would come off the page."* I pressed it as a stranger would, against a
production build of this branch, and measured what was in that box:

| in the excerpt, on a phone | colour | on | contrast |
| --- | --- | --- | --- |
| **"appointments last year"** | `#f3f4f7` | `#ffffff` | **1.10 : 1** |
| "four clinicians, six days a week" | `#97a3bd` | `#ffffff` | 2.53 : 1 |
| **"3,400"**, 56px | `#1fc0e0` | `#ffffff` | 2.17 : 1 |

Every line of it fails, and the first one is not a failure of contrast so much
as an absence of it: the labels were not dim, they were **not there**. The
picture whose entire job is to show a person what a change would take away had
nothing legible in it, at the moment they were being asked to allow it.

Nothing errored. No test could see it. The words were in the DOM and the
excerpt was rendered through the same registry as the page, exactly as
`in-question.ts` promises — *"rendered through the same registry, wearing the
same theme, showing the same words."*

## Where it came from, and it is in neither of the files that look wrong

Yesterday's commit on this branch moved `DEMO_STARTING_THEME` from `editorial`
to `midnight`, which is the right change and the one the maintainer asked for.
**Two places in this lane were holding a copy of what the page looks like**, and
both became wrong in the same instant:

- **`.loom-stage`** paints `--surface-stage`, the demo chrome's white, and sets
  `color-scheme: light`. On the stage that is invisible, because the root
  primitive paints `bg-canvas` over it. On an **excerpt rooted at a band** there
  is no root primitive, so the chrome's white is what shows — under ink the
  excerpt correctly took from the page's theme.
- **`share-card.tsx`** imported `editorialPalette` by name, with a comment
  saying it did so *because that is the palette the tree carries*. It was. Then
  it was not. The card went on unfurling a cream page with navy figures for a
  link that lands on a navy page with cyan ones.

Neither was a wrong colour. Both were a **second copy of a decision that has one
home** — the three registered ids on the tree's root node (0049) — and a copy is
a defect whether or not it currently agrees.

The share card is the sharper lesson, because **every assertion about it stayed
green.** `share-card.test.tsx` measures all eleven ink-on-ground pairs at 4.5:1
and they all passed: a picture of the wrong page can be a perfectly legible one.
Readable was never the claim.

## What a stranger can understand now

**What they are about to lose, and that the link they followed was of this
page.**

| | before — this branch's head | after |
| --- | --- | --- |
| the excerpt inside the question, phone | reports/2026-09-26-demo-the-page-decides-before-phone.png | reports/2026-09-26-demo-the-page-decides-after-phone.png |
| the frame the one invited press produces, wide | reports/2026-09-26-demo-the-page-decides-before-wide.png | reports/2026-09-26-demo-the-page-decides-after-wide.png |
| the picture a link unfurls as | reports/2026-09-26-demo-the-page-decides-card-before.png | reports/2026-09-26-demo-the-page-decides-card-after.png |

Measured on the new build, same two viewports:

| | before | after |
| --- | --- | --- |
| the excerpt's ground | `#ffffff` — the demo chrome's | **`#111827`** — the palette's `bg-canvas` |
| its `color-scheme` | `light` | **`dark`** |
| "appointments last year" against it | **1.10 : 1** | **16.13 : 1** |
| the card's stage ground | `#fafaf7` — `editorial`, unnamed by the tree | **`#111827`** — resolved from the id the tree carries |

## And a third thing, which is this branch's own regression

Walking the wide layout turned up the 24 September finding's exact symptom, back
after being closed on the 25th: **the amber caution pinned over the frame a
stranger's first correct press produces.**

Neither of the two constants that fix govern had changed. What changed is that
folding the explainer — correctly; it cost a phone screen that is nothing but
rail — took about three hundred pixels out of the rail, and the scroller then
ran out of travel before the card could reach the top:

| at 1280 × 900, with a question open | before | after |
| --- | --- | --- |
| the rail's scroll position after the press | 612 | 787 |
| the furthest it can scroll | **612 — the same number** | 1222 |
| the caution, pinned, in amber | **43 → 146, on the frame** | **−132 → −29, off it** |

Those last two numbers are the ones `demo-28` recorded on `main`, to the pixel.
`ANSWER_ARRIVES` is a promise about where a card goes, and a promise the layout
can quietly withdraw is not one. `roomToLand` is the third half of that
decision, in the file the other two already live in.

## The change

Five files. One claim, said twice, plus the regression above.

### `_lib/ground.ts` — new, and it is the unit

- **`demoPagePalette`** — resolved from `DEMO_STARTING_THEME` through the demo's
  own theme registry, at module scope. A selection that does not resolve is a
  deployment that cannot draw its own page, so it throws where `demoRegistry`
  throws.
- **`pageColour(slot)`** — one of the page's colours as a value, for
  `ImageResponse`, which resolves no custom properties and so cannot be handed
  `var(--loom-bg-canvas)`. Everything on a real screen reads the variable.
- **`pageGround(theme)`** — `{ backgroundColor, color, colorScheme }` for a
  frame standing in for the page. `bg-canvas` because that is what the root
  primitive paints; `color` as well as the ground because a frame that set only
  the ground leaves anything inheriting reading the **rail's** ink — Loom's
  voice, on the clinic's page.

`colorScheme` is derived by comparing the palette's own ink to its own canvas,
which needs **no threshold**. The runtime has one (`SCRIM_DARK_CEILING`) and it
answers a different question — whether a wash darkens what is under it. Across
all twenty-one registered palettes the canvases are at `L > 0.9` and `L < 0.02`,
so there is no line to sit near.

### `part-in-question.tsx` — the frame reads the ground

`style={{ ...themeStyle(theme), ...pageGround(theme) }}`. Inline rather than in
the stylesheet, and there is a test for that: the rule it has to beat is
`.loom-stage`'s in `@layer base`, and a layered declaration loses only to an
inline one. A later run that tidies this into CSS gets a white excerpt back and
a red test.

### `share-card.tsx` — the palette resolved, and one hairline

`pageColour` replaces the `editorialPalette` import. The comment that was false
for a day is kept and answered rather than deleted, because what it got wrong is
worth reading once.

**And the split is now stated.** The card's one structural device is a light
page beside a dark instrument, which was carried by luminance alone — a fact
about `editorial` and not about the composition. On `midnight` the two grounds
are `#111827` and `#0a0a0a`, which at the 360px an unfurled card is actually
seen at is one rectangle. The stage pane takes the same hairline the bar already
draws, inside its own border-box, so the image loses no width.

### `_lib/arrival.ts` and `demo/page.tsx` — the room to land in

`roomToLand(waiting)` → `lg:pb-[70vh]`, and `""` otherwise. Conditional, because
on arrival the rail is barely taller than the viewport and trailing room would
make the demo's **default state** — the one a stranger judges — scroll into
emptiness. A viewport unit rather than a length because the shortfall is
`viewport − card − what follows it` and grows with the screen.

### What was not changed

No copy. No sentence on the rail or the page. The caution's words, tone,
stickiness and offsets. The record, the disclosure, the marks, the spotlight,
the presets, the budget, the visitor cookie. `src/` was not opened for writing
at all.

## Decisions taken that were not specified

- **The ground comes from `bg-canvas`, not `bg-surface`.** A band excerpted out
  of a page sat on the page's canvas; a band that paints a surface of its own
  paints it over this, exactly as it does on the stage.
- **The share card keeps its own `CARD_PAIRINGS` list** rather than deriving
  pairs from the element tree. The list is what the elements draw from, so it is
  not a second copy — and a derivation would measure whatever was drawn rather
  than what was meant.
- **The hairline is `CHROME.edge`, the rail's line, not the page's.** The split
  is Loom's chrome asserting itself against the page, so it is drawn in Loom's
  colour.
- **`roomToLand` is conditional and `lg:` only.** Both cost something if got
  wrong in the other direction and both are argued in the file.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing escalated, nothing left out.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and `reports/`.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, written to a file as the last
thing on its line and read in a separate command (`EXIT=0`).

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 161 | 3,130 |
| `@loom/app` | 316 | 6,141 |

**816 findings, 0 malformed · 112 prerendered pages, 1,300 junctions, 0 run
together ·** `pnpm shoot`: 1280 vs 1280 wide, 390 vs 390 phone, exit 0, no
overflow.

The demo lane's own suite goes **581 → 618: thirty-seven added, none weakened,
none skipped.** One helper was rewritten mid-run and it is worth recording why:
the first version of `borders()` in `share-card.test.tsx` collected anything
whose style key began with `border`, and the bar has carried one from the start
— so the assertion about the new hairline passed with the hairline **deleted**.
It reads one named property now. A collector that cannot tell two declarations
apart measures neither.

### The defect matrix

Each defect restored in turn against this commit, the four affected files run
together, the tree returned between rows. Baseline **74 passed**.

| defect restored | caught |
| --- | --- |
| the excerpt takes the demo chrome's ground again | **2 tests** |
| the ground is a colour written in `ground.ts` rather than the palette's | **12 tests** |
| `color-scheme` is always `light`, as the stylesheet had it | **1 test** |
| the card names a palette instead of resolving the tree's | **2 tests** |
| the rail gets no room for the card to land in | **3 tests** |
| the card loses the line between its two halves | **1 test** |

Six rows, six caught. The second is the one with the most riding on it: it is
the state this lane was in this morning, and it is the only row whose failure
list includes the share card, the excerpt and the contrast sweep at once.

**What this suite still cannot do**, said plainly: the contrast numbers in the
tables above are computed from palette values, and the *rendered* contrast is a
fact about a browser. `vitest` guards that the two ends of every pair come from
one palette. The pictures are the argument.

## Findings

**Filed one, closed none.**

- **`Loom daily build`** — *a host cannot ask a resolved theme which way round
  it is, so every surface that frames part of a tree computes it again.* Closed
  for this lane in `_lib/ground.ts`; filed because the derivation is eight lines
  and is not demo-specific, and the next host to draw a partial tree will write
  it a third time. Two shapes offered, the smaller being a `themeGround(theme)`
  beside `themeStyle(theme)` with no schema change.

**Re-verified, not re-filed:**

- `21st.dev` `EGRESS_BLOCKED`, a **twenty-eighth** consecutive run, one call.
- The 25 September *shot list cannot scroll* finding, hit again: photographing
  the front door's embed of this demonstration needed a scratch Playwright
  driver, because the frame is below the fold and `pnpm shoot` can press but not
  scroll. None of this report's own pictures needed it.

## Open questions

Nothing blocking.

- **The trailing room is visible if you look for it.** With a question open and
  the rail scrolled past the end of the record, there is a band of empty rail
  under the footer. It buys the frame the demo's one invited press produces,
  which I take to be worth more; the alternative the 24 September finding
  offered — holding the caution until a control is back in view — is an
  observer, a hidden state and an accessibility argument about a warning that is
  in the document and not on the screen. Recorded rather than filed, because it
  is a trade this lane made knowingly.
- **The front door's embed of this demonstration is now a dark box in a white
  page.** I photographed it against two local servers and it reads as an inset
  device rather than a clash — nothing is broken and I have filed nothing. It is
  `Loom marketing`'s surface and their call, and it is mentioned here because
  their band changed appearance without their branch changing.
- **The demo has twenty-one palettes it can be re-themed into and the excerpt is
  now correct in all of them**, which is a property no screenshot shows. The
  sweep in `ground.test.ts` is the only thing that knows.
