# The card you have already read

**Routine:** `Loom demo` · **Branch:** `demo-18-the-card-you-already-read` · **15 September 2026**

The eighteenth run of this lane. It takes the recommendation two previous runs
measured, argued for, and left on the table as a product call.

---

## What a stranger could not understand before this run

**Which of their five asks they were looking at.**

The demo's claim is *the change and the record of it, side by side*, and the
record is a rail of cards. The first card is the argument: what was asked, what
the Gate weighed on two questions, which rule read the answers, what the ceiling
comparison was, what the change does, and a button that puts it back.

**The fifth card is the same argument again.** Driven at 1280×900 against a real
`next build`, five asks leave a rail **3,851px long against 857px of screen** —
four and a half screens — of cards that are **496–593px each**, and one of them
is **twelve of its fourteen lines word for word identical to the first**.

The repeated part is always the same three blocks, measured per card:

| block | height |
| --- | --- |
| the weighing panel — *what Loom weighed*, two questions, two answers | 140–156px |
| the rule's own sentence | 16px |
| the ceiling comparison | 32px |

About two hundred pixels a card, saying what the card eight inches above it
already said. A visitor scrolling that is not reading the weighing again. They
are hunting for the one line that says which ask this card is, and it is set in
the same size and colour as everything they have already read.

## What a stranger can understand now

The same five asks, same script, same viewport, against two real builds:

|  | `main` | this branch |
| --- | --- | --- |
| the rail | **3,851px** | **3,057px** |
| the five cards | 496 · 593 · 570 · 512 · 570 = **2,741px** | 496 · 383 · 361 · 347 · 361 = **1,948px** |
| the card that repeated the first | **12 of 14 lines identical** | **6 of 9** |
| words on a repeated card | 168–171 | 100–103 |
| the phone rail (390×844) | **4,736px** | **3,950px** |

On every card under the newest, the three blocks fold to the line that states
their conclusion:

> **›** Some risk, and you could undo it. · *and the rule that read it*

**Nothing is removed.** The panel, the rule and the comparison are all still
there, in the same order, one click under that line — which is the maintainer's
standing direction for this surface (*plain language is the default, the
technical record is one click away, nothing is ever removed*) applied to the
second telling rather than to the vocabulary.

The card has not stopped accounting for itself. It has stopped accounting for
itself **again**.

## Two cards never fold, and the second one is the point

`_lib/reasoning.ts` decides, and the whole module is about the second clause.

**The newest card** is open because that is the card a visitor reads as *the*
account. `record-card.tsx` has carried the rule this bends since the surface was
built — *a demo whose whole argument is that the runtime can account for itself
must not put the account behind a click* — and it is exactly right about that
card. What was missing was anything deciding which card that is.

**Any card still waiting on an answer** is open wherever it has ended up in the
rail, and this is a safety property rather than symmetry. `weighed.ts` records
that the reversal answer — *"The 4 pieces it takes off the page are kept, so the
exact opposite of this change already exists"* — is **the sentence that makes
the green button pressable**. It is the only thing on the card telling a stranger
that saying yes to a described loss is safe. A visitor can leave one question
open and ask for something else, which pushes the question down the rail and the
buttons with it. Folding the reassurance while leaving **Apply this change** in
the open would have been a worse surface, not a tidier one — so the predicate is
a function with a test rather than an index check.

**A hold the page has moved past folds like any other read card.** No answer the
visitor can give will land it; `PageMovedOn` has taken the buttons' place. It
reads `moved` from the same held reading `awaitingAnswer` uses to decide the rail
must not scroll to a question nobody can answer, so the two cannot disagree about
whether a question is live. Those are also the tallest cards in the rail.

## The four changes

### `_lib/reasoning.ts` — new, and the whole of the decision

`reasoningFor(record, records, moved)` → `"open" | "folded"`. Identity by
`recordId` rather than by reference, because answering a hold replaces the record
(`session.ts`) and a caller can be holding an object that is no longer the one in
the list — a reference check there would have folded the newest card.

### `_lib/weighed.ts` — the pair in one line

`weighedBrief` composes the summary from **the strings the panel already
prints**: the portal's `STAKES[…].label` and its `reversibilityWord`, whose own
note says those clauses *"read straight after a stakes label without a colon in
sight"*. That is exactly the sentence wanted, so this needed no new words — and a
summary that paraphrased its own panel is the drift `weighed.ts` exists to
refuse. Two tests assert the brief and the open answers name the same level and
the same direction, over every level rather than the one in the fixture.

