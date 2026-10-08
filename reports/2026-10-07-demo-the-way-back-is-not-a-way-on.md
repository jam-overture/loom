# The way back is not a way on

**Routine:** `Loom demo` · **Branch:** `demo-41-the-way-back-is-not-a-way-on`
· **7 October 2026**

The forty-second run of this lane, with no open pull request of its own. A
fresh branch off `main` at `bd0af3d`.

Every picture below is a production `next build` of a real commit, served by
`pnpm shoot --serve` and photographed at 390 × 844, 1280 × 900 and 348 × 465
with reduced motion. **Every number is `pnpm shoot`'s own `measure`**, with the
selectors committed in `2026-10-07-demo-the-way-back-is-not-a-way-on.shots.json`
beside this report. The `before` figures and the three `before` pictures are the
same harness run against a production build of `main` at `bd0af3d`, built
separately.

**No maintainer comment was outstanding.** Nothing has been said on this lane's
work since #458; #541 merged this morning and every comment on it is this
lane's own. The only open pull request in the repository is `Loom portal`'s
#544.

---

## What a stranger could not understand before this run

**That the button they were being offered was their own undo.**

The demo invites one press, and the arrival screen advertises a second kind:
*Loom will make 2 on its own*. A stranger who takes that path — press
**Re-theme the whole page**, watch the page move, no question asked — is
fifteen seconds in and looking for what to do next. What the panel offered
them, measured cold on `main` at 1280 × 900:

> **Re-theme the whole page** · *Every colour and typeface on the page changes
> at once.* · `GOES AHEAD`

Eleven pixels above a record card reading *"Put it back" undoes it*. **Two
controls, the same effect, and only one of them said so.** Press it and the
page goes back to exactly how it arrived, under a second **Applied** card with
the same words on it as the first.

And the caption under the record said:

> **5 more changes to ask for ↑**

The same five the arrival screen offered. A visitor who had just made one of
five changes was told there were five more — literally true of the list, and
read as *nothing I did counted*.

## What specifically failed, diagnosed before anything was built

Measured cold against a production build of `main` at `bd0af3d`, 1280 × 900,
after one press of *Re-theme the whole page*:

| on the panel, after one press | where it is | what it said |
| --- | --- | --- |
| row 1's label | `y 442` | **Re-theme the whole page** |
| row 1's promise | `y 477`, 281px | *Every colour and typeface on the page changes at once.* |
| row 1's chip | `y 442` | `GOES AHEAD` |
| the record card's own undo | `y 671` | **Put it back** |
| the ending's count | `y 604` | **5 more changes to ask for** |

**Nothing here was a regression and no run did this.** It is what two correct
decisions do when they meet. `availablePresets` plans every preset against the
tree *as it stands*, which is right — an ask with nothing to do must not be
offered. And both unattended presets are **toggles**: `palette` swaps the theme
ids and back, `backdrop` swaps `aurora` for `panel` and back. So an applied
toggle is applicable again *in the other direction* and comes straight back onto
the list wearing the sentence it shipped with — a sentence written against the
page as it arrived, describing a change the page is about to be moved away
from.

That row was **the only false sentence on this surface**. The label is honest.
The chip is the Gate's own verdict, reached by running this press against this
tree under this policy, and it is as true of a press that puts something back as
of any other. What was false was the claim about the *page*.

It is also the sharpest possible place for this surface to be wrong. The demo's
whole argument is that the account beside a change tells you what it did; here
the surface's own list contradicted the record sitting under it.

## The change

**An ask that would put the page back says so, before the press.**

### `_lib/put-back.ts` — the same two functions, one step earlier

`put-back.ts` already answers *did this put the last change back*, for a card
that has landed: `settingsMoved` walks a delta against the tree it was planned
against, and `reversesTheLastChange` compares those moves against what the
change immediately before moved. It now answers *would it*, for a press nobody
has made:

```ts
export const wouldPutTheLastChangeBack = (
  before: LoomTree,
  delta: TreeDelta | undefined,
  last: readonly SettingMove[] | undefined
): boolean => delta !== undefined && reversesTheLastChange(settingsMoved(before, delta), last)
```

