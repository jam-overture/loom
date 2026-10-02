# Seventeen levers from a record

**Date:** 2026-10-02 · **Section:** §6 (telemetry), binding on §2 · **Lane:** `Loom daily build`
**Branch:** `framework-65-seventeen-levers-from-a-record`
**Records:** [0215](../decisions/0215-a-stake-rule-either-reads-a-policy-or-is-fixed-at-its-code-and-only-the-first-kind-can-be-asked-again.md).
**None superseded.**

---

## What this run did

`/portal/rules/what-if` shipped yesterday and can move **seven of a Gate
policy's seventeen fields**. The other ten move the *measurement*, and the
screen's own panel says so in those words:

> Re-measuring would mean weighing every change against the page as it stood at
> the time, which this screen does not have, so those are deliberately not
> offered rather than offered and quietly ignored.

Quoted rather than photographed: that screen is behind the portal's sign-in and
this run has no credentials for it, and **this unit has no screen of its own** —
it is `src/`. The visual is the table below, which is the capability's own output
against a real record, taken by a run and not typed.

**All ten are answerable now, from the record, running the Gate's own rules.**
This run did not touch the screen — that is `Loom portal`'s, and the finding
telling them what to call is filed. What shipped is the capability and the one
thing a caller must not get wrong about it.

---

## The table, first, because it is the argument

One change — a card reconfigured and a footer removed — judged once by the real
runtime, narrowed to a real journal record, then put to six policies that were
never in force:

```
the record, as the journal holds it:
  {"stakes":"medium","removedNodeCount":1,"affectedNodeCount":2,
   "configuredPropKeys":["variant"],"touchedPrimitiveTypes":["loom.card","loom.footer"],
   "stakeFactorCodes":["shallow-structural-change"]}

policy put to that one record                  level     reading
---------------------------------------------- --------- ----------------------------------
the deployment's own (recorded: medium)        medium    exact
protectedPrimitiveTypes: [loom.card]           high      exact
protectedPropKeys: [variant]                   high      exact
removalThresholds: {medium:1,high:2}           medium    exact
breadthThreshold: 2                            medium    exact
shallowDepthThreshold: 1                       medium    exact

the same policies, against a record written before the fields existed:
protectedPropKeys: [variant]                   medium    FLOOR — unreadable: protected-prop-configured
protectedPrimitiveTypes: [loom.footer]         high      FLOOR — unreadable: protected-type-removed
protectedPrimitiveTypes: [loom.footer] (full)  critical  exact
```

The first block is the ten levers, working. **The last two lines are the whole
reason this is not two fields on a schema.** A record missing one list reads
`high` where the full record reads `critical` — and the rule that went missing is
the one that reached the top. A screen showing that `high` as an answer would be
telling an operator the Gate would have *held* a change it would have *refused*.
So the floor is labelled, by name, rule by rule.

---

## What was asked for, and why it is not what shipped

`Loom portal` filed this on 1 October and the ask was precise: two optional
fields on `assessmentSummarySchema` — `affectedNodeCount` and
`configuredPropKeys` — so a host could rebuild a `StakeInput` and call
`assessStakes` for itself. The entry closes with *it is not this lane's to do:
0018 is explicit that the portal reads the framework through what it publishes.*

**Both fields shipped. The plan they were for does not work**, and finding that
out is most of this unit.

`assessStakes` takes a `ChangeAnalysis`, and an analysis carries six lists of
specifics — the unreachable targets, the unregistered types, the nodes whose
props their own primitive refuses, the questions nothing reads, the redirected
forms, the repointed regions. **None of them crosses the telemetry boundary**,
because each names parts of a particular page (0023). A caller assembling an
analysis from a journal would pass six empty lists and one fabricated id per
affected node. Five of those empty lists are the inputs to `critical` rules.

So every change the Gate **refused** would have re-measured as ordinary, and the
simulation would have been most wrong about exactly the changes an operator opens
the screen to ask about. A fabricated `[]` is not a cheap approximation here; it
is the failure mode pointed at the only interesting rows.

---

## The decision: two kinds of rule, and only one can be asked again

Fourteen rules were in one list and nothing named the difference between them.

**Seven are *measured*** — a field of the policy decides the answer. The three
protected-type rules, the protected-prop rule, large removal, breadth, shallow
restructuring. The facts they read are now a named type:

