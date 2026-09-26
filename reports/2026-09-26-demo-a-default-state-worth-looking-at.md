# A default state worth looking at

**Routine:** `Loom demo` · **Branch:** `demo-30-a-default-state-worth-looking-at` ·
**26 September 2026**

**Pull request:** [#403](https://github.com/jam-overture/loom/pull/403) ·
**Deployed preview:**
https://loom-git-demo-30-a-default-s-2c7850-jpizzolato36-6341s-projects.vercel.app/demo

(Published unverified: `*.vercel.app` is off this sandbox's egress allowlist, the
standing 19 August limit. Vercel reports the deployment **Ready**. Worth opening
rather than only reading the pictures — the hover states, the fold of the
explainer and the `aurora` gradient behind the headline do not survive a still.)

Both pictures are a production `next build` of a real commit — `main`'s
`b126601` for the *before*, this branch's for the *after* — served with
`next start` and photographed with `pnpm shoot`.

**Asked for by the maintainer, in session, not chosen from the queue:**

> *The demo needs to be re-worked. I don't like the default state. I want
> something that looks more modern and cool.*

…with an inspiration image: a tiling contractor's landing page. Dark ground,
a huge tightly-tracked display line with one word in cyan, monospace
micro-labels, badge chips, a stat row, a solid accent CTA beside a ghost one,
and a photograph behind all of it.

---

## What a stranger could not understand before this run

Nothing, and that is the point of this entry — **this run is not about
comprehension.** Twenty-nine runs have gone into what the demo *says*. The
maintainer's complaint is that the thing saying it does not look like a product
anyone would buy, and on the arrival screen he is right.

| | before |
| --- | --- |
| **the stage**, two thirds of the screen | a light magazine theme: a serif headline, a grey pill button, a soft radial, no accent, no depth |
| **the rail** | five distinct jobs — eyebrow, claim, promise, controls, explainer — set within four pixels of each other, so it read as one column of grey |
| **the phone** | the stage is entirely below the fold, so the whole first screen is that column, and 300px of it is an explainer for a thing the visitor has not done |

## What changed, and the first one is a constant

### The stage: `editorial` → `midnight`

`DEMO_STARTING_THEME` was `editorial` + `editorial-serif` + `comfortable` — a
light, serif, magazine theme with a muted slate accent. It is now **`midnight` +
`geometric` + `technical`**: `#111827` deep navy, a `#1fc0e0` cyan accent, a
heavy geometric display face on a ramp that tops out at 88px, and barely-there
radii on a four-pixel grid.

**Nothing was invented and nothing was built.** All three ids were already
registered by `createThemeRegistry()`, the tree is byte-identical, and the
presets address the same nodes. It is one constant, and it is most of the
difference between the two pictures — which is itself the demo's argument,
made on the demo: *every colour and typeface on this page is data.*

`midnight` was picked because it is the closest thing the registry has to the
inspiration — deep blue-black with a cyan accent is that image's exact scheme.

### The re-theme preset now goes dark to light

`DEMO_ALTERNATE_THEME` was `bold` (black + yellow). From a light start that was
a dramatic change; from `midnight` it would be dark to dark. It is now
`editorial` — the theme the demo used to arrive on — so **Re-theme the whole
page** takes a dark page to a light one, which is the most legible version of
its own promise: *every colour and typeface on the page changes at once.*

### The rail: the type contrast it never had

The heading is 30px against an 11px monospace label. That ratio is one the
specimen page has always had and the instrument beside it never did.

- **A monospace micro-label with a lit dot.** *Live* is a claim a recording
  would also make; a lit dot is the convention for a thing that is running.
- **The accent on one word, and it is the verb.** *Change* is what this surface
  does. It is a `<span>` inside the heading, so the accessible name is still the
  whole sentence.
- **Two chips: `No sign-in`, `Nothing kept`.** The only new content on the
  screen. They answer, before it is asked, the question that stops a stranger
  pressing anything on an unfamiliar tool — *what is this going to cost me?* —
  and both are facts rather than promises (`visitor.ts` mints an opaque cookie
  that grants nothing; the session is a tree in memory). Both were already
  stated **at the foot of the rail**, which is the one place a visitor deciding
  whether to start has not reached. The footer's copy of the clause is gone:
  saying it twice on one screen is how a footer stops being read.
- **Every section label is now monospace on the same tracking**, so the rail's
  chrome is one voice and the page's words are another.
- **The primary carries an arrow**, `aria-hidden`, so what it says is unchanged
  and what it looks like is a control that acts on something.

### `WhatHappens` folds

The three steps were open on arrival and cost about 300px — on a phone, the
whole lower half of the only screen there is. The maintainer's own direction
settles it: *plain language is the default, the technical record is one click
away, nothing is ever removed.* An explanation of what a press will do is
exactly the second category. It is a `<details>`, so it works with JavaScript
off and the steps inside it are unchanged.

## Look at it

| | before — `main` | after — this branch |
| --- | --- | --- |
| the arrival screen, 1280 × 900 | [before](2026-09-26-demo-a-default-state-worth-looking-at-before-wide.png) | [after](2026-09-26-demo-a-default-state-worth-looking-at-after-wide.png) |
| the same on a phone, 390 × 844 | [before](2026-09-26-demo-a-default-state-worth-looking-at-before-phone.png) | [after](2026-09-26-demo-a-default-state-worth-looking-at-after-phone.png) |

On the phone the whole instrument now fits one screen: the claim, the chips, the
green button with its promise, and all four of the other asks. Before, the fold
landed in the middle of the explainer.

## What this does not have, and it is the inspiration's best device

**A photograph.** The image behind that hero is doing more work than any other
single thing in it, and this run cannot supply one:

- `loom.media` requires a `src`, and `mediaUrlSchema` refuses `data:`
  deliberately, so an inline asset is not expressible in a tree.
- A same-origin path names a file in `apps/loom/public/`, which is an asset this
  repository does not have.
- Fetching stock photography over this sandbox's egress and committing it is a
  licensing decision, and it is the maintainer's rather than a routine's.

So the run took the other eighty per cent — ground, type, accent, labels, chips,
depth from hairlines — and left the photograph as a question on the pull
request. It is filed below rather than guessed at.

## Real test numbers

`pnpm verify` — **green, exit 0**, read off the run and not off a pipe
(`VERIFY_EXIT=0`).

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 163 | 3,130 |
| `@loom/app` | 315 | 6,104 |

814 findings, 0 malformed · 112 prerendered pages, 1,300 junctions, 0 run
together · `pnpm shoot`: 1280 vs 1280 wide, 390 vs 390 phone, no overflow.

The demo lane's own suite goes from **580** to **581**. **Four existing
assertions changed and none was weakened** — every one of them asserted the
thing this run deliberately changed, and three are now stronger than they were:

| assertion | was | is |
| --- | --- | --- |
| the arrival theme | `toBe("editorial")` | resolves **all three** ids against `DEMO_STARTING_THEME`, so it catches an unregistered id rather than a changed one |
| the alternate theme | `toBe("bold")` | resolves against `DEMO_ALTERNATE_THEME`, **plus a new test** that the two disagree about palette, font pack *and* style preset — which is the re-theme preset's promise |
| the primary slot | `textContent` equality | the same button by **accessible name**, which is what a screen reader announces and excludes the decorative arrow |
| the step numbers are hidden | every `[aria-hidden]` in the component | every `[aria-hidden]` **in the list**, because the summary that folds the section has a chevron of its own |

## Findings

**Filed one**, for the maintainer: **the demo's best available device is a
photograph and the repository cannot hold one.** Three ways out, none of which a
routine should pick: an asset committed under `apps/loom/public/` with a licence
the maintainer has read, a hosted URL on a domain he controls, or a decision
that the demo is type-led and the hero slot stays empty for good. Until then
`loom.hero` paints its own `aurora` backdrop from the palette, which is what the
after picture is using and needs no asset.

## Open questions

- **Is the stage dark enough to be confusing?** `page.tsx` argues at length that
  the stage is light and the rail is dark, and that the separation is
  load-bearing: when both halves were white, a visitor could not tell which
  words were Loom's. Both halves are now dark, and the thing carrying the
  separation is no longer value but **hue and material** — the stage is navy
  with a lit gradient, the rail is flat near-black with hairlines and monospace
  labels. I judged it holds in the pictures and I am not certain at every
  viewport. It is the first thing to look at if the screen ever reads as one
  surface.
- **The chips are a place a later run will want to put a badge.** Two remove
  friction. A third would add it.
- **The stage's middle is sparse**, and that is the specimen's business rather
  than the instrument's: it is a hero, a logo cloud and a services grid with a
  lot of air. Worth a run of its own now that the theme can carry one.