**Nothing new is computed and nothing new is said.** `whatEachWillSay` already
runs `composeChange` against this tree under this policy for every offered ask —
that is how the arrival screen's `GOES AHEAD` and `ASKS YOU FIRST` are produced
— and a proposal's delta is on the outcome it returns. So the direction is read
off the delta the **Gate has just assessed**, with no second opinion free to
disagree with the card's, and no second runtime call: the presets are
deterministic interpreters ([0057](../decisions/0057-a-preset-is-a-deterministic-interpreter.md)),
so this costs a tree walk over a delta already in hand.

**`undefined` in, `false` out.** An ask that reached no proposal has no delta to
read a direction off, which is the silence `willSayOf` already keeps about the
verdict itself.

### `_lib/what-each-row-says.ts` — the sentence, and the one word that does not move

```ts
export const PUTS_IT_BACK = "Puts the page back to how it looked before your last change."

export const promiseOf = (promise: string, putsBack: boolean | undefined): string =>
  putsBack === true ? PUTS_IT_BACK : promise
```

**Only the promise moves, and the restraint is the point.** The chip stays the
Gate's word. Swapping it for a direction would trade a fact the Gate produced
for one the history did, and would leave the sentence above the list — *Loom
will make 2 on its own and ask you first about 3* — counting rows that no longer
carry what it counts. The false sentence was the one about the page.

The words are the demo's own: it already says *"The whole page went back to how
it looked"* on a card and *"Changed back"* on a mark. This is that fact in the
forward tense every string on this panel is written in, with no level, no rule
and no policy in it.

It names **your last change** rather than *the original page*, because that is
the only claim the reading behind it checks: `reversesTheLastChange` compares
against the change immediately before and nothing earlier, so a page carrying
two changes and a press reversing one of them has not come back to how it
started.

**One function for the row and the lead**, because they are one sentence in two
sizes. The lead is whichever ask `leadingAsk` nominates out of what is left, so
once *Take the numbers off* has been answered the green button **is** a toggle —
and a green button promising *every colour and typeface on the page changes at
once* while undoing the visitor's last change is the same defect at the loudest
size this panel has.

### `_lib/what-else.ts` — the count stops counting the way back

The caption's own note said the spent ask is taken out, and *taken out* meant
one thing when it was written and means two now. A removal spends its preset —
the numbers are off the page, nothing is left for that ask to do. A toggle
spends nothing.

So what is counted is the asks that would move the page **on**. The row is not
hidden: it is still in the panel, now saying what it does, and the same press is
already offered by name as **Put it back** on the card this caption is about.
Counting it here would be offering the way back as a way on, which is the one
direction this row exists to point.

Its third silence is applied rather than rewritten: a panel offering nothing but
the way back has no ways on, so the caption goes quiet — a link to an empty
panel is the silently-dead control this whole demonstration argues against.

### `_lib/rail.ts` — `whatElse` becomes `theEnding`, and why that was forced

The ending's condition was three readings `whatTheRailShows` had already worked
out. It is now four, and the fourth is the Gate's answer to each offered ask —
which is computed from `available` and therefore **cannot be computed before
it**. So the ending is a second exported reading rather than a field on the
view, taking the view and the verdicts in the order `page.tsx` already produces
them.

**Still in `_lib` and still not in the markup**, which is the property that
mattered: `page.tsx` is an `async` Server Component no `vitest` run can mount,
and the five readings the 17 September finding counted were all unwired by
deleting one argument with the suite green.

### The parameter that is required, and the defect matrix row that made it so

`whatEachWillSay` takes the visitor's records as a **required** fifth argument.

It was optional for one commit, and the matrix caught exactly what that costs:
deleting the argument in `page.tsx` puts every row back on the promise it
shipped with and **the entire suite stays green**, because no test can mount
that file. This lane has counted that hole twice (14 and 18 September) and the
answer that works here is not another test — it is a signature a caller cannot
silently stop answering. Required, the deletion is a type error, and
`tsc` inside `pnpm verify` is what catches it. Verified by making the deletion:

```
apps/loom/app/(demo)/demo/page.tsx(170,25): error TS2554: Expected 5 arguments, but got 4.
```

It takes the **records** rather than the moves, so `lastMovesIn`'s rule — the
first record that *reached the page*, and what it moved — is applied in one
place by the module that depends on it, instead of at a call site free to hand
in a different history than the card below the row was measured against.
`lastMovesIn` is exported from `record.ts` for that, and `page.tsx` lost an
import and a decision rather than gaining one.

## Measured, on the two production builds

### 1280 × 900, after one press of *Re-theme the whole page*