```ts
export type StakeMeasurement = {
  readonly insertedNodeCount: number
  readonly removedNodeCount: number
  readonly movedNodeCount: number
  /** `affectedNodeIds.length`. Breadth reads the count and never the ids. */
  readonly affectedNodeCount: number
  readonly shallowestAffectedDepth: number
  readonly touchedPrimitiveTypes: readonly PrimitiveType[]
  readonly removedPrimitiveTypes: readonly PrimitiveType[]
  readonly relocatedPrimitiveTypes: readonly PrimitiveType[]
  readonly configuredPropKeys: readonly string[]
}
```

Nine numbers and four lists of type and prop names — and **nothing that
identifies a node**, which is exactly the part a record can carry. The seven take
this instead of an analysis. `assessStakes` derives one with `stakeMeasurementOf`
and is otherwise unchanged, factor for factor and in the same order.

**Seven are *fixed at their code*** — no policy field can move them: discarded
work, an unreachable target, an unregistered type, refused props, an unread
question, a redirected submission, a repointed binding. A host turns those off by
declaring no vocabulary (0002) and cannot tune them, so the level belongs to the
rule rather than to the moment. `FIXED_LEVELS` declares each once and the factors
read it, because the level now has a second reader holding only a code.

The two lists are **filtered from `STAKE_FACTOR_CODES`**, not written out, so a
fifteenth rule joins one side by whether the table names it and neither list can
go stale.

Then the published way to ask:

```ts
const { level, factors, unreadable } = remeasureStakes(summary, candidatePolicy)
```

It calls `measureStakes` — the Gate's own seven, the same call `assessStakes`
makes — and turns each recorded fixed code back into its level with
`fixedStakeLevel`. Every factor says which half it came from: `remeasured` ran
again, `recorded` could not and did not need to.

**Nothing re-implements a threshold.** A copy of *large removal* living in a
portal would drift from the Gate months after it was made, silently, about the
one subject a person consults that screen to be sure of.

---

## `unreadable`, which is the part a reviewer should push on

0045 made a later telemetry field optional and never defaulted, on the ground
that `undefined` and `[]` are different claims. **This is the first consumer that
has to act on the difference rather than state it**, and the honest answer is not
a level.

A rule whose input the record does not carry is named in `unreadable`, and `level`
is then a **floor**: the true stakes are that level or higher. Empty is the claim
that the figure is exact.

What keeps that from swallowing the whole corpus is that a rule is unreadable
only when **this policy, on this record, could actually have reached the missing
field**:

| the record does not say | and it does not matter when |
| --- | --- |
| `removedPrimitiveTypes` | the policy protects nothing, or `removedNodeCount` is 0 |
| `relocatedPrimitiveTypes` | the policy protects nothing, or `movedNodeCount` is 0 |
| `configuredPropKeys` | the policy protects no prop key, or `configuredNodeCount` is 0 |
| `affectedNodeCount` | the four node counts cannot add up to `breadthThreshold` |
| `stakeFactorCodes` | never — all seven fixed rules go unreadable |

Each row is a fact about the record, not a default. The last measurable one is
the only inference: an insert or a remove contributes its whole subtree to both
the affected set and its own count, a move and a configure contribute one to
both, and the affected set is a set — so `affectedNodeIds.length` can never be
larger than the four counts added up. **That premise is a test, not a comment**:
the suite asserts it over the real analysis for every delta in its corpus, so a
change to how affected nodes are tallied breaks a test rather than quietly making
a record read narrower than it was.

This is what makes the breadth lever answerable over the journal that already
exists rather than only over records written after today.

---

## Decisions this run made that nothing specified

**Publishing a function rather than the fields the finding asked for.** Argued
above and written into 0215 with the rejected alternative named. The filed ask is
closed as *the two fields are there and that plan does not work*, which is a thing
worth saying out loud to the lane that filed it.

**A separate return type rather than `StakeAssessment`.** A `StakeFactor` carries
a `detail` sentence naming the nodes it found, and a re-measure holds no nodes. It
would have had to invent the sentence or leave it empty, and a type whose field is
a lie in one of its two producers is worse than two types.

**The vacuity rules.** Nothing asked for them and without them every record
written before today would read `unreadable` for breadth forever, which would make
the capability true and useless. Each is a one-line sound inference from a
required field.

**`source` on each factor.** Not asked for. A reader of that screen is entitled to
know which part of the answer was computed under the policy they are editing and
which part was taken as it stood.

