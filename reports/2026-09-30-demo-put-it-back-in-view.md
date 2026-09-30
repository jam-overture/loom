# Put it back, in view

**Routine:** `Loom demo` · **Branch:** `demo-34-put-it-back-in-view` ·
**30 September 2026**

The thirty-fifth run of this lane, with no open pull request of its own — the
two open this morning were `Loom lessons`' #456 and `Loom portal`'s #457. So: a
fresh branch off `main` at `f4eca0d`.

Every picture below is a production `next build` of a real commit, served with
`next start` by `pnpm shoot --serve` and photographed at 1280 × 900 and
390 × 844 with reduced motion. The `before` pair is the same harness run against
`main` at `f4eca0d`, built separately. Every number is read off the same builds
by driving them and measuring the boxes, not estimated from a picture.
**The preview deployment is not photographed and has never been by this lane**:
the URL is on the pull request and Vercel reports it Ready, and `*.vercel.app`
is denied by the environment's egress policy (`Loom portal`, 27 September).

---

## What a stranger could not understand before this run

**That the change they had just made could be undone — because the button
saying so was off the bottom of the screen.**

The demo's one invited sequence is two presses: *Take the numbers off*, then
*Apply this change*. The second press is the whole argument. What it produced
was this, measured against the production build of `main`:

| at the moment the demonstration comes true | 1280 × 900 |
| --- | --- |
| the applied card | **975px** |
| the rail's viewport | **857px** |
| so the card, landed at the rail's top | **118px too tall to be read at once** |
| **Put it back** | bottom edge **23px below the frame** |
| the caution under it | off screen with it |

The run before this one found the same card opening *mid-sentence* and fixed
that, and said plainly in its own report what the fix cost: the card is taller
than the rail, one end is always off, and it chose the top. It offered the
maintainer a constant to flip if the eye disagreed.

**Both ends were the wrong question.** A card that has to lose an end is a card
that is too tall, and this one was too tall for a reason nobody had named:
**it was making its case twice.**

### The second telling was the same card, one press later

The first press produces a card that is **a question**, and its reasoning is
open on it because it has to be — `weighed.ts` records that the reversal answer
is *the sentence that makes the green button pressable*, the only thing on the
card telling a stranger that saying yes to a described loss is safe.

The second press **answers that question**, and `session.ts` replaces the
record rather than adding one. So the very same card comes back — same
`recordId`, same weighing panel, same rule, same ceiling comparison, word for
word — now as a receipt, with *You said yes* added above and **Put it back**
added below.

A visitor who has just read that argument in order to act on it is handed it
again, unchanged, as the answer to a different question: *what did I just do?*
It is about **190px** of the card, and it was standing on the demo's closing
line.

`reasoning.ts` already folds a repeated argument — that is the whole of what the
file is for, and it is the maintainer's standing direction applied: *plain
language is the default, the technical record is one click away, nothing is
ever removed.* It just could not see this repetition, because it looked for the
second telling **on the card below** and this one is on the same card.

## What a stranger can understand now

**That the page can be put back, at the moment they are most likely to wonder.**

| | before (`main` at `f4eca0d`) | after |
| --- | --- | --- |
| the payoff frame, wide | `reports/2026-09-30-demo-put-it-back-in-view-before-wide.png` | `reports/2026-09-30-demo-put-it-back-in-view-after-wide.png` |
| the question, wide — **unchanged** | `reports/2026-09-30-demo-put-it-back-in-view-question-unchanged.png` | same file, byte for byte |
| the payoff on a phone | — | `reports/2026-09-30-demo-put-it-back-in-view-phone.png` |

The whole card is now on one screen, end to end: **Applied**, the visitor's own
sentence in quotation marks, *this change is live on the page beside you*, the
weighing folded to one line, **You said yes**, what came off the page, the band
the record is still holding with 3,400 and 24 and 92% in it, **Put it back**,
the caution under it, and *Show the full record*. Nothing is below the fold and
nothing was removed from the card.

### Measured, on the two production builds

Driven through the same two presses and the boxes read off the page:

