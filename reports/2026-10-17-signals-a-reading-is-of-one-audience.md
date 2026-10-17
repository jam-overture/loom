# Reader signals — a reading is of one audience

**Routine:** `Loom signals` · **Date:** 2026-10-17 (morning run) · **Branch:**
`signals-36-a-reading-is-of-one-audience` · **Section:** §36 of
[`docs/signals.md`](../docs/signals.md)

## What I completed

Not a new question this time — a wrong answer.
[0290](../decisions/0290-a-reading-is-of-one-audience-and-two-forms-of-a-page-are-two-readings-rather-than-one-handed-in-twice.md),
`readingKeyOf` and `byAudience` in
[`src/signals/audiences.ts`](../src/signals/audiences.ts), with the audience
carried on a reading and matched in the three joins that pick a page's rows out
of a window.

Two days ago [0284](../decisions/0284-a-signal-names-the-audience-it-was-collected-under-and-the-predicate-stays-in-the-control-plane.md)
put the audience on all five reader tables so that two forms of one page — a
base tree plus the deltas an audience earns, per
[0263](../decisions/0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md)
— could be told apart. Its own consequences said the portal must not collapse
the dimension, and that no screen reads it yet.

**The collapse was already five levels below any screen.** Two forms of a page
share a tree **and** a revision, which is exactly the key every reading in this
subsystem identified a page by. So the first deployment to serve a second form
of a page would have got, with nothing visible to anybody:

- the second form's counters dropped as **the first form's node handed in
  twice** — `duplicated`, the one condition
  [0158](../decisions/0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)
  makes permanent — and `health.ts` publishing `rows-mishandled`, whose remedy
  is **`caller`**. The loudest fault this subsystem has would have fired on
  every page of a deployment doing exactly what 0263 built, and told it its own
  surface was at fault;
- a rate that could be one form's `reached` over the **other** form's `opened`,
  with the pairing decided by the caller's array order, so two screens reading
  one store could disagree and neither could tell;
- each funnel question's second answer dropped as the same question asked twice;
- the second form's bucket for a country dropped out of the region map as the
  first form's bucket handed in twice — the quietest of the four and the one
  whose counts are running totals rather than a window's, so one form's
  readership was published as the page's and the readership comparison of §20
  would have been comparing neither form with itself;
- the second form missing from the order over a deployment's pages and from all
  three censuses of its library — in no order, no standing and no arrival count.

So this is the reading of a column that was already there. **Nothing was added
to a payload, a browser, a column, a store or the vocabulary of kinds**, and it
is the twenty-sixth thing taken out of what this subsystem already knows rather
than collected.

### The three things that decided the shape

**What counts as one page is published once, because what counts as one page is
what decides what a duplicate is.** Five readings refuse to count a page twice —
the health of a collection, the order over a deployment's pages, and the
censuses of a library by placement, by reach and by action — each in its own
loop, each on a tree and a revision. They now import `readingKeyOf`. That is
the lesson `counters.ts` already holds for the store keys and `funnelPairKey`
holds for the funnel pairing, applied in the one place where getting it wrong is
0158-permanent: a count that has been added cannot be unadded, and one that was
**never** added cannot be noticed.

**A window holding two audiences with none asked for is read as neither.** The
three available answers were summing two populations, which is the failure 0284
names and which produces a number that looks right forever; picking one by row
order, which is what the code did; and refusing. `pageReadingOf` refuses: the
reading names both audiences it was handed, every part is `unknown`, and a
**seventh collection fault** — `audiences-mixed` — says it was the caller and
says the remedy is to split, rather than sending anybody looking for a bad row.

**A window naming one audience needs no caller to say so, and a window naming
none is not `aud_everyone`.** *Nothing here says* is a third state and is kept
as one. `aud_everyone` would be an assertion: true of every row written before
the migration, false of a deployment serving only `aud_pro`, where defaulting to
it would turn a correct reading into a page with no door row and a
`door-unscaled` fault. So a window whose rows never carried the column reads
exactly as it always did, and a window naming one audience is read as that
audience's without being asked.

