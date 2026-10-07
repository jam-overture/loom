# The page, on the first screen

**Routine:** `Loom demo` · **Branch:** `demo-40-the-page-on-the-first-screen`
· **6 October 2026**

The forty-first run of this lane, with no open pull request of its own. A fresh
branch off `main` at `41c65e9`.

Every picture below is a production `next build` of a real commit, served by
`pnpm shoot --serve` and photographed at 390 × 844, 1280 × 900 and 348 × 465
with reduced motion. **Every number is `pnpm shoot`'s own `measure`**, with the
selectors committed in `2026-10-06-demo-the-page-on-the-first-screen.shots.json`
beside this report. The `before` figures and the four `before` pictures are the
same harness run against a production build of `main` at `41c65e9`, built
separately before anything was written.

**No maintainer comment was outstanding.** Nothing has been said on this lane's
work since #458; every comment on #526, which merged this morning, is this
lane's own.

---

## What a stranger could not understand before this run

**On a phone: that there was a page at all.**

This is the one screen a shared link lands on, and it had no page on it. The
rail's heading says **“Ask that page for a change.”** and the line under it says
**“It’s the page below.”** Measured on `main` at 390 × 844, neither sentence was
pointing at anything on the screen: the rail is 1,013px, the fold is 844, and
the stage's first pixel is at **`y 1,094`**.

So a visitor who followed a link on a phone met a full screen of instrument —
a claim, a green button, four more buttons, a footer — and was told to ask *that
page* for a change, with no page anywhere. The brief's own list of what makes a
demo clunky has **nothing to react to on arrival** on it, and this was the
largest instance left. It was filed as a finding by this lane yesterday,
measured, with three possible shapes and a recommendation; this run built the
recommended one.

## What specifically failed, diagnosed before anything was built

Measured cold against a production build of `main` at `41c65e9`, 390 × 844, on
the screen a stranger arrives at:

| on arrival, on a phone | where it is |
| --- | --- |
| the rail | `y 82`, **390 × 1,013** |
| *Ask that page for a change.* | `y 130` |
| *It’s the page below.* | `y 246` — pointing at nothing on the screen |
| the green button | `y 325` |
| the four other asks | `597`, `664`, `731`, `814` — the last ends **33px past the fold** |
| the footer | `y 995` |
| the fold | **844** |
| **the page** | **`y 1,094`** — **250px past it** |

**Nothing here was a regression and no run did this.** The rail is 1,013px
because every one of the five runs that fought for the phone fold won: the press
is above it, `ask-panel.tsx` reverses its own reading order below `lg` to keep it
there, the explainer is folded, the four asks carry their verdicts. All of it is
right, and the sum of it is a screen with no page on it.

The wide screen never had the problem — the stage is 848px of page forty pixels
from the rail — which is why five runs of measuring this surface at 1280 × 900
did not turn it up.

## The change

The top band of the tree is drawn in the rail, between the sentence that names
it and the controls that operate on it, on narrow screens only, and only while
the visitor has asked for nothing.

| | |
| --- | --- |
| [**the arrival screen, on a phone**](2026-10-06-demo-first-screen-arrival-phone.png) · [before](2026-10-06-demo-first-screen-arrival-phone-before.png) | **the picture worth opening** — the only frame in this unit that moved |
| [the arrival screen, wide](2026-10-06-demo-first-screen-arrival-wide-unchanged.png) | **unchanged, byte for byte** |
| [the embed at 348 × 465](2026-10-06-demo-first-screen-embed-unchanged.png) | **unchanged, byte for byte** |
| [the question, one press later](2026-10-06-demo-first-screen-held-phone-unchanged.png) | **unchanged, byte for byte** |

### `_lib/the-page-itself.ts` — which node, and the one silence

```ts
export const thePageItself = ({ tree, asked }): PageItself | undefined => {
  if (asked) return undefined

  const band = topBand(tree.root)
  if (band === undefined) return undefined

  return { tree: { ...tree, root: band }, caption: THE_TOP_OF_IT }
}
```

**The band is the root's own first element child and there is no walk below
it.** The page's bands are the root's children (`page-tree.ts`) — the hero, the
logos, the features — so the top of the page is the first of them, and a search
that descended would find the hero's *heading*: a line of type with no ground
under it and no edges a visitor can see a page in. A slot is skipped rather than
descended into, which is `in-question.ts`'s own reason for refusing one.

**One silence, and it is the whole of the condition.** From the first press
onwards every screen on this surface already brings the page to the visitor: the
question renders the band it is about inside itself, answering carries them to
the mark on the page with `BackToTheRecord` pinned underneath, and a removal's
content is in the landed card. The arrival screen is the one screen with no page
on it, and it is the one screen this draws on.

