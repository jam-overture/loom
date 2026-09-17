# 0166 — A list that ranks is checked where it is written, and a level the scale cannot place is the heaviest one

**Status:** Accepted for the first half (the completeness check), **Proposed for
the second** (the rank of an unplaceable level), which is blocked on a lesson
rewrite in another lane and is not in the branch this record lands on
**Date:** 2026-09-17
**Section:** §2 — Composition Runtime

## Context

`Loom lessons` filed it on 15 September while ranking every completeness check
in the runtime to explain why `everyMemberOf` exists. Two published lists still
claimed to name every member of a union with nothing checking either. One of
them is what the Gate ranks with.

`STAKE_ORDER` is a hand-written copy of `stakeLevelSchema`'s four members, and
`stake-level.test.ts` compared it against a third hand-written copy of the same
four strings. So the test failed when somebody edited the copy and passed when
somebody added a member to the schema — which is the edit that matters, because
`rankOf` is `STAKE_ORDER.indexOf(level)` and `indexOf` answers `-1`.

Measured on this checkout with a fifth level cast in to stand for the day
somebody adds one:

```
indexOf: -1   compareStakes(fifth, low): -1   isAtLeast(fifth, critical): false
highestStake([low, fifth]): low
```

A level meant to sit above `critical` ranks beneath `low`. The finding inferred
the consequence from `gate.ts`; this run measured it end to end, and it is worse
than a missing factor. Under `defaultGatePolicy`, whose `refusalFloor` is
`critical`:

| stakes level on the assessment | the Gate |
| --- | --- |
| `critical` | **rejected** — `stakes-at-refusal-floor` |
| a level the order does not name | **accepted** — `within-policy` |

Both stakes rules ask a question whose safe-sounding answer is `false`: not at
the refusal floor, not above the ceiling. So the one change the Gate could not
weigh was the one it applied with nobody asked. The failure is silent, and it
opens rather than closes.

Nothing is broken today: `stakeLevelSchema` has four members and refuses a fifth
at its boundary. What was here is that the mechanism protecting the Gate's
arithmetic from a one-line schema edit was a test restating its own subject.

The second list, `UNJUDGED_REASONS`, is the smaller and odder half.
`src/tree/delta.ts` names it in prose as an exemplar of the remedy — *"the same
one `EPISODE_RESOLUTION_KINDS` and `UNJUDGED_REASONS` already are, and it costs a
line"* — and it was a bare literal. Its neighbour in that sentence was guarded;
it was not.

## Decision

**1. Both lists are checked where they are written**, with `everyMemberOf`. A
member added to either union stops the declaration compiling, in the file that
is wrong, rather than failing a test elsewhere or failing nothing.

**2. `STAKE_ORDER` stays spelled out rather than derived from
`stakeLevelSchema.options`.** `everyMemberOf` forces the list to be complete and
leaves the order explicit, which is the smaller change and the honest one: the
order is arithmetic the Gate reads, and the set is not.

**3. A level the order does not name ranks above every level it does** —
`rankOf` answering `STAKE_ORDER.length` rather than `-1`. **Proposed, and
deliberately not in this branch.** Lesson 25 teaches this arithmetic as its
worked example: exercise D prints the six lines above, `transcripts.test.ts`
re-runs that fenced block against the live runtime, and several paragraphs of the
lesson's argument turn on `isAtLeast(fifth, "low")` being `false`. Making the
change here turns `pnpm verify` red for four surfaces until the lesson is
rewritten, and rewriting a lesson's central worked example is `Loom lessons`'
content, not this lane's. Filed for them with the order it has to be done in:
their half first, then this line and the block in `stake-level.test.ts` that
currently pins the wrong direction on purpose.

Decision 1 is what makes this deferral cheap rather than a shrug. The route the
finding was worried about — somebody adds a fifth member to `stakeLevelSchema`
while thinking about something else — now stops the declaration compiling. What
decision 3 still covers is a level that never passed through the types: cast at a
seam, or read off a record a newer deployment wrote. That is the smaller half,
and it is the half being deferred.

**4. The test asserts the properties, against a second source.** `STAKE_ORDER`
is held against `stakeLevelSchema.options` as a sorted list plus a duplicate
check — the shape `gate.test.ts` already uses for `ESCALATION_LADDER` — and the
order is asserted through `isAbove` on adjacent pairs, which is what the order
means rather than what it is written as. The literal is gone.

