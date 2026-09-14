# The record said what was asked, and never what was done

**Routine:** `Loom demo` · **Branch:** `demo-17-what-the-record-did` · **14 September 2026**

The seventeenth run of this lane. It is a repair, and what it repairs is the
half of the demo's own sentence that was missing.

---

## What a stranger could not understand before this run

**What the change actually was, once it had happened.**

The demo's claim is *the change and the record of it, side by side*. Press the
leading button and the held card makes good on it — the Gate's weighing, the
rule, the ceiling comparison, and then the line that says what this is in the
words on the page:

> This comes off the page, and everything under it goes too.
> **“3,400” “24” “92%”**

**Press *Apply this change*, and that line disappears.**

Everything else stays. The badge turns green, *"You said yes"* arrives, the
weighing and the rule and the comparison are all still there — and the one
sentence describing *the change* is gone, at the exact moment the change became
real. The card a stranger reads after the press is entirely about the decision
and contains nothing about what was decided.

**And for a change Loom applies on its own, the line was never there at all.**
Two of the five presets are low-risk, so they land unattended and their cards
are `applied` from the first render. *"Repaint the band at the top."* produced
this, start to finish:

> **Applied** · “Repaint the band at the top.”
> This change is live on the page beside you. “Put it back” undoes it.
> *asked by a demo visitor*
> **WHAT LOOM WEIGHED** — Low risk. / Yes, nothing is destroyed by it.
> Nothing this project watches for was involved, so it went ahead on its own.
> **Put it back**

The ask, the verdict, and no change. A visitor is told a thing was weighed and
allowed, and never told what it was.

**How this was found.** By pressing the same button four times. The rail filled
with four cards that were identical to the word — and `backdrop` is a *toggle*,
so presses one and two make opposite changes to the page. Two opposite changes,
two records, not one character between them. That is not a repetition problem;
it is the record failing to contain the change.

## Why it happened, which is the interesting part

The plain reading resolves a delta against a tree. `page.tsx` computes it per
render against the tree on the stage — the only tree a render has — and hands it
to the card.

That is exactly right for a change still waiting, and **impossible for one that
has landed**: the delta has already been applied to the tree on the stage, so
resolving it there reports a change that does nothing. The page could not
compute the sentence, so it correctly declined to, and the card correctly
printed nothing. Every step was right and the result was a record with a hole in
it.

The tree that *can* answer is the one the change was judged against, and it
exists for exactly one moment: between the server action reading the head and
the runtime writing the next revision.

## What a stranger can understand now

The same card, after the same press:

> **You said yes.** Loom held this change until you answered. Without that,
> nothing on the page would have moved.
> **This came off the page, and everything under it went too.**
> **“3,400” “24” “92%”**

And the unattended one, which had nothing:

> Nothing this project watches for was involved, so it went ahead on its own.
> **How one part of the page looks changed. Not a word on it changed.**

And the undo, which is the demo's payoff:

> **One part of the page went back to how it looked. Not a word on it changed.**

Nothing was removed from any card. One line was added to the three states that
did not have it, in the place the same line already occupied on a held card, in
the colour of the mark the same change left on the stage.

## The five changes

### `_lib/plain-change.ts` — every sentence is now a pair

Fourteen readings, each written as `{ proposed, done }` and selected by a
`tense`. **Pairs rather than a past-tense table of its own**, because these are
one fact said twice and the failure worth preventing is the two drifting apart:
a sentence reworded in one tense and not the other is a diff nobody can read as
wrong. Side by side it is obvious.

The guard that keeps it honest is a test asserting **no reading is the same
string in both tenses**, over every operation in both directions — which is
exactly what a half-finished reword produces.

### `_lib/record.ts` — the reading is frozen where the delta and the tree meet

`ChangeRecord` gains `did`, computed in the `change-assessed` fold, from a new
`AssessedAgainst` the caller supplies. It sits next to `touched`, which was
already frozen there for the same reason: the tree it describes is gone by the
time anything reads it.

Two things about this that are not obvious:

- **The fold that answers a hold must carry it forward.** A held change is
  assessed when it is *asked for* and answered later, and answering narrates no
  assessment and arrives with no tree. A drop in `draftFrom` would empty the
  line at the exact press that makes it true — which is the original defect,
  rebuilt. It is carried, and a test puts that defect back.
- **Absent, never guessed.** A caller that cannot honestly name the tree passes
  nothing and the card prints nothing. A wrong reading would be a confident
  account of a change that did not happen, which is worse than silence on the
  one surface whose product is the record.

### `demo/actions.ts` — the one caller that can name the tree

