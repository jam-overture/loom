# The two questions it promised, and never answered

**Routine:** `Loom demo` · **Branch:** `demo-10-the-two-questions-it-promised` ·
**30 August 2026**

The tenth run of this routine. The previous nine fixed where the demo lives, how
its controls are ranked, whose page is on the stage, which change the primary
button asks for, what the record says once you have answered, where the mark
lands, what a proposal would take off the page, and an undo that withdrew its own
offer.

This run is about the one sentence on this surface that a stranger is asked to
hold in their head — and the card that never came back to it.

---

## What a stranger could not understand before this run

I drove the built page as somebody who has never heard of Loom, at 1440×800 and
390×844, through the whole sequence: land, press the green button, meet the hold,
press **Apply this change**, read the card.

The rail tells them, before they press anything, what is about to happen:

> **Loom decides.** Every ask is weighed on two questions: how much damage could
> this do, and can it be taken back? A named rule decides whether it lands on its
> own or waits for you to say yes.

That is the best sentence on this surface. It is the entire Gate in one line with
no vocabulary in it, and `what-happens.test.tsx` has asserted both halves of it
since the day it was written.

**Then the card answered neither of them.** Here is everything a visitor could
read, in the light, on the card the primary button produces, as it stood on
`main` this morning:

> **Waiting on you** · *“Take the numbers band off the page.”*
> Loom will not make this change until you say yes.
> asked by a demo visitor
> **Riskier than a request from here is allowed to be without asking.**
> [ Apply this change ] [ No thanks ]

One sentence, and it is the rule's *conclusion*. Not how much damage. Not whether
it can be taken back. A stranger was told a weighing would happen, watched a
verdict arrive, and never saw the weighing — so the sixty seconds ended with *some
rule stopped it*, which is an assertion, rather than *this takes four things off
the page and every one of them is kept so it can go back*, which is an argument.

### Both answers were on the record the whole time

This is the sixth consecutive run where nothing was broken. `assessStakes`
produced the level and the factors. `assessReversibility` produced the inverse and
the count of what it has to carry. `_lib/record.ts` has carried `StakesView` and
`ReversibilityView` since the surface was built, with a doc comment calling them
*“the two axes the Gate weighed”*. `record-card.test.tsx` has asserted since day
one that both reach the card, in a test called **“shows both axes the Gate
weighed, separately”** — and it passed, because they *are* on the card. One click
down, in the runtime's shorthand:

```
WHAT THE GATE WEIGHED
stakes                 medium
large-removal          removes 4 nodes · medium
shallow-structural…    restructures at depth 1 · medium
reversible             yes
undo carries           4 nodes
```

`undo carries: 4 nodes` is the most persuasive fact this record holds. It says the
page has not been asked to remember what it looked like — the record is holding the
removed content itself, which is why the undo is exact rather than a promise. It
was a field name, a number, and a noun a visitor has no use for, two clicks from
the sentence that would have made it land.

**The general form is the one filed on 25 August and it held again:** when this
surface fails, the machinery is already there and correct, and what is missing is
the last hop onto the screen. What is new this time is that the missing hop had a
*promise* attached to it — the rail had already told the visitor to expect these
two answers, so this was not an omission, it was an unkept sentence.

---

## What shipped

**The card answers both questions, in the words they were asked in, above the rule
that read them.**

> **Waiting on you** · *“Take the numbers band off the page.”*
> Loom will not make this change until you say yes.
> asked by a demo visitor
>
> > **How much damage could this do?**
> > **Some risk.** Worth a look before you say yes, but nothing drastic.
> >
> > **Can it be taken back?**
> > **Yes.** The 4 pieces it takes off the page are kept, so the exact opposite of
> > this change already exists.
>
> **Riskier than a request from here is allowed to be without asking.**
> [ Apply this change ] [ No thanks ]

Three decisions in that, and each is load-bearing.

**The questions are one constant, read by both halves.** `WEIGHED_QUESTIONS` lives
in `_lib/weighed.ts`; `WhatHappens` composes step two from it and the card heads
its answers with it. The gap this run closed was opened by two files drifting
apart, so what keeps it closed is that they can no longer drift: a reworded
question with an unchanged heading now fails a test.

**The answers come before the rule, not after it.** The rail promises *weighed on
two questions, then a named rule decides*. Reversed, the card would be a verdict
with its reasoning underneath — which is the shape this replaced. In the order
shipped, the card reads as the argument the rail said it would be. On a held
change it also puts *“Yes — the four pieces it takes off the page are kept”*
directly above the button asking a stranger to commit, which is the sentence that
makes **Apply this change** safe to press.

**No new vocabulary was written.** The stakes sentences are the portal's `STAKES`
table and the reversibility clause is its `reversibilityWord` — both already
exported, neither previously read by this surface. A visitor told *“Some risk”*
here and a reviewer told the same thing three files away are looking at one
product. A fourth table in this lane would have been a fourth product's worth of
drift; see the finding filed below, which is about the three that already exist.

### Nothing was removed

The level, the factor codes, the runtime's `detail`, `reversible`, `undo carries`
and the inverse operations all keep the rows they had, one click down, unchanged.
The plain sentences are the reading; the rows are the evidence for it. That is the
maintainer's direction for the portal applied here — *plain language is the
default, the technical record is one click away, nothing is ever removed* — and
the screenshot with the disclosure open is the one that shows it holding.

