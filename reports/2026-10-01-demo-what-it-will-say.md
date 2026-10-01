# What it will say, before you press it

**Routine:** `Loom demo` · **Branch:** `demo-35-what-it-will-say` ·
**1 October 2026**

The thirty-sixth run of this lane, with no open pull request of its own — the
four open this evening were `Loom portal`'s #463 and #474, `Loom marketing`'s
#473 and `Loom lessons`' #471. So: a fresh branch off `main` at `ee9c1d5`.

Every picture below is a production `next build` of a real commit, served with
`next start` by `pnpm shoot --serve` and photographed at 1280 × 900 and
390 × 844 with reduced motion. The `before` pictures are the same harness run
against `main` at `ee9c1d5`, built separately. Every number is read off those
builds by driving them and measuring the boxes, not estimated from a picture.

**No maintainer comment was outstanding.** #458 merged as `c1097a8` with
nothing on it but this lane's own note and Vercel's. The open question that run
raised — two disclosures on the payoff card — is answered below under *what
was left out*, and it was not this run's unit.

---

## What specifically fails, measured

The brief names five ways a demo can be clunky and asks which one this surface
still has. The answer is the fourth and the fifth, and they are one defect seen
from two sides. **On arrival at 1280 × 900, on `main`:**

| block in the rail | top | height |
| --- | --- | --- |
| the claim and the two chips | 20 | 171 |
| the ask panel opens | 215 | — |
| **the leading ask's excerpt** | **377** | **358** |
| *or ask for one of these* | 751 | 17 |
| *or type your own* | 1040 | 20 |
| *what happens when you ask* | 1101 | 17 |
| the one link out, to `/docs` | 1141 | 78 |

The rail's scroller is **857px** and its content is **1,239px**.

- **The interesting part is below the fold.** Everything from *or ask for one
  of these* downwards — the four other asks, the free-text box, the three-step
  explainer and the only link out of this surface — is off the screen.
- **There is nothing to react to on arrival.** The single largest element a
  stranger meets, at **358px and 42% of the first screen**, is a second
  rendering of a band that is already on the page beside it. It is a still
  life, and it is the biggest thing on the screen.

The other three are not this surface's problem any more and the run before each
of them says so: there is **one** step before something happens, there is **one**
obvious first action, and the first screen has no jargon on it.

### And underneath both of them, the thing that actually fails

**The first screen sold the half of this product everybody else already has.**

*Ask that page for a change.* — an AI can rewrite a page, which
`docs/rollout.md` names as the least novel thing here. The record, which is the
differentiator, appeared on that screen as **one clause of a hedge**:

> Loom weighs every ask before it lands: some changes it makes on its own, some
> it won't make without asking you first. Either way, it writes down what it did.

Every word of that is true and it is true of *every ask ever made*, which means
it proves nothing about anything. A stranger who pressed nothing — and most
strangers press nothing — left this surface knowing that an AI can change a
page and that somebody claims to write it down.

## What a stranger can understand now

**That this page is governed, before they touch it — because the Gate says so
about the button in front of them.**

Under the one green button the demo invites, where the hedge used to be:

> **Pressing this raises a question, not a change.** Some risk — so Loom asks
> you before the page moves, and writes down what you decide.

**That sentence was not written. It was run.** `composeChange` interpreted,
analysed, assessed and gated *Take the numbers off* against the tree being
rendered, under `demoPolicy`, with the preset's own interpreter, and stopped at
the verdict without writing anything (0021). What is printed is its answer.

| | before (`main` at `ee9c1d5`) | after |
| --- | --- | --- |
| the arrival screen, wide | `…-before-wide.png` | `…-after-wide.png` |
| the arrival screen, phone | `…-before-phone.png` | `…-after-phone.png` |
| the question, one press later — **unchanged** | `…-held-unchanged.png` | same file, byte for byte |
| the payoff, two presses later | — | `…-after-applied-wide.png` |
| the front door's embed, 348 × 465 | — | `…-after-embed.png` |

All prefixed `reports/2026-10-01-demo-what-it-will-say`.

### Measured, on the two production builds

Driven and the boxes read off the page, at 1280 × 900:

| | before | after |
| --- | --- | --- |
| the claim sentence | 215, **55px** (three lines) | 215, **37px** (two lines) |
| the lead button's form | 268 | 268 — untouched |
| **the verdict** | — | **351, 32px, wholly on the first screen** |
| the ask's excerpt | 377 → 735 | 399 → 757 — same 358px, still whole on the first screen |
| *or ask for one of these* | 751 | 773 — still on the first screen |
| the rail's content | **1,239px** | **1,261px** — grew by 22 |
| the rail's viewport | 857px | 857px |
| `scrollWidth` vs `innerWidth`, wide | 1280 / 1280 | 1280 / 1280 |
| `scrollWidth` vs `innerWidth`, phone | 390 / 390 | 390 / 390 |

