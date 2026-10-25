# 23 October 2026 (evening) — a distance that is not there, and a refusal that is not a silence

**Routine:** `Loom signals` · **Branch:**
`signals-50-a-comparison-of-two-populations-is-not-a-window-nobody-read`
(#700) · **Section:** §50

## Before anything was built

**One pull request open**, #694 — the maintainer's own, sign-up, sign-in and
password reset. It touches nothing under `src/signals/` or
`apps/loom/app/_lib/reader-signals/`. The framework lane has no branch open at
all, so there was nothing to race on the signal path. This lane's #697 has
merged and `main` is at `3547af0`, with 0305 and 0306 on it.

**No maintainer comment anywhere**, on #694 or anywhere else, and no review
comment of any kind. So nothing outranked the queue.

**Branched fresh off `origin/main`.** Nothing was merged in and there was no
conflict anywhere in the run.

**What the queue said.** Ten open findings this lane owns. The two picked are
the two newest and the two the last run named as what was left: the
`weightMovedOver` nought filed last night, which the entry itself said needed
*one run to establish which of two things it is*, and the `different-audiences`
standing, open since 20 October.

## The plain version

Both halves of this run are **an absence wearing a measurement's clothes**,
which is the third run in a row on that theme.

A library roll says how far the weights behind its weighted mean moved. Where a
side had no weight at all it said **nought**, which is the one value a card
reads as *the weights did not move*. There is no distance between a mix and
nothing. It now withholds the figure.

The deployment change order refuses a comparison whose two windows are of two
different audiences, and files that refusal under the standing `unread`, whose
sentence is *one of the two windows reported no view of its revision*. Both its
windows reported plenty. **That one is not fixed**, because fixing it reverses a
clause of an accepted record; it is written up as a proposal and what could be
built around it was built.

## The unit that was taken — 0307

[0307](../decisions/0307-a-distance-between-a-mix-and-nothing-is-withheld-and-the-invariant-both-rolls-rest-on-is-asserted.md),
in `weightMovedOver` in
[`library-reach-change.ts`](../src/signals/library-reach-change.ts), which is
the helper both library rolls take this figure from.

**The finding offered two possibilities and it was both of them.**

It said the clause was either *reachable, and a card reads the wrong sentence*
or *unreachable, and is a clause nothing can falsify* (0231). Traced from both
callers, it is **unreachable**: `doorOf` returns a silence unless the row has
both openings and appearances, so a door that can scale a page has counted at
least one page view at it; a row is measured only where every comparable place's
two doors could scale it; and a measured row has at least one comparable place.
The word roll already states that invariant in prose — *a spoken passage with no
door reason has a weight behind it* — as the sentence four quotients rest on,
and nothing checked it.

**And the nought was wrong anyway**, for the one caller that can reach it, which
is a caller outside this repository. `weightMovedOver` is exported from
`@jam-overture/loom/signals` and is in the generated API reference.

So the fix is **neither** of the two the entry proposed on its own:

- The helper returns `number | null` and **withholds** where either side has no
  weight. This is what 0247's own reading — the arithmetic this one is borrowed
  from — already does: `readershipChangeOf` withholds `moved` where either
  window has no views.
- **The clause stays** rather than being deleted. Deleting it would divide by
  nought and publish `NaN`, which is worse than either a nought or a `null`
  because it survives arithmetic silently.
- **The invariant is asserted**, by a row-walk over real readings that holds
  `weightMoved === null` exactly where `silence !== null`, with both halves of
  the implication required to be reachable in the fixture so the walk cannot
  pass vacuously.
- **The helper gets a suite of its own**, which it never had: weighted alike,
  no weight in common, the halving, and the three ways a side can have no
  weight.

**No published field changed shape.** Both `weightMoved` fields were already
`number | null`, withheld with the rest of their row, so every surface sees what
it saw.

## The unit that was not taken — 0308, proposed

The deployment change order maps the comparison silence `different-audiences`
to the standing `unread`, and the silences table maps that standing to the
condition `no-view-reported` — *nothing reported a view of it*.

**0301 decided that mapping explicitly**, in the same record that took
`audiences-mixed` out of the same bucket:

> `different-audiences` and `nothing-measured` go on sharing `unread`: those two
> are both *there was nothing to compare on one side*, and the cause travels on
> the row for a surface that wants to say which.

Changing it reverses a clause of an accepted record, which the governance calls
**architectural — needs review**. So
[0308](../decisions/0308-a-comparison-of-two-populations-is-not-a-window-nobody-read.md)
is written `Proposed`, nothing is superseded, and the change is not built.

**What the run added that the finding did not have is the measured version of
the sentence.** On fixtures now in the suite: a page served to skiers in the
earlier window and to riders in the later one stands in `standings.unread` with
**a hundred views on each floor** and **two hundred arrivals** at the later
form's own door. Every figure on the row contradicts the standing over it. That
is the shape 0301 removed one cause of and left this one behind.

**And the condition it wants already exists.** `two-audiences` — *the two
readings are of different audiences, and so of different readers* — is brought
by the before-and-after reading. So the silences table would gain nothing,
exactly as 0301's three new members gained nothing. The proposal is one member
on two unions and one line in a switch.

**What was built in its place**, none of which depends on the proposal:

- **Two fixtures** standing the two kinds of nothing side by side, asserting
  that both land in `unread` and that only `silence` tells them apart. 0301
  promised that the cause travels on the row and nothing checked it; it is
  checked now, and the day 0308 is accepted there is a test that says what
  moved.
- **A note on the `unread` member and on `standingFor`**, saying the standing
  covers two comparison silences and that the sentence it carries is true of one
  of them.

## Decisions I took that were not specified

- **I called the second half architectural rather than building it.** The
  finding of 20 October framed it as a judgement about what a screen should
  group, which would have made it this lane's to take. Reading 0301 in full, it
  is not: the mapping is in that record's Decision section with an argument
  behind it, and reversing it inside a pull request is the thing the governance
  names. The cost of being wrong in that direction is a run; the cost of being
  wrong the other way is a reversed decision nobody reviewed.
- **The clause stays rather than being deleted, although it is unreachable.**
  Unreachable from the two rolls is not unreachable from the package's own
  consumers, and the value a deleted guard would publish is `NaN`.
- **No tagged absence, where 0306 took one.** There is exactly one reason this
  figure is absent and the row's own `silence` names it. 0306's argument was
  that a surface could **not** derive the reason from the two sides; here it
  can, which is the test for whether a tag earns its place.
- **I dropped a three-line note from `KindReachChange.weightMoved`.** It said
  what 0307 says, on a type whose published signature is already cut short. The
  generated reference went from showing a reader 132 of 142 lines to **127 of
  146** — nine lines of somebody else's documentation off the page to restate an
  invariant that is in the helper's own entry and in a test. Measured, reverted,
  and the reference is back to 132 of 142. The same note on the word roll's
  `ReaderWords` costs nothing, because that signature is not cut, and it stayed.
- **I numbered them 0307 and 0308.** `main` carries up to 0306 and nothing is
  open on a branch, so those are the two next free.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit code 0** through every stage:
build, typecheck, the root suite, `findings:check`, `reports:check`, the app's
own verify and `prerender:check`. Nothing skipped, nothing weakened.

| suite | files | tests |
| --- | --- | --- |
| root (`vitest run`) | 237 | **5,665** |
| the app's own | 351 | **6,274** |
| `src/signals/` alone | 46 | **1,534** |

The suites that moved: `library-reach-change.test.ts` 35 → **42**, and
`deployment-change.test.ts` 31 → **33**. Everything else passed untouched, and
no silence set gained a condition.

**One red on the way, and it was mine rather than a surprise.**
`src/documentation.test.ts` failed on *never makes a decision-record number part
of a published sentence*: the note added to the `unread` member cited 0308 as a
markdown link, and a link makes the number part of the grammar where a
parenthetical does not. It is an indented comment, so the whole of it is
published rather than its first paragraph. Rewritten as `(0308)` and green.

### The planted mutations

Seven, each reverted after measuring, over the three suites together (105
tests).

| what I broke | tests that failed |
| --- | --- |
| the withheld distance returned as a nought | **3** |
| the guard deleted, so a side with no weight divides | **3** |
| the halving dropped | **4** |
| the absolute value dropped, so two places cancel | **4** |
| the distance computed on a withheld row | **1** |
| two populations filed as two pages | **1** |
| the comparison's own cause dropped from the row | **4** |

**No survivors — on the second sweep.** The fifth row survived the first one,
and it is the row worth reading. The fixture the invariant walk first used had
withheld rows with **no weight on either side**, so taking the row's own guard
away changed nothing: the helper withheld the figure regardless, and the walk
could not tell the two guards apart. The fixture now builds the state that
separates them — a kind standing on two pages, one of which the earlier
window's door cannot scale, so its row is withheld **while carrying the other
page's weight**. That is also the honest answer to *is the clause reachable*: it
is not, and the only reason the walk is not vacuous is that this state exists
beside it.

The first two rows are the two directions of the correction, and each is caught
by its own cases rather than both by one: returning a nought fails the three
withholding cases, and deleting the clause fails the same three with `NaN`.

## Nothing reaches a reader

No payload field, no browser code, no column, no store, no new kind and no new
member of any closed set reachable from a batch. `broadcast.ts` is
**byte-identical to `origin/main`** and measures **6,513 bytes minified**
(esbuild, bundled, browser platform, ESM) — the same figure as the last two
runs. The helper and the order both reach packages and sit outside the
broadcaster's import graph, and `browser-weight.test.ts` passes.

This is the thirty-eighth thing taken out of what this subsystem already knows
rather than collected, and the third in a row that **publishes less ambiguity**
rather than deriving a figure.

**Nothing here makes per-reader identity cheaper or dearer to add later.** Every
weight in 0307 is a count of page views at a door; 0308 is about which audience
a host's own column named, which Loom never sees a person behind.

## Findings

One closed, one answered with a proposal, none filed.

- **closed:** *a distance of nought where there is no distance* — closed by
  0307, with the correction written into the entry that it was **both** of the
  two things it offered, so the fix is neither of the two it proposed.
- **answered, still open:** *the change order maps `different-audiences` to
  `unread`* — put to the maintainer as 0308, `Proposed`. The entry's status
  carries what the run established and what was built around it.

## Open questions

Two, both with a recommendation, neither blocking, both in the pull request
comment. The one now open **five runs** is *nothing draws any of this*, and the
routine that would is paused.

## What the merge has to deal with

One branch, two units on it, based on `origin/main` at `3547af0`. Nothing was
merged in and there was no conflict anywhere in the run. `decisions/README.md`
and the generated API reference were **regenerated** rather than hand-resolved.
`FINDINGS.md` was appended to, and the two lines changed inside it are the
statuses of this lane's own entries of 20 and 22 October.

Preview:
<https://loom-git-signals-50-a-compar-307c71-jpizzolato36-6341s-projects.vercel.app>
— the branch alias, quoted from Vercel's own comment on #700 rather than
checked from here, because this session's egress policy refuses that host.

Nothing in either unit draws a screen, so it is the branch deployed rather than
something to look at.