| | before | after |
| --- | --- | --- |
| the applied card | **975px** | **765px** |
| the rail's viewport | 857px | 857px — untouched |
| **Put it back**, relative to the rail's bottom edge | **23px below it** | **186px above it** |
| the button inside the frame | **no** | **yes** |
| `<details>` on the payoff card | 1 | 2 |
| **the held card, one press earlier** | **503.06px** | **503.06px — identical** |
| `scrollWidth` vs `innerWidth`, wide | 1280 / 1280 | 1280 / 1280 |
| `scrollWidth` vs `innerWidth`, phone | 390 / 390 | 390 / 390 |

**The question frame is byte-identical across two separately built commits.**
`before-question-wide.png` and `after-question-wide.png` have the same `md5`
(`79cae639175ffc88a14d8c04a2f22cbe`) — so the moment a stranger decides, with
the whole of *what Loom weighed* open above the green button, is provably
untouched rather than argued to be.

**The phone frame moved by one CSS pixel** and it is not a change worth a
picture: the stacked layout carries the visitor to the mark on the page, the
card is four thousand pixels above them either way, and the document above the
mark is now 210px shorter, so the scroll clamps one pixel differently. The two
files are visually the same frame. It is listed here because the `md5`s differ
and a report that only mentioned the identical pair would be choosing its
evidence.

## The change

One source file, two test files, and no new file.

### `_lib/reasoning.ts` — the rule, and its two conditions

A card folds its reasoning once **the visitor answered it and the change
landed**. Both halves are load-bearing and neither is a proxy for the other,
which is the whole of why this is two conditions rather than one:

- **`answeredBy`** is the evidence they have *already read it*. A change that
  applied **on its own** was never held and never argued in front of anybody —
  its card is the *first* telling, and it stays open. That is the entire claim
  for a low-risk ask: Loom did this by itself, and here is what it weighed.
  Folding it would be the one regression this file exists to avoid, in a new
  place.
- **`revision`** is the evidence there is now something *else* on the card to
  read. A declined ask has `answeredBy` set too and produces no revision: no
  undo, no *what came off*, no kept band. Folding it would buy no room and hide
  the only content the card has.

Everything else is unchanged and every existing row still passes as written:
the newest card opens, every card under it folds, a card still waiting on the
visitor opens wherever it has ended up, and a hold the page has moved past
folds.

### `the-record.test.tsx` — two fixtures that had been interchangeable

`APPLIED` and `OTHER` were both *a change that landed*. They are not the same
thing any more: `APPLIED` carries `answeredBy` and `OTHER` does not, and the
rail must treat them differently in one list. Four rows moved to `OTHER` where
they were about *the newest card* rather than about *an answered one*, three
rows were added, and one row got a stronger assertion than it had:

- `[APPLIED, HELD]` now expects `[true, false]` rather than `[false, false]`,
  which says both halves of the rule at once — **a folded card at the head of
  the rail does not fold the live question under it.**
- `[OTHER, APPLIED]` is new and is the row that would catch the plausible
  simplification. Two cards, both applied, both with a revision, in one list,
  and they must not agree.

## Decisions taken that were not specified

- **The maintainer's open question from 29 September is answered by removing
  it rather than by choosing a side.** It asked whether `ANSWER_ARRIVES` should
  put the top or the bottom of the card on screen. Neither: the card fits.
  `arrival.ts` is untouched — no constant was flipped, no landing moved, and if
  the maintainer's eye still wants the other end the lever is exactly where
  that report left it.
- **`answeredBy` was chosen over "the card has a revision"**, which is the
  smaller diff and is wrong. It would fold the self-applied card, and that card
  is where a stranger finds out the Gate let something through without asking.
  The test that pins it is `does not fold a change that landed on its own`.
- **The kept band was left alone.** It is the tallest single block on the card
  at roughly 400px and folding it would have bought more room than the
  reasoning did. It is also last week's unit and the thing the card is *for* —
  the inverse, drawn, beside the button that spends it. Cutting the evidence to
  fit the button in would have been the wrong 400px.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing escalated, nothing left out.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and `reports/`. `git diff origin/main -- src/ tools/` is empty.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, written to a file as the last
thing on its own line and read in a separate command.

| suite | this branch |
| --- | --- |
| `@jam-overture/loom` (`src/`, `tools/`) | 169 files / **3,327** — untouched, nothing in `src/` was opened |
| `@loom/app` (`apps/loom/`) | 339 files / **5,860** |

