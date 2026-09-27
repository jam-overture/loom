# What the press is about

**Routine:** `Loom demo` · **Branch:** `demo-31-what-the-press-is-about` ·
**27 September 2026**

The thirty-second run of this lane, and the first with no open pull request of
its own to push onto — `demo-30` merged as #403 and #410 took its framework
finding. So: a fresh branch off `main` at `c265328`.

Every picture below is a production `next build` of a real commit, served with
`next start` by `pnpm shoot --serve` and photographed at 1280 × 900 and
390 × 844 with reduced motion. **The preview deployment is not photographed and
has never been**, by this lane or any other: the URL is on the pull request and
Vercel reports it Ready, and `*.vercel.app` is denied by the environment's
egress policy (`Loom portal`, 27 September).

---

## What a stranger could not understand before this run

**What the one button on the screen was about.**

The demo invites exactly one press. It is green, it is the only green on the
page, and it says **Take the numbers off** — under a promise reading *"The
appointments, the years and the waiting time come off the page."*

There were no appointments, years or waiting time anywhere on the screen.

| the band that press is about | where it is on arrival |
| --- | --- |
| 1280 × 900 | below the fold of a stage showing the clinic's hero |
| 390 × 844 | about four thousand pixels down a 6,380px document |

So the first thing this demo asked of a stranger was to take its word for what
it was about to remove, and the first thing it gave them back was the Gate
asking, personally, whether they would allow it. The whole of the sixty seconds
was spent on a change to a thing they had never laid eyes on.

**The argument for fixing it was already in this lane, written a week ago, one
step too late.** `in-question.ts` — the module that renders the band inside the
Gate's question — says:

> So a stranger on a phone is asked, personally, to allow a change to a part of
> a page they have never laid eyes on […] **A part of a page is data, so it can
> be brought to the question instead** — rendered through the same registry,
> wearing the same theme, showing the same words.

Every word of that is true of the *press* as well as the answer, and for a
better reason: a question is something the visitor has already decided to have,
and an ask is the decision.

## What a stranger can understand now

**What they are about to do, before they do it** — and then the same band,
ringed on the page, when they have.

| | before | after |
| --- | --- | --- |
| the arrival screen, wide | `reports/2026-09-27-demo-what-the-press-is-about-before-wide.png` | `reports/2026-09-27-demo-what-the-press-is-about-after-wide.png` |
| the arrival screen, phone | `reports/2026-09-27-demo-what-the-press-is-about-before-phone.png` | `reports/2026-09-27-demo-what-the-press-is-about-after-phone.png` |
| what the press then produces | — | `reports/2026-09-27-demo-what-the-press-is-about-pressed-wide.png` |

The arc a stranger now runs, and it is one object followed the whole way:

1. **arrival** — the band, under the button that would take it off, with *"This
   is what would come off the page."*
2. **the press** — the same band, ringed in amber on the stage, chipped *This
   would be removed*, beside the Gate's question about it.
3. **the answer** — the band goes, the page is marked, the card becomes a
   receipt with *Put it back* on it.

Nothing in step 1 is a picture, a mock or a second copy. It is the clinic's
page, from that node down, rendered through the same registry and wearing the
same resolved theme as the stage — which is a thing only a runtime that keeps a
page as a tree can do at all, and is the demo's own claim about itself taken at
its word.

## The change

Nine files. One new module, one extraction, one reading moved out of a client
component, one moved out of `page.tsx`, and a stylesheet rule moved onto a
modifier.

### `_lib/before-the-press.ts` — new, and it is the unit

`partTheAskWouldTouch(tree, ids, preset)`. A preset is a deterministic
interpreter ([0057](../decisions/0057-a-preset-is-a-deterministic-interpreter.md))
and its plan is computed from the tree on the stage, so the operations this
reads are **the operations the press will produce** rather than a rehearsal of
them. Re-theme the page and the preview re-themes; move the band and the preview
moves with it; take the band off and there is no lead preset left, so the
preview goes with the button.

It costs no model call. That is the whole reason the default path is presets:
the demo must work with no API key configured, and an arrival screen that only
shows the page when a key is present is not an arrival screen.

### `_lib/in-question.ts` — `partFromOperations`, and one body

`partInQuestion(tree, delta)` is now `partFromOperations(tree, delta.operations)`.
A delta is not the only thing that has operations, and the alternative was a
second walk of the tree, free to disagree with the first about which node an
operation names.

