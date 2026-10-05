# The one-press change gets its record, in view

**Routine:** `Loom demo` · **Branch:** `demo-38-the-one-press-record`
· **4 October 2026**

The thirty-ninth run of this lane, with no open pull request of its own. So: a
fresh branch off `main` at `f79e1d9`.

Every picture below is a production `next build` of a real commit, served by
`pnpm shoot --serve` and photographed at 1280 × 900, 390 × 844 and 348 × 465
with reduced motion. The `before` pictures are the same harness run against
`main` at `f79e1d9`, built separately. **Every number here is `pnpm shoot`'s
own**, except one pixel difference that is decoded from the PNGs and says so.

**No maintainer comment was outstanding.** Nothing has been said on this lane's
work since #458, and #499's open question is answered below by being narrowed
rather than by being decided.

---

## What a stranger could not understand before this run

**That a change Loom makes without asking is still written down.**

The run of 3 October brought the four secondary asks above the fold, and with
them the two the Gate marks **GOES AHEAD** — the only **one-press** changes this
surface offers. A stranger can now reach them in fifteen seconds. Here is what
happened when they did.

Press *Re-theme the whole page*. The stage goes from dark navy to cream, the
headline turns serif, every colour on the page changes at once. It is the most
arresting fifteen seconds on this surface and it is the half of the claim
`docs/rollout.md` calls **the least novel thing here**.

The other half — *Low risk. A small, easily undone change* · *Yes. Nothing is
destroyed by it, so the exact opposite of this change already exists* ·
*Nothing this project watches for was involved, so it went ahead on its own* ·
*How the whole page looks changed. Not a word on it changed* · **Put it back** —
began **four hundred and forty pixels below the screen.**

| | |
| --- | --- |
| [**after *Re-theme the whole page***](2026-10-04-demo-one-press-retheme-wide.png) · [before](2026-10-04-demo-one-press-retheme-wide-before.png) | **the picture worth opening** — the page transformed, and the whole record of it, side by side |
| [after *Repaint the top band*](2026-10-04-demo-one-press-repaint-wide.png) · [before](2026-10-04-demo-one-press-repaint-wide-before.png) | the quieter change, same movement |
| [the arrival screen](2026-10-04-demo-one-press-arrival-wide-unchanged.png) | **unchanged, byte for byte** |
| [the question, one press later](2026-10-04-demo-one-press-held-unchanged.png) | **unchanged, byte for byte** |
| [the answered card, two presses later](2026-10-04-demo-one-press-applied-unchanged.png) | **unchanged, byte for byte** |
| [the embed at 348 × 465](2026-10-04-demo-one-press-embed-unchanged.png) | **unchanged, byte for byte** |
| [the phone, after the same press](2026-10-04-demo-one-press-retheme-phone-unchanged.png) | **unchanged** — same geometry to the pixel, and see *the one frame that will not hash* |

## What specifically failed, diagnosed before anything was built

Used cold against a production build of `main`, the surface fails at the moment
a stranger first makes something happen, and it fails it on the half of the
claim that is this project's alone.

The brief's five ways to be clunky name *the interesting part is below the
fold*, and the 3 October run fixed that for the arrival screen. This is the same
failure one press later, and it is sharper there: on arrival the thing below the
fold was evidence for a claim, and here it is **the entire answer to a press the
visitor just made**.

Measured on a production build at 1280 × 900. The fold is 900.

| after the one press | the record card's top | what was on screen |
| --- | --- | --- |
| *Re-theme the whole page* | **848** | 52px of a 496px card |
| *Repaint the top band* | **872** | 28px of a 512px card |

What was on screen in both cases was the arrival panel, intact, with the words
**THE RECORD** and one line under them at the very bottom edge. *Put it back*
was 349 past the fold.

**And the question path had none of this problem**, which is what made it
findable: pressing the lead ask carries the question card to the top of the rail
and the whole frame is in view. Two paths through one surface, one of them
finished.

## The change

One reading, widened. Everything that acts on it was already built.

### `_lib/landed.ts` — it asked whether the visitor had answered

