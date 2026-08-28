# 0096 — A record is amended in place when only the count moved

**Status:** Accepted
**Date:** 2026-08-28
**Section:** §2 — Composition Runtime

## Context

`decisions/README.md` has one rule for changing a record and it is a good one:
never edit a record to reflect a change of direction — mark it superseded, leave
its text intact, and write the replacement. The trail is the artefact.

It has no rule for the other thing that happens to a record, which is that the
decision stays exactly right and a fact about the shape it produced moves
underneath it.

0002 is the case that forced this. It records that the Gate is a pure function of
two axes and that the decision is an ordered list of rules, first match wins —
all of which is still true and none of which is in doubt. It also says how many
rules there are, and that number has been wrong since 4 August: 0035 added a
sixth rung and 0071 a seventh, and each of those is a record of its own that
quotes 0002's reasoning approvingly. Superseding 0002 would be false — nothing
was reversed. Leaving it alone means the entry point to the Gate misinforms every
reader who arrives at it.

It is not a small cost. The lessons lane wrote lesson 09 from 0002 on 16 August,
repeated the wrong count eleven times, numbered ten rung references one too low,
and put two review questions in front of the maintainer asking him to recall a
list with a rung missing. It took a week to notice, because every *executed*
output in the lesson was correct: the exercises run against a fixture with no
form in it, so the seventh rule never speaks.

The general form was named by that lane in the same finding, and it is wider than
this record: **nothing in this repository connects a list in `src/` to a sentence
that counts it**, in a record, a lesson, a documentation page or a marketing
claim. Four surfaces now describe this runtime in prose.

## Decision

**A record may be amended in place when the decision it records still stands and
only a fact about the shape has moved.** The amendment is a dated block directly
under the header, before `## Context`, naming what moved, which records moved it,
and stating plainly that nothing is reversed. The body is then corrected. The
record keeps its number, its status and its trail.

The line between this and superseding is what a reader would do differently. A
record whose *decision* a reader would now act on differently is superseded. A
record that would send a reader to write down the wrong number is amended.

**A number a record states about a list in `src/` is held against that list by a
test.** `src/record-claims.test.ts` is a registry: the record, an expression that
finds the counted sentence, and the list that settles it. Registering a claim
requires the pattern to match exactly once, so a record reworded past its own
registration fails rather than dropping out of the check unnoticed.

**The lists themselves are published rather than counted by their readers.** The
Gate's ladder is `ESCALATION_LADDER`, derived from the rules rather than declared
beside them; a union whose members cannot come from a schema names them through
`everyMemberOf`, which will not compile when the union grows and the list does
not. A surface that needs to know how many rungs there are asks the runtime.

## Consequences

- A rung inserted into the Gate turns `pnpm verify` red in two places at once —
  the ladder and every record that counts it — and the failure names the record
  to amend. This is the first check in the repository that can fail on a
  sentence.
- The registry is deliberately incomplete, and that is the design. Most numbers
  in a record are about the world, an argument, or something that no longer
  exists, and a sweep over every digit would be a test that fails on prose. A
  count nothing in `src/` settles is simply not registered.
- Amending has a cost the trail does not otherwise pay: the record no longer
  reads exactly as it did on the day it was accepted. The dated block is what
  keeps that honest, and it is why the amendment says what moved rather than
  silently correcting the number.
- Three claims are registered today, in 0001, 0002 and 0007. Every one of them
  was checked by hand for the first time while writing this, and one of the three
  was already wrong.
- The surfaces are not covered. A lesson, a documentation page and a marketing
  claim can each still count a list by reading the source, and this closes only
  the records. Those lanes can register their own claims against the same lists,
  which is now possible because the lists are exported; whether they should is
  theirs to decide.

## Alternatives considered

**Supersede 0002 with a corrected copy.** Rejected: it is untrue. Superseding
says the earlier reasoning no longer holds, and 0002's reasoning is quoted
approvingly by both of the records that made its count wrong. It would also lose
the thing 0002 is — the entry point to the Gate — by scattering it across three
numbers.

**Delete the count from the sentence.** Suggested in the finding, and it does end
the class: a record that says the Gate is *an ordered list of rules* cannot be
stale about how many. Rejected because it makes every reader poorer to protect
against a failure a test can catch. The count is load-bearing for a reader who
has not read the source, which is the reader a record is for.

**A dated footnote pointing at 0035 and 0071, with the number left alone.** The
cheapest fix, and it fixes today rather than the class — the next rung leaves
both the sentence and the footnote wrong. Taken as the *form* of the amendment
and rejected as the whole of it.

**Sweep every record for numbers and check them all.** Rejected: unimplementable
without a test that fails on prose. A number in a record is usually not about a
list, and the ones that are cannot be told apart by a pattern. Deliberate
registration is the cost of the check being trustworthy.

**Generate the sentence into the record from the code.** Rejected: it makes a
record partly generated, and `decisions/README.md` draws exactly one generated
boundary — the index table — with everything above it prose a person wrote. A
record whose paragraphs are assembled by a tool is not a thing a reader can trust
was reasoned.