## Decisions I took that were not specified

**I treated this as a correctness unit rather than building the audience
comparison.** The queue in my prompt points at interpretation, and the obvious
interpretation here is *which form of this page reads better*. I did not build
it, because it would have been built on readings that were wrong: the comparison
takes two readings of one tree at one revision, and until this change neither of
them could be taken. The comparison is now expressible and is one record away.

**I made the refusal a behaviour change rather than a warning beside the old
number.** A caller that hands in a mixed window now loses its reading instead of
getting one of the two forms. That is safe to do today precisely because 0284
says no screen reads the dimension yet, and the alternative was to keep shipping
a plausible number with a fault beside it that most readers of a screen would
never join up.

**I put the audience on `PageReading` and `ReadingProgress` and nowhere else.**
Those two are joined to door rows or used as a key. `PageCopy`, `PagePace`,
`PageAction` and the rest are read off a reading that already named its
audience, and a field they cannot be joined by is a field they cannot be joined
by wrongly. Adding it everywhere for symmetry would be five more places for it
to be set wrong.

**I widened `RevisionOf` rather than adding a second matcher.** `pageViewsFor`
takes the audience on the thing it is asked about, where `null` and absent both
mean *this caller did not say* — so every existing call site is unchanged and
`PageReading` scopes itself by carrying the field.

## Records added

[0290](../decisions/0290-a-reading-is-of-one-audience-and-two-forms-of-a-page-are-two-readings-rather-than-one-handed-in-twice.md),
Accepted. **Nothing is superseded**; 0284 and 0263 are both unchanged and both
right. Its *Alternatives considered* carries the one thing I want on the record
for whoever builds the comparison: that a change comparison's arithmetic is
right for an audience comparison and its **sentence is wrong**. A
before-and-after holds the readership still and varies the tree, which is why
§20's readership reading exists to check it; an audience comparison varies the
readership by construction and holds the tree still, so the confounder §20
detects is permanently true and the movement carries two causes — the form the
host served and the people it served it to — that nothing in these counters
separates. A function whose fields are `was` and `now` would print *your change
did this* over a difference between two groups of readers.

**The number may move.** `main` carries 0289 and #659 holds a second 0289
awaiting merge, so this took the next number free on `main` as the governance
says. A renumbering changes nothing here but the number.

## Findings filed or closed

- **Closed, filed and fixed in the same run:** *every reading of the counters
  was audience-blind, and the first deployment to serve two forms of a page
  would have been told its surface was at fault.* Written down rather than
  quietly fixed because it is a published **verdict** that was wrong, not a
  figure that was thin — and because the lesson generalises: a dimension added
  to a schema is not added to a subsystem. 0284's consequences named the portal
  as the thing that must not collapse the dimension, and the collapse was
  already in the readings the portal would have been reading. The next dimension
  to land on these tables should be checked against every place that keys a
  page, not against the surfaces that draw one.
- **Filed for `Loom portal`:** *every screen that reads these counters now has a
  dimension on it, and two of its rows are one page in two forms.* It covers
  splitting with `byAudience`, the two rows that share a tree and a revision,
  that `audiences-mixed` means the surface rather than the deployment, that
  `otherAudience` is not a fault, and that an `aud_` is opaque so a screen can
  show the id and nothing more.

## Test numbers

`pnpm verify` **green, exit 0**: 5,302 runtime tests across 232 files and 5,938
app tests across 335 files. `src/signals` alone is 1,181 tests across 41 files,
up from 1,148 across 40. The new file is 13 tests; 20 more are in `parts`,
`funnel`, `health`, `deployment`, `library` and `region`.

**Five planted mutations, each caught:**

