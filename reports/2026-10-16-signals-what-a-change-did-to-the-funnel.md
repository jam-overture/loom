# Reader signals — what a change did to the funnel

**Routine:** `Loom signals` · **Date:** 2026-10-16 (morning run) · **Branch:**
`signals-34-what-a-change-did-to-the-funnel` · **Section:** §34 of
[`docs/signals.md`](../docs/signals.md)

## What I completed

The comparison the funnel never had:
[0288](../decisions/0288-a-change-to-a-funnel-is-two-shares-that-factor-and-a-difference-of-two-floors-is-a-bracket.md),
`funnelChangeOf(was, now)` in
[`src/signals/funnel-change.ts`](../src/signals/funnel-change.ts).

Every other reading here that measures attention has had its before-and-after
for a fortnight — where reading stops, how much of a page gets read, whether
readers had time for it, who the readers were, what readers did inside a part,
and four readings of a library. **The funnel had none**, and it is the one
counter a deployment opens the portal for: *we shipped a change, did more
readers buy?* was two screens and a subtraction done by eye.

It is the **twenty-third** thing taken out of what this subsystem already knows
rather than collected — the twenty-fourth if #649 lands first and counts §33 the
way §32 counted itself, which is the one number here that depends on the merge
order. **Nothing was added to a payload, a browser, a column, a
store or the vocabulary of kinds.**

### The two things that decided the shape

**A funnel's two factors are separable, so this comparison gets the
counterfactual that §18's could not have.** 0251 refused one for what readers
*do*, and the refusal was structural: `engaged ÷ reached` has readers on both
sides of the division, so there is no reader-free term to hold still. A funnel
does not have that problem, and the identity is exact —

```
conversion.share = entry.share × rate
```

— with each factor's numerator and denominator inside one window, which is the
test 0251 set for any ratio across two windows. So the later window's reach at
the earlier window's closing rate isolates one side and the other diagonal
isolates the other, and the reading answers *your change did not sell more; it
got more readers to the pricing band and the same share of them bought.*

**A difference of two floors is not a floor.** This is the half I would have
got wrong without 0282 having been written yesterday. 0231 found `rate` the one
figure in this subsystem biased *downward* — a page view that straddles a rollup
boundary contributes `reached 1, converted 0` to the first window and nothing to
the second, so the conversion is **lost** — and published `rateAtMost` as its
ceiling. Nobody had ever subtracted two of them.

The number is in the suite, and it is not a rounding error:

| | earlier window | later window |
| --- | --- | --- |
| arrivals opened / appearances | 100 / 100 | 100 / **140** |
| reached the pricing band | 50 | 70 |
| finished | 10 | 10 |
| `rate` | 0.200 | **0.143** |

A card drawing `rateRatio` alone says *your conversion rate fell by 29%*. The
same readers did the same things: the deployment shortened its rollup window, so
the later window loses more conversions to the straddle. The bracket built from
each side's own ceiling is **[0.71, 5.0]** — it contains 1, `rateMoved` is
`false`, and `FunnelChange.undecided` counts how many pairs on a screen are in
that state.

### What else is in it

- **`QuestionMovement`** — what the change did to the question itself. A funnel
  pair is the one thing read here that a *deployment* wrote, and `broken` (both
  ends before, one of them gone now) is a thing to fix in the configuration
  rather than in the page. It is a fact about two trees, so it answers under
  every silence.
- **A silence costs half the reading and never the row.** The door's three
  states withhold every share of the arrivals and leave the rates, the movements
  and the questions standing — a rate is two counts off one row and needs no
  count of who arrived.
- **`funnelPairKey` is published**, because a comparison pairs its rows by the
  same rule a reading deduplicates them by, and what counts as one question is
  what decides what a duplicate is (0158).

## Decisions I took that were not specified

**Four, and the first is the one to disagree with if you are going to.**

**1. Three causes and not four, which is a claim about arithmetic.** 0244 and
0279 both publish *neither alone was enough and the two together were*. I
refused a fourth member here, because a **product**'s two counterfactuals
multiply to the product of its two levels — `(entryNow × rateWas) × (entryWas ×
rateNow) = conversionWas × conversionNow` — so one of them always carries the
movement. A **sum**'s do not, which is why 0244 and 0279 need it. I checked the
proof numerically over 2.68 million combinations before writing it down, and the
suite walks a grid of the two factors and asserts the answer set is exactly
`entry`, `closing`, `either` and nothing. `conversionCauseOf` is published and
total anyway: handed four numbers that are not a funnel's factors it returns
`null` rather than attributing a movement to a side that did not carry it.

**2. The two counterfactual rules were deliberately not merged into one
function.** This cuts against the habit — `counters.ts`, `door.ts`, `passageOf`,
and yesterday's `spokenFor` are all the same move — and I started by making the
shared helper. I deleted it when the proof above landed: they are not two
spellings of one rule, they are two rules, and the fourth outcome is the
difference. A shared function would publish an outcome one caller has to prove
impossible, which is worse than four lines written twice.

