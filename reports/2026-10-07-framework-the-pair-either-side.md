# The pair either side

**Routine:** `Loom daily build` (framework core) · **Date:** 7 October 2026
**Branch:** `framework-58-the-pair-either-side` · **Section:** §1 — process, the specimen harness

## What was completed, in plain language

**A screenshot proves a change only against a photograph of the tree without it,
and until today nothing in this repository took that pair.** A run that wanted
one wrote six shell commands by hand: copy the changed source aside, `git show`
an older revision over it, re-shoot into a scratch directory, copy the good file
back, `cmp` the two sets. Two consecutive runs of this lane wrote exactly those
six — #538 to prove a phone shot was the old behaviour rather than a
reconstruction of it, and this morning's run to prove a focus ring arrives on a
trigger — and both had to be taken on trust in the report, because a `cmp` in a
deleted scratch directory is not an artefact.

It is now a flag:

```bash
pnpm specimen src/render/the-button-they-came-from.specimen.ts --against origin/main
```

**The subject comes from the ref. The instrument and the sheet do not.** `src/`
is extracted from the revision into a scratch tree; the harness and the specimen
module are copied in from the working tree over the top. So this is not *"what
did `main` look like"* — it is **this sheet, pointed at an older library**, which
is the question a report asks when it claims a picture moved.

## The picture, which is this morning's picture, and that is the claim