| mutation | caught by |
| --- | --- |
| `readingKeyOf` without the audience | 6 tests across `audiences`, `health`, `deployment`, `library` |
| a mixed window reads the first audience instead of neither | 2 tests in `parts` and `health` |
| `pageViewsFor` drops the audience filter | 3 tests in `funnel` and `health` |
| `funnelReachOf` drops the audience filter on the funnel rows | 1 test in `funnel` |
| `regionReadingFor` drops the audience filter on the region rows | 1 test in `region` |

**The double-count guard, which is the one that had to survive this change.**
Narrowing `duplicated` to *the same row of the same form* is exactly the kind of
narrowing that can quietly stop catching a real double count, so the cases are
asserted on both sides in four places: one audience's two rows for a node are
still `duplicated` with the first standing and `otherAudience` nought
(`parts`); one audience's two answers to a funnel pair are still
`duplicatedPairs` (`funnel`); one audience's region handed in twice is still a
bucket dropped (`region`); and a revision handed in twice is still dropped from
the health reading while two **forms** of it are two rows.

**Two things went red on the way and are worth knowing about.** The first
`pnpm verify` failed on `src/documentation.test.ts` — a decision-record number
in a published doc comment has to sit inside a parenthetical that lifts out, and
five of mine were part of the sentence (*"told apart by the column 0284 added"*
rather than *"told apart by one column (0284)"*). Vitest does not typecheck, so
the second red was `pnpm typecheck` on my own new test file: a type whose every
property is optional is a weak type, so an inline `{ at: 1 }` is rejected
against it even though it is structurally fine. Both are mine and both are
fixed; the first is a rule this lane will meet again every time it cites a
record in a doc comment.

## Browser cost

**Nothing new runs in a browser.** Measured from a clean `git archive` of
`origin/main` and of this tree, bundled with `esbuild --bundle --minify
--format=esm --platform=browser` from `src/signals/broadcast.ts`:

| | minified | gzipped |
| --- | --- | --- |
| `origin/main` | 6,477 bytes | 2,935 bytes |
| this branch | 6,477 bytes | 2,935 bytes |

`cmp` reports the two bundles **byte-identical**. The import-graph guard in
`src/signals/browser-weight.test.ts` passes: `audiences.ts` is reached only from
`parts.ts`, which the broadcaster does not import, and its only import of its
own is a type.

The region map was the fifth join and was found while the first full verify was
running, so it is in this unit rather than filed: it is the same defect in the
same shape, and leaving it would have published one form's readership as the
page's on the one counter here whose rows cannot be un-doubled.

## Preview

https://loom-git-signals-36-a-readin-1ffff7-jpizzolato36-6341s-projects.vercel.app
— taken from the `vercel[bot]` comment on #661 rather than composed. The branch
segment was truncated to `signals-36-a-readin` and a `1ffff7` hash appended,
which is why a guessed host has been wrong six times; this container cannot
reach `*.vercel.app` to check one either way.

## A reading for the mangling findings, taken by accident and then on purpose

The first version of #661's body cited 0290 and 0284 as markdown links by
branch name, at 167 and 161 characters, and GitHub mangled both. Rewriting them
against the head commit's short sha took them to 135 and 129 — and **both
mangled again**, each keeping its own injection style, while a 120-character
markdown link in the same body came back clean in both postings. A third
posting put 0290 in as a **bare** absolute URL alone on its own line, 169
characters, and that was mangled too.

That is nine counted readings in one body. It kills the 16 October entry's
`[…](…)` hypothesis outright, and it puts this body's bracket at **120–129** —
below the 144 and 152 that two other entries counted clean. Since every entry
in that file measured a different body and got a different bracket (133–141,
144–155, 155–164, now 120–129), the hypothesis I filed for whoever picks this
up is that **the bound is a property of the body rather than of the URL** — a
budget, so a longer body mangles at a lower per-URL length. It would reconcile
every reading in the file instead of making four of them errors, and it is
falsifiable in one posting.

**My entry was wrong twice before it was right**, and the corrections are in it:
the first version claimed the sha remedy worked, which I wrote before reading
the body back, and the second blamed the link syntax. Only the counted table
survived.

