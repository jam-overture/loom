# 0198. A refusal records which rules it broke, and the rules' names are a closed vocabulary

**Status:** Accepted
**Date:** 2026-09-27
**Section:** §6 (telemetry), binding on §2

> **30 September 2026.** Two counts in the table below moved from *thirteen* to
> *fourteen* when [0208](0208-a-question-nothing-reads-is-refused-before-it-is-written.md)
> added `unread-binding`. Maintained rather than superseded: nothing this record
> decides has changed, and `src/record-claims.test.ts` exists to fail until the
> arithmetic in the prose agrees with the list in `src/`.

## Context

`assessStakes` returns a level and the factors that produced it, and the second
half is the useful one: *"high stakes"* is not feedback, *"this removes 14 nodes
and touches commerce.checkout"* is. That argument is written at the top of
`src/runtime/stakes.ts` and it has been true inside a request since the Gate was
written.

It stopped at the request boundary. `summariseAssessment` narrows a
`ChangeAssessment` for the journal — correctly, under
[0023](0023-telemetry-narrows-the-stream-and-never-copies-the-log.md), because an
event carries whole trees and a record must not — and what it kept of the stakes
was `stakes`, the single highest level anything reached. The factors did not
cross. So a stored refusal said *critical* and nothing else.

**That was survivable while one rule was critical and is not now.** When the
summary was written, `protected-type-removed` was the only factor at the top of
the scale, and `removedPrimitiveTypes` crossed with a comment saying so: *the
input to the only `critical` stake factor*. Since then
[0173](0173-a-change-may-not-add-a-node-the-deployment-cannot-draw.md) added
`unknown-primitive` and
[0179](0179-what-a-primitive-accepts-is-a-vocabulary-the-write-path-is-handed-not-a-field-on-a-policy.md)
added `invalid-props`, both `critical`, and `nested-target` had already arrived.
Four rules now produce the same word in the record.

`Loom portal` filed what that costs, on 23 September, from
`portal-35-what-it-objected-to`:

> *This project turned down four changes as too risky* and *this project turned
> down four changes because the AI invented parts that do not exist here* are the
> same row, and only the second is a thing an operator can act on.

Both screens that read the journal are affected. `/portal/rules` attributes a
count to a rule and could only attribute it to the *reason code the Gate
recorded*, which is `stakes-at-refusal-floor` for every one of them.
`/portal/trust` groups calibration by what the Gate did, so a model confidently
inventing primitives — the single most legible failure mode a catalogue has — is
folded in with changes that were merely large. The portal's workaround is to tee
the `change-assessed` event and read `stakes.factors` off it inside the request,
which works for the screen a person is looking at when the refusal happens and
cannot work for anything read back later, which is most of what a portal shows.

## Decision

**A `change-assessed` record carries the codes of every factor the Gate raised,
in the order it raised them.** `stakeFactorCodes` joins `AssessmentSummary`,
optional and never defaulted, under
[0045](0045-a-telemetry-field-added-later-is-optional-forever.md):
a record written before the field did not decline to name its rules, it could
not, and an empty array in its mouth would be a finding it never made. An empty
array on a new record is a different fact and a real one — the Gate looked and
raised nothing.

**The codes cross and nothing else does.** Three things could have:

| | crosses | why |
| --- | --- | --- |
| `code` | **yes** | one of fourteen fixed strings, naming a rule and nothing about the change |
| `detail` | no | a sentence naming nodes, types and endpoints. It is content, and content is what 0023 keeps out |
| `level` | no | recoverable. Thirteen of the fourteen are fixed at their code; `large-removal` is decided by `removedNodeCount`, which the summary already carries, against the `removalThresholds` of the policy `policyFingerprint` already names |

**And `StakeFactorCode` becomes a schema**, because the codes now leave the
process and anything crossing that boundary is parsed on the way back in.
`stakeFactorCodeSchema` is the declaration and the type is inferred from it;
`STAKE_FACTOR_CODES` is `schema.options` rather than a second hand-written list,
which is the case `closed-set.ts` explicitly says needs no `everyMemberOf`.

This is deliberately *not* the bargain `telemetryFailureSchema.code` makes. That
one is an open string so that adding an error code somewhere else in the codebase
cannot invalidate yesterday's records. A stake factor is not an error: it is the
Gate's own vocabulary, in the same position as `stakeLevelSchema` and
`dispositionReasonSchema`, which already cross as closed enums. A record naming a
rule this version has never heard of is a record it genuinely cannot interpret,
and refusing to parse it is the honest answer rather than a cost.

## Consequences

- **The thirteen rules become groupable.** `/portal/rules` can count refusals by
  the rule that caused one instead of by a reason code shared across all of them,
  and `/portal/trust` can separate a model that invents parts from a model that
  is merely bold. Neither is this lane's to build, and both now have the field.
- **`removedPrimitiveTypes` keeps its place and loses its stated reason.** Its
  comment claimed it was the input to the only critical factor. What it actually
  earns is the half a code cannot say: `protected-type-removed` says a rule
  fired, `removedPrimitiveTypes` says what it fired about. The comment now says
  that instead.
- **The list is walkable, so a cast stops standing in for it.** Two surfaces hold
  a `Record<StakeFactorCode, string>` of plain-language sentences and both reach
  for `Object.keys(...) as StakeFactorCode[]` to iterate it. Neither is this
  lane's file; the list they were missing now exists.
- **A fourteenth rule is three edits, all of them forced.** The schema, and two
  counted sentences: this record's *thirteen*, registered in
  `src/record-claims.test.ts`, and the surfaces' tables, which are total over the
  union and stop compiling. Nothing about the fourteenth is silent.
- **A record written by a newer deployment does not parse on an older one.** That
  is the cost of a closed vocabulary, it is the cost `stakeLevelSchema` already
  carries, and the failure is loud rather than a code silently read as absent.

## Alternatives considered

**The whole factor, `{ code, level, detail }`.** Rejected on `detail`: it is a
sentence naming nodes and types, which is exactly the content 0023 exists to keep
out of a retained, aggregated corpus. Keeping `{ code, level }` and dropping
`detail` was closer, and was rejected because the level is derivable from fields
the record already carries — a second copy of a fact is how two readings of one
record start disagreeing.

**A boolean, `refusedAsUndrawable`.** The narrowest thing that answers the
portal's actual question, and rejected for being shaped to one question. Eleven
other factors would still be invisible, and the twelfth question would need a
second boolean.

**Widening `DispositionReason` instead, so the Gate records *why* at a finer
grain.** This is the more expressive change and it is the wrong lane's: the
disposition is the Gate's verdict and its reasons are about policy comparison
(`stakes-at-refusal-floor` is a true statement about a ceiling). What was missing
is not a finer verdict but the facts the verdict was reached from, which is what
an assessment summary is for.

**Leaving it, on the grounds that the portal's tee works.** Rejected because it
works only during the request that produced the refusal. A journal exists to be
read back, and a field that has to be recomputed from an event nobody kept is not
in the journal.

**Keeping `StakeFactorCode` a bare union and writing the codes as strings in the
telemetry schema.** Rejected: the record would parse a code no rule can raise,
and the two hand-written lists would be free to drift. The schema is what makes
`STAKE_FACTOR_CODES` a derivation rather than a copy.