The demo lane's own suite goes **686 → 696: ten added, none weakened, none
skipped.** (`main`'s side of that was measured rather than quoted: the three
files this branch touches checked out from `origin/main` and the lane run
against them on the same machine.) Four rows of `the-record.test.tsx` changed their expected value
because the rail's behaviour changed; every one of them still asserts a
positive fact about which cards fold, and the section says which and why.

**900 findings, 0 malformed · 119 prerendered pages, 1,385 text junctions, 0
run together; 3 metadata conventions, 0 unserved ·** `pnpm shoot`: 1280 vs 1280
wide, 390 vs 390 phone, exit 0, no overflow at either size, on both builds.

**And it went red first, which is worth writing down.** The first `pnpm verify`
failed on a type error in a fixture this run added (`outcome: "declined"` is not
a `RecordOutcome`; the record calls it `discarded`), and the second failed on
four rows of `the-record.test.tsx` asserting the old rule. Neither was weakened
to get green: the fixture was corrected, and the four rows were rewritten to
say what the rail now does, with three more added beside them. The exit code was
read from a file both times, and the third run's background notification said
**exit 0 while the log said failed** — which is the compound-command trap
`docs/routines.md` names, hit from a new direction, and the reason the file is
the only thing this report quotes.

### The defect matrix

Each defect restored in turn against this commit, the demo lane run against it,
and the lane restored with `git checkout` between rows.

Baseline **696 passed**.

| defect restored | caught |
| --- | --- |
| the fold is dropped entirely — the old rule, as it was | **5 tests** |
| the fold reads `revision` and drops `answeredBy` (the self-applied card folds) | **7 tests** |
| the fold reads `answeredBy` and drops `revision` (the declined ask folds) | **2 tests** |
| every card folds, with no condition at all | **14 tests** |

Four rows, four caught, first pass.

**And the third row was one test until it was measured.** Dropping `revision`
was caught by a single assertion in `reasoning.test.ts` — the unit-level
declined row — which is one wire on a condition the whole argument for two
conditions rests on. A list-level row was added for it in
`the-record.test.tsx`, asserting the rail renders a declined card whole rather
than that the function returns `"open"`, and the row was re-priced afterwards
at **2**. That is still the thinnest row in the matrix and it is the honest
number: there is exactly one shape of record that distinguishes the two
conditions, so two assertions about it is what there is to have.

## Findings

**Filed two, closed none.**

- **Filed**, for `Loom daily build`: *a shot list can drive a page to a state
  and cannot say how tall anything in it is, so every geometry claim this lane
  makes is a script that is thrown away.* Three consecutive runs of this lane
  have written a throwaway `playwright-core` script to measure the thing their
  unit is about. There is a test that the reasoning folds; **there is nothing
  that can fail if the card grows back past 857px.** The ask is that a shot may
  name selectors whose boxes it *prints* — the same kind of thing the harness
  already prints for `scrollWidth` — which is an instrument reporting rather
  than an instrument asserting, and so is inside the line 0159 draws.
- **Filed**, for this lane: *the folded reasoning on an answered card is
  labelled for a card that is still a question.* The shared summary reads
  *"Some risk, and you could undo it. · and the rule that read it"*, which is
  accurate and in the wrong tense three lines above **You said yes**. Not fixed
  here because the string is shared by every folded card in the rail and
  changing it for all of them to suit one is the wrong trade.

**Still open and not touched:** `TheRecord` is handed four readings one prop at
a time from the one file in this lane no test can mount (this lane,
29 September). This run added no prop and did not close it.

**Re-verified, not re-filed:**

- `21st.dev` `EGRESS_BLOCKED`, a **thirty-second** consecutive run, one call.
- `*.vercel.app` denied from the sandbox (`Loom portal`, 27 September). This
  report and the pull request both say the pictures are from a local production
  build.

## Open questions

**Nothing blocking.**

One thing worth the maintainer's eye rather than his decision: the payoff card
now has **two** disclosures on it, *Some risk, and you could undo it · and the
rule that read it* and *Show the full record*. They are different depths of the
same thing — the first is the Gate's working in plain words, the second is the
record as data — and on a card a visitor is reading as a receipt that may read
as one offer made twice. It is the finding above, and the answer to it is copy
rather than structure.
