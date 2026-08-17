# 2026-08-17 — where the grade was wrong

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-03-calibration` (→ `main`).

Visual: [the calibration page, with the misses under the table](2026-08-17-portal-where-the-grade-was-wrong.png).

---

## Where this run started

`main` at `4fb172e`. **No open pull request of mine** — #85 is the primitives
routine's and #86 the lessons routine's, and neither touches `apps/portal`. I
read the comments on #80, my last merged PR: the only ones are Vercel's bot and
my own two. **No maintainer comment was outstanding on my lane**, so the plan
decided the work.

Branched with `git fetch origin main && git checkout -b … origin/main`, which is
the finding I filed on 16 August rather than the procedure's current wording. It
mattered again: the local `main` ref was four merges stale a second time.

**This is the unit the previous run recommended and the brief prefers.** #80's
comment said *"the calibration page over real judgements, then history"*; the
corrected brief ranks calibration first for the same reason — it is where Loom's
data is least substitutable.

## What I found before building, which changed the unit

**The calibration page already exists**, and it is good. It reads
`calibrationOf(episodesOf(records))` through the public telemetry exports as 0031
requires, draws ten confidence bands with the observed rate against the mean
claim, splits by the policy that judged each claim, keeps the unjudged out of the
denominator, and has a genuinely considered empty state.

So the honest question was not "build calibration" but **"what does that page
still not tell anyone?"** — which is the brief's bar applied to a surface that
already exists.

The answer is in the type. `CalibrationScore` is `judged`, `survived`,
`observedRate`, `meanConfidence`, `gap`. **A fold's job is to lose identity**,
and this one does it thoroughly: not one field on the report can name a claim.
The page can say *the 90–100% band delivered 50%* and cannot say which four
claims that was, what they were trying to do, or what refused them. Those are the
only facts a reader can act on, and they were being computed and discarded on
every request.

## What shipped

**The claims the table counts, and could not show.**

`lib/calibration-misses.ts` reads the same fold the report reads and keeps the
half the report throws away. The page now folds the records once and hands the
result to both, which is what makes the two views incapable of describing
different windows.

### What counts as a miss

A confidence is a stated probability of surviving, so a claim's error is measured
against its own outcome: **`surprise` is `confidence` when the change was refused
and `1 - confidence` when it survived.** A 0.95 that was refused was 0.95 wrong; a
0.2 that survived was 0.8 wrong.

A claim is a **miss** when that exceeds **0.5** — where the outcome stops being
what the claim predicted and starts contradicting it. That threshold needs no
tuning and no defending beyond the meaning of the number, which is why it is the
one used. A 0.3 that was refused is the model being roughly right and is not
listed.

The exclusions are the report's, deliberately rather than coincidentally: a
runtime-authored proposal carries a confidence nobody graded (0032 stamps the
inverse behind a revert with 1), and an unjudged proposal has no outcome to
contradict. A test asserts the misses are a subset of what the report judged.

### Grouped by what caught them

The useful sentence is never "the model is overconfident". It is **"the model is
overconfident about changes it cannot undo, three times, at a mean claim of
91%"** — a class of change, and the rule that keeps catching it. So the misses
are grouped by cause, largest group first, and each group heading is a sentence
about the model rather than a translation of the reason code. `irreversible`
repeated nine times is a `GROUP BY` with a title; *"sure about a change that could
not be undone"* is a finding.

**A discard is credited to the human, not to the rule that caused the hold.** This
is the one ordering decision in the file and it is load-bearing: a discarded
proposal carries a disposition too — the Gate held it, which is how a person saw
it at all — so reading the reason code first would file every discard under
whichever rule caused the hold. 0031 calls the human discard the highest-value
signal in the journal, and it is the only judgment on the page that no policy
change would have produced.

### The reading that contradicts the table beside it

`contradictedBands` is the part I would defend hardest.

A band's gap is an average, and an average can sit exactly where the model said
it would while claims underneath it went the way their own confidence said they
would not. Three claims of 0.65, two surviving: the band observes 67% against a
mean claim of 65%, the row says **"on the mark"**, and it is telling the truth —
and one of those three was a change the model was 65% sure of that the Gate
refused.

The row is right about the band and says nothing about the claims in it. That
distinction is one nobody makes while reading a calibration table, and naming the
bands where the two readings disagree is the only way a reader finds out. It is
in the screenshot: the 60–<70% row looks healthy, and the notice above the groups
says it holds a missed claim.

`isOnTheMark` was extracted from `readGap` rather than duplicated, so the table
and the misses cannot disagree about which bands are settled — a disagreement
that would be invisible from either side.

### Also on a row

A repair chain, in the direction the reader is reading. `repairOf` points
backwards, so the successor is only reachable by reading the whole window first —
a claim cannot see its own retry. 0031 says the refusal that prompted a repair is
precisely the case where the grade was wrong, so a lone refused 0.9 and a refused
0.9 the model was handed back are different stories and the page tells them apart.

The rationale is the row's body rather than a detail under a fold, because it is
the only thing that says what *kind* of change this was — and the pattern a reader
is looking for is in the sentences, not the ids. The Gate's own sentence is kept
verbatim; a discard gets none, because it has no rule behind it to borrow one from.

## Tests

**38 new tests. The portal was at 484 and is at 522** across 50 files.
Runtime: **1241 passing** across 89 files, untouched by this diff.
`pnpm install && pnpm verify` green — typecheck, both suites, `next build`.
Nothing weakened or skipped.

| file | what it pins |
| --- | --- |
| `lib/calibration-misses.test.ts` (23) | surprise measured against the claim's own outcome; the threshold, including a claim sitting exactly on it; runtime-authored and unjudged claims dropped exactly as the report drops them; misses a subset of what the report judged; ranking by wrongness then recency; a discard credited to the human over the hold's rule; a discard given no rule detail; repair links resolved in both directions; grouping, ordering and the group mean; a band whose rate agrees while a claim inside it does not; a claim of exactly 1 landing in the closed top band |
| `app/calibration/_components/missed-claims.test.tsx` (11) | the rationale reaches the DOM; the claim, the verdict and the distance are all shown; the underconfident case reads as its own thing rather than as a refusal; the group heading is a sentence and not the code; the discard is distinguishable; the Gate's sentence is verbatim; both directions of a repair; the contradicted-band warning appears and, when no band is contradicted, does not; singular and plural counts |
| `lib/calibration-view.test.ts` (+4) | `isOnTheMark` agreeing with the label a reader is shown; every cause having a label and a note, and none of them being the bare code |

One test failed while I was writing it and the failure was mine, not the code's:
my first contradicted-band fixture put the two claims in *different* bands, where
nothing cancels. The cancellation happens *within* a band, which is what the
corrected fixture shows. The component's copy said "misses in opposite directions
cancel" on the strength of the same misunderstanding and is now accurate.

## What this tells a developer that they could not get elsewhere

The bar, answered for this unit:

- **Which claims were wrong, and what they were trying to do.** **Yes, and it
  exists nowhere else.** A refused proposal is by definition the change that has
  no commit and never will; there is nothing in the repository, in `git log` or in
  a build log that has ever seen it. The self-graded confidence beside it exists
  only because 0007 put it there.
- **What the model is *specifically* overconfident about.** **Yes.** The grouping
  turns a rate into a named class of change with the rule that keeps catching it.
  A host reading "sure about a change that could not be undone, 3×, mean claim
  91%" can act on it — tighten the model's brief, or move the floor, and 0031 says
  that decision is theirs.
- **A band that reads as calibrated and is not.** **Yes, and it is the one a
  careful reader cannot reach by looking harder** — the row's own numbers are
  correct, and the thing they conceal is not recoverable from them.
- **The human discard.** **Yes**, and it is the only signal here made from outside
  the system, which 0031 argues at length and nothing else in the ecosystem
  records at all.
- **The dates, the ids, the layout.** Craft. Not claimed as insight.

## What I did not do

- **History**, the third of the brief's three. Its own unit, and still the one
  most at risk of restating what a revision already shows.
- **The `data-unavailable` diagnostic** the framework routine's data-seam finding
  offers the portal. Still open, still unurgent, not this unit.
- **No decision record.** Nothing here touches the tree schema, the delta model or
  an Accepted record. 0018 holds — every type and function came from
  `@loom/runtime` and `@loom/runtime/telemetry` root entry points, no deep import
  was wanted. 0019 holds — this makes a judgment more reviewable and adds no way
  to author a change. 0031 holds, and pointedly: this computes and returns, and
  nothing in the runtime consults it.
- **`src/` is untouched.**

## Recommendations

1. **The screenshot is of a fixture, and that is a gap worth closing.**
   `/calibration` requires an actor, the demo's event sink is a per-request array
   rather than the telemetry journal, and preview deployments are protected — so
   there is no path by which you or I can look at this page with real data
   without a database and a signed-in session. I rendered the real components
   against a fixture fold and said so. Filed as a finding: the demo could feed the
   journal, which would make every telemetry surface demonstrable at once.
2. **Nothing blocking.** The two open findings I own from earlier runs (the
   stale-`main` branching wording, the private-repository image problem) are
   yours and unchanged.
3. **Next from me, unless you redirect me: history.** It is the last of the
   brief's three and it needs a sharper idea than "list the revisions" — the one
   I would build against is what a revision's *inverse* would undo, which is a
   fact the log holds and never shows.