Run against the commit before the focus-return change (`0d248c1`, #537), the
flag printed this:

```
2026-10-07-…-minimal-wide-arrived              1280x900@2x  scrollWidth 1280 / innerWidth 1280
2026-10-07-…-minimal-wide-inside               1280x900@2x  scrollWidth 1280 / innerWidth 1280
2026-10-07-…-minimal-wide-back-on-the-trigger  1280x900@2x  scrollWidth 1280 / innerWidth 1280
3 shots against 0d248c1: 2 identical, 1 differs
  2026-10-07-…-minimal-wide-arrived.png              identical
  2026-10-07-…-minimal-wide-inside.png               identical
  2026-10-07-…-minimal-wide-back-on-the-trigger.png  differs
  the pictures taken at 0d248c1 are in …/against
```

**Both pictures it produced are byte-identical to the two this morning's run
committed by hand.** The automated pair *is* the hand-made pair:

| the flag's output | the committed file | `cmp` |
| --- | --- | --- |
| `against/…-back-on-the-trigger.png` | [`2026-10-07-framework-button-before.png`](2026-10-07-framework-button-before.png) | identical |
| `…-back-on-the-trigger.png` | [`2026-10-07-framework-button-after.png`](2026-10-07-framework-button-after.png) | identical |

That is the strongest thing available to say for it, and it is why **no new
picture is committed with this report.** The two above are already in `reports/`;
a second copy of a 98 KB photograph, committed to illustrate a tool whose job is
comparing photographs, is the per-specimen baseline image that
[0240](../decisions/0240-a-picture-is-proved-against-an-older-library-photographed-with-this-harness.md)
rejects, in miniature. `reports/against/` is in `.gitignore` for the same reason:
a run commits the one picture it argues from, under a short name.

**The two `identical` lines are the half that is easy to miss and are what make
the third one evidence.** A lone "after" picture of a focus ring says nothing —
the ring is also where it was before anything opened. What makes the third shot
proof is that the two either side came back *the same file*, so the only variable
between the pair is the thing being argued about.

## Decisions taken that were not specified, and why

**The instrument must not vary between the two photographs, and this is the whole
design.** The finding that asked for this said *"it builds the tree from another
ref"*. It does not build the whole tree, and the asymmetry is load-bearing twice
over. The sheet is the *question* — it says what to photograph and in which
states — so a sheet taken from the ref would be a different question, or, for a
sheet written that same morning, no question at all. And the harness is routinely
newer than the change: the `{ key }` step that made a keyboard journey
photographable **did not exist at the revision it had to be photographed
against**. An instrument taken from the ref could not have taken the *before*
picture at all.

**It prints and never fails, which was the filing's condition and is 0159's
line.** A moved picture is the commonest reason to have run the harness; a
comparison that changed the exit code would make every deliberate visual change a
build failure. The verdict a run exits on is still the overflow measurement
alone.

**A sheet that will not build at the ref is an answer, not an error.** A specimen
written for an API this branch adds has nothing to stand on at the revision, and
*the sheet does not build there* is a real reply to the question. Measured on a
real case — `src/primitives/the-word-the-page-writes.specimen.ts` against
`bbb849d` — it prints:

```
against bbb849d: the sheet does not build there — Error: nav-menus is not in the phrasebook
  nothing was photographed to compare against, so every shot above is new
```

What *does* fail is a revision `git rev-parse` cannot resolve, because that is a
question that could not be asked rather than an answer nobody liked. Checked end
to end: `--against mian` exits 1 with *no such revision as mian — pass something
`git rev-parse` resolves, like origin/main*.

**`git archive` rather than a worktree or a checkout.** Extracting a tarball
touches no repository state: nothing in `.git/worktrees` to leak if the run is
killed, no index, no lock, no debris a routine with no memory of the last run
cannot diagnose. Pathspecs go through `git ls-tree` first, because `git archive`
fails the whole extraction on a pathspec matching nothing and a `tsconfig` that
arrived after the ref is not a reason to refuse a comparison. **`reports/` is
deliberately not extracted** — it is 614 MB of committed pictures, and
`git archive HEAD` of the whole tree is 671 MB.

**No second `pnpm install`.** `node_modules` is symlinked from the working tree.
The dependencies are the instrument's and the instrument is this branch's by
construction, so installing the ref's would answer a question nobody asked and
put a network inside a flag people should reach for casually.

**The ref's pictures are kept, under the same names, in `<out>/against/`** rather
than under a suffix. A report's *before* has to be a file somebody can find, and
the harness already names a shot `<specimen>-<theme>-<viewport>-<state>`, which
clears 160 characters routinely — the wrong side of the 147-character boundary
the URL-mangling entry measured yesterday.

## Records

**Added, one:** `0240 — A picture is proved against an older library,
photographed with this harness`. Accepted. Index regenerated.

**Superseded: none.** 0159 is untouched and is what this is built on: *an
instrument may reach a state, and may never assert one.* A comparison across two
runs is the furthest thing in this harness from that line, which is why the
record argues the case explicitly and why two modules are held to it by a test
that reads their source.

**The number.** 0240 is the next free one after re-reading `main` (0239) and both
open pull requests — #544's report states it adds no record, and #545 adds none.
**No collision this time**, which is the first day in five without one.

## Findings

**Closed, one, this lane's own:** the 7 October entry *proving a picture moved
means building the tree twice by hand*, filed twelve hours ago by this lane and
closed by this branch. The dated note on it says what shipped, the one way it
differs from what the entry asked for (the instrument and the sheet come from the
working tree, not the ref) and why that difference is what makes the flag usable.

**Filed, none.** This run built the thing an open finding named and found nothing
outside its lane.

**Carried, unchanged:** the 20 September entry about a session clone being fifty
commits deep is now the stated limit of `--against`, in both recipes. It is not
closed and this does not change it — a ref older than the clone's depth reads as
*no such revision*, which is true of the clone and misleading about the
repository. Fetching more history inside a flag would make a photograph depend on
a network, so it is documented instead.

## Open questions

**Nothing blocking.**

**Still open from earlier runs and unchanged by this one:** focus trapping and
`inert`, which are `ARCHITECTURAL — needs review` because taking them reverses
clause 6 of 0176 — this morning's run recommended taking it as a `modal: true` on
`present` and that recommendation stands; the `ModelEffort` scale borrowed from
one vendor that three adapters will each have to map; and whether Grok is a third
adapter at all.

**One thing this run deliberately did not build**, recorded here rather than as a
finding because nobody has asked for it: a `--diff` composite showing *where* two
pictures differ. It needs a pixel library this repository does not have, and two
files on disk under the same name are enough for a human to flick between. Worth
a finding the first time a lane wants it.

## The gate

`pnpm verify` from a deleted `dist` and `.next` — **exit 0**, status written to a
file as the last thing on its own line and read in a separate command.

| | files | tests | failed | skipped |
| --- | --- | --- | --- | --- |
| package | 189 | **4,154** | 0 | 0 |
| application | 407 | **7,221** | 0 | 0 |

1,056 findings, 0 malformed. 126 prerendered pages, 1,586 text junctions, 0 run
together.

**+42 tests, in one new file and one existing one**: 38 in
`tools/specimen/against.test.ts` and 4 added to `specimen.test.ts`'s
*the command line* block. No test was deleted, skipped or weakened, and none was
rewritten — everything here is new surface. The arithmetic reconciles against
`main`: 4,154 − 42 = 4,112, which is the package count #544 reports for
`bd0af3d`. The application side is untouched by this branch; nothing under
`apps/` or `src/` is in the diff.

**An earlier verify run was killed rather than reported**, and this is why. It was
started before two changes landed in `baseline.ts` — resolving the output
directory against the repository rather than the process, and making the room for
a sheet whose directory is new on this branch — so its numbers would have been
about a tree this branch is not shipping. The morning run's note about two
concurrent gates over one log file is the same mistake one step earlier; the
remedy is the same, which is to run the gate last, once, on the final tree. The
table above is a single run with nothing else going.

### Defect matrix

Seventeen planted, **seventeen red**, each caught by the test written for it. The
three worth reading are 1, 10 and 16: all three are versions of this change that
work on the happy path and lie quietly.

| # | defect | caught by |
| --- | --- | --- |
| 1 | the pairing keys on the path rather than the name | *…by name, in the order they were shot* |
| 2 | `identical` and `differs` swapped | *reports the two either side as identical…* |
| 3 | a shot only the ref took is dropped | *names a shot only this run took, and one only the ref took* |
| 4 | the verdicts come back alphabetical | *keeps the order this run took its shots in* |
| 5 | a sheet that will not build is compared anyway | *says the sheet does not build at the ref, and why* |
| 6 | the tally prints a verdict nothing fell under | *leaves out a verdict nothing fell under* |
| 7 | the early-stop note prints whether or not it explains anything | *says nothing when every shot was taken on both sides* |
| 8 | the comparison reaches for the exit code | *never reaches for the exit code in either module* |
| 9 | the sheet is not copied in from the working tree | *copies the sheet in from the working tree…* |
| 10 | the harness is taken from the ref as well | *photographs the library at the ref with the harness and the sheet from the working tree* |
| 11 | a sheet outside the repository is accepted | *refuses a sheet outside the repository* |
| 12 | the pathspecs skip `git ls-tree` | the same integration test, via `git archive` |
| 13 | the failure sentence is the first line | *picks the line the error announced itself on* |
| 14 | the scratch path is left in the sentence | *takes the scratch tree off a path* |
| 15 | the digests come back sorted | *keeps the order it was asked in* |
| 16 | a previous comparison's pictures are left in place | *clears the pictures a previous comparison left* |
| 17 | `--against` silently takes no value | *refuses `--against` with the next flag as its value* |

**Row 1 is this run's own defect rather than a plant** — it shipped in the first
version, and what it produced was not an error but a plausible lie: *3 shots
against 0d248c1: 0 identical, 0 differ, 3 there only*, which reads as a sheet
whose every shot is new. A `ShotResult` carries the path it was written to, and
the two sides of a comparison write into different directories by construction.

**Row 10 is the one the whole design turns on**, and it is red for a reason worth
seeing: the fake harness committed at the ref in that test throws on sight, so a
plan that took `tools/` from the revision cannot photograph anything at all.

**Row 8 is held by reading the source rather than by calling anything.** The two
modules behind `--against` are asserted not to contain `process.exit` or
`exitCode` in any form. It is the only way to state 0159's line about a *module*
instead of about one of its calls, and it fails the moment a future author adds a
failure path.

## Not in this run

**`*.vercel.app` is denied from this sandbox** (27 September finding, unchanged),
so the pictures above were taken by a local `pnpm specimen`, not against the
preview.

**Nothing in `src/` was opened**, and nothing in any route group. The diff is
`tools/specimen/`, `docs/routines.md`, `.gitignore`, one record, the index,
`FINDINGS.md` and this report.

**`apps/loom/app/(demo)/` was left alone**, and that is a judgement rather than an
omission — see the note below.

## Two places this lane's brief is stale, for the maintainer

Said here because a routine with no memory reads this file and the brief in the
same breath, and `docs/routines.md` is explicit that where the two disagree the
brief wins and the file is wrong.

**The one-application migration the brief still leads with is done**, and has been
since 19 August. `apps/loom` holds the route groups, `apps/portal` and `apps/docs`
are retired, sign-in is at the `(portal)` boundary, and `docs/routines.md` records
it. Three routines are described as blocked on it; none of them is.

**The brief says the demo is this lane's. `docs/routines.md` says `Loom demo` owns
`apps/loom/app/(demo)/`, and that routine has an open pull request today
(#545).** Following the brief's letter would mean two routines editing one
directory, which is the exact failure the lane split exists to prevent — so the
directory was left alone and this paragraph written instead. The recommendation is
that the brief be corrected, not the governance file.