**No surface was changed.** The screen's paragraph is wrong as of this merge and
stays wrong until `Loom portal` takes it — the same choice this lane made about
lesson 32 this morning and for the same reason. It is stated here rather than
discovered.

---

## Gate

`pnpm install && pnpm verify` — **green, exit 0**.

| | `main` @ `f4d2b9c` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 173 files / **3,560** | **174** / **3,611** |
| `@loom/app` | BASE_APP_FILES files / **BASE_APP_TESTS** | BRANCH_APP_FILES / **BRANCH_APP_TESTS** |
| findings | 949 | **951**, 0 malformed |
| published exports | 1,233 | **1,245** (+12) |

**+51 root tests**, all written this run: 46 for the re-measure, 4 for the
partition, 1 for the two new record fields. **The application suite is the same tests as
`main`** — none added, none removed. Two app-side files changed: the generated API
reference, and two fields added to one fixture in `(portal)`, described below.

The `main` baseline was measured in a worktree at `f4d2b9c` with its own `dist`
built, not quoted. Nothing was weakened, skipped or deleted.

**Red three times while working. Two were mine and one was a fixture in another
lane.**

Two expectations in the new suite were wrong where the code was right: a header
removal under a policy protecting `loom.header` floors at `high` and not `low`,
because `touchedPrimitiveTypes` is a required field and survives the loss of
`removedPrimitiveTypes` — which turned out to be the sharpest illustration of the
floor in the whole unit and is now the test's own comment. And `tsc` caught a
hand-built event envelope that `vitest` had been perfectly happy to run.

The third is worth a paragraph, because it is the third of its kind in two days.
`app/(portal)/_lib/write.test.ts` hand-builds a `ChangeAssessment` with ten of
`ChangeAnalysis`'s eighteen fields and casts the gap away with `as never`. Reading
two more fields of an analysis made the narrowing dereference `undefined`, so it
threw, so the journal was never reached — **and the failure arrived as
`expected "record" to be called at least once`, in a test about ordering.** Fixed
on this branch by adding `affectedNodeIds: []` and `configuredPropKeys: []` to the
fixture: two lines, no behaviour, and the fixture is more truthful than it was.

**The cause is filed against this lane, not that one.** `src/testing/doubles.ts`
publishes `buildIntent` and `buildProposal` and stops, so a surface that needs an
assessment has nothing to reach for but an object literal and a cast. The ask is a
`buildAssessment` beside the other two, and the two fixtures that hide the same
hole without being red yet are named in the entry. Not done here: adopting it
means rewriting another lane's test, and a pull request that fixes a break and
redesigns the doubles is two reviews.

**One process note, because it cost twenty minutes.** This run branched off a
*local* `main` that was 22 commits stale and got most of the way through a build
before noticing that six decision records were missing from disk. The work was
stashed and re-applied onto `origin/main` cleanly. `git log --oneline -1 main`
against `origin/main` is a two-second check and nothing in `docs/routines.md`
says to make it.

---

## Scope

`src/runtime/stakes.ts`, `src/telemetry/event.ts`, `src/telemetry/remeasure.ts`
(new), their tests, `src/telemetry/index.ts`, `decisions/`, `reports/`,
`FINDINGS.md`, and the generated API reference. Two app-side files: the generated API reference, and
two `[]` fields in `app/(portal)/_lib/write.test.ts`. `git diff origin/main...HEAD
-- src/primitives 'apps/loom/app/**/*.tsx' 'apps/loom/app/**/page.tsx'` is
**empty**. No primitive, no component and no word of screen copy is touched.

---

## Open questions

1. **Should `/portal/rules/what-if` set aside an unreadable row, or show it as a
   floor?** Filed for `Loom portal` with a recommendation (set aside and count,
   beside the rows whose recorded verdict does not reproduce) and it is their
   call. Either is honest; silently showing the floor is not.
2. **Reversibility is not re-measurable** and nothing has asked for it. The
   ladder's reversibility rung reads a recorded boolean, so the same gap exists
   one axis over, and it is a bigger job: `assessReversibility` reads the tree.
   Recorded rather than started.
3. **Decision numbering**, unchanged from this morning's report. No collision this
   time — `0215` was free after re-reading `origin/main`, which is the convention
   working by luck rather than by design, since any lane writing today is reading
   the same free number. Four lines in `docs/routines.md`, and the maintainer's
   call.
4. **A committed shot list**, asked twice and unanswered. This run has no shot to
   commit — nothing it changed draws anything — so the question is still open and
   is now three runs old.