| | before (`main` at `bd0af3d`) | after |
| --- | --- | --- |
| `#ask` | `y 202`, 391 × 541 | `y 202`, 391 × 541 — **unmoved** |
| the four rows | `442 / 509 / 576 / 643` | `442 / 509 / 576 / 643` — **unmoved** |
| **row 1's promise** | *Every colour and typeface…* `y 477`, **281px** | ***Puts the page back to how it looked before your last change.*** `y 477`, **304px** |
| the record card | `y 44`, 391 × 496 | `y 44`, 391 × 496 — **unmoved** |
| the ending's section | `y 564`, 391 × 56 | `y 564`, 391 × 56 — **unmoved** |
| **the ending's count** | **5 more changes to ask for**, `y 604` | **4 more changes to ask for**, `y 604` |
| the rail | holding **2,170** in 857 | holding **2,170** in 857 — **unmoved** |

**Nothing moved. One sentence changed and one number came down by one.** That
is the whole geometric cost of this unit, and it is why the rail still holds
2,170: the replacement sentence is 23px wider on one line, and the count is one
character shorter.

### 390 × 844, the same press

| | before | after |
| --- | --- | --- |
| the four rows | `391 / 458 / 525 / 608` | `391 / 458 / 525 / 608` — **unmoved** |
| row 1's promise | *Every colour and typeface…* | ***Puts the page back…*** at `y 426`, 304px |

### The six frames that must not move, and did not

| | `md5` | |
| --- | --- | --- |
| the arrival screen, 1280 × 900 | `e8fd0ea8bd7fe902144d9cd111bf7b5c` | **byte-identical to 6 October's** |
| the arrival screen, 390 × 844 | `8498ace7521893a50c32e1d3f06fd321` | **byte-identical to 6 October's** |
| the embed at 348 × 465 | `8c0540a07671a9b19d55c2603f130c73` | **byte-identical to 6 October's**, and to `main`'s today |
| the question, one press later | `cccd31997848348da1832313c8feb651` | **byte-identical to `main`'s** |
| the end of the invited sequence | `392a4c1614258e18a37d4e03f539625c` | **byte-identical to `main`'s** |
| that path's count | **4 more changes to ask for**, `y 873` | unchanged at both ends |

The last row is the one worth reading. The held→applied path — press **Take the
numbers off**, then **Apply this change** — is the sequence the demo invites,
and it is untouched by all of this. A removal moves no setting, so nothing
pressed after it can be read as putting it back, and its ending already counted
four. **The defect was only ever on the other path**, and the fix reaches only
that path.

The three frames that moved:

| | | |
| --- | --- | --- |
| [**the panel, one press in**](2026-10-07-demo-way-back-panel-wide.png) · [before](2026-10-07-demo-way-back-panel-wide-before.png) | `0185fe92…` → `f44aaa03…` | **the picture worth opening** |
| [the ending](2026-10-07-demo-way-back-ending-wide.png) · [before](2026-10-07-demo-way-back-ending-wide-before.png) | `8544e9b3…` → `03f930af…` | five became four |
| [the panel on a phone](2026-10-07-demo-way-back-panel-phone.png) · [before](2026-10-07-demo-way-back-panel-phone-before.png) | `bbb64be7…` → `bc69ed61…` | the same sentence, same geometry |

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line and
read in a separate command.