### What it says, and what it is careful not to say

`weighed.ts` says the opposite **exists**. It never says pressing **Put it back**
moves the page at once. An undo is a change of its own and is gated like any
other ([0032](../decisions/0032-an-undo-is-a-proposal-not-a-rewind.md)); a
sentence here promising immediacy would be the same defect #194 is fixing one
control further along, arriving from a new direction. There is a test for it.

Two honesty cases the table would otherwise get wrong:

- **A change that removes nothing** — a theme swap — has `retainedNodeCount: 0`,
  so the clause about kept pieces would be a sentence about a number that is
  zero. It gets *“Nothing is destroyed by it, so the exact opposite of this change
  already exists”* instead.
- **A change the runtime called irreversible** gets *“No — undoing it would not
  put everything back the way it was”*, and the two reasons the runtime can give
  (an effect outside the tree, an inverse over the retention budget) stay in the
  record, because *“past a budget of 24”* is a sentence for somebody who knows
  what the budget is.

### One type narrowed

`StakesView.level` was `string`. It holds a `StakeLevel` and always has —
`record.ts` copies it straight off the assessment. Reading it against the portal's
four-entry table with a `string` in hand means either a cast or an unreachable
fallback branch, and both are a surface pretending it might be handed a level the
Gate cannot produce. It is now `StakeLevel`, which is a no-op at runtime and
changes nothing in any fixture.

---

## What a stranger can understand now

The sixty seconds run like this:

> Land. The rail says an AI can rewrite that page, and that every ask is weighed
> on two questions — how much damage, and can it be taken back. Press **Take the
> numbers off**. The page does not move; the numbers band rings amber and a card
> says Loom will not do this until you say yes. **The card answers both
> questions**: some risk, worth a look, nothing drastic — and yes, the four pieces
> it would take off are kept, so the exact opposite already exists. Press **Apply
> this change**. The numbers go, the gap rings green, revision 1. The same two
> answers are still on the card, now under a badge saying it happened and above a
> button that puts it back. Open the full record and every one of those sentences
> has a row of the runtime's own evidence underneath it.

The claim they leave with is the one the surface exists to make: **an AI proposed
a change, something weighed it on two questions and showed me both answers, it
would not act until I agreed, and it wrote all of it down.**

---

## Test numbers

`pnpm install && pnpm verify` — **green, exit 0**.

- Root: 111 test files, 1741 tests, all passing.
- `apps/loom`: 136 test files, 1982 tests, all passing — up from 134 and 1963 on
  `main`.
- New this run: **19 tests** across four files — 12 in `_lib/weighed.test.ts`,
  3 in `_components/weighed.test.tsx`, 3 added to `record-card.test.tsx`, 1 added
  to `what-happens.test.tsx`.
- Nothing was skipped and no test was weakened.

**`main` was red and this branch carries the one-character fix.**
`app/(marketing)/_lib/facts.test.ts` counts the decision records on disk against
`FACTS.decisions` in `(marketing)/_lib/copy.ts`, which said `94` against 95
records — red on `main` since 28 August, verified here by running `pnpm verify` on
`main` before branching (exit 1, one failing test). It is the stated merge gate
for all seven surfaces, so a branch cannot be opened green without it. #174 fixes
it properly in its owner's lane and should merge first; this branch's bump is then
a no-op or a one-character conflict. Cross-lane diff, one line, named here as
`docs/routines.md` requires.

---

## Findings

**Filed:**

- **Three surfaces each translate the Gate from a private table.** The portal
  exports `STAKES`, `ruleSentence` and `reversibilityWord`; the marketing lane has
  a complete parallel set (`WEIGHT`, `BECAUSE`, `RAISED_BY`) that is
  module-private; the docs have a third for stake levels. One `medium` is three
  words depending which page you are on. This run took the portal's rather than
  writing a fourth, which is the whole of what one lane can do about it. The gap
  nobody exports is `StakeFactorCode` — ten closed codes, translated well in
  `RAISED_BY`, reachable by nobody. Owned by `Loom portal` and `Loom marketing`.
- **`21st.dev` blocked, ninth verification from this lane.** `EGRESS_BLOCKED`
  again today.

**Not re-filed, still open and worth stating:** `docs/rollout.md:19` still says
the demo is live at `apps/loom/app/(portal)/portal/demo`, nine days after it
moved, and the `Loom demo` brief still opens with *“Two problems to fix before
anything else”*, the first of which landed on 21 August. Seventh consecutive run.

---

## Open questions

Nothing blocking. One thing worth the maintainer's eye is in the finding above:
whether a marketing page and a review queue should say different words for one
verdict is a positioning call, not an engineering one. Either answer is fine; what
drifts is two tables and no note.

---

## Screenshots

- `-arrival.png` — 1440×800, nothing pressed. Unchanged above the fold.
- `-held.png` — after **Take the numbers off**: the band ringed amber on the
  stage, the two answers on the card, the buttons below them.
- `-applied.png` — after **Apply this change**: the same two answers under an
  Applied badge, above **Put it back**.
- `-record.png` — the card with the full record open. The two plain sentences at
  the top, every row of the runtime's evidence for them underneath.
- `-phone.png` — 390×844. The whole card, both answers and both buttons, in one
  viewport.