Absent on the same terms as the pair: an ask that never reached assessment has
no verdict to be brief about, and the fold names what is behind the arrow instead
of claiming one.

### `_components/the-reasoning.tsx` — new, open or folded

**Open, it renders a fragment**, so the three blocks stay direct children of the
card's `gap-3` column and the DOM is byte-for-byte what it was. That is why all
377 existing tests passed unchanged the first time the component was wired in,
and it is a property worth having: a regression in the open case shows up as
those tests going red rather than as a silent reflow. There is a test asserting
the fragment, because a wrapper would change spacing on every card and nothing
else would catch it.

**It is deliberately not `TechnicalDetail`.** That disclosure is the technical
record — codes, fingerprints, operations — and filing plain-language reasoning
under a technical arrow would tell a visitor the weighing is a technical matter,
when the whole argument of this surface is that it is not. Two disclosures on one
card, saying two different kinds of thing, is the honest shape.

### `_components/record-card.tsx`, `the-record.tsx` — told, rather than deciding

The card takes `reasoning`, defaulted to `"open"`: a card rendered on its own is
always the newest one, and a caller that has not thought about repetition should
get the whole account. The rail computes it, for the same reason it computes
`offer` and `asked` — it is a fact about the *list*, which is the one thing about
itself a card cannot see.

## Decisions taken that were not specified

- **The verdict is in the summary, not a category.** *"What Loom weighed"* would
  have made a visitor open four cards to find out whether any of them said
  anything different. With the conclusion in the line, the fold costs them
  nothing at a glance.
- **The trailing clause names the rest.** The panel is not all that is down
  there, and a disclosure that hid the rule without saying so would be the one
  removal this surface does not allow itself.
- **What the change *did* never folds.** Last run added that line precisely
  because it is the one thing that genuinely differs between two cards. Folding
  it would have undone that work on the same cards. Asserted.
- **The undo never folds.** *The inverse, as a button that really puts it back*
  is the demo's payoff; behind a click it would have taken the point of the
  surface with it. Asserted.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing was escalated and nothing was left out.
- **No file outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and this report. `src/` was not opened at all.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, read off the run rather than
remembered:

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 150 | 2,620 |
| `@loom/app` | 253 | 4,406 |

638 findings, 0 malformed. 102 prerendered pages, 828 text junctions, 0 run
together.

**It was red the first time and the failure was mine — the same failure this
lane reported last run, on the same lesson.** `pnpm verify` exited **2** on two
typecheck errors, both in test files I had written *after* the last time I ran
`tsc`:

- `container` destructured and never read, in an assertion I had rewritten to
  use `screen` instead;
- `{ moved: movedOn(0, 2) }`, which `exactOptionalPropertyTypes` refuses because
  `movedOn` returns `MovedNote | undefined` — **and the same file already had
  the right pattern twice, forty lines above** (`movedOn(0, 3)!`), which I did
  not reach for.

Last run's report ends with *"typecheck after the last edit, not after the
first"*, written about a fixture with `heldProposalId: undefined`. I ran `tsc`
before writing the tests and not after, and hit the same wall in the same place.
The test runner is blind to both: the app suite was green throughout, because a
type error in a fixture is invisible to the runner that executes it. Fixed, and
`pnpm verify` re-run **from the top** rather than from the failing step — the
numbers above are from that green run. Worth recording that a lesson written
down once did not stop it happening again the next day.

The demo lane's own suite goes from **29 files / 377 tests** to **31 files /
408 tests** — **thirty-one added, none weakened**, counted per file:

| file | `main` | branch |
| --- | --- | --- |
| `_lib/reasoning.test.ts` | — | 8 |
| `_lib/weighed.test.ts` | 13 | 20 |
| `_components/the-reasoning.test.tsx` | — | 8 |
| `_components/record-card.test.tsx` | 57 | 61 |
| `_components/the-record.test.tsx` | 12 | 16 |

**Every defect was put back one at a time and the whole lane suite re-run.**
All six were caught:

