# The end of the sixty seconds

**Routine:** `Loom demo` · **Branch:** `demo-39-the-end-of-the-sixty-seconds`
· **5 October 2026**

The fortieth run of this lane, with no open pull request of its own. A fresh
branch off `main` at `6686895`.

Every picture below is a production `next build` of a real commit, served by
`pnpm shoot --serve` and photographed at 1280 × 900, 390 × 844 and 348 × 465
with reduced motion. **Every number is `pnpm shoot`'s own `measure`**, with the
selectors committed in `2026-10-05-demo-the-end-of-the-sixty-seconds.shots.json`
beside this report. The `before` figures and the `before` picture are the same
harness run against a production build of `main` at `6686895`, built separately
before anything was written.

**No maintainer comment was outstanding.** Nothing has been said on this lane's
work since #458; every comment on #514 is this lane's own.

---

## What a stranger could not understand before this run

**Why the record matters.**

The record is *shown*, completely and well — what was asked, what the Gate
weighed in its own words, which way it went, what came off the page and the
button that puts it back. Every card on this rail speaks about itself. **Nothing
on this surface says why any of it is the product**, and a stranger can watch the
whole sequence and read it as a tool that narrates itself.

`docs/rollout.md` is unambiguous about which half is which:

> The differentiator is not adaptation, it is the record. Plenty of things
> change a page with AI.

The adaptation half is said on arrival, at the size of a claim. The record half
was said nowhere, and it is now said in one sentence, in the one place it is a
caption on evidence rather than a promise:

> **That is the whole loop. The page moved, and the reason it moved is written
> down beside it — whether or not anyone was watching.**

## What specifically failed, diagnosed before anything was built

Used cold against a production build of `main`, driven through the one sequence
the demo invites — press **Take the numbers off**, then **Apply this change** —
the surface fails at the **end**. That is about forty seconds in, and it is the
twenty seconds that decide whether a stranger goes to the documentation or
closes the tab.

Measured at 1280 × 900. The rail is an 857px scroller starting at `y 44`, so its
last visible pixel is **901**.

| at the end of the demonstration | where it is |
| --- | --- |
| the record card the press produced | `y 44` — **765px of 857** |
| the ask panel | `y −470` — **above the viewport** |
| its three remaining rows | `y −262`, `y −195`, `y −128` — all of them |
| the green button the panel nominates next | above the viewport with them |
| the footer, with the one way out of the demo | `y 891` — **ten pixels** of a 78px block |

So the surface's answer to *what now?* is a record card and **one pressable
control: Put it back** — which undoes the thing the stranger came to see.

Nothing is broken. `already-asked.ts` withdrew only the ask that was spent, the
panel re-nominates a lead, the green button is there. The visitor cannot see any
of it, and the rail never told them to look up.

This lane filed the shape of it as a cost on 4 October — *the ask list is further
from the visitor's eye after a change than it was* — and took the landing anyway,
correctly: a record below the fold was worse. **What was not measured then is
that the landing also takes the way out with it.**

| | |
| --- | --- |
| [**after the answer**](2026-10-05-demo-end-applied-wide.png) · [before](2026-10-05-demo-end-applied-wide-before.png) | **the picture worth opening** — the same card, and a rail that now ends somewhere |
| [after *Re-theme the whole page*](2026-10-05-demo-end-retheme-wide.png) | the one-press path, where the whole ladder is in view |
| [the phone, after the answer](2026-10-05-demo-end-applied-phone.png) | the same three steps, in the document's own scroll |
| [the arrival screen](2026-10-05-demo-end-arrival-wide-unchanged.png) | **unchanged, byte for byte** |
| [the question, one press later](2026-10-05-demo-end-held-unchanged.png) | **unchanged, byte for byte** |
| [the embed at 348 × 465](2026-10-05-demo-end-embed-unchanged.png) | **unchanged, byte for byte** |

## The change

One reading, one row of markup, and a count the rail already had.

### `_lib/what-else.ts` — when the rail has an ending, and what it says

```ts
export const whatElseToAsk = ({ available, landing, waiting }) => {
  if (landing === undefined) return undefined
  if (waiting !== undefined) return undefined
  if (available.length === 0) return undefined

  return { count: available.length, sentence: WHAT_ELSE_SENTENCE, label: labelFor(available.length) }
}
```

**Three silences, each argued.**

- **Nothing has landed.** `landing` is `landed.ts`'s reading of whether the
  revision the page is at was produced by this visitor's own press. Before that
  there is no loop to have closed, so **the arrival screen is untouched** — and
  that is asserted in `rail.test.ts` rather than left to a screenshot.
- **A question is still open.** The visitor's next move is the **Apply this
  change** under it, and `set-aside.ts` is pinned to the top of the rail saying
  what asking for something else would cost them. A row counting other asks
  underneath that is the surface arguing with its own caution.
- **Nothing is left to ask.** A link to an empty panel is the silently-dead
  control this demonstration argues against (`read-the-docs.tsx`), and the
  sentence goes with it rather than standing alone: it is a caption on the way
  on, and there is no way on.

