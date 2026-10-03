# An assessment a test can ask for

**Date:** 2026-10-03 · **Section:** §2 (composition runtime) · **Lane:** `Loom daily build`
**Branch:** `framework-66-an-assessment-a-test-can-ask-for`
**Records:** [0216](../decisions/0216-a-published-double-derives-whatever-the-runtime-derives.md).
**None superseded.**

---

## What this run did

`src/testing/` publishes `buildAssessment` and `NOTHING_MEASURED`. A test that
needs a judged change — a `ChangeAssessment` — can now ask for one, with the
handful of facts it cares about, and get back a record the runtime could actually
have produced.

That was the last unit's own parting ask. `framework-65` added two fields to the
telemetry record, a `(portal)` test that hand-built an assessment with ten of
eighteen fields went red sideways, and the two-line patch that unbroke it was
filed against this lane with the reason: **there was nothing else to reach for.**
`buildIntent` and `buildProposal` existed; the third was missing, so three
fixtures across two lanes wrote the record out as a literal and cast the gap
away.

---

## The transcript, because the claim is about agreement

A real removal of a protected header, judged by the real Gate over the published
fixture, beside the double standing in for it:

```
removing a protected header, judged by the Gate, beside the double standing in for it

                             assessChange               buildAssessment
  top-level fields           4                          4
  analysis fields            18                         18
  stakes.level               critical                   critical
  stakes.factors             3                          3
    1                        protected-type-removed     protected-type-removed
    2                        protected-type-touched     protected-type-touched
    3                        shallow-structural-change  shallow-structural-change
  reversible                 true                       true
  retainedNodeCount          2                          2
  inverse.baseRevision       1                          1

  identical top-level keys  true
  identical analysis keys   true

what the draft has no field for, and where each one came from instead

  stakes.level              highest of the factors it was given
  reversible                whether irreversibilityReasons is empty
  retainedNodeCount         analysis.removedNodeCount
  inverse                   the proposal's own delta, one revision later
```

The bottom block is the part worth arguing about, and it is 0216.

---

## Incompleteness was never the worse failure

A fixture missing a field goes red. It goes red late and it goes red in the wrong
file — the 2 October break arrived as `expected "record" to be called at least
once` in a test about event ordering — but it goes red, and somebody fixes it.

The failure that does not go red is **incoherence**. A `ChangeAssessment` has
three agreements inside it that no type expresses:

| | the runtime does | so a literal can say |
| --- | --- | --- |
| `stakes.level` | `highestStake` of its own factors | `low`, beside a `critical` factor |
| `reversibility.reversible` | `reasons.length === 0` | `false`, with no reasons |
| `retainedNodeCount` | `analysis.removedNodeCount` | `0`, for a removal of 4 |

One of the three fixtures already does this. `proposal-line.test.tsx` carries
`irreversibilityReasons: ["a removal destroys content"]`, and that list is filled
by `reversibility.reasons.map((reason) => reason.code)`, so every value a real
journal has ever held there is `out-of-tree-effect` or
`retention-budget-exceeded`. It is prose in a field of codes, paired with
`reversible: false` and `retainedNodeCount: 0`. Nothing reads the field, so
nothing is broken; the test is green against a record no run of Loom can emit.

So `AssessmentDraft` has **no field** for a level, a reversible flag, a retained
count or an inverse delta. Each is computed from what the draft does say, by the
rule the runtime uses. A caller cannot contradict one, which is the whole of the
decision and also its cost — written out under *Consequences* in 0216, with the
one case it makes harder (a test that genuinely wants a malformed record, which
should write the literal, because it is testing the boundary).

---

## Held against the runtime, not against a second reading of the source

Nine tests, in `src/testing/assessment.test.ts`. The shape of all of them is the
same and it is the reason the file exists: **every claim the double makes is
checked against a record `assessChange` produced in the same run.**

- The built record's fields are the measured record's fields, at every level —
  so the day a field is added to any of the four halves, this fails in the lane
  that added it.
- Each of the three agreements is asserted of the double **and** of a real
  `assessChange` result. A Gate that stopped taking the highest factor would fail
  here as well as in its own suite.
- A built assessment narrated through `recordOf` parses against
  `assessmentSummarySchema` — which is why one double covers two shapes, and the
  reason no `AssessmentSummary` fixture needs writing out either.