It is said in terms of the **records** rather than a flag, because a record is
what an ask produces (`session.ts`) — so *nothing has been asked for* and *there
are no records* are one fact rather than two free to disagree. What that buys is
the three byte-identical frames above.

### `_components/page-band.tsx` — the extraction, and why this unit forced it

What a band *is* — the registry it is resolved with, the theme and the ground it
wears, the fact that edit mode is off — now lives in one file. Three decisions,
each of them a defect once:

- a band re-resolving its own theme would be a second answer to a question that
  has one;
- a band taking its ground from `--surface-stage` printed `#f3f4f7` on `#ffffff`
  — **1.10:1** — for three weeks after the starting theme moved to `midnight`;
- a band rendered with edit mode on draws a second amber ring inside the card
  that is asking about the first one.

This lane has deferred three extractions over the past month for the stated
reason that *the extraction opens files this unit has no reason to open*. This
one is the opposite case: the fourth caller is the reason the file exists, and
the alternative was a second copy of all three decisions written fresh in a new
component, free to disagree with the original the first time any of them
changed. The markup is identical and `part-in-question.test.tsx`'s twenty tests
pass untouched.

### `_components/the-page-itself.tsx` — `inert`, and the caption

**The band is inert, and that is the one way this band differs from the other
three.** `globals.css` already makes nothing inside a band pressable, but
`pointer-events: none` is a rule about a mouse: it leaves every control inside in
the tab order and leaves the whole band in the accessibility tree. The other
three never cared, because what they draw is a stat grid or a feature row. **The
top of this page is the clinic's hero**, which carries an `h1` and two calls to
action — so drawn like the others this window would have put a second *Book an
assessment* in the tab order, a second `h1` ahead of the page's own, and a whole
duplicate hero into a screen reader's reading of a rail whose sentences are the
only ones that explain anything.

It is on the **band** and not on the section around it, so the caption under it
is still read.

**The caption is four words: *This is the top of it.*** It is there because the
window is a part of a page and could be read as the whole of one — a stranger
who takes it for the page has been shown a runtime that changes a thumbnail,
which is a smaller claim than the true one. The fade at the band's foot says
*this continues* in pixels; this says it in words. No instruction in it: *scroll
down to see the rest* would be this lane telling a visitor to go hunting on a
4,724px document, which `rail-header.tsx` deleted two lines for on 26 September,
and they do not need to go — the press carries them.

### `globals.css` — 15rem, and the two sizes where it does not draw

**Built first at 9rem, and that build is the reason this section exists.** At
rail width the hero's first 146px are its backdrop and its eyebrow, and *Back to
the things you had stopped doing* begins after them — so a 9rem window was a
dark box with a pill in it on a dark rail. Measured on two production builds of
this branch:

| | what is in the window | what it costs below it |
| --- | --- | --- |
| **9rem** | the backdrop and the eyebrow pill. No heading. | the button at `y 515`, the first ask **6px** under the fold |
| **15rem**, `padding-top: 0` | the eyebrow, the heading's whole first line, the second running into the fade | the button at `y 611`, the four asks under the fold |

The first of those is a worse thing to put on a first screen than nothing: a
stranger cannot tell it from a rendering fault. `padding-top: 0` rather than the
shared 12px buys a line of the heading — the band is a page, so the air at the
top of the window is the hero's own and a second inset above it is a letterbox
nothing can see on a dark ground.

**And it does not draw at two sizes, for two different reasons.** Above 1024px
the page is already beside the rail, which is the question's exemption read
forwards. Below **46rem** of viewport height it is the embed: a demo inside
somebody else's page is 348 × 465, the rail is already 1,062px, and the one
thing that has to be on screen is the green button at `y 325`. The window would
put that press at `y 611` of a 465px frame — the *nothing to press* defect of
19 September, caused by the fix for a different one. Both halves are one rule,
and `globals.test.ts` asserts it as one, because the failure is a later run
splitting it and keeping the width half.

### `rail.ts` and `page.tsx` — the wiring

`pageItself` is computed in `whatTheRailShows` from the tree and the records,
beside the other six readings, because `page.tsx` is an `async` Server Component
no `vitest` run can mount and a condition written there is a condition nothing
can check. It is the **reading** rather than a rendered element — unlike the
three bands a change is about, this one does not cross into a client component,
so it is drawn at the call site exactly as `whatElse` is, and the test gets to
assert the only interesting thing about it: which node it is of.

