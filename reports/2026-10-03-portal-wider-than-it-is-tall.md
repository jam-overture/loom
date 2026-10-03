# 2026-10-03 — "Wider than it is tall"

**Build order section:** §5 — Loom Portal. **Not from the plan**: the maintainer,
3 October — *"The portal is too vertical in the main content pane. Remember your
directive to make this extremely user friendly. We still have a long way to go."*

**Branch:** `portal-47-wider-than-it-is-tall` (→ `main`), cut from `main` at
`937965e`. Not stacked.

---

## The measurement, taken before anything was changed

| | |
| --- | --- |
| screens capped at `max-w-3xl` (768px) | **18** |
| screens capped at `max-w-xl` (576px) | **6** |
| the front door | **1280 × 2150** — two and a half screens of scrolling |
| width it used | **568 of 1280** |

**And the sharpest instance, which names the cause.** The front door's card grid
is written `repeat(auto-fill, minmax(288px, 1fr))` — a grid that fills whatever
it is given — and it had been drawing **two columns**, because it was given 672.

The verdict was right and the cause was one line repeated twenty-four times.

---

## Why nobody had just deleted the cap

Because the cap is not a mistake. Prose has a measure — about 65 to 75
characters — past which a reader loses their place returning to the left margin,
and 768px is roughly right for it. A screen that dropped the cap would trade a
column of empty space for paragraphs 140 characters wide, which is worse.

**One container was answering two questions**: how wide is the screen, and how
wide is a sentence.

`_components/screen.tsx` splits them.

> **The screen is as wide as the display. The sentences are as wide as a
> sentence should be.**

`Screen` is full width to 90rem. `Measured` is `68ch` — characters rather than
pixels, because the eye counts rather than measures. Sentences get the measure;
grids, cards, rows and panels never do. A screen that does this gets shorter and
wider at once, **without a single paragraph changing shape**.

`Columns` is the third piece: a main subject at two thirds and a rail at one.
Not a row of equals, because these sections are not equals.

---

## Visuals

Six pages staged through the published builders into a `memoryTreeStore()`, so
the grid has something to lay out. Nothing in markup; the shipped screens do
their real reads, naming and rendering.

| | before | after |
| --- | --- | --- |
| **the front door** | [2150px, two columns](2026-10-03-portal-vertical-before-front.png) | [**1774px**, three columns, two-column lower half](2026-10-03-portal-vertical-after-front.png) |
| **your pages** | [958px, a column of names at 576px](2026-10-03-portal-vertical-before-pages.png) | [**1028px**, a full-width grid of drawn pages](2026-10-03-portal-vertical-after-pages.png) |

---

## The honest arithmetic

**The front door is 18% shorter and uses the whole display.**

**The page index is 7% taller**, and that is the trade rather than a regression.
It stopped being a list of names and became a list of pages you can tell apart —
which is `docs/portal.md` phase 1 in as many words, and what Vercel does with
projects. At thirty pages a card grid is taller than thirty text rows; the
information per vertical pixel is what went up, not the pixel count.

**The thumbnails cost no read.** `/portal/pages` was already calling `headsOf` to
take a name off every page and dropping the tree one line later — the third time
this lane has found that exact shape. The grid spends layout, not requests.

---

## What is left, which is most of it

**Sixteen screens still carry a cap.** This unit converted the two a person
meets first and built the thing the rest will be converted with. `screen.test.ts`
holds the remaining count — **29 caps across the lane, counting components** — as
a **ceiling that may only go down**, so the next run that writes one back in
fails rather than being waved through in review. That is how all twenty-four got
there: each one reasonable on its own.

Next two, by how much they stack: `/portal/trust` and `/portal/readers`, both of
which draw one tall card per page inside 768px.

---

## Tests

`pnpm verify` — **green, exit 0**.

| | `main` at `937965e` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 177 / 3,699 | **177 / 3,699** — `src/` untouched |
| `@loom/app` | 371 / 6,621 | **372 / 6,629** |
| findings | 972 | **974**, 0 malformed |

**+8 tests**, nothing weakened or skipped. The one worth naming is the sweep: it
counts the caps left in the lane and fails if the number rises, which is the only
guard that could have prevented this in the first place.

---

## What I did not do

**I did not convert the other sixteen screens.** A twenty-four-screen relayout in
one pull request is unreviewable, and the brief says so about sweeping changes.
The primitive and the rule are on `main`; the rest is a queue.

**I did not choose a layout for the empty case.** The front door's left column
is white below the queue whenever the queue is empty — which is every screenshot
here, because nothing in this repository has ever had a loaded deployment. Two
remedies are filed. Picking one from the empty case is how a screen ends up
wrong for every real one.

**I did not touch the thumbnail crop**, although the thumbnails are mostly white
in every picture. That is the fixture — six staged pages with three parts each —
and not the design. Optimising the crop against it would have been optimising
against my own test data.

**I did not touch `src/`.** `git diff origin/main -- src/ tools/` is empty.