`NOTHING_MEASURED` is a complete `ChangeAnalysis` measuring nothing, published,
and it is where the eighteen fields are declared **once**. `src/runtime/stakes.test.ts`
was the only other complete analysis literal in `src/` — 49 call sites behind one
`analysisOf` helper — and it now spreads `NOTHING_MEASURED` and states only its
three deliberate non-zeroes. Two literals would have made *"a field added moves
one file"* false on the day it was written.

---

## Decisions this run made that nothing specified

**Derive, don't accept.** Argued above and recorded. The generous builder — let
the caller override all four — is the one a future caller will ask for, and
rejecting it is the only interesting thing in 0216.

**`buildAssessment` is not `assessChange`.** Calling the real one from the double
was considered on paper. It makes the caller specify a *delta* rather than the
facts it cares about, so a test wanting `invalid-props` at `critical` has to
construct a tree, a props vocabulary and an operation that offends it. That is
`gate.test.ts`'s job and `gate.test.ts` already does it.

**No second builder for `AssessmentSummary`.** `recordOf` is published and
already narrows an envelope into a record, so the narrowing stays the single
place the two shapes are related.

**The three fixtures were not converted.** They are `(portal)`'s files. The
replacement is written out line for line in `FINDINGS.md` so adopting it is a
paste, and the one fixture worth doing sooner is named with the reason. A
migration PR that also rewrites another lane's tests is two reviews, which is the
same call `framework-65` made and for the same reason.

**`0216`, not `0215`.** See below — this is not the usual note.

---

## The numbering collision is now ahead of a merge, not behind one