**3. `Accepted` rather than `Proposed`, and nothing superseded.** Nothing here
contradicts 0231; it is 0231's figures compared, and the one thing it says about
them that 0231 does not — that a difference of two floors needs an interval — is
what 0231's own `rateAtMost` was published for.

**4. The ranking is by readers and the figure is not people.** `readersMoved` is
the conversion-share movement at the later window's scale, which is 0280's rule
and 0221's. No ratio or difference of two windows' raw counts is published
anywhere on the type.

## Records added

One: **0288**. `pnpm decisions:index` regenerated; `0151`–`0154` and `0278`
still print as holes, which is #647 holding 0278 and the older gaps 0097 allows.
`0283` is on `main` as *a declared ramp step is a maximum* and is also claimed by
#649 — that clash is the merge's to renumber, and nothing in this branch cites
either.

## Findings

**Filed:** one, owned by `Loom portal` — the before-and-after funnel card, with
the four refusals it must not undo (do not draw the ratio without its bracket;
`readersMoved` is not people; a `broken` question is not readers who stopped
buying; do not refuse the row under a silence). It also names the one state
worth a design decision rather than a rule: where a window is `unopened` or
`uncounted` there is no drift to bracket with, so the ratio is given and
`rateMoved` is `null` — a point estimate in exactly the state where the straddle
is least knowable.

**Closed:** none. The two entries this lane filed yesterday are both closed by
#649, which is still open.

## Test numbers

`pnpm verify` **green, exit 0**, on the tree this pull request carries. Nothing
failed, nothing was skipped, and no test was given a longer budget or weakened
to get there.

- **5,200 runtime tests across 229 files**, and **5,879 app tests across 333
  files**. `findings:check` reads 1,218 entries with none malformed;
  `reports:check` 1,855 visuals at 130.7MB with none over budget;
  `prerender:check` 133 pages and 1,840 text junctions, none run together.
- `src/signals` alone: **1,139 tests across 40 files**, all passing.
- The unit itself is **35 tests** in a new file, and the two files it touched
  are unchanged in count but for the silence set: `funnel.test.ts` 48 and
  `silences.test.ts` 49.

**One thing failed on the way and is worth writing down**, because it will
catch the next run that documents a published declaration. The first full
verify went red on `src/documentation.test.ts` — *never makes a decision-record
number part of a published sentence* — with four offences, all mine. The rule
is the maintainer's and the enforcement is exact: a record number may appear in
a **parenthetical citation** and nowhere else, because the site strips the
parenthetical and whatever is left is what a stranger reads. *"which is 0221's
rule"*, *"the error 0158 made permanent"*, *"(0274 says which)"* and *"the
sufficiency rule 0244 and 0279 publish"* all survive that strip and all read as
gibberish to somebody who has never seen this repository. Reworded; the gate is
green and the sentences are better.

**Four planted mutations, each caught**, which is what I checked before
believing the suite:

| mutation | tests that failed |
| --- | --- |
| `rateMoved` reads a bare ratio instead of the bracket | 1 |
| both counterfactuals read the same diagonal | 3 |
| a repeated question is compared twice | 1 |
| a door silence takes the rate with it | 2 |

**The double-count guard this lane owes every counting unit** (0158) is the
third of those. A caller that concatenated two reads of the counters would put
one window's question in the comparison twice and double the readers it moved;
the suite builds that case and asserts the comparison is identical to the honest
one, pair for pair and in `mostGained`, with `duplicated` reporting the row it
dropped.

## Browser cost

**Nothing new runs in a browser.** Measured both sides from a clean
`git archive` of `origin/main` and of this branch: the broadcaster bundles to
**6,477 bytes minified and 2,935 gzipped** on both, and `cmp` reports the two
minified bundles byte-identical. `browser-weight.test.ts` still finds no package
at all in its import graph. `funnel-change.ts` is server-side arithmetic over
counters that already exist, and the one value it imports — `funnelPairKey` — is
in a module no browser bundle reaches.

## Open questions

Nothing blocking. Three with a recommendation each are in the pull request
comment: the three-member cause, the un-merged counterfactual rules, and whether
`rateAtMost`'s whole-page drift is too generous a ceiling to be useful at the
scale of one pair.

## Beside the framework lane

**#649 is this lane's own and was open through this run.** It takes §33, so this
took §34 rather than racing it for the number; it touches
`src/signals/copy.ts`, `copy-change.ts`, `parts.ts` and
`library-word-reach-change.ts`, none of which this branch goes near. The three
files that will collide are the three that always do — `docs/signals.md`
(two sections appended in the same place), `decisions/README.md` (generated,
regenerate rather than resolve) and `FINDINGS.md` (union-merged, so both
appends survive).

**#647 is `Loom daily build`'s** and holds 0278. It does not touch
`src/signals/`, so nothing was raced.

## The door this lane is keeping cheap

Nothing here touches it. Per-reader identity stays deferred and nothing in 0288
makes it dearer to add later: both sides of this comparison are counters already
stored, and an identified batch would arrive with the same two factors and the
same straddle to bound.