`page.tsx` gains one guard and one element.

## Measured, on the two production builds

### 390 × 844, the screen this unit is about

| | before (`main` at `41c65e9`) | after |
| --- | --- | --- |
| the rail | `y 82`, 390 × **1,013** | `y 82`, 390 × **1,299** |
| the header | `y 102`, 199px | `y 102`, 199px — **unmoved** |
| the window | — | `y 325`, 350 × **262** (a 240px band holding 1,013, and its caption) |
| **the clinic's own heading** | **not on the screen** | **`y 471`** |
| the caption, *This is the top of it.* | — | `y 571` |
| the green button | `y 325` | `y 611` |
| its promise, and the Gate's verdict under it | `y 383`, `y 423` † | `y 669`, `y 709` |
| *you can ask for 5 changes here…* | `y 487` † | `y 773` |
| the four other asks | `597`, `664`, `731`, `814` | `883`, `950`, `1,017`, `1,100` |
| the footer | `y 995` | `y 1,281` |
| the stage's first pixel | `y 1,094` | `y 1,380` |

**† are the only `before` figures in this report the harness did not take.**
`main`'s build was photographed before those three selectors were on the list,
and rebuilding it for them would have bought a number arithmetic already has:
everything below the window moved by exactly 286px, so they are this branch's
less 286. Every other figure here, on both trees, is `measure`'s.

The stage moved further away and that is the trade stated plainly: **a visitor
who wanted to reach the page by scrolling now scrolls 286px further, and a
visitor who wanted to see it does not have to scroll at all.**

### The three frames that must not move, and did not

| | `md5` | |
| --- | --- | --- |
| the arrival screen, 1280 × 900 | `e8fd0ea8bd7fe902144d9cd111bf7b5c` | **byte-identical** |
| the embed at 348 × 465 | `8c0540a07671a9b19d55c2603f130c73` | **byte-identical** |
| the question, one press later, 390 × 844 | `16e4bc9b0e979403317308292ca50c34` | **byte-identical** |

Each is a separate production build of a separate commit, photographed by the
same harness. The geometry agrees independently: at 1280 × 900 the rail still
holds **935 in 857**, the four asks are still at `499 / 566 / 633 / 700`, the
footer is still at `881`, the stage still holds **3,155 in 857**, and
`section.demo-part--arrival` reports **`0 × 0`** — the stylesheet's refusal,
measured on the screen rather than asserted only in a test. At 348 × 465 the
green button is still at `y 325` and the window is `0 × 0`.

The arrival screen on a phone is the one frame in this unit that moved:
`ef100592bcd9b1569b823f108f8aa070` → `8498ace7521893a50c32e1d3f06fd321`.

## What it costs, stated against itself

**On a 390 × 844 phone the four secondary asks go under the fold.** They were at
`597 → 877` with the last one already 33px past it; they are now at `883 →
1,163`. That is the whole of what this unit spends, and it is spent on purpose:

- **What they carry is still above the fold without them.** Each row prints a
  verdict — `GOES AHEAD`, `ASKS YOU FIRST` — computed by running the ask. The
  claim they are evidence for is the panel's own sentence, *“You can ask for 5
  changes here. Loom will make 2 on its own and ask you first about 3.”*, at
  `y 773`; and the lead ask's own verdict, *“Pressing this raises a question,
  not a change — some risk, so Loom asks you before the page moves, and writes
  down what you decide”*, at `y 709`. Both are on the screen, as is the
  disclosure offering to show what the press would take off the page, at
  `y 826` of a fold at 844. The governing claim is proven above the fold by the
  one ask a stranger is being invited to press.
- **The first screen is now a sentence, a page, and one thing to press.** That
  is the shape this surface has argued for at every other width.

**The rail is 286px taller on arrival** and 1,299px of it is below a fold it was
already 169px below. Nothing else on this surface moved at any size.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line and
read in a separate command.