**The verdict cost 22 pixels of rail**, because the hedge it replaced was three
lines and the brief claim is two. Nothing that was on the first screen came off
it.

**The question frame is byte-identical across two separately built commits.**
`before-held-wide.png` and `after-held-wide.png` have the same `md5`
(`79cae639175ffc88a14d8c04a2f22cbe`), so the moment a stranger decides is
provably untouched rather than argued to be.

**And the payoff card is unchanged, measured rather than asserted.** Driven
through both presses on this build: the applied card is **765px** and
**Put it back** sits **187px** above the rail's bottom edge, against the
**765px** and **186px** that 30 September's run recorded for the state that is
now `main`. The two `applied` pictures have different `md5`s and are the same
frame: the rail above is 22px taller, so the browser clamps the scroll one
pixel differently. It is said here because a report quoting only the identical
pair would be choosing its evidence.

### What it cost, at the one size where it cost something

At **348 × 465** — the demonstration inside the front door's embed, the
smallest screen this surface is judged at — the button is 325–471 and its
promise 383–415, and **the verdict's third line is clipped by 6px**.

Not fixed, and the reason is that the cheap ways to buy six pixels are all
worse than the clip: the two chips and the *It's the page below* line above it
are each a deliberate copy decision from an earlier run, and shrinking the
verdict's type would make the most important new sentence on the screen the
smallest. At 390 × 844 all four are whole on the first screen.

**And a claim in that file's own comment turned out to be false, so it was
corrected rather than left.** It said that at 348 × 465 the button, its promise
*and the frame sentence* were all above the fold together. The sentence
measures 487–524 today, and arithmetic says it was below the fold before this
run too — the header has gained a line and a chip row since that measurement
was taken, and nothing re-took it. The comment now carries the numbers and the
date they were taken on.

### Why this is allowed, when `presets.ts` forbids exactly this

`presets.ts` refuses to let a preset's label name a verdict, and it is right:

> a label promising "this one will be held" would be a surface predicting a
> decision it does not make — and would be wrong the first time the policy or
> the page moved.

Every word of that holds against a **typed** claim. This is not one. Retune the
policy, move the page, swap the leading preset, and the sentence moves with
them — because it is not a sentence *about* the Gate's output, it **is** the
Gate's output. A prediction can be wrong; a value cannot disagree with itself.

`pipeline.test.ts` holds that directly rather than trusting the paragraph: for
**every** preset, the verdict the arrival screen reaches and the verdict the
real write path produces are asserted equal, and the page either moved or it
did not.

### It costs no key, no store and no session

The preset interpreters are deterministic (0057), so this is a tree walk.
Timed over 200 runs: **0.62ms** for the held ask, **0.31ms** for the re-theme.
`composeChange` is handed no store — in the `applied` branch it computes a tree
and this module drops it, which a test pins by comparing the tree before and
after. A visitor who never presses anything leaves no trace of having been told
what would have happened.

## The change

Two files edited, one added, and three test files.

### `_lib/what-it-will-say.ts` — the verdict, in two halves

`willSayOf(outcome)` is pure and takes one field off the assessment, so the
**words** are testable with no pipeline. `whatItWillSay(tree, presetId, …)`
runs the real one, so the **verdict** is testable with no words. The split is
what lets `pipeline.test.ts` assert the join.

**Three strings, forward tense, and that is the one thing none of the tables it
could have borrowed is.** Every plain-language table this surface reads was
written for a record, and a record already happened: `RULE_SENTENCES`'
`within-policy` reads *"so it went ahead on its own"*, which is a false
statement about a button nobody has pressed. So the rule stays on the card,
where the tense is right, and what is shared here is `STAKES` — the level
words, which have no tense — exactly as `weighed.ts` shares them. A test holds
the tense.

**The three endings, and the two that say nothing.** A hold, an auto-apply and
a refusal each get a sentence; an ask that never reached the Gate gets none,
which is the same restraint `weighedOf` exercises one screen later and is also
what restores the fuller sentence above the button.

### `ask-panel.tsx` — the hedge gives way to the fact, and only to the fact

The old sentence does two jobs: it states the claim (*Loom weighs every ask and
writes down what it did*), and it hedges about *which* asks wait for you —
a stand-in for something the surface could not state. With the statement
directly below it, the stand-in is three lines of *maybe* over a line of *this
one will*. So the claim stays, shortened, and the hedge goes.

**Nothing is removed.** The full sentence is what a panel with nothing to
foretell still shows, and both branches are asserted.

The verdict sits **inside the lead form, under the promise**: the promise is
about the page and this is about the Gate, and both are facts about one button
that the narrow layout's `flex-col-reverse` reorders as a block. Three tests
hold the placement.