| | `main` at `bd0af3d` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` (`src/`, `tools/`) | 188 files / 4,112 | **188 / 4,112** — `src/` untouched |
| `@loom/app` (`apps/loom/`) | 407 / **7,221** | 407 / **7,245** |
| the demo lane | 53 files / **789** | 53 / **813** |
| findings | 1,056 | **1,057**, 0 malformed |
| `prerender:check` | — | 126 pages, 1,584 junctions, 0 run together |

**Both totals were measured on both trees rather than derived**, which is this
run's own correction: `vitest run` was run against a production checkout of
`main` at `bd0af3d` for the left column.

**+24 lane tests, all written, none weakened, skipped or deleted.** No new test
file — every one of them went into a file that already tested the module it is
about: `put-back.test.ts` +5, `what-each-row-says.test.ts` +5, `ask-panel.test.tsx`
+5, `what-it-will-say.test.ts` +4, `what-else.test.ts` +4, `rail.test.ts` +1.

**Four existing test files changed behaviour-neutrally and none changed
meaning**: `how-many-wait-for-you.test.ts` and `ask-panel.test.tsx` gained
`putsBack: false` on a fixture, `pipeline.test.ts` and `rail.test.ts` gained the
new required argument, and `rail.test.ts`'s five `whatElse` assertions became
five `ending` assertions over the same sequences.

**The test that earns its place over the others** is `rail.test.ts`'s *stops
counting the ask that would only put the last change back*, and it earns it by
being the only one that runs the whole chain the defect lived in: a real press
through the real pipeline, the real `whatEachWillSay`, and the ending read off
both. Every other test holds one link.

### The defect matrix

Each defect restored in turn **against the commit**, the demo lane run against
it, and the lane restored between rows. Baseline **813 passed**.

| defect restored | caught |
| --- | --- |
| the promise is always replaced | **9** |
| the promise is never replaced | **4** |
| the ending counts the way back as a way on | **3** |
| the reading forgets the history it compares against | **3** |
| the direction is read off the whole log rather than the last change on the page | **3** |
| the Gate's answer never carries a direction | **2** |
| the runner stops applying the history it was handed | **2** |
| nothing is ever collected as the way back | **2** |
| the row stops asking which way it goes | **2** |
| the lead stops asking which way it goes | **1** |
| **`page.tsx` stops handing the records in** | **0 tests — a `tsc` error** |

**Ten of eleven by test, and the eleventh is the reason the parameter is
required.** That row read **0** while the argument was optional, which is the
measurement that changed the signature; it is now `TS2554` at
`page.tsx(170,25)` and `pnpm verify` fails on it.

## Decisions taken that were not specified

- **The chip is not the thing that changes.** A `PUTS IT BACK` badge in place of
  `GOES AHEAD` was built first and thrown away on the argument above: the chips
  exist so the sentence over the list is checkable against the rows, and a row
  wearing a direction instead of a verdict stops being evidence for it.
- **The direction is read off the Gate's assessed delta, not off `preset.plan`.**
  Planning in `rail.ts` would have been synchronous and free of the verdicts —
  tidier wiring, and a second delta, computed separately from the one the Gate
  weighed, free to disagree with it the first time anything repairs a proposal.
- **The ending moved out of the view rather than the verdicts moving into it.**
  Restructuring `whatTheRailShows` to take the verdicts means computing
  `available` before calling it, which splits one reading into two and gives
  `page.tsx` a third thing to get right.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing escalated.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and `reports/`. `git diff origin/main --name-only` outside those
  three is empty.

## What was left out

**The sentence above the list still says what it said on arrival.** *You can ask
for 5 changes here. Loom will make 2 on its own and ask you first about 3* is a
count of verdicts, and every word of it is true of the screen after a press —
but it is the arrival screen's sentence character for character, over a list
where one row is now the way back. Filed below with three shapes and a
recommendation.

**The lead press still does not move the page** — this lane's open design
question, carried a fifth run and untouched. The recommendation is still *leave
it and measure*: nobody has watched a stranger use this surface.

**The other three bands still rely on `pointer-events: none`**, carried a second
run.

**The disclosure chevron is still drawn in three components**, carried a fifth
run.

**The folded reasoning on an answered card is still labelled in the present
tense**, carried a seventh run.

## Findings

**Filed one, appended to one, closed none.**

- **Filed**, for this lane: after a one-press change the panel's own count
  sentence is the arrival screen's word for word, and one of the five it counts
  is now the way back. Three shapes, recommendation **(2)** — say both — and
  only if a run has nothing better.
- **Appended** to the 12 September entry this lane owns the first half of
  (*`git checkout -b <branch> main` branched off a `main` forty-one commits
  stale*): today's container again started on a detached `HEAD` at the real tip,
  with the local `main` **four days and seventeen merges behind**. The branch
  was right — the bug moved to **step 7**. `git checkout main` to take the
  before pictures produced a tree in which `_lib/what-else.ts` did not exist, so
  the demo's ending caption was absent from every before shot and this report
  would have claimed this run added it. Caught only because the numbers
  disagreed with a measurement taken earlier in the same session on the same
  code. *A routine that measures against `main` reaches for it twice — once to
  branch, once to photograph — and the fetch has to happen before both.*

**Re-verified, not re-filed:** `21st.dev` `EGRESS_BLOCKED`, a **thirty-ninth**
consecutive run, one call. `*.vercel.app` denied from the sandbox
(`Loom portal`, 27 September) — the preview URL is on the pull request and the
pictures are from a local production build.

## Open questions

**None new.** The one this run raises is filed with a recommendation.