The three refusals carry over unchanged — an operation naming the page root, an
operation naming a node this tree does not have, no operations at all — and so
do the lead sentences, which is not luck: every one of them is already in the
conditional, because a question is a thing that has not happened. Neither has an
ask nobody has pressed.

### `presets.ts` — `leadingAsk`, moved out of the panel

Which ask gets the green button was computed in `ask-panel.tsx`. It had to move,
because the preview needs the same answer on the server, and **two copies of a
nomination is how a panel comes to preview one ask and offer another** — a
defect where each half is correct about itself and no render test can see it.

### `rail.ts` — the wiring, which is where this lane loses things

`RailView.leading` carries the nominated preset and the excerpt, and it is
absent while a question is open — which is the panel's own rule about its green
button, read off the one value that knows. The panel used to work that out from
`waiting`; it is one value now, so the button and the preview cannot come apart.

`showAsk` is a second callback rather than a second use of `showPart`, because
`showPart` takes a proposal id and an ask has not been made. Fabricating one
would put an id nothing minted into the one part of this surface whose whole
subject is that every id is real.

### `in-question.ts`, `part-in-question.tsx` and `globals.css` — the two moments

`PartInQuestion` carries `where: "question" | "ask"`, set by whichever function
built it, and the view puts `demo-part--question` or `demo-part--ask` on the
frame from the part rather than from a prop. **That is not where it started** —
see the defect matrix below, which is the only reason it is a field. Two things
hang off it, and both are real:

- **The wide-screen `display: none` was on `.demo-part` and is now on
  `.demo-part--question`.** Its stated reason is a ring on the stage forty
  pixels away — and before any press there is no ring, because a ring is what a
  press produces. Left where it was, the excerpt would have been hidden at
  exactly the width this surface is judged at, with every other assertion still
  passing.
- **The ask's window is taller.** A question's excerpt has two buttons under it
  a visitor has to reach on a 390×844 screen, so 13rem is the ceiling. An ask's
  has a list of alternatives under it and nothing waiting on an answer, and at
  rail width the stat grid falls to one column and its three figures stand about
  330px — so 13rem would show *3,400* and fade out before *24* and *92%*, under
  a button promising all three. 21rem shows all three.

And the lead is an `<h4>` in a card and a `<p>` in the panel. Same words, same
size; what differs is the claim the markup makes about the document, and in the
panel the nearest heading is the rail's `h1`, two levels up.

### `ask-panel.tsx` — after the opening block, not inside it

This is the one placement decision. Inside the `flex-col-reverse` block, the
excerpt would push `WHAT_EVERY_ASK_MEETS` down by the height of a band — off the
narrow first screen, which is the one property that block exists to hold. A
stranger who has not read that sentence and presses a change the Gate holds has
watched a button do nothing. The sentence keeps its place; the excerpt takes the
one after it.

## What it cost, measured

Every number below is read off the built page in the browser, at the two
viewports, with reduced motion — not off a screenshot and not estimated.

**1280 × 900, on arrival**

| | y | |
| --- | --- | --- |
| the green button | 330 → 383 | unmoved |
| *This is what would come off the page.* | 421 | new |
| the excerpt's window | 443 → 779 | **336px — 21rem** |
| *3,400* | 455 → 513 | in the window |
| *24* | 590 → 649 | in the window |
| *92%* | 726 → 785 | last 6px under the fade |
| *or ask for one of these* | **795** | was 437 |

**390 × 844, on arrival**

| | y | |
| --- | --- | --- |
| the green button | 325 → 377 | unmoved |
| *Loom weighs every ask…* | 431 → 487 | **unmoved, and that is the placement decision** |
| *This is what would come off the page.* | 503 | new |
| the excerpt's window | 525 → 861 | **319 of its 336px above the fold** |
| *3,400* · *24* · *92%* | 537 · 672 · 808 | all three on the first screen |
| *or ask for one of these* | **877** | was 519 |

**What it cost, said plainly.** The excerpt is 358px including its lead, and the
four secondary asks move down by exactly that. At 1280×900 their heading is
still on screen at 795 of 900 and the first of them is below the fold; at
390×844 the heading is below the fold at 877.

That is a trade this lane made knowingly and it is the panel's own ranking
argument applied one step further: *this panel has exactly one primary action*.
What a stranger now meets on the first screen at either width is that one
action, the promise it makes, the sentence saying some asks wait for an answer,
and the thing it is about. What they met before was four more buttons.