**The rule beside it is the neutral edge, not the awaiting amber**, although
the words say a question is coming. Amber on this rail means *there is a
question open and it is yours* — the badge, the ring on the stage, the sticky
caution, the rule on the card. No hold exists on arrival, and a fifth amber
mark for a question nobody has raised would make the arrival screen look like
a screen with work on it.

### `page.tsx` — one `await`, and no decision

`whatItWillSay(tree, rail.leading?.preset, …)`. Which ask is primary is
`rail.ts`'s reading, handed straight through; the only thing this file does is
the `await`, which is the one thing a client component cannot do and the whole
reason the call is not in `ask-panel.tsx` beside the button.

It is a sixth prop handed to a component one field at a time from the file no
test can mount, which is this lane's open finding of 29 September. It does not
close it and does not make it worse in kind: the prop is absent-or-present and
`ask-panel.test.tsx` asserts both branches, so dropping the line is caught.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line
and read in a separate command.

| | `main` at `ee9c1d5` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` (`src/`, `tools/`) | 171 files / 3,441 | **171 / 3,441** — `src/` untouched |
| `@loom/app` (`apps/loom/`) | 348 / 6,040, 1 skipped | **349 / 6,060**, 1 skipped |
| findings | 929 | **930**, 0 malformed |

**+20 application tests, all written**: thirteen in `what-it-will-say.test.ts`,
five in `ask-panel.test.tsx` and two in `pipeline.test.ts`. Nothing weakened,
skipped or deleted; the one skipped test is `(docs)`' and is on `main`. 120
prerendered pages, 1,451 text junctions, 0 run together. `pnpm shoot`: 1280 vs
1280 wide, 390 vs 390 phone, 348 vs 348 embed, exit 0, no overflow at any size,
on both builds.

**It went red once, and the failure was a false premise rather than a typo.**
A first version of the *stops foretelling an ask the page has outgrown* test
used `promote`, on the assumption that asking for it would exhaust it. It does
not: `promote` is **held**, so asking changes nothing about the page and the
quote is still where it was. The test was rewritten around the leading ask with
its hold actually confirmed — which is a stronger row, because it is the one
that proves the verdict dies with the *change* rather than with the *ask*.

### The defect matrix

Each defect restored in turn against this commit, the demo lane run against it,
and the lane restored with `git checkout` between rows.

## Decisions taken that were not specified

- **The excerpt was not shrunk to pay for the verdict**, although it is the
  358px this report opens by complaining about. `globals.css` argues 21rem and
  the argument is good — a window that faded out before *24* and *92%* would
  preview one number under a button promising three — and reopening a closed
  defect to buy room for a new idea is the wrong trade. The brief sentence gave
  back roughly what the verdict took. The question is filed.
- **The card was not touched.** What the arrival screen says is a strict subset
  of what lands on the card: the weighing panel, the rule and the ceiling
  comparison stay there. That ordering is what makes the press a promise kept
  rather than an argument made twice, which is the failure `reasoning.ts`
  exists to catch and the one this screen was most able to reintroduce.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing escalated.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart
  from `FINDINGS.md` and `reports/`. `git diff origin/main --name-only` outside
  those three is empty.

## What was left out

**The 30 September finding is still open and was not fixed here.** The folded
reasoning on an answered card is labelled in the present tense — *"Some risk,
and you could undo it. · and the rule that read it"*, three lines above **You
said yes**. It is small, it is this lane's, and it belongs to a run about the
payoff card rather than one about the arrival screen. Folding a copy fix for
the last screen into a unit about the first would have made both harder to
review.

## Findings

**Filed two, appended one, closed none.**

- **Filed**, for this lane: *the first screen spends 42% of itself on a still
  life, and this run paid for the verdict without reclaiming it.* The table at
  the top of this report, three shapes, and a recommendation to leave it until
  something else needs the pixels.
- **Filed**, for this lane: *the arrival screen now runs the Gate on a render,
  and nothing here can see what that costs a real request.* 0.62ms warm in a
  `vitest` process is not a cold serverless invocation, and this lane cannot
  measure one — `*.vercel.app` is denied from the sandbox.
- **Appended**, to 30 September's entry for `Loom daily build` about what a
  shot list cannot see: a **fourth** throwaway `playwright-core` script in four
  runs, and the first where the measurement *chose the unit* rather than
  evidenced one. A lane picking its next unit with an instrument it rewrites
  every time is a different and worse cost than not being able to assert a
  regression.

**Re-verified, not re-filed:** `21st.dev` `EGRESS_BLOCKED`, a **thirty-third**
consecutive run, one call. `*.vercel.app` denied from the sandbox
(`Loom portal`, 27 September) — the preview URL is on the pull request and the
pictures are from a local production build.

## Open questions

**Nothing blocking.**