`assessedAgainst` reads the head *before* the write. Its failure is handled by
returning `undefined`: the reading is an addition to a card, not a precondition
for a write, and refusing a visitor's ask because a sentence could not be
composed would cost them the demo.

The undo path passes `restoring: true`, which is the one thing only a call site
knows — an undo's operations are ordinary inserts and removes (0032), so nothing
in the delta says which way it is going.

### `demo/_components/plain-reading.tsx` — renamed, and given a tone

`WhatWouldHappen` became `PlainReading`, because the name was a tense and the
component now renders both. Its one new prop is the colour: amber while the
question is open, green once it has landed, matching the ring on the stage.

### `demo/_components/record-card.tsx` — one line, one slot

`did` renders where `plain` renders, so the card's reading order is unchanged.

## Decisions taken that were not specified

- **Past tense, not a heading.** A *"WHAT CHANGED"* label would have been a
  sixth section on a card this lane has spent six runs cutting back. The tense
  carries it: *came off* against *comes off* is the whole difference, and it
  needs no chrome.
- **The guard is the outcome, and only the outcome.** I first wrote
  `plain.length === 0 && outcome === "applied"`, which reads as caution and is a
  branch no render can reach — the page keys `plain` by `heldProposalId`, which
  a landed record does not have. **A condition nothing can make false is a claim
  no test can check**, so it came out. The defect probe is what found it: the
  version with the redundant guard, deliberately broken, failed nothing.
- **"Higher" is not claimed for a setting.** See *the one thing I did not fix*.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing was escalated and nothing was left out.
- **No file outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and this report. `src/` was not opened at all.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**. Numbers in the pull request
description, read off the run rather than remembered.

**It was not green the first time, and the failure was mine.** `pnpm verify`
exited 2 on a typecheck error in a test I had written twenty minutes after the
last time I ran `tsc`: `heldProposalId: undefined` on a fixture, which
`exactOptionalPropertyTypes` refuses — a discarded ask has no proposal, it does
not have a blank one. The file already had the right pattern three fixtures
above (`ANSWERED` drops the key rather than blanking it) and I did not reach for
it. Fixed, and re-run from the top rather than from the failing step. The lesson
is small and worth writing down: **typecheck after the last edit, not after the
first** — the app suite ran green throughout, because a type error in a fixture
is invisible to the runner that executes it.

The demo lane's own suite goes from **29 files / 357 tests** to **29 files /
377 tests**. **Twenty added, none weakened**, counted per file rather than
remembered:

| file | `main` | branch |
| --- | --- | --- |
| `_lib/plain-change.test.ts` | 20 | 25 |
| `_lib/pipeline.test.ts` | 14 | 20 |
| `demo/_components/record-card.test.tsx` | 51 | 57 |
| `what-would-happen.test.tsx` → `plain-reading.test.tsx` | 5 | 8 |

The renamed file carries **all five of its original assertions verbatim** and
adds three; nothing was rewritten to accommodate the change, because nothing it
asserted stopped being true.

**Every defect was put back one at a time and the suite re-run.** Four of five
were caught by exactly the test that should catch them:

| defect restored | what fails |
| --- | --- |
| `draftFrom` stops carrying the reading forward | *keeps the record's account … when the visitor says yes* — 1 test |
| the tense is ignored and every reading comes back present-tense | 8 tests, across three files |
| the frozen reading is printed without checking the outcome | 2 tests |
| a landed change is drawn in the waiting colour | 1 test |
| **`actions.ts` stops telling the undo path it is restoring** | **nothing — 377 passed** |

**The fifth is a real gap and it is filed.** `pipeline.test.ts` covers the write
path end to end, but it *replicates* what the server action does rather than
calling it — so every argument `actions.ts` passes is asserted in the test's own
copy of the call and nowhere in the file that ships. Delete one `true` and the
demo's payoff silently regresses to describing a return as an arrival, on a
green suite. The finding names the shape that would fix it (move the two
decisions out of the action and into `_lib/`, where the pipeline test can call
the same function rather than a copy of it) and says why I did not fold it into
this unit: it is a refactor with its own argument, and this one was already five
files.

## The one thing I did not fix, said plainly

**A change that only configures says what kind of change it was and never which
way it went.**

For an insert, a remove and a move the new line is specific, because those
operations have a subtree and a subtree has words. **A `configure` has none —
and both unattended presets are one.** *Re-theme the whole page* and *Repaint
the top band* each read *"How one part of the page looks changed"*, in both
directions, and both are toggles. So a visitor who presses either twice still
gets two cards that make opposite changes and read alike.