## Consequences

**A fifth stake level is now a compile error** rather than a silent
misranking — in `stake-level.ts`, which is the file that would be wrong. The
same for a fourth unjudged reason, in `calibration.ts`. Neither union is expected
to grow, which is exactly why neither was being re-checked.

`src/tree/delta.ts`'s sentence naming `UNJUDGED_REASONS` as an exemplar of this
remedy became true.

Nothing the Gate decides changed in this branch. No rule, no reason code, no
union widened, no behaviour altered — the whole diff is a type-level check, two
doc comments and the tests.

**What is still wrong, and is now pinned rather than merely known.** An
unplaceable level still ranks beneath `low`, and `stake-level.test.ts` asserts
that in the wrong direction on purpose, with a comment saying so and pointing
here. When decision 3 lands that block inverts. The alternative — deleting the
block and leaving the behaviour untested until the lesson catches up — makes the
defect quieter without making it smaller.

When decision 3 does land: an unplaceable level is refused where the same policy
refuses `critical`, carried into the disposition unchanged so the record says
which level could not be placed, and lets `highestStake` fold to it rather than
dropping it. Two unplaceable levels will compare equal, which is accepted rather
than overlooked — the rank is *at the top of the scale*, not *ordered among
things off it*, and there is no evidence available to order them by.

## Alternatives considered

**Derive `STAKE_ORDER` from `stakeLevelSchema.options`.** Nothing could drift,
which is the strongest version of completeness. Rejected: it makes the order a
member is *declared* in load-bearing for what the Gate does about it. The two
coincide today only because the schema happens to be written in severity order,
and a contributor reordering an enum for readability would be silently editing
the Gate. A list that has to be complete and a list that has to be in an order
are different claims, and only one of them a schema can make.

**Leave `rankOf` and rely on the compile-time check alone.** The types now make
the list complete, so `-1` is unreachable through them. Rejected: the routes that
skip the types are exactly the routes that carry a level from somewhere else — a
cast, a persisted disposition, a newer peer — and those are the cases where
failing open is worst.

**Make `rankOf` throw, or return a `Result`.** Honest, and it matches the
project's dislike of a silent answer. Rejected both: `src/result.ts` opens with
*"Loom never throws across a module seam"*, and a throw here reaches a Gate whose
whole contract is that it is a total pure function from an assessment to a
disposition. A `Result` would push that same total-function question up into
`gate.ts` and every caller of it, to describe a case the types already prevent.
The refusal *is* the report: the disposition names the level it could not place,
which is louder than a log line and lands where a reviewer is already looking.

**Rank an unplaceable level at the bottom deliberately, and file it.** Rejected
without much weighing — that is what it did, and the run measured what it costs.

**Land decision 3 and rewrite lesson 25 in the same branch.** It is one argument
and it would arrive whole. Rejected: the lesson's spine is this defect — a
warm-up exercise quoting the old test in full, a taxonomy row naming it, exercise
D and three paragraphs reading its transcript line by line. Rewriting that is
writing a lesson, which is a surface this lane does not own, and a migration-sized
content change buried inside a framework diff is the kind of PR that cannot be
reviewed. Filed instead, with the order stated.

**Leave `stake-level.test.ts`'s literal alone, so lesson 25's warm-up exercise
goes on quoting a test that exists.** Rejected: the exercise asks a reader to say
what that test fails to protect against, and the answer is now *nothing, it was
replaced* — which is a better outcome for the repository and a stale quotation
for the lesson. A test kept bad so a lesson can keep citing it is the tail wagging
the dog. Filed with the rest of the lesson-25 drift.

**Guard the other lists in the same sweep** — `TREE_OPERATIONS`,
`TELEMETRY_EVENT_TYPES`, `COMPOSITION_OUTCOME_KINDS`. Each is one line. Rejected
for this unit: all three already fail something when a member is added (a test
against `schema.options`, a `Record` that stops compiling), and
`TELEMETRY_EVENT_TYPES` carries a doc comment arguing for the test it has,
against the schema that is its boundary. Moving a working check is refinement
inside a finished section. The two in this record are the two that failed
nothing.
