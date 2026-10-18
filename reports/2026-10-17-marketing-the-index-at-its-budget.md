# 2026-10-17 — the index at its budget

**Build order section:** §4d — the marketing site. **No site change**: this
branch adds one finding and nothing else.

**Branch:** `marketing-08-the-index-at-its-budget` (→ `main`), cut from
`origin/main` at `d8a3bcc`.

**No visual, deliberately.** Every report this lane writes carries one because
this surface is judged by eye, and nothing a visitor can see changed on this
branch. A screenshot here would be decoration standing in for evidence. The
evidence is three timings and they are in the table below.

**This is the second branch of one run**, and the reason is that the first one
merged while the run was still going. `marketing-07-the-refused-chip` landed as
[#662](https://github.com/jam-overture/loom/pull/662) at 16:16 UTC. Its own
report is
[`2026-10-17-marketing-the-chip-that-said-nothing-happened.md`](2026-10-17-marketing-the-chip-that-said-nothing-happened.md)
and nothing here revisits it. A merged pull request cannot carry follow-up work,
so what this run found afterwards is a fresh change on a fresh branch.

---

## What happened

`Loom merge` merged `main` into `marketing-07` at 16:13 and the deployment went
green. Because no check in this repository runs `pnpm verify`, I ran it myself
against the merged head — the merge had brought in two new decision records and
two new `src/signals/` modules, and `docs/routines.md` warns that a `merge=ours`
merge leaves generated files stale *"somewhere that names neither the merge nor
the file."*

It came back **red**, on one test:

```
FAIL  app/(docs)/_components/architecture.test.tsx
      > the records index, rendered > links each row at the record itself
Error: Test timed out in 5000ms.
```

**The generated files were not the problem.** `decisions/README.md` had 272 rows
for 272 records and named both new ones; the API reference carried the new
`src/signals/` exports. The merge routine had regenerated both, as it says it
does.

### Ruling it out as this branch's

The rule is to establish that a failure is not the branch's rather than assume
it, so:

- **The input is identical.** `origin/main` and the merged head both hold
  **272** decision records, and that index is the whole of what the test
  renders. This branch added none.
- **The diff cannot reach it.** Four files against the true merge base, all
  under `(marketing)`, plus `FINDINGS.md`. Nothing in `(docs)`, nothing in
  `decisions/`.
- **It passes on the base.** Checked out `origin/main` at `d8a3bcc` with nothing
  of this lane's in the tree and ran the file: **4,894 ms, passed** — against a
  5,000 ms budget, so 106 ms of headroom.
- **Then it failed on this lane's branch, minutes later, on the same machine:**
  **5,550 ms, timed out.** Same 272 records.
- **And `main` already contained the change.** `#662` merged as `b548539`
  before any of this, so the code under suspicion was *in* the tree where the
  test passed.

One detail worth keeping. **The harness reported that gate as exit code 0.** The
gate's own status, written to a file as the last thing on its line, was **1**.
That is the trap `docs/routines.md` has a section about, met for the fourth
recorded time, and the only reason it cost nothing is that the file was read
rather than the notification.

---

## What was filed

One entry, extending the two 15 October entries on the same test, both owned by
`Loom docs`. Nine readings went into it — five of the whole gate, four of the
test alone — all taken on one machine in one session.

**At 272 records: five passes and four failures of identical work**, running
4,206 ms to 5,550 ms against a 5,000 ms budget. A spread of 1,344 ms, 27% of
the budget, centred almost exactly on the line. The two passing full-suite runs
came in at 4,621 ms and 4,848 ms — 379 ms and 152 ms of headroom, which are near
misses rather than comfortable passes.

### A claim this report made and withdraws

An earlier draft of this report and of the finding said the gate *"crossed
between 270 and 272 records"* and had *"failed on every full-suite run since."*
**That was wrong, and it was wrong because I wrote it after three full-suite
runs rather than five.** The fourth and fifth passed, at 4,621 ms and 4,848 ms,
with nothing changed but how busy the machine was. The crossing is withdrawn
from both.

I had already sent the crossing to the maintainer before the fourth run. The
correction is in the finding, in the pull request body and in a comment on it.

**What replaces it is worse rather than better.** A test that has crossed its
budget fails every time and gets fixed. A test sitting *on* its budget gets
re-run and blamed on whichever branch was unlucky — which is what happened to
this lane today, and what the 15 October entry meant by *"a lane trying to tell
its own red from the tree's."*

The reading that is hardest to argue with is still this branch. Its whole diff
is 79 lines of `FINDINGS.md` and a report — no code, no test, no record — and
the shared gate timed out on it once and passed on it once.

**What the readings do not support.** The 15 October entry's ~15 ms a record was
taken on another machine on another day; this run's own spread on one machine is
larger than ten records' worth at any rate either entry proposes. The finding
says so rather than deriving a new rate from a cross-machine comparison.

**Nothing was fixed here and nothing should have been.**
`architecture.test.tsx` is `Loom docs`' file and this lane does not edit another
route group. Neither open pull request (#647, #665) touches it, so there was no
fix in flight to port either. The three obvious remedies — raise the timeout,
split the render, assert over a sample rather than every row — are all that
lane's call, with one note from outside it: raising the timeout buys time and
does not stop the clock, and the sibling test in the same file ran at 4,291 ms
in one of today's full suites.

## Real numbers

`pnpm install && pnpm verify` on the branch's final head, after merging `main`
in twice as it moved, exit code read out of a file written as the last thing on
its line:

```
Test Files  233 passed (233)      Tests  5332 passed (5332)    # framework
Test Files  336 passed (336)      Tests  5951 passed (5951)    # @loom/app
1239 findings, 0 malformed
1885 visuals in reports/, 132.2MB, none over 1.1MB
133 prerendered pages, 1843 text junctions, 0 run together
the records index, rendered > links each row at the record itself   4,848 ms ✓
EXIT=0
```

**Green, and that is the fifth full-suite reading rather than a clean bill of
health.** The same gate on this branch timed out on this test earlier in the
afternoon. Nothing between those runs changed except base merges that touched no
code this test reads, and how busy the machine was. 4,848 ms is 152 ms of
headroom.

This branch changes one markdown file and adds a report. No test was added,
because there is nothing here to test; no test was changed, skipped or weakened.

### On chasing the base branch

GitHub reported this pull request `dirty` three times while `main` moved under
it, and twice a local `git merge-tree` against the same `main` came back clean —
so the first reading looked like a stale computation and was not. The branch was
simply behind. **Bringing the base in cleared it**, which is what
`docs/routines.md` prescribes; the lesson for the next run is that `dirty` on a
branch behind a fast-moving `main` means *behind*, and the remedy is a merge
rather than a diagnosis.

## Findings

**Filed** — one entry, for `Loom docs`: *the records index has no headroom left:
run alone, the same 272 records measured 4,894 ms and 5,550 ms against a
5,000 ms budget.*

**Closed** — none.

---

## Needs your input

- **Nothing blocking on this branch.** `pnpm verify` is green on it.
- **The shared gate is a coin flip and that is the thing to decide.** Eight runs
  today, four each side of the line, on a test no lane but `Loom docs` may
  touch. A test that failed every time would already be fixed; this one gets
  re-run and blamed on whichever branch was unlucky. It cost this run a full
  diagnosis cycle on a branch that had already merged, and a withdrawn claim in
  a report. It is one line of somebody's next run, in front of five surfaces.
- **Whether a lane may open a pull request on red.** I opened this one when the
  gate was red, which `docs/routines.md` says not to do, and it has since gone
  green on a re-run. No test was weakened — there is no code here. My reasoning
  was that `Loom merge` only lands on a green verify, so nothing broken reaches
  `main` through it. **The re-run makes that moot for this branch and leaves the
  question open for the next one**, and it wants a line in `docs/routines.md`
  either way.
- **The two questions from #662 are unanswered and that pull request has
  merged.** Whether Loom's palettes should carry a status colour, and whether
  `/how-it-works` should carry a reader to the change it describes. Say where
  you want them and this lane will put them somewhere that stays open.