Two **open** pull requests both claim `0215`:
[#485](https://github.com/jam-overture/loom/pull/485) (this lane's, unmerged) and
[#486](https://github.com/jam-overture/loom/pull/486) (`Loom signals`).
`primitives-28` on [#487](https://github.com/jam-overture/loom/pull/487) claims
`0217`, skipping `0216` — which is that lane reading the open branches rather than
only `main`, and it is the convention working better than it is written.

This branch took `0216`, the free number. Filed, and the repair is one line:
every brief and `docs/routines.md` say *take the next free number after re-reading
`main`*, and `main` is not where the claims are. It should read **after
re-reading `main` and the open pull requests** — which `pnpm decisions:index`
already assists, since it prints `note: 0215 has no record here — either one was
deleted, or the number is claimed on a branch that has not merged` for exactly
this case. Whichever of #485 and #486 lands second needs a renumber; that cost
was measured at nine citations and about fifteen minutes on 2 October.

This is the **fifth** same-day collision in six days. It is recorded rather than
re-argued: the recommendation (a band per lane) was made on 2 October with a
commitment not to raise it a fourth time without a ruling, and this is a new
fact, not the same ask.

---

## Findings

**Filed (2):**

1. *The assessment double exists; the three fixtures that needed it are still
   object literals* — for `Loom portal`, with the replacement written out and the
   `irreversibilityReasons` problem named.
2. *Two open pull requests both claim `0215`* — for `@jonathanbravecredit`, as
   above.

**Closed (1), and the Status line is not reachable from here.** The 2 October ask
this unit answers (*"…there is no double to reach for instead"*) was filed on
`framework-65-seventeen-levers-from-a-record`, which has not merged, so the entry
is not in this branch's `FINDINGS.md` and its Status cannot be edited from a
branch cut off `main`. The new entry says so and names the replacement text;
whoever lands #485 should flip it to
`closed by framework-66-an-assessment-a-test-can-ask-for`. Stated here rather
than left to be noticed.

---

## Gate

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`apps/loom/.next`, with the status written to a file and read in a separate
command.

| | `main` @ `f4d2b9c` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 173 files / **3,560** | **174** / **3,569** |
| `@loom/app` | 359 files / **6,322** | 359 / **6,322** |
| findings | 949 | **951**, 0 malformed |
| published exports | 1,233 | **1,236** (+3) |

**+9 root tests, all in one new file.** The application suite is **identical to
`main`**: no app test was added, changed or removed. **Nothing is skipped in
either suite** — measured, not assumed; `grep -i skipped` over the full verify log
matches two test *names* and no skip count.

The `main` baseline was measured, not quoted: a worktree at `f4d2b9c`, installed
and built, both suites run, `pnpm findings:check` and `docs:api` run there too —
which also confirmed `main` has no generated-reference drift of its own.

**One cross-lane file changed and it is generated.**
`apps/loom/app/(docs)/_lib/api/reference.generated.json` is the output of the
repository's own `pnpm --filter @loom/app docs:api`, regenerated because three
exports were added, and `*.generated.json` is `merge=ours` for this reason. No
hand edit, and `grep` found no place in `apps/`, `src/`, `docs/` or `lessons/`
where the export total is spelled out as a literal.

**Never red while working.** The new file passed first run; `stakes.test.ts` held
at 50 tests through the `NOTHING_MEASURED` swap.

---

## Scope

`src/testing/doubles.ts`, `src/testing/index.ts`,
`src/testing/assessment.test.ts`, `src/runtime/stakes.test.ts`, `decisions/`,
`reports/`, `FINDINGS.md`, and the generated API reference.
`git diff origin/main...HEAD -- 'apps/**'` touches **only** the generated file.
No route group, no primitive, no signal, and nothing a deployment renders.

---

## Open questions

1. **Should `AssessmentDraft` ever take a level?** Recommendation: **no**, and
   0216 says why. Flagged because the first caller who wants a record the Gate
   cannot emit will ask, and the answer should be *write the literal in the test
   that is about the boundary* rather than widening the double.
2. **Decision numbering**, with the fifth instance and the one-line repair above.
   Recommendation: amend the sentence to *`main` and the open pull requests*
   whatever is decided about bands. The maintainer's call; not raised again
   without one.
3. **The three fixtures** belong to `Loom portal` and are filed for them. If the
   preference is that the framework converts fixtures when it publishes a double
   that replaces them, say so and this lane will do it next run — it is a
   lane-boundary question, not a technical one.
4. **Is a committed transcript the convention for a `src/`-only unit?** This
   report's visual is a program's output rather than a screenshot, like the last
   two. The script that produced it was not committed, unlike the shot lists
   `0213` asks for. Recommendation: for a unit with no screen, the transcript in
   the report is enough.

---

## Later the same day — `main` arrived, and two of this report's open items closed themselves

`Loom merge` merged `main` into this branch at `f25007b` and regenerated the
decisions index and the API reference at `e06ad44`. **Both regenerations were
correct**: re-running `pnpm decisions:index` and
`pnpm --filter @loom/app docs:api` on the merged head produces no diff.

**The numbering collision resolved the way it had to.** #485, #486 and #487 all
landed. `0215` stayed with #485, **#486's record was renumbered to `0218`**, and
`0216` — taken by this branch after reading the open pull requests rather than
only `main` — needed no change. The prediction in the section above was that
whichever landed second would need a renumber; that is what happened, and the
fifteen minutes were spent by the lane that had to spend them. The one-line
repair to `docs/routines.md` is unchanged and still the ask.

**The finding this unit closes is now closed in this file.** It was written on
`framework-65-seventeen-levers-from-a-record` and so was unreachable from a
branch cut off `main`; #485 landed, the merge brought it in, and its Status now
reads `closed by framework-66-an-assessment-a-test-can-ask-for`. The note in the
entry filed earlier today, which told whoever landed #485 to flip it, has been
corrected to say it is done. Nothing else in that entry changed.

### The gate, re-measured against the `main` this branch now sits on

| | `main` @ `2b5e305` | this branch @ merged head |
| --- | --- | --- |
| `@jam-overture/loom` | 175 files / **3,638** | **176** / **3,647** |
| `@loom/app` | 363 files / **6,421** | 363 / **6,421** |
| findings | 958 | **960**, 0 malformed |
| published exports | 1,251 | **1,254** (+3) |

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`apps/loom/.next`, status written to a file and read in a separate command. The
baseline was measured again in a fresh worktree at `2b5e305`, not carried over
from the morning's table.

**The deltas are identical to the pre-merge measurement** — +1 root file, +9 root
tests, an application suite unchanged to the test, +2 findings, +3 exports. A day
of four other lanes' work landed underneath this unit and moved none of its
numbers, which is what an additive change to `src/testing/` should look like and
is worth having measured rather than assumed.
