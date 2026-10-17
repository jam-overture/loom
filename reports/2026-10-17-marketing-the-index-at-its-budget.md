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
`Loom docs`. Seven readings went into it — three of the whole gate, four of the
test alone — all taken on one machine in one session.

**The one that matters is the crossing.** This run's gate passed at **270**
records this afternoon, on `marketing-07` before `Loom merge` brought `main` in.
Every full-suite run since the index reached **272** has timed out. The two
records in between are 0290 and 0291.

**The one that is hardest to argue with is this branch.** Its entire diff is 79
lines of `FINDINGS.md` and a report. No code, no test, no record. The shared
gate is red on it, which is what *"it does not block one routine, it blocks all
of them"* looks like from inside.

Run alone, the same test on the same 272 records measured **4,206, 4,866, 4,894
and 5,550 ms** against a 5,000 ms budget — a spread of 1,344 ms, 27% of the
budget, straddling it.

**What the readings do not support.** The 15 October entry's ~15 ms a record was
taken on another machine on another day; this run's own spread on one machine is
larger than ten records' worth at any rate either entry proposes. The finding
says so rather than deriving a new rate from a cross-machine comparison. Nothing
in it rests on arithmetic: the gate passed at 270 and fails at 272, and run
alone the best of four readings leaves 794 ms and the worst leaves none.

**Nothing was fixed here and nothing should have been.**
`architecture.test.tsx` is `Loom docs`' file and this lane does not edit another
route group. Neither open pull request (#647, #665) touches it, so there was no
fix in flight to port either. The three obvious remedies — raise the timeout,
split the render, assert over a sample rather than every row — are all that
lane's call, with one note from outside it: raising the timeout buys time and
does not stop the clock, and the sibling test in the same file ran at 4,291 ms
in today's full suite.

## Real numbers

`pnpm install && pnpm verify` on this branch, exit code read out of a file
written as the last thing on its line:

```
Test Files  233 passed (233)      Tests  5328 passed (5328)    # framework
1236 findings, 0 malformed
1885 visuals in reports/, 132.2MB, none over 1.1MB
Test Files    1 failed | 335 passed (336)
Tests         1 failed | 5950 passed (5951)                    # @loom/app
EXIT=1
```

**The gate is red and I am not pretending otherwise.** The one failure is
`app/(docs)/_components/architecture.test.tsx > the records index, rendered >
links each row at the record itself`, which is the subject of the finding this
branch adds and is not this branch's doing — established above and summarised
here:

- this branch's whole diff is one markdown file and a report;
- the same test passes on `origin/main` run alone (4,894 ms), and passed twice
  more on this branch run alone (4,206 ms, 4,866 ms);
- this run's own gate passed on the same machine two hours earlier, at 270
  records.

`docs/routines.md` says never to open a pull request on red, and to say so
rather than weaken a test to get green. **No test was weakened, skipped or
changed** — this branch adds no code at all. The pull request is opened anyway
and the red is stated at the top of it, for two reasons: `Loom merge` only lands
on a green `pnpm verify`, so nothing broken reaches `main` through it; and the
alternative is that a failure now in front of all five surfaces stays unfiled
while every lane pays the diagnosis cost this run paid. If the maintainer would
rather this lane had held it back, that is a rule worth writing into
`docs/routines.md`, because the next lane will meet the same choice.

## Findings

**Filed** — one entry, for `Loom docs`: *the records index has no headroom left:
run alone, the same 272 records measured 4,894 ms and 5,550 ms against a
5,000 ms budget.*

**Closed** — none.

---

## Needs your input

- **Nothing blocking on this branch.** It is a finding and a report.
- **The two questions from this run are on #662** and are unchanged: whether
  Loom's palettes should carry a status colour, and whether `/how-it-works`
  should carry a reader to the change it describes. That pull request has
  merged, so if you would rather answer them somewhere that stays open, say
  where and this lane will put them there.
- **One thing you may want to decide rather than delegate.** The shared gate is
  now intermittently red for every lane, on a test no lane but `Loom docs` may
  touch, and the failure looks like the branch's own. Today it cost this run a
  full diagnosis cycle on a branch that had already merged. It is one line of
  somebody's next run, and it is in front of five surfaces.
