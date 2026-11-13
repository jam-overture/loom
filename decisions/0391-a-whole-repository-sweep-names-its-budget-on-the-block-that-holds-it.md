# 0391. A whole-repository sweep names its budget on the block that holds it, and a check says which files those are

**Status:** Accepted
**Date:** 2026-11-12
**Section:** §1 — Process, the merge gate

## Context

[0375](0375-a-whole-repository-check-is-budgeted-by-what-it-reads-rather-than-by-a-wall-clock.md)
replaced the fixed 5,000 ms default on the whole-repository sweeps with
`sweepBudget(sources)` — twenty milliseconds a source over a floor of ten
seconds — because the instrument rather than the diff had taken the merge gate
red. It fixed the two sweeps that had failed and left the others, under a
consequence bullet that set the test for the rest:

> **`sweepBudget` is the spelling for the next whole-repository check**, and
> there are three more sweeps today that pre-date it … **None is close to its
> default budget now, so none is changed here**; a sweep that approaches one
> should take this budget rather than a larger number.

**Three days later one of those three took the merge gate down.** `Loom signals`
filed it on 12 November: `tools/sources/mocks.test.ts` > *every test file that
runs in a shared worker > installs no mock whose effect depends on what ran
before it* failed with `Test timed out in 5000ms` on #851's merged head, and the
re-run of the whole gate was green with nothing changed in between. The diff
under test added **one** `*.test.ts` to the 651 that sweep reads, at the 0.3–0.5
ms a source `files.ts` measures: about half a millisecond against five seconds.

**The test in that bullet is the part that failed, not the budget.** Measured on
this branch, on an idle container, the two sweeps in that file are **388 ms and
310 ms** — about 6x under the default, which reads as "not close". Inside
`pnpm verify` many suites share a CPU, and the timeout landed while a PGlite
suite took 2.6 s in the same window. Headroom measured on an idle container is
not headroom, so *how far a sweep sits from the default today* cannot be the
test of whether it needs a budget sized to its work.

This is the third instance of one fault in two weeks — #843's finding, 0375's
two sweeps, now this one — and **all three were a whole file that named no
budget at all**, found each time by a lane reading a red gate it did not cause.

## Decision

**1. The budget goes on the `describe` that holds the sweeps, not on each `it`.**
Vitest 3 hands a block's `timeout` option to every test inside it, measured
here rather than assumed: with the block's budget set to 1 ms both sweeps in
`mocks.test.ts` fail with `Test timed out in 1ms`, and with it set to
`sweepBudget(suites)` both pass. A sweep written into that block later inherits
the budget instead of having to remember it, which is the half of the remedy no
check can enforce.

**2. A sweep that takes the shared instrument names a budget for it.**
`tools/sources/budgets.ts` answers whether a source imports `everySource` and
names no `sweepBudget`, and `budgets.test.ts` sweeps all 651 `*.test.ts` in the
repository for one. The rule is keyed on the **import** rather than on the name,
because the name is not reserved: `apps/loom/app/(portal)/every-screen.test.ts`
declares an `everySource` of its own over one route group, reads it while the
suite is collected rather than inside a test — 832 ms of collection, outside
what any test timeout governs — and is another lane's file. Comments and
strings are blanked with `codeOnly` first, because the docblocks in that
directory quote their own imports.

**3. The test 0375's bullet set is replaced.** A sweep needs a budget because it
reads the whole repository, not because it has come close to five seconds on an
idle container. **0375's decision stands and is not superseded**: the formula,
its floor and its reasoning are unchanged, and nothing here edits that record.
What is overtaken is one consequence bullet's judgment about which files needed
it, by evidence that arrived after it was written.

## Consequences

- **`mocks.test.ts` runs under 13,020 ms rather than 5,000**, and the two sweeps
  that cost 388 ms and 310 ms idle have the headroom 0375 gave the other four.
- **The five files the rule covers are named in a test rather than counted**:
  `budgets`, `code`, `deployment`, `files`, `mocks` and `semicolons` under
  `tools/sources/`. A sixth whole-repository sweep fails that test until it is
  listed, which is the alarm against the rule quietly becoming a rule about
  nothing.
- **The rule is per file, which is narrower than the fault it names.** A suite
  that budgets one sweep and forgets a second one added later still passes it.
  That half is closed by decision 1 instead, by construction rather than by a
  check.
- **It does not reach `tools/git/portability.test.ts`**, the third sweep 0375
  named, because that file walks `tools/` and `src/` with a local copy of the
  walker and imports nothing from `files.ts`. Left alone deliberately: its
  fifteen tests are **72 ms** in total, it lexes nothing, and it reads two
  directories rather than three. If it ever approaches its budget the remedy is
  to take `everySource` and `sweepBudget`, at which point this rule reaches it
  without being changed.
- A sweep can still grow into needing a budget without importing the shared
  list, and nothing here would say so. That is the stated limit of keying on the
  import, and the price of not flagging another lane's file for a fault it does
  not have.
- `tools/` is still in no lane's row in `docs/routines.md`, which is why 0375
  and this record both land in `Loom daily build`. Carried as an open question
  since #843.

## Alternatives considered

- **A `timeout` on each sweeping `it`, as 0375 spelled it in the four files it
  fixed.** Rejected as the only remedy: it is what the three instances show
  people forget, and it is one line per sweep rather than one per block. The
  four existing files are **not** changed to the block form — they work, they
  are explicit, and the check does not care where the budget is named.
- **A per-`it` static check**: find each `it` in those files, decide from its
  body whether it reads the repository, require a `sweepBudget` in its options.
  It is the property that actually matters, and it was written and abandoned —
  deciding "this body reads the repository" needs a transitive walk over local
  identifiers (`suites` → `sharedWorkerSuites` → `everySource`) and an
  indentation heuristic to delimit each initializer. That is about a hundred
  lines of lexical guesswork inside the gate four surfaces depend on, to catch a
  case that decision 1 makes impossible in the one place it could occur.
- **A `testTimeout` for `tools/sources/**` in the Vitest config.** It would
  apply with nothing to remember, and it was rejected because the figure cannot
  be `sweepBudget(sources)` without the config walking the filesystem at load,
  and because it would put a 13 s timeout on the fixture tests in those files
  too — a genuinely hung unit test would take thirteen seconds to say so
  instead of five.
- **Counting the sweeps in a file and requiring as many budgets.** Rejected on
  [0387](0387-a-landmark-is-not-a-count-and-a-copy-is-a-sequence-of-them-at-the-distances-the-text-puts-them-at.md)'s
  own argument: a count of parts is not a count of things to fix, and this one
  would go stale against any refactor that merged two sweeps.
- **Editing 0375's consequence bullet in place.** Not done. Whether a merged
  `Accepted` record may be corrected in place is the open question #881 put to
  the maintainer; until it is answered this record leaves 0375 untouched and
  says here what the evidence overtook.