## Decisions taken that were not specified

- **One preview, and it is the leading ask's.** The four secondary asks get a
  promise each and nothing else. That is `FIRST` in `in-question.ts` applied to a
  list rather than to a delta, for the reason it gives — *three previews stacked
  inside a question is a quiz* — and five would be worse.
- **The excerpt is not withdrawn while a question is open.** It goes with the
  green button, because the nomination and the preview are one value. A preview
  of a sixth thing that could happen, over a question about the fifth, is the
  panel competing with the question it just produced.
- **No new copy.** The lead sentence is `LEADS[remove]`, already written, already
  conditional. Nothing on this rail was reworded.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing escalated, nothing left out.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and `reports/`. `src/` was not opened at all.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, written to a file as the last
thing on its own line and read in a separate command (`EXIT=0`).

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` (`src/`, `tools/`) | 165 | 3,216 |
| `@loom/app` (`apps/loom/`) | 316 | 5,515 |

**855 findings, 0 malformed · 114 prerendered pages, 1,302 text junctions, 0 run
together; 3 metadata conventions, 0 unserved ·** `pnpm shoot`: 1280 vs 1280
wide, 390 vs 390 phone, exit 0, no overflow at either size.

The demo lane's own suite goes **618 → 643: twenty-five added, none weakened,
none skipped.**

### The defect matrix

Each defect restored in turn against this commit, the seven affected files run
together, the lane restored from a clean copy between rows. Baseline **117
passed**.

| defect restored | caught |
| --- | --- |
| the ask's excerpt is given the question's moment, so a wide screen hides it | **5 tests** |
| the wide-screen `display: none` goes back on `.demo-part` | **1 test** |
| the rail computes the nomination and never the excerpt | **1 test** |
| the rail nominates the first of the table instead of `leadingAsk` | **1 test** |
| the excerpt goes inside the reversed block, pushing the frame sentence off the narrow first screen | **2 tests** |
| the rail keeps nominating while a question is open | **1 test** |
| the ask's window is the question's 13rem | **1 test** |
| `partFromOperations` stops refusing the page root | **2 tests** |

Eight rows, eight caught — **and the first row is the reason the shape of this
unit changed halfway through.**

### The row that was caught by nothing, for an hour

The moment an excerpt is standing in started as a **prop of
`PartInQuestionView`**, which reads as the obvious place for it: it decides two
things in the stylesheet and nothing in the library. The matrix was run against
that version and the first row came back **116 passed, 0 failed**.

It could not have come back anything else. With the moment a prop, the only
place the answer could be written was `page.tsx` — an `async` Server Component
that reads a cookie and opens a session, which no `vitest` run can mount. So a
`where="question"` typed by habit on the ask's callback would have hidden the
arrival screen's excerpt at exactly the width the maintainer judges this surface
at, with the whole suite green and the build passing. That is the table
`rail.ts` opens with, adding a sixth row on the day it was read.

The moment is a field on `PartInQuestion` now, set in `in-question.ts` by which
caller asked — `partInQuestion` for a hold, `partTheAskWouldTouch` for a press
nobody has made. `page.tsx` no longer decides anything about it, `rail.ts` can
assert it, and the same defect restored against the fixed version is the
five-test row above.

**Measured rather than reasoned about**, and it is worth saying which way round
that was: the argument above is the explanation of a green matrix row, not the
reason the row was run. The design was already written, already committed, and
already tested.

## Findings

**Filed one, closed none.**

- **`Loom demo`** — *the demo shows a stranger the change and the record, and the
  inverse is the one third of the claim sixty seconds does not reach.* The
  brief's sentence has three parts and the third is three presses in. Filed with
  the sequence measured and two shapes weighed, and with the check that kills the
  cheaper of them: `ChangeRecord.inverseOperations` is `describeOperation` over
  the inverse rather than the inverse, so it is a sentence for the disclosure and
  not a delta to render.

**Re-verified, not re-filed:**

- `21st.dev` `EGRESS_BLOCKED`, a **twenty-ninth** consecutive run, one call.
- `*.vercel.app` denied from the sandbox (`Loom portal`, 27 September). This
  report and the pull request both say the pictures are from a local production
  build.

## Open questions

Nothing blocking.
