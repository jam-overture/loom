# 0216. A published double derives whatever the runtime derives

**Status:** Accepted
**Date:** 2026-10-03
**Section:** §2 — Composition Runtime

## Context

Three fixtures in two lanes spell a judged change out as an object literal, and
all three were written that way because there was nothing else to reach for.
`src/testing/` published `buildIntent` and `buildProposal` and stopped there, so
a surface that needed a `ChangeAssessment` had two options: run `assessChange`
against a real tree, which means owning a tree and a registry to get at a
number; or write the record out by hand.

Writing it out by hand has now failed twice in two days, in the same shape. A
lesson hand-built a `ShotResult` without `measured`, and a `(portal)` test
hand-built a `ChangeAssessment` with ten of `ChangeAnalysis`'s eighteen fields
and cast the gap away. Both broke when the framework read one more field, and
the second broke *silently sideways* — the failure arrived as
`expected "record" to be called at least once` in a test about event ordering,
because narrowing dereferenced `undefined.length` before the journal was
reached.

Incompleteness is the failure that gets noticed, eventually, by going red. It is
not the worse one. A `ChangeAssessment` has three internal agreements that no
type expresses:

- `stakes.level` is the highest level among `stakes.factors` — `assessStakes`
  computes it with `highestStake` and cannot do otherwise.
- `reversibility.reversible` is true exactly when `reversibility.reasons` is
  empty — `assessReversibility` assigns `reasons.length === 0`.
- `reversibility.retainedNodeCount` is `analysis.removedNodeCount` — the inverse
  has to carry back what the removal destroyed.

A literal can break all three and compile. One of the three fixtures already
carries an `irreversibilityReasons` entry that is prose rather than a reason
code, which is a record no run of Loom will ever produce. Nothing reads it, so
nothing is wrong today; the test is nonetheless asserting against a world that
does not exist.

## Decision

**`src/testing/` publishes `buildAssessment`, and its draft cannot say anything
the runtime would derive.**

`AssessmentDraft` takes a proposal, the facts about the delta a test cares about
as a `Partial<ChangeAnalysis>` over a complete zero default, the Gate factors,
and the reasons a change cannot be taken back. It takes **no** level, **no**
reversible flag, **no** retained count and **no** inverse delta. Each of those
four is computed from the draft by the same rule the runtime uses, so a caller
cannot contradict one.

Three further clauses:

1. **The complete default is declared once, in the lane that owns the type.**
   `NOTHING_MEASURED` is a `ChangeAnalysis` measuring nothing, and it is
   published. A field added to the analysis stops it compiling here, in the
   framework, rather than in whichever surface narrows that field next.
2. **A double's claims are held against a record the runtime produced**, in the
   same test run, rather than against a second reading of the same source.
   `assessment.test.ts` asserts the built record's fields are the measured
   record's fields at every level, and asserts each of the three agreements of
   both the double and a real `assessChange` result.
3. **One double covers the record as well as the assessment.** A surface needing
   an `AssessmentSummary` gets one by narrating a real envelope through
   `recordOf`, so no fixture need spell that shape out either.

This is not a claim that `buildAssessment` is `assessChange`. The real one
measures a delta against a tree, so reaching a particular Gate rule through it
means crafting a delta that raises exactly that rule — the right test for the
Gate, and absurd apparatus for a screen that needs a critical change to draw.
The double assembles the record directly and is honest about which of its
contents are derived.

## Consequences

A field added to `ChangeAnalysis`, `StakeAssessment` or `Reversibility` is a
compile error in `src/testing/doubles.ts` and nowhere else, provided fixtures
adopt the builder. The three that have not are named in `FINDINGS.md` for their
owner, with the replacement written out; until they adopt it the old failure
mode remains available to them.

A test can no longer write down a level that disagrees with its factors. That is
the point, and it is also the cost: a test *about* a malformed record — a journal
asked to store a level no factor supports — has to build that literal itself, and
should, because it is testing the boundary rather than standing a change in.

`NOTHING_MEASURED` is API. Its field values are now something a host may depend
on, and the zeroes and empty lists are the promise: nothing measured, not
nothing known.

## Alternatives considered

**Add the two missing fields to the fixture and stop.** What
`framework-65-seventeen-levers-from-a-record` did, deliberately, to keep `main`
green without redesigning anything in a bug-fix branch. Rejected as the end of
it: it is the third such patch in two days and it leaves the next field's
failure exactly where this one was.

**Let the draft override the four derived values.** The obvious generous
builder, and the one a caller will eventually ask for. Rejected because the
generosity is the defect: a fixture that can state a level independent of its
factors is a fixture that can assert a screen renders correctly for a record the
Gate cannot emit, and the screens reading these records are the ones whose whole
credibility is that they never show a number nothing stands behind. A test that
genuinely needs an incoherent record is testing a boundary and can write the
literal.

**Make `buildAssessment` call `assessChange` over `sampleTree`.** Maximally
honest, and it was tried on paper first. Rejected: the caller then specifies a
*delta* rather than the facts it cares about, so a test wanting
`invalid-props` at `critical` has to construct a tree, a props vocabulary and an
operation that offends it. That is `gate.test.ts`'s job and it already does it.

**A second builder for `AssessmentSummary`.** Rejected as a copy with a
boundary in the middle. `recordOf` already narrows an envelope into a record and
is already published, so a summary fixture is one call away from an assessment
fixture, and the narrowing stays the single place the two shapes are related.