## Open questions

Nothing blocking. Three with a recommendation each are in the pull request
comment: whether refusing a mixed window is too strong for a pre-production
alpha, whether two forms of a page should stand as two rows in the order over a
deployment's pages, and whether the audience comparison is wanted next.

## §35 merged into this branch mid-run, and brought the same defect with it

**This is the part of the run worth reading twice.** #659 — the two orders a
change makes over a deployment's pages, 0291 — merged into `main` while this
branch was open, and `main` was merged in here. That brought
`deployment-change.ts`, written against the readings as they were before this
unit, and it had the defect this unit exists to remove **in two shapes**:

- its comparison key was the page and the two revisions, so two forms of a page
  compared over the same pair made the second form's comparison *the first one
  handed in twice*;
- its ambiguity gate grouped by **tree**, so two forms compared over
  *different* revision pairs made the page `ambiguous` and **both** forms were
  dropped from both orders, from the standings and from the arrivals;
- and it rebuilt the door's asking from the tree and revision alone, discarding
  the audience the progress reading now carries, so a movement could be scaled
  by the other form's arrival count.

The fix needed **one more rule beside `readingKeyOf` rather than a sixth
spelling of it**, and that distinction is clause 7 of 0290. `formKeyOf` is *a
page in one of its forms* — tree and audience, **no revision** — because a
comparison spans two revisions and the ambiguity being gated is about one form
holding two of those pairs. `readingKeyOf` answers *what is one reading*, where
the revision is part of the identity; collapsing the two would have keyed an
ambiguity gate on the very thing the gate ranges over. Four more tests, and two
planted mutations (the form key dropping the audience, the door's asking
dropping it) each caught by three of them.

**The lesson, which I have put in 0290's consequences.** A published key stops
two places disagreeing only once both import it, and a branch open across the
landing of another is exactly where that fails quietly. My own PR body claimed
the rule was published once and imported by every place that decides what a
duplicate is; for about five hours, after #659 landed, that claim was false.

## Beside the framework lane

**#659 was this lane's own and has since merged**, as 0291 rather than the 0289
it was written as — which left 0290 to this record, so nothing here was
renumbered. It took §35, so this took §36 rather than racing it. The section
above has what its merge cost. It touches `src/signals/deployment-change.ts`,
`silences.ts`, `silences.test.ts` and `index.ts`; this branch touches
`index.ts` too — one export line in a sorted list — and nothing else of its.
No new silence vocabulary is added here, deliberately: `audiences-mixed` is a
collection **fault**, which is `health.ts`'s own vocabulary, so `silences.ts` is
untouched and the file 0240's mapping test walks is not contested.

**#647 is `Loom daily build`'s** and holds 0278. It does not touch
`src/signals/`, so nothing was raced. The three files that always collide are
the three that always do: `docs/signals.md` (two sections appended in the same
place), `decisions/README.md` (generated — regenerate rather than resolve) and
`FINDINGS.md` (union-merged, so both appends survive).
`apps/loom/app/(docs)/_lib/api/reference.generated.json` will collide with #659
and is also generated.

## The door this lane is keeping cheap

**Nothing here touches per-reader identity, and one thing is worth saying about
why not.** An audience looks superficially like the thing that was parked, and
it is the opposite of it: a group a host named before any reader arrived, with
the predicate evaluated in the customer's own process and never leaving it
(0263 clause 1), and an opaque `aud_` on a counter row that is still a node, a
revision and six numbers. Splitting a window by it is grouping rows by a column
the host wrote.

The door is, if anything, slightly cheaper to open after this. Whatever shape
consent takes, an identified batch arrives under some audience, and the
machinery that now keeps two populations apart — one published key, one split,
one refusal to read a window of two — is the machinery a consent-gated
population would need to be kept apart from an ungated one. Nothing in 0290
assumes the only dimensions a reading can have are the ones it has today.