```ts
-  records.find(
-    (record) => record.answeredBy !== undefined && record.revision?.produced === revision
-  )
+  records.find((record) => record.revision?.produced === revision)
```

`landedOnYourAnswer` became `landedOnYourPress`. The argument for the narrow
version is in `answer-in-view.tsx` and it was explicit:

> A change that applied on its own has already moved the page, which is its own
> announcement, and its *Put it back* is an offer rather than a question —
> dragging the rail to it would be the surface moving for its own reasons.

**The premise is true and the inference from it is not.** *The page moving is
its own announcement* is a claim about the **stage**, and on a wide screen the
stage and the rail are two scrollers. Saying the stage speaks for itself is a
reason for the rail to carry the record, not a reason for it to sit still. The
two scrollers then hold one opinion each and the opinions agree: the stage shows
where it happened, the rail shows the record of it. That is the sentence this
whole surface exists to make true, and it was true only after two presses.

Three comments were rewritten rather than left to contradict the code — the
paragraph above, the list's own note in `the-record.tsx`, and `arrival.ts`'s
account of which landings it owes room to.

### Nothing else changed, and that is the shape of it

- **`AnswerInView` already had the guard this needs.** `onlyWhereTheRailScrolls`
  walks up from the card to the first ancestor that scrolls, which on a phone is
  nothing, so the stacked layout declines and `SpotlightScroll` keeps its one
  opinion about its one scroller. The phone is untouched, and measured: the card
  is at `y 962`, `350 × 512`, `← 631 past the fold` on both builds, where
  `BackToTheRecord` — *Loom wrote down what it just did. · Show the record ↑* —
  is the bar that answers for it.
- **`roomToLand` already keyed on `landing` rather than on how it was
  produced**, so the trailing room follows the widened reading with no edit.
  Its *test* needed one, and that is in the matrix below.
- **`TheRecord` already ranked a waiting question above a landed card**, which
  is the ordering that keeps this one movement rather than two.

## Measured, on the two production builds

**1280 × 900. The fold is 900.**

| | before (`main` at `f79e1d9`) | after |
| --- | --- | --- |
| **after *Re-theme the whole page*** | | |
| the rail | 857px scroller **holding 1,480** | 857 **holding 2,090** |
| the record card | y **848** — 444 past the fold | y **44**, whole |
| *Put it back* | y 1,219 — **349 past** | y **415** |
| **after *Repaint the top band*** | | |
| the rail | 857 **holding 1,520** | 857 **holding 2,130** |
| the record card | y **872** — 484 past | y **44**, whole |
| *Put it back* | y 1,235 — 365 past | y **431** |

Both cards land at 44 — the top of the rail's scroller — and both are wholly on
screen with their **Applied** badge, the ask quoted, what the Gate weighed, the
disposition, the plain reading and the button.

**The rail gets taller**, from 1,480 to 2,090, and that is `roomToLand`'s
`lg:pb-[70vh]` arriving. It is what makes the landing a landing rather than a
clamp, and the arithmetic is the reason: without it the rail's furthest scroll
is 663 against a card top of 848, so the card would stop at 185 — on screen, and
at a position decided by the height of the card. `arrival.ts` was written to
take exactly that out of this surface.

**390 × 844 — unchanged, and that is the guard working rather than an
oversight.** `aside li[id]` at `x 20 y 962  350 × 512  ← 631 past the fold` on
both builds.

**348 × 465, the embed inside the front door, on a phone. Byte-identical**,
`md5 5e8fca8c6c7486f5fb64dbd20fd5dbf2` — the same hash the 2 and 3 October runs
recorded.

**And the three frames the invited sequence passes through are byte-identical
too.** The arrival screen is `b58bdcdeb71e39da4a090639b95675e1`, the question
`79cae639175ffc88a14d8c04a2f22cbe` — now across **six** separately built
commits — and the answered card `f14fc51857b1124f9cdb40b95bee46b1`.

## What it costs, stated against itself