**The count is `stillToAsk`'s**, planned against the tree as it stands now — so
a visitor who follows the link finds exactly that many rows. It is the same
discipline `how-many-wait-for-you.ts` holds on the first screen: a number the
next press checks, rather than a promise. The two paths give two different and
both-correct numbers, which is the whole argument for computing it: **4** after
*Take the numbers off*, because the `loom.stat-grid` the preset plans against is
gone; **5** after *Re-theme the whole page*, because `palette` is a toggle and
swaps back.

### `_components/what-else.tsx` — 56 pixels, and why not 73

A sentence and a link to `#ask`. A link rather than a button, for the reason the
caution's *Answer it first* is one: it goes somewhere rather than doing
something, and it lands on the panel itself rather than on a heading above it.

**It has no rule above it, and that is a decision rather than a default.** Every
other block at the foot of this rail opens with `border-t pt-4`, because each is
a new topic: the steps are the frame the cards are read through, the footer is
what becomes of the page. This is a *caption on the card above it*, and a rule
over a caption says the opposite — and the rule costs 17 pixels there is not
room for. Measured, on two production builds of this branch:

| | the row | the card leaves it | the link |
| --- | --- | --- | --- |
| with `border-t pt-4` | **73px** | 68 | **6px clipped at the bottom edge** |
| without | **56px** | 68 | whole, **12px clear** |

The first build of this unit shipped the surface's own ending cut off, which is
the defect it exists to remove, in miniature.

### `_lib/rail.ts` — the reading is wired where the other three are

`whatElse` is computed in `whatTheRailShows` from `landing`, `waiting` and
`available` — the three answers this file has already worked out against the
tree and the store together — rather than from the records a fourth time. The
condition is not written at the call site because `page.tsx` is an `async`
Server Component no `vitest` run can mount, which is the defect class `rail.ts`
was extracted to end.

### `demo/page.tsx` — one line

`{rail.whatElse && <WhatElseToAsk end={rail.whatElse} />}`, between `TheRecord`
and `WhatHappens`.

## Measured, on the two production builds

**1280 × 900. The rail is 857px starting at `y 44`, so its last pixel is 901.**

### The path the demo invites — press, then answer

| | before (`main` at `6686895`) | after |
| --- | --- | --- |
| the record card | `y 44`, 765px | `y 44`, 765px — **unmoved** |
| the ending | — | `y 833`, **56px**, whole, 12 clear |
| *4 more changes to ask for* | — | `y 873` |
| the ask panel | `y −470` | `y −470` — unmoved |
| the footer's *Read the docs* | `y 891` of 901 — **10px** | `y 988` — off screen |
| the rail | 857 **holding 2,284** | 857 **holding 2,364** |

### The one-press path — *Re-theme the whole page*

| | after |
| --- | --- |
| the record card | `y 44`, 496px |
| the ending | `y 564`, 56px, whole |
| *5 more changes to ask for* | in view |
| `WHAT HAPPENS WHEN YOU ASK` | in view |
| the footer's *Read the docs* | `y 719`, **whole** |

**The whole ladder is on one screen on this path** — the card, the caption, the
way back to the asks, the steps, and the way out — which is what the end of a
demonstration should look like and what it has never looked like here.

### 390 × 844, after the answer

The ending is `350 × 72` at `y 386`, with the footer at `y 539`, in the
document's own scroll. `BackToTheRecord` still answers for the spotlight, and
nothing about the stacked layout was touched.

### The three frames that must not move, and did not

| | md5 | |
| --- | --- | --- |
| the arrival screen | `b58bdcdeb71e39da4a090639b95675e1` | **byte-identical** to 4 October |
| the question, one press later | `79cae639175ffc88a14d8c04a2f22cbe` | **seven** separately built commits |
| the embed at 348 × 465 | `5e8fca8c6c7486f5fb64dbd20fd5dbf2` | byte-identical |

The arrival screen's geometry agrees independently: the rail holds **935 in
857**, the four ask rows are at `499 / 566 / 633 / 700`, the footer at `881`, and
`section[aria-label='What you just saw']` reports **`no match`** — the first
silence, measured on the screen a stranger judges rather than asserted only in a
test.

### And every picture is reproducible from the final committed build

All six shots were re-taken from a fresh `pnpm shoot --serve` against the build
`pnpm verify` left behind on the head commit, and **all six `md5`s match the
files in this directory** — the three unchanged frames above, and the three new
ones: `b29b53fd1d1c390da2a723a63926638b` (after the answer),
`32a74efeab399bb10d25522c4c8592cf` (after *Re-theme the whole page*),
`83d75683a9b5a34f9f86f68515261f76` (the phone).

## What it costs, stated against itself

**On the path the demo invites, the footer's *Want this on a page of your own?
Read the docs →* goes from ten pixels visible to none.** It is the honest cost of
this unit and it is the right trade twice over: ten pixels of a 78px block is not
a way out, and what takes its place is a row that exists to send the visitor
somewhere. On the one-press path the footer gains rather than loses — it was
pushed down by 55px and is wholly in view at both ends.