| defect restored | what fails |
| --- | --- |
| a live question stops being kept open | 2 tests, across `reasoning` and `the-record` |
| the newest card is found by reference rather than by id | 1 test |
| the fold drops the rule sentence | 10 tests, across two files |
| the brief stops agreeing with the panel it summarises | 5 tests |
| the fold takes the *what it did* line with it | 4 tests |
| every card folds, including the newest | 9 tests |

No test was weakened and nothing was skipped. One fixture error of my own —
`quoted: []` where `PlainChange` wants `words` and `more` — was caught by the
suite on the first run of the new tests and fixed; the two that reached `pnpm
verify` are above.

## Findings

**Filed:**

- `Loom demo` (this lane): **the demo's leading question is destroyed by the
  next button a visitor presses.** See below — it is the largest thing I found
  this run and it is not what I fixed.
- `21st.dev` `EGRESS_BLOCKED`, **seventeenth consecutive run** — re-verified
  against the standing entry rather than re-filed.

**Carried, not closed.** Both of last run's findings — a `configure` never
saying which way it went, and `actions.ts` being the one file in this lane a test
cannot reach — are untouched by this unit and still open.

## The thing I found and did not fix

**Two presses, in the order the panel puts them in:**

| | the rail |
| --- | --- |
| press **Take the numbers off** | `Waiting on you` · *“Take the numbers band off the page.”* |
| then press **Repaint the top band** | `Applied` · *“Repaint the band at the top.”*<br>`Nothing changed` · *“Take the numbers band off the page.”* |

The demo asks a stranger a question, and the very next thing the panel invites
them to do **answers it for them, with no**. Nothing warns them before the press.

Every step is correct: the low-risk preset lands unattended, which moves the
revision; a hold judged against a stale revision is one Loom will not apply,
which is the runtime saying *I will not apply a decision to a page I have not
seen*; and the demo reports that accurately. Nobody is wrong and the visitor
loses the question anyway.

Driven with all five presets, **three of the five cards end `Nothing changed`** —
and they are the tallest cards in the rail. A visitor who presses every button,
which is what the panel is for, ends with a record three-fifths composed of asks
that went nowhere.

It is filed with three shapes and a recommendation. It is not in this unit
because it is a change to how the demo *sequences asks*, which is a different
argument from how it *prints* them, and folding the two together would have made
a PR nobody could review as one thing.

## Open questions

Nothing blocking.

- **Answered this run:** *does the record earn its repetition?* Carried unanswered
  from 13 and 14 September. Taking it cost the rail 794px and no content.
- **"Ask about just this"** — the scope control reasoned out in this lane's
  22 August finding, still the largest unbuilt idea here.
- **The rail and the stage scroll independently** (7 September). Recommendation
  unchanged: make the chip a link to its card, or leave it.

## The visuals

| | |
| --- | --- |
| [rail, before](2026-09-15-demo-the-card-you-already-read-rail-before.png) | `main`: the whole rail after five asks, 3,851px, five cards you cannot tell apart |
| [rail, after](2026-09-15-demo-the-card-you-already-read-rail-after.png) | this branch, same five presses: 3,057px, and the five asks are legible as five different things |
| [before](2026-09-15-demo-the-card-you-already-read-before.png) | 1280×900, framed at the second card — one and a half cards on screen |
| [after](2026-09-15-demo-the-card-you-already-read-after.png) | the same frame: three cards, each headed by its own ask |
| [opened](2026-09-15-demo-the-card-you-already-read-opened.png) | one fold opened — the panel, the rule and the comparison, whole, where they always were |
| [phone](2026-09-15-demo-the-card-you-already-read-phone.png) | 390×844, where the rail is the entire surface. `scrollWidth` 390 against `innerWidth` 390 — no horizontal overflow |

Both wide pairs are **the same script driven against two real `next build`
outputs**, `main`'s and this branch's, so the only difference in the frame is the
change. Not the preview deployment, which this environment cannot open
(`vercel.app` is not on the sandbox's egress allowlist; the standing 19 August
finding).

**To see it yourself:** open `/demo` and press **Take the numbers off**, then
**Apply this change**, then press two more buttons. On `main` every card repeats
*what Loom weighed* in full and the rail is four and a half screens. Here the
newest card argues in full and the ones under it carry one line — *“Some risk,
and you could undo it. · and the rule that read it”* — which opens onto exactly
what `main` was printing.
