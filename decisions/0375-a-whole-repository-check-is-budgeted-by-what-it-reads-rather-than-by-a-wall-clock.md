# 0375. A whole-repository check is budgeted by what it reads, rather than by a wall clock

**Status:** Accepted
**Date:** 2026-11-09
**Section:** §1 — Process, the merge gate

## Context

`pnpm verify` green is the merge gate for four surfaces, not one, and twice in
six days it has gone red on a diff that was not responsible.

**4 November (evening).** `the signal ledger > costs the same per node on a
large page as on a small one` failed at 4.038 against a bound of 4 — 0.95% over
— on a branch touching no runtime code, on a container that had just finished a
`next build`. Filed against `Loom signals`; still open.

**9 November.** Two sweeps in `tools/sources/` timed out inside `pnpm verify` on
#837's merged head. Both are whole-repository scans: they read every `.ts` and
`.tsx` under `src/`, `tools/` and `apps/loom/` — 2,065 files, 18.0 M characters
— and lex each one. Re-run, they passed. #843 measured what the diff under test
cost that scan: three runs with its two new files present (2,773 / 2,760 /
2,983 ms) against three with them moved out (2,654 / 2,745 / 2,991 ms). The
distributions overlap completely. **The diff cost the scan nothing measurable.**

What failed was the instrument. Vitest's default per-test timeout is 5,000 ms;
the scan took about 2,700 ms on an idle container, roughly **1.7x headroom**.
Inside `pnpm verify` many files run in parallel on a shared CPU, so the same
scan takes about twice as long in wall-clock terms while doing identical work.
The repository grows every day and a fixed budget only moves one way.

**Measuring the scan to widen that headroom found the reason it was slow, and it
was a defect rather than a size.** `opensRegex` in `tools/sources/code.ts`
decides whether a `/` opens a regular expression or divides. It did so by
joining the entire emitted output so far and reading the end of it — on every
such slash. That makes a file's cost the product of its length and its number of
slashes:

| | chars | slashes | scan | ms per 1k chars |
| --- | --- | --- | --- | --- |
| `src/primitives/library.test.ts` | 444,658 | 1,224 | **1,067 ms** | **2.400** |
| `src/primitives/compositions.test.ts` | 133,012 | — | 15 ms | 0.114 |
| median over files above 2k chars | — | — | — | 0.032 |

One file was **47% of the whole repository's scan**, at 75x the median cost per
character. It is not the largest file here; it is the one with the most slashes.

## Decision

**Two parts, and the second is the one that generalises.**

1. **What decides a slash is read from the end of the emitted code, not from
   all of it.** The keyword pattern is anchored at the end and matches a keyword
   preceded by the start of the code or by one non-word character, so the
   longest keyword plus that one character is the whole of what can decide it.
   That length is derived from the keyword list rather than typed, because a
   longer keyword added later would otherwise silently shorten what the test can
   see. The scan over this repository went from **2,290 ms to 688 ms**, and the
   result is byte-for-byte identical on all 2,065 sources and on 300,000
   randomly assembled ones.

2. **A check whose work is the whole repository is budgeted per source, not in
   fixed milliseconds.** `sweepBudget` in `tools/sources/files.ts` allows 20 ms
   a source with a 10-second floor — about forty times what the sweep costs on
   an idle container. **A timeout is a net for a scan that has stopped, not a
   measure of how busy the machine is.** The budget grows with the repository,
   so the headroom cannot erode as the repository does.

**A skip is not the remedy**, and `docs/routines.md` already says why in another
context: a test that silently does not run is how the next regression goes
unnoticed for a month. Neither sweep is about speed, and neither should be able
to fail because of it.

## Consequences

- The two sweeps `pnpm verify` runs are **670 ms and 1,077 ms** measured on this
  branch, under a budget of 41 s. The 1.7x headroom is gone as a category, not
  widened.
- Every other reader of `codeOnly` gets the speedup for nothing: the sweeps in
  `mocks.test.ts` and `deployment.test.ts`, `pnpm weigh`, and anything that lexes
  a source later.
- **`sweepBudget` is the spelling for the next whole-repository check**, and
  there are three more sweeps today that pre-date it — `mocks.test.ts`,
  `deployment.test.ts` and `tools/git/portability.test.ts`. None is close to its
  default budget now, so none is changed here; a sweep that approaches one
  should take this budget rather than a larger number.
- **It does not answer the 4 November entry.** `src/signals/ledger.test.ts`
  asserts a *ratio between two measurements*, not a duration, so a per-source
  budget is the wrong instrument for it. That one stays `Loom signals`' call and
  its recommendations stand.
- `tools/` is in no lane's row in the lane table, which is why #843 named
  `Loom daily build` as the closest fit. That is still unsettled and is in this
  run's report as an open question.

## Alternatives considered

- **Raise the two timeouts to a larger fixed number.** #843's own recommendation,
  and rejected for the reason it gives: it buys time rather than headroom. The
  repository grows every day; a bigger constant is the same decision again in a
  few months.
- **Assert a rate — milliseconds per thousand characters scanned.** Rejected: it
  is still a stopwatch, and it would fail on a busy container exactly as the 4
  November entry does. Neither sweep is about how fast this machine is.
- **Leave the quadratic and only change the budget.** The gate would be green and
  `pnpm verify` would keep paying 1.6 s a run for one file's slashes. The
  measurement was already in hand and the fix is bounded and provably
  equivalent.
- **Merge the two sweeps into a single pass**, reading and lexing each source
  once instead of twice, which would halve the remaining 1.75 s. Rejected for
  this run: it moves tests between files for a saving the budget no longer needs,
  and the two sweeps assert different things about different modules. It is in
  the report as an open question rather than done quietly.
- **Rewrite the scanner's character loop** (preallocation, index assignment
  instead of `push`). Rejected: the measured cost was one accidental quadratic,
  and tuning a lexer that is now 688 ms for the whole repository is refinement
  inside code that works.