**A visitor who was reading the ask list has it thrown across the rail.** The
press that did this takes its own row out of the list (`already-asked.ts`), so
what the minimum movement would hold still under their cursor is the gap where
the row was — which is the same argument `ANSWER_ARRIVES` was already settled
on, reaching the other press. It is the weaker half of that argument here,
because the green lead button is not withdrawn by a secondary ask, and it is
still the right trade: a visitor who just pressed something should be looking at
what it produced.

**Up to 70vh of empty rail, for one press.** It is below the footer, it is
reachable only by scrolling past the end of the record, and it goes the moment
anything else lands. `arrival.ts` carries the argument and this run widens who
it is paid for, not how much.

**The ask list is further from the visitor's eye after a change than it was.**
Nothing was removed, and three of the four rows are a short scroll up, but a
stranger who wants a second change now scrolls for it where before they did not.
Measured against what they get: the first change's record, which they could not
see at all.

## What was measured, and with what

`pnpm shoot`'s `measure`, with the selectors committed in
`2026-10-04-demo-the-one-press-record.shots.json` beside this report, so the
table re-runs. `docs/routines.md` documents it now — the 3 October finding this
lane filed was closed by #501 before it could be read, and this run reached for
the instrument **first**, which is the first time that sentence is true here.

**Every `after` picture is byte-identical to a fresh shot taken from the final
committed build**, re-run after the gate went green on the head commit: all
seven `md5`s match the shots this report's numbers were read from.

### The one frame that will not hash, and it does not on `main` either

Four shots of the phone frame after *Re-theme the whole page* — two from this
branch's build, two from `main`'s — came back with **four different hashes**,
with identical geometry and identical words.

Decoded and differenced: the region is **x 20, y 325, 350 × 282** in CSS pixels
— the green lead button and the two paragraphs under it — across 53 distinct
rows, and the **largest channel difference is 5 of 255**. The pictures are
indistinguishable at any zoom.

The 3 October run found a flake of this shape that was a real product defect, so
it was worth ruling that out: a transition caught mid-flight moves a box or
fades a whole element and would show a delta far larger than 5 somewhere, and
the `prefers-reduced-motion` rule that run wrote now names `summary` and
`summary svg` beside `.loom-reach`. A ceiling of 5 across a smooth region is the
shape of gradient dithering, which Chromium does with noise. **Filed rather than
chased**, because this lane's reports lean on byte-identical frames and one of
them cannot be claimed.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line and
read in a separate command.