That was true of the *whole card* before this run and is now true of one line of
it. It is progress and it is not the finish, and the gap is filed with three
shapes and a recommendation. It was not fixed here because naming the direction
means naming the values, the values are `aurora` and `panel`, and `settingsOf`
excludes the registry's enums from the quoted words on purpose — a setting is
not something a visitor reads off the page. The fix is a vocabulary decision,
not a rendering one, and one of the three shapes is `Loom primitives`' rather
than mine.

## Findings

**Closed:**

- `docs/rollout.md` still putting the demo at `(portal)/portal/demo` — **fixed
  on `main`**, verified on `f62b9bc`. Nine runs of this lane filed it and the
  tenth got to delete it. The three earlier copies are the same finding and are
  closed by the same fix.

**Filed:**

- `Loom demo` (this lane): **a `configure` never says which way it went**, as
  above, with three shapes and a recommendation.
- `Loom demo` (this lane): **`actions.ts` is the one file in this lane a test
  cannot reach, and it is now load-bearing** — found by the defect probe, with
  the table above and the refactor that would close it.

**Re-verified in place rather than re-filed:**

- `21st.dev` is `EGRESS_BLOCKED` — **sixteenth consecutive run.** The cost was
  nil again: what decided this unit was pressing a button four times and reading
  what came back, which no reference gallery could have answered.

**No longer re-filed, and worth recording why.** The `Loom demo` brief still
opens with *"Two problems to fix before anything else"*, whose first problem
landed on 21 August. This is the tenth run to meet it. I have not filed it a
tenth time — a third of `FINDINGS.md` is entries filed twice, which is itself an
open finding, and the standing entry says everything a new one would. It is in
**Needs your input** on the pull request instead, where a person reads it.

## Open questions

Nothing blocking. One carried forward from 13 September, unanswered:

- **Does the record earn its repetition?** Measured this run at 1280×900: the
  rail's scroll height is **1,029px on arrival and 3,504px after five asks**,
  growing a near-constant **~476px per card**, and the same ~75 words are on
  every one of them. Last run's
  recommendation stands: on the *second and later* cards, collapse the weighing
  box and the rule to one line each with the full text one click down, and leave
  the newest card whole. **This run makes the case slightly stronger and also
  slightly weaker** — stronger because it confirms the cards really are close to
  identical, weaker because the line added here is the one thing that now *does*
  differ between them, so collapsing the shared parts would leave exactly the
  distinguishing sentence standing. That is a better outcome than I could argue
  for last week, and it is still a product call rather than a run's judgement.
- **"Ask about just this"** — the scope control, reasoned out in this lane's
  22 August finding, still the largest unbuilt idea here.
- **The rail and the stage scroll independently** (7 September). Recommendation
  unchanged: make the chip a link to its card, or leave it.

## The visuals

| | |
| --- | --- |
| [applied, before](2026-09-14-demo-what-the-record-did-applied-before.png) | `main`: the visitor pressed **Apply this change** and the sentence describing it went away |
| [applied, after](2026-09-14-demo-what-the-record-did-applied-after.png) | this branch, same press: *"This came off the page, and everything under it went too."* over the three figures |
| [unattended, before](2026-09-14-demo-what-the-record-did-unattended-before.png) | `main`: a change Loom made on its own — ask, verdict, and nothing in between |
| [unattended, after](2026-09-14-demo-what-the-record-did-unattended-after.png) | the same card, now saying what it did |
| [undo](2026-09-14-demo-what-the-record-did-undo.png) | the payoff, read as a return rather than an arrival — the `restoring` flag arriving through the real action |
| [phone](2026-09-14-demo-what-the-record-did-phone.png) | 390×844, where this matters most: the page is thousands of pixels away and the sentence is the only account of it |
| [screen](2026-09-14-demo-what-the-record-did-screen.png) | 1280×900, the whole demo two seconds after saying yes |

Both wide pairs are **the same script driven against two real `next build`
outputs** — `main`'s and this branch's — so the only difference in the frame is
the change. Not the preview deployment, which this environment cannot open
(`vercel.app` is not on the sandbox's egress allowlist; the standing 19 August
finding).

**To see it yourself:** open `/demo`, press **Take the numbers off**, then press
**Apply this change**. On `main` the sentence quoting *“3,400” “24” “92%”*
vanishes as the badge turns green. On this branch it stays, in the past tense,
above **Put it back**. Then press **Repaint the top band** twice and read the two
cards it leaves — on `main` they are identical; here they say what they did, and
the finding filed beside this says why they still say it in the same words.