**The way out is not repeated in the new row**, deliberately, and that is why
the cost above is paid rather than dodged. Saying it twice on one screen is how
a footer stops being read at all, which is this lane's own rule from
`rail-header.tsx` — and on the one-press path both would be in view together.

**The rail is 80px taller after a landing.** All of it is below the fold at the
moment it is added and it goes with the landing.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line and
read in a separate command.

| | `main` at `6686895` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` (`src/`, `tools/`) | 183 files / 3,906 | **183 / 3,906** — `src/` untouched |
| `@loom/app` (`apps/loom/`) | 384 / 6,917 | **386 / 6,933** |
| the demo lane, **measured on both trees** | **755** in 49 files | **771** in 51 files |
| findings | 1,013 | **1,015**, 0 malformed |
| `prerender:check` | — | 126 pages, 1,539 junctions, 0 run together |

The lane figures are measured, both of them, by running the lane against
`main`'s tree and against this one. The `@loom/app` figure for `main` is the
only one inferred — the lane is all that changed, so it is this branch's 6,933
less the sixteen tests added.

**+16 lane tests, all written, none weakened, skipped or deleted.** Two test
files added (`what-else.test.ts`, `what-else.test.tsx`), five tests appended to
`rail.test.ts`. **No existing test was changed** — the diff to `rail.test.ts` is
append-only, and the diff to `rail.ts` and `page.tsx` is insertions only
(`+144`, `−0` across the three).

**The test that earns its place over the others** is `rail.test.ts`'s *counts the
asks the panel is actually about to offer*, and it earns it by being the one that
holds the number honest: it reads `available` before and after the press and
asserts the drop, rather than asserting a literal that would quietly become a
second opinion about the panel the first time a preset was added.

### The defect matrix

Each defect restored in turn **against the commit**, the demo lane run against
it, and the lane restored from `HEAD` between rows. Baseline **771 passed**.

| defect restored | caught |
| --- | --- |
| the count is taken from the preset table rather than from what is on offer | **4** |
| the rail stops wiring the reading | **3** |
| the ending is drawn before anything has landed | **2** |
| the ending is drawn while a question is still open | **1** |
| the row grows a second set of controls | **1** |
| the row repeats the footer's way out | **1** |
| the sentence loses the clause that says why the record matters | **1** |
| the link points somewhere other than the panel | **1** |

**Eight of eight, and the top row is the one worth reading.** Hard-coding the
count to the size of the preset table is the cheapest-looking edit in this unit
and the one a future run is most likely to make, and it is caught four times —
twice in the reading and twice in the wiring, because `rail.test.ts` asserts the
count against `available` on both paths rather than against a literal of its
own.

## Decisions taken that were not specified

- **A caption, not a panel.** There is room for one thing — the card lands at
  the top of the rail and is 765 of 857 — and a second set of ask controls is
  the defect `ask-panel.tsx` opens by arguing against: a rail with two primary
  actions has none.
- **The sentence is said once, here, and not on arrival.** On the first screen
  it would be a promise, and this lane has twice replaced a promise there with
  something the next press checks. After a landing it is a caption on evidence
  the visitor is looking at.
- **No runtime word in it.** No policy, no rule id, no stakes level, no
  revision — all four are one disclosure away on the card it is a caption for,
  which is the standing direction for this surface.
- **The phone was left alone.** The document scrolls there, the row falls where
  it falls, and nothing about the stacked layout needed an opinion.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing escalated.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and `reports/`. `git diff origin/main --name-only` outside those
  three is empty.

## What was left out

**The lead press still does not move the page** — this lane's open design
question, carried a third run and untouched. The recommendation is still *leave
it and measure*, for the reason that has not changed: nobody has watched a
stranger use this surface.

**On a phone, the arrival screen never shows the page.** Measured this run and
filed below — the rail is 1,013px of instrument and the stage begins **251px
past the fold**, so a visitor told *ask that page for a change* and *it's the
page below* meets neither. It is the largest remaining instance of the brief's
own *nothing to react to on arrival*, and it is structural rather than small.

**The disclosure chevron is still drawn in three components**, carried a third
run, for the reason it was carried the first two: the extraction opens files
this unit has no reason to open.

**The folded reasoning on an answered card is still labelled in the present
tense**, carried a fifth run.

## Findings

**Filed one, appended one, closed none.**

- **Filed**, for this lane: on a phone the demo's arrival screen never shows the
  page it is about. Measured above.
- **Appended**, to the 4 October note that the ask list is further from the
  visitor's eye after a change: the half of it this run took, and the half it
  did not.

**Re-verified, not re-filed:** `21st.dev` `EGRESS_BLOCKED`, a **thirty-seventh**
consecutive run, one call. `*.vercel.app` denied from the sandbox
(`Loom portal`, 27 September) — the preview URL is on the pull request and the
pictures are from a local production build.

## Open questions

**None new.**