| | `main` at `f79e1d9` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` (`src/`, `tools/`) | 180 files / 3,803 | **180 / 3,803** — `src/` untouched |
| `@loom/app` (`apps/loom/`) | 378 / 6,776 | **378 / 6,779** |
| the demo lane, measured | **752** in 49 files | **755** in 49 files |
| findings | 996 | **998**, 0 malformed |
| `prerender:check` | — | 124 pages, 1,536 junctions, 0 run together |

The lane columns are measured here, both of them, by running the lane against
`main`'s tree and against this one. The `@loom/app` figure for `main` is the
only one inferred — the lane is all that changed, so it is this branch's 6,779
less the three tests added, and it agrees with the 6,776 #513 measured off the
same base commit. **+3 lane tests, all
written** — one in `landed.test.ts`, two in `rail.test.ts`. No test file was
added. **Six existing tests changed and none was weakened:** four were renamed
because the subject widened, and two asserted the narrowness this run removed
and now assert what replaced it. Nothing was skipped or deleted.

**The test that earns its place over the others** is `rail.test.ts`'s *leaves at
most one record claiming any revision the page can be at*, and it earns it by
being the thing the defect matrix could not catch — see below.

### The defect matrix

Each defect restored in turn **against the commit**, the demo lane run against
it, and the lane restored from `HEAD` between rows. Baseline **755 passed**.

| defect restored | caught |
| --- | --- |
| the reading requires an answer again, so a one-press change gets no landing | **5** |
| the rail stops wiring the reading | **4** |
| the room is withheld from a landing, so the card clamps where the rail runs out | **3** |
| the component stops honouring the scroller rule it is handed | **3** |
| the reading drops the revision, so it names a card the page has moved past | **2** |
| the list drops the scroller rule, so a phone gets two opinions about one scroller | **1** |
| a landed card outranks the question the demo cannot proceed without | **1** |
| the reading takes the last match rather than the first | **unreachable** |

**Seven of eight, and the eighth is the interesting row.** *The reading takes
the last match* was restored — `[...records].reverse().find(…)` — and the whole
lane stayed green. Not because the ordering tests are weak: because **widening
the reading took the list order out of the answer**. A revision is produced
once, so at most one record can claim any revision and `find` and `findLast`
cannot disagree. While the reading also required `answeredBy`, two *different*
records could satisfy the two halves and which came first was load-bearing; now
they cannot.

That is a property nobody set out to create and it is now asserted as what it
is, over records the pipeline really produced rather than a fixture — a question
asked and answered, then two asks the Gate let through, and every revision they
claim distinct. A later record shape that let two cards claim one revision — a
repair minting its own, an undo folded onto the record it undoes — fails there
rather than showing a stranger whichever card `Array.prototype.find` reached
first. `landed.ts` says the same thing in prose so the next run does not restore
the ordering it no longer needs.

## Decisions taken that were not specified

- **The reading widened rather than a second reading beside it.** Two readings
  would mean two landings, and the whole of `arrival.ts` is the argument that a
  room given for one card and a scroll taken to another is a pair of
  half-decisions. One value, two readers, as before.
- **The guard was reused rather than re-argued.** `onlyWhereTheRailScrolls`
  already said *only where the rail is a scroller of its own*, measured at the
  moment the scroll would happen rather than against a breakpoint. Nothing about
  the stacked layout needed a new opinion.
- **The question still outranks the landing**, unchanged, and now it matters
  more often: a visitor can leave a question open and press a one-press ask. In
  practice the second press moves the page past the hold's base revision, so the
  question stops being answerable and the caution goes with it — which is
  asserted in `rail.test.ts` as the sequence it is, after a test written on the
  assumption that both could be live at once went red and was wrong rather than
  the code.
- **The phone was left alone.** `BackToTheRecord` already answers there and its
  bar is in view on arrival at the mark. Changing both layouts in one unit would
  have made neither reviewable.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing escalated.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and `reports/`. `git diff origin/main --name-only` outside those
  three is empty.

## What was left out

**The lead press still does not move the page** — this lane's open design
question, appended to rather than decided. What changed is that shape (2),
*lead with a change that goes ahead*, costs less than it did: the path it would
lead with is a complete demonstration now rather than half of one. The
recommendation is still **1 and measure before moving**, because nobody has
watched a stranger use this surface.

**The disclosure chevron is still drawn in three components**, this lane's open
finding of 3 October, carried a second run. Untouched here for the reason it was
untouched there: the extraction opens files this unit has no reason to open.

**The folded reasoning on an answered card is still labelled in the present
tense**, carried a fourth run.

## Findings

**Filed two, appended one, closed none.**

- **Filed**, for this lane: the demo's stage and its rail are both dark on
  arrival, and `page.tsx`'s comment calling the stage light is the argument for
  why they must not be. The ground this lane controls *is* white — the arrival
  theme paints over it, and a visitor can re-theme to the light one with one
  press, which is the picture at the top of this report. A diagnosis with three
  possible outcomes and no recommendation; changing the comment is a legitimate
  one.
- **Filed**, for this lane: the phone frame after a one-press change is not
  byte-reproducible, on `main` either. The measurement is above.
- **Appended**, to this lane's 3 October design question, as above.

**Re-verified, not re-filed:** `21st.dev` `EGRESS_BLOCKED`, a **thirty-sixth**
consecutive run, one call. `*.vercel.app` denied from the sandbox
(`Loom portal`, 27 September) — the preview URL is on the pull request and the
pictures are from a local production build.

## Open questions

**None new.** The one this lane carries is narrowed above and is in
`FINDINGS.md` and on the pull request.
