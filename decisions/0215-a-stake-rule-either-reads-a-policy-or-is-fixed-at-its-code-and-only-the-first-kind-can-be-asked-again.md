# 0215. A stake rule either reads a policy or is fixed at its code, and only the first kind can be asked again

**Status:** Accepted
**Date:** 2026-10-02
**Section:** §6 (telemetry), binding on §2

## Context

`/portal/rules/what-if` replays every judgment a deployment has recorded against
a policy a reader is editing, and reproduces each recorded verdict under the
deployment's own policy before it is believed. It can move **seven of a
`GatePolicy`'s seventeen fields.** The other ten move the *measurement*, and the
portal lane filed the gap on 1 October: the stakes **level** is on the record and
how the level was arrived at is a function of a page as it stood that day.
Offering those ten and holding the level fixed would answer every question with
*nothing would change*, which is a lie shaped like a result.

The finding asked for two optional fields on `assessmentSummarySchema` —
`affectedNodeCount` and `configuredPropKeys` — so that a host could rebuild a
`StakeInput` and re-run `assessStakes` itself. **A host cannot do that, and the
reason is the decision.** `assessStakes` takes a `ChangeAnalysis`, which carries
six lists of specifics — the unreachable targets, the unregistered types, the
nodes whose props their own primitive refuses, the questions nothing reads, the
redirected forms, the repointed regions. None of them crosses the telemetry
boundary, because each names parts of a particular page (0023). A caller
assembling an analysis from a record would have to pass six empty lists and a
fabricated id per affected node — and five of those empty lists are inputs to
`critical` rules, so **every change the Gate refused would re-measure as
ordinary.** The simulation would be most wrong about exactly the changes an
operator came to ask about.

Two kinds of rule were being held in one list, and nothing named the difference.

## Decision

**The Gate's fourteen rules are partitioned, and the partition is published.**

A rule is **measured** when a field of the policy decides its answer: the three
protected-type rules, the protected-prop rule, large removal, breadth, shallow
restructuring. The facts those seven read are named as `StakeMeasurement` — nine
numbers and four lists of type and prop names, and nothing that identifies a node
— and they take it instead of a `ChangeAnalysis`. `assessStakes` derives one with
`stakeMeasurementOf` and is otherwise unchanged, factor for factor and in the same
order.

A rule is **fixed** when no policy field can move it: discarded work, an
unreachable target, an unregistered type, refused props, an unread question, a
redirected submission, a repointed binding. A host turns those off by declaring
no vocabulary (0002) and cannot tune them, so the level belongs to the rule.
`FIXED_LEVELS` declares each one once and the factors read it, because the level
now has a second reader that holds only a code.

`FIXED_STAKE_FACTOR_CODES` and `MEASURED_STAKE_FACTOR_CODES` are filtered from
`STAKE_FACTOR_CODES`, so a rule added to the vocabulary joins one side by whether
the table names it and neither list can go stale.

**`remeasureStakes(summary, policy)` is the published way to ask a record what it
would have been.** It runs `measureStakes` — the Gate's own seven, not a copy —
against a measurement assembled from the record, and turns each recorded fixed
code back into its level with `fixedStakeLevel`. Each factor says which it was:
`remeasured` or `recorded`.

**A rule whose input the record does not carry is named in `unreadable`, and the
level is then a floor rather than an answer.** 0045 made a later telemetry field
optional and never defaulted, on the ground that `undefined` and `[]` are
different claims; this is the first consumer that has to act on the difference
rather than state it. A rule is unreadable only when this policy on this record
could actually have reached the missing field — a host protecting nothing is not
asking about protected types, a change that removed no nodes removed no types,
and breadth is readable whenever the four node counts the record always carries
cannot add up to the threshold. So an ordinary record under an ordinary policy is
readable in full, including records written before today.

Two fields are added to `assessmentSummarySchema`, optional per 0045:
`affectedNodeCount`, because breadth reads a length and never the ids, and
`configuredPropKeys`, because prop names are host vocabulary where prop values
are what a visitor reads.

## Consequences

**The simulation becomes seventeen fields instead of seven**, and every one of the
ten new ones runs the Gate's code rather than a second implementation of it. A
copy of *large removal* in a portal would drift from the Gate months after it was
made, silently, and about the one subject a person consults the screen to be sure
of.

**A caller must read `unreadable` before showing a level.** Empty is the claim
that the figure is exact; non-empty means the true stakes are that level or
higher, and a surface either says so or sets the row aside. `/portal/rules/what-if`
already sets aside every change it cannot reproduce, so this is the same
discipline one step earlier in the same screen.

**Records written before today answer less, and say which less.** They carry no
`configuredPropKeys`, so a policy that protects a prop key cannot be asked about
a change that configured one — and gets told so by name rather than being handed
a `low`.

**The record grew by one number and one bounded list per assessment.** No node id
and no prop value crosses that did not cross before, which is the test
`event.test.ts` now holds.

**The two-kind split is binding on §2.** A rule added to the Gate must say which
kind it is, by appearing in `FIXED_LEVELS` or not, and a rule that reads both a
policy field and a list of specifics would not fit this frame. None of the
fourteen does today.

## Alternatives considered

**Two optional fields and nothing else**, as filed. Rejected: it does not reach
the stated goal. The caller still cannot build a `ChangeAnalysis` without
fabricating ids and six empty lists, and the five empty lists it would have to
fabricate are `critical` inputs, so the answer it computed would be wrong
downward on refusals.

**Journal the six lists of specifics** so the whole analysis can be rebuilt.
Rejected: that is content — node ids, prop paths, endpoint names, the sentences a
factor wrote — and 0023 keeps it out of the record. It would also grow every
record by an unbounded amount to answer a question the codes already answer.

**Default the absent fields to `[]` and return a level with no caveat.**
Rejected, and it is the reason `unreadable` exists. It is 0045's loss case
exactly: an operator asking *would protecting `loom.card` have caught any of
this* would be told *no* by every record written before the field, with nothing
to distinguish that from a measurement.

**Let `remeasureStakes` return a `StakeAssessment`**, so the two paths share one
type. Rejected: a `StakeFactor` carries a `detail` sentence naming the nodes it
found, and a re-measure holds no nodes. It would have to invent the sentence or
leave it empty, and a type whose field is a lie in one of its two producers is
worse than two types.

**Have the portal reproduce the measurement and guard it with a build-time
check**, as it already does for the ladder's rungs. Rejected: the ladder
comparison is eight comparisons against fields that are on the record, where this
is fourteen rules with thresholds, severity ordering and a vocabulary. The
existing guard is affordable because what it guards is small.