| | `main` at `41c65e9` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` (`src/`, `tools/`) | 186 files / 4,022 | **186 / 4,022** — `src/` untouched |
| `@loom/app` (`apps/loom/`) | 398 / 7,087 — derived | **400 / 7,105** |
| the demo lane | 51 files / 771 | **53 / 789** |
| findings | **1,036** | **1,037**, 0 malformed |
| `prerender:check` | — | 126 pages, 1,542 junctions, 0 run together |

**+18 lane tests, all written, none weakened, skipped or deleted.** Two test
files added (`_lib/the-page-itself.test.ts`, `_components/the-page-itself.test.tsx`),
four tests appended to `rail.test.ts` and two to `globals.test.ts`. The lane's
figure on `main` is derived rather than re-run — it is this branch's 789 less
exactly the eighteen written here — and it agrees with the 5 October report's
own measurement of **771 in 51 files**, which is the check that makes the
derivation worth printing.

**One existing test file changed behaviour-neutrally and none changed
meaning**: `globals.test.ts` gained two assertions, `rail.test.ts` gained a
`describe`, and `part-in-question.test.tsx` was not touched at all although the
component under it lost thirty lines to `page-band.tsx` — which is the strongest
thing that can be said about an extraction.

**The test that earns its place over the others** is `rail.test.ts`'s *says
nothing once a change has landed*, and it earns it by closing the second of the
two routes to the same condition: the window is withdrawn by `records.length`,
and the two ways a visitor produces a record — a question they are asked, and a
change that goes ahead on its own — reach it by different outcomes. A reading
written against *holds* rather than *records* passes the first and fails the
second, and the arrival window would then survive onto the screen where the
record card is already at the top of the rail.

### The defect matrix

Each defect restored in turn **against the commit**, the demo lane run against
it, and the lane restored from `HEAD` between rows. Baseline **789 passed**.

| defect restored | caught |
| --- | --- |
| the reading descends into the band and shows what is inside it | **4** |
| the window is drawn after the visitor has asked for something | **3** |
| the rail stops wiring the reading | **2** |
| the band is the root's first child, whatever kind it is | **1** |
| the band is not inert | **1** |
| the caption moves inside the inert band | **1** |
| the wrapper loses the class the stylesheet clips and hides it by | **1** |
| the window's ceiling is removed, so the whole hero goes in the rail | **1** |
| the hiding rule keeps its width half and loses its height half | **1** |

**Nine of nine.** The last row is the one worth reading: it is the edit a later
run tidying a two-condition media query is most likely to make, it leaves a
stylesheet that looks correct and reads correctly, and what it produces is an
embed with nothing to press at the one size this surface is least likely to be
photographed at.

## Decisions taken that were not specified

- **The window draws on the arrival screen and nowhere else.** The alternative —
  keeping it through the question and the landing — would have shown the page
  changing in the rail, which is a stronger demonstration and a worse screen: a
  question already renders the band it is about directly under its own two
  buttons, and a second rendering of a different band above it is two pages in
  one rail. It also costs the three byte-identical frames above, which are the
  evidence that this unit moved one screen and no others.
- **The referent line in the header was left exactly as it is.** *It’s the page
  below.* now has something under it, so it reads as pointing rather than
  promising, and it survives for the screens after the first press where the
  window is gone. Rewriting it would have changed copy three runs have argued
  about, for no measured reason.
- **No heading and no `aria-label` on the window's section.** A labelled region
  announces itself as something to navigate into and there is nothing in there
  to navigate to — the page it is a view of is the next landmark in the
  document.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing escalated.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and `reports/`. `git diff origin/main --name-only` outside those
  three is empty.

## What was left out

**The lead press still does not move the page** — this lane's open design
question, carried a fourth run and untouched. The recommendation is still *leave
it and measure*, for the reason that has not changed: nobody has watched a
stranger use this surface.

**The other three bands still rely on `pointer-events: none`**, which is a rule
about a mouse. Filed below rather than fixed here, because the right shape for
it is a reading over the tree — *is the page below carrying these same nodes* —
rather than a flag, and this unit had one screen to fix.

**The disclosure chevron is still drawn in three components**, carried a fourth
run.

**The folded reasoning on an answered card is still labelled in the present
tense**, carried a sixth run.

## Findings

**Filed one, closed one.**

- **Closed:** *on a phone the demo's arrival screen never shows the page it is
  about* (5 October, this lane's own), by the shape its own recommendation named.
  The entry is left whole, because the two refused shapes are the argument for
  the built one — and because the objection recorded against the built one
  turned out to be answered by the surface itself: three bands were already
  rendered a second time, and `page-band.tsx` is now the one file that decides
  what such a band is.
- **Filed**, for this lane: three of the four bands this surface draws rely on
  `pointer-events: none`, which keeps a mouse out and leaves everything inside in
  the tab order and the accessibility tree. Nothing is broken today and the
  reason is a fact about which preset leads rather than about the rule.

**Re-verified, not re-filed:** `21st.dev` `EGRESS_BLOCKED`, a **thirty-eighth**
consecutive run, one call. `*.vercel.app` denied from the sandbox
(`Loom portal`, 27 September) — the preview URL is on the pull request and the
pictures are from a local production build.

## Open questions

**None new.**
