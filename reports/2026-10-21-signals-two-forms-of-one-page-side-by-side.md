# 21 October 2026 — two forms of one page, side by side

**Routine:** `Loom signals` · **Branch:** `signals-44-two-forms-of-one-page-side-by-side` ·
**Section:** §4c

## Before anything was built

Two pull requests open. **#687** is this lane's, from last night, carrying 0301;
it has no maintainer comment and no review comment of any kind, so there was
nothing outranking the plan to address. **#689** is `Loom portal`'s and touches
nothing in `src/signals/`. Nothing was waiting on me.

#687 is **not merged**, which has not happened to this lane before — every
previous run found its predecessor on `main`. That single fact decided what was
built today, and the reasoning is in *The unit I did not build* below rather
than buried, because it is the most useful thing in this report.

Branch cut from `origin/main` at `300f48f` (#688) after `git fetch origin main`,
which moved the clone on from `0b1479e`.

## The plain version

A deployment serving two audiences serves two forms of one page: one tree, one
revision, two sets of counters, and two slightly different pages because each
audience earns its own deltas. Four weeks of this lane's work was about keeping
those two apart — not summed, not picked between by whichever row sorted first,
not compared as though one of them had changed.

**Nothing could hold them against each other on purpose.** Which is the question
a deployment that earned a second form actually has: *do the riders read this
page the way the skiers do, and does each of them get the same page at all?*

It can now.

> half the skiers who arrived reached the pricing band; one rider in ten did

Over one tree at one revision, so nothing about the page moved and the only
thing that differs is who was reading.

## What was built

`formComparisonOf` in `src/signals/forms.ts`, taken as
[0302](../decisions/0302-two-forms-of-one-page-are-compared-at-each-forms-own-share-and-neither-side-is-earlier.md),
and planned as §44 of `docs/signals.md`.

The plan named this reading on 17 October and deliberately left it, with one
instruction: **it must not borrow `changeOf`.** That instruction is the whole
design. There are ten comparisons in `src/signals/` and every one of them varies
the tree and holds the readership still. Hand `readingChangeOf` two forms of one
revision and it produces every stop, every share and every `improvement`, with
no `null` and no silence anywhere on it, labelled as *what your change did*
about a change that did not happen. 0294 refuses that pair — which is why there
was a gap to fill rather than a bug to fix, and why the reading that fills it is
the mirror of the one that refuses it rather than a relaxation of it.

Six things in it were decisions rather than implementation:

**1. It refuses two revisions.** Two forms of a page share a tree *and* a
revision, so a pair spanning two revisions varies the tree as well as the
readership and every figure on it carries both causes with nothing to separate
them. That is the one thing a before-and-after exists to avoid, and this reading
would otherwise have done it silently.

**2. Neither side is earlier, so the order of the arguments does not reach the
answer.** This is the one I would defend hardest. 0224's bargain is that
`readingChangeOf` does not check which reading is older: a caller holding them
backwards gets every sign reversed, and that is deliberate, because it makes
*this week against last week* come out of the same function. **Here the same
bargain would be a defect.** There is no fact of the matter about which of two
populations comes first, so two deployments asking one question would get two
answers and a screen built on one of them would read the sign of every figure
backwards with nothing saying so.

So the two sides are sorted by audience id before anything is read off either of
them, and the answer is identical whichever way round the question is asked —
asserted over a four-part fixture rather than described. The same fact decides
the per-part figure: the difference is **unsigned** (`gap`) and the direction is
a **name** (`favours`), because a sign is read against an order and the order
here is the alphabet of two names the host chose.

**3. The comparable figure is each form's share of its own arrivals.** A
`reached` count is not: two forms are served to two sets of people, so one form
reporting more readers is very often one form having more readers. Measured on
fixtures: a form with a thousand views reaching a band five hundred times and a
form with a hundred views reaching it fifty times come back as a gap of
**nought**, where a comparison of counts would have reported the busier form
reading it five times better.

**4. The content half is stated rather than estimated.** A difference between
two forms has two causes — the deltas changed the page and the people are
different — and nothing in the counters separates them. §20 exists so a
before-and-after can *report* when its readership moved; here that confounder is
permanently true and is not a fault to detect. So `onlyIn` names every part
exactly one form has, each entry naming its form, and `disagreed` names every
shared node the two forms give different primitive types. A part only one form
has is never compared: otherwise a band the other form does not contain reads as
a band that form's readers skipped, which is the most confident wrong sentence
this reading could produce.

**5. Nothing is added up across parts**, and the absence answers two questions
rather than one. A mean over parts counts one reader once per part they got
through, *and* the two forms do not have the same parts, so two such means have
two denominators that are not the same page. Either alone would be enough. What
is published instead is `counted` — *eleven parts read better by the skiers,
three by the riders, four alike, six beyond saying* — and `sharpest`.

**6. It is the eighteenth silence set and the first whose subject is the
readership**, so the first since the eighth to bring three conditions of its own:
`two-revisions` (the third side of what a comparison holds still),
`one-population` (**the only condition in the table about too few of
something** — `two-audiences` turned over), and `no-audience-named`. Three in
one set is unusual and I want to be clear it was not casual: each is a state
only a reading that holds the tree still and varies the audience can be in, and
each has a remedy the other two do not. The *Alternatives considered* section of
0302 argues each one against the condition it looks most like.

The sharpest difference between this reading and a before-and-after is in that
last member and is written down as a decision rather than left as a consequence.
0294 **compares** a pair with an unlabelled side and merely reports that it is
not provably of one readership, because there the audience is a confounder and
refusing it would withhold every comparison spanning the day a deployment
upgraded. Here the same side is **refused**, because the audience is the
subject. Two opposite treatments of one value, deliberately, with the reason on
both.

## Decisions I took that were not specified

- **`one-population` is a refusal and not an empty answer.** A caller handing in
  one audience twice is holding a before-and-after, and the condition says so
  rather than returning a comparison of a thing with itself.
- **A shared node whose type the two forms disagree on stays in the comparison**
  and is named in `disagreed`, which is how `LibraryReading.roleDisagreed`
  treats the same shape. The two reaches are each their own form's and stay
  comparable; what would otherwise be silent is that the two sides are not
  showing the same thing.
- **`nothing-measured` publishes the census.** It is the only member of this set
  that withholds half a reading rather than all of it, which is how
  `CopyChangeSilence` already spells the same state: what the two forms hold is
  a fact about the two composed trees and survives a window nobody read.
- **No top-level `treeId` or `revision` on the reading**, where every other
  reading in this subsystem has one. This is a reading of two sides, and the two
  refusals that matter most are exactly the two where picking one side's would
  be picking one of two different answers. Each side carries its own.
- **I did not number this 0301.** `main` carries 0300 and #687 holds 0301, and
  two records sharing a number is fatal (0097). 0300 did the same thing eight
  days ago for the same reason, so this follows its precedent and says so in a
  note at the top of the record. Nothing in 0302 cites or depends on 0301.

## The unit I did not build, and why that is the useful part of this report

The obvious next unit was not this. **0301 left three comparisons behind** —
`copyChangeOf`, `paceChangeOf` and `actionChangeOf` — and they still publish
`nothing-measured`, *one of the two windows held no page views*, where one side
was a window of two forms read as neither. Both forms were measured. It is the
same false claim about readers that 0301 removed from two readings, in the three
it did not reach, and the fix is one guard each taken from `funnel-change.ts`
verbatim.

**It is blocked, and the blocker is exactly one thing.** `copy-change` is one of
the five silence sets that predate the arrival table in `silences.test.ts`, and
`pace-change` and `action-change` both arrive in that table *before*
`funnel-change`. So any of the three adopting `two-forms-unsplit` makes
`funnel-change`'s declaration of it stop being novel, and the provenance fold
reports that no set ever brought it — the exact deletion that test's own note
says it exists to prevent. #687 fixes that generally rather than for its own
case, and **with it on `main` the unit needs no further change to
`silences.test.ts` at all.**

The alternative was to write that same fix a second time, in the same lines, on
a branch that cannot be stacked on #687 — which would have handed the merge a
conflict in the one file both changes rewrite. That is the situation 0300 was in
with `pageViewsFor` eight days ago, and it took the same decision. So the unit
is filed with its design, its confirmation and its single blocker, to be taken
on the first run after #687 lands.

**What I built instead was not a consolation.** §44 was the next unbuilt item in
the plan's own words and had been waiting four days; it touches none of #687's
files in `src/signals/`.

## Real test numbers

`pnpm install && pnpm verify` — **green**. 234 test files, 5,514 tests, nothing
skipped. `src/signals/` alone: 43 files, 1,383 tests. `forms.test.ts` is 25
tests.

Two things failed on the way and both were mine:

- `pnpm typecheck` rejected `readonly readonly [A, B][]` in the test file.
  Corrected to a readonly array of readonly tuples.
- `src/documentation.test.ts` found two published sentences with a
  decision-record number in them — one in `forms.ts`, one in `silences.ts`. The
  maintainer's rule is that a number never reaches a page, and an *indented*
  doc comment is published whole, so a markdown link to a record inside one puts
  the number in a sentence where a left-margin comment's second paragraph would
  not. Both rewritten as parentheticals. **This is the second thing I have
  learned about that test by failing it**, and the rule worth carrying is: in an
  indented doc comment, cite as `(0300)` and never as a link.

### The planted mutations

Five, each reverted after measuring, because a test that cannot fail is
documentation:

| what I broke | tests that failed |
| --- | --- |
| dropped the canonical ordering of the two sides | **8** |
| swapped `unsplit` and `unattributed` | **5** |
| dropped `spokenFor` from the gap rule | **1** |
| moved the revision guard ahead of the population guards | **2** |
| let the second pass re-file parts both forms have | **4** |

The third one is the one worth reporting. **It was a survivor until I added a
test for it**, and the reason is instructive: the gap rule withholds a
difference where either side held no views *or* either side's standing is
`unknown`, and every fixture I had written reached the first clause only. The
second clause needs a window that **held readers** and has a row for the band
whose reach is nought — a press delegated to a band no `viewed` ever named,
which is the 0282 state. Nobody writes that window by accident.

That is the third day running that the thing a mutation found was a test I had
not written rather than a line of code. Yesterday's note was *a guard ordering
is a decision only if a single input can reach both guards*; the one this adds
is **a disjunction in a guard needs a fixture per branch, and the branch nobody
writes by hand is the one that will survive.**

The fourth and fifth rows are the ordering and double-counting cases the
standards ask for by name. The two orderings this reading claims are both real —
a pair can be of two revisions *and* have no second population, and a pair can
have one unlabelled side and one unsplit one — and the fixtures reach both
guards in each case, which is what makes them decisions rather than sentences.

## Nothing reaches a reader

No payload field, no browser code, no column, no store, no new kind.
`broadcast.ts` is **byte-identical** to `main` — its bundle and `main`'s compare
equal byte for byte — and measures **6,390 bytes minified** (esbuild, bundled,
browser platform). That is not the 6,477 of yesterday's report and nothing here
caused the difference: #686 landed a line in `broadcast.ts` and 35 in
`deliver.ts` since that measurement.

Rule 4's budget is untouched and `browser-weight.test.ts` passes. The
thirty-third thing taken out of what this subsystem already knows rather than
collected.

**Nothing here makes per-reader identity cheaper or dearer to add later.** Every
figure is a share of one audience's own arrivals over a window the store already
keeps per audience, and an `aud_` stays an opaque name for a predicate the host
wrote and Loom never sees. There is no reader in this reading at any point —
only two populations, each counted as a floor on page views.

## Another lane's branch in the signal path

**#689**, `Loom portal`'s, touches nothing under `src/signals/` or
`apps/loom/app/_lib/reader-signals/`, so there is nothing to race. Worth noting
for the next run that **#686 and #688 both landed inside this lane's files** —
`src/signals/broadcast.ts`, `deliver.ts`, `intake.ts` and
`apps/loom/app/_lib/reader-signals/keys.ts` — while this lane was asleep. That
is the project-key work and it is the maintainer's own; it is not a collision,
but it means `broadcast.ts` is no longer only this lane's to measure.

## Findings

Three filed, none closed.

- **the three comparisons 0301 did not reach**, owned by this lane, with the
  design, the confirmation and the single blocker above.
- **the same form comparison of a part's words and of what readers did inside
  it**, owned by this lane. It is this join at a different counter and no
  decision at all: every clause of 0302 is about the pair rather than the
  counter and carries over unchanged. Filed rather than built because three
  readings of one shape in one unit is how a rule comes to be spelled three
  times and agreed with by two of them.
- **no screen reads a form comparison**, owned by `Loom portal`, with the three
  things on it a card has to decide about and the two that are traps: the
  direction is a name and not a sign, and `onlyIn` is not a skipped part.

## Open questions

Three, each with a recommendation, none blocking. They are in the pull request
comment.

## Known conflicts for the merge

Said plainly because #687 is still open and this is the first time this lane has
had two branches in flight.

- **`docs/signals.md`** — both branches insert a new section immediately before
  *Still not in scope*. #687 adds §43 and this adds §44, so the numbering is
  already right and the conflict, if git takes one, is two appends at one anchor.
- **`decisions/README.md`** and the generated API reference — regenerated by
  `pnpm decisions:index` and the app's own verify, never hand-resolved.
- **`FINDINGS.md`** — union-merged; appended to and never reflowed.
- **`src/signals/silences.ts` and `silences.test.ts`** — both branches touch
  these, in different functions and different hunks separated by unchanged
  lines. The one adjacency is my new row at the end of the arrival table in
  `silences.test.ts`, three unchanged lines above where #687's first hunk starts.
- **Nothing else overlaps.** #687's `change.ts`, `progress.ts`,
  `deployment.ts`, `deployment-change.ts`, `page-views.ts` and `funnel.test.ts`
  are all untouched here.

Preview: the branch deployment is linked on the pull request. Nothing here draws
a screen, so it is the branch deployed rather than something to look at.
