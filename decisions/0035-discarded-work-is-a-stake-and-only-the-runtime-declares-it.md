# 0035. Discarded work is a stake, and only the runtime may declare it

**Status:** Accepted — partially supersedes 0032
**Date:** 2026-08-04
**Section:** §2 → §5

> 0032 decided that an undo whose target was built on afterwards "is not proposed
> at all", and in the same breath named the successor: "offering it *only* as a
> held proposal is the obvious refinement and is left open; it needs the Gate to
> be told that a change is contested … and adding one is a §2 contract change
> worth its own record." Its stated reason for rejecting was a limitation rather
> than a principle — "the Gate cannot see the difference between a clean undo and
> a partial rollback" — and this record removes that limitation, which is what
> "left open" invited. 0032's text is unchanged; only its status line records the
> partial supersession, and the reversal is flagged for review on the PR.

## Context

A `TreeDelta` is self-contained. That is 0001's whole argument for four discrete
operations: each one is individually reviewable, and understanding one never
requires fetching something else. It is also why a delta cannot express the one
fact that matters most about an undo.

"Set this text back to what it was" and "set this text back to what it was,
throwing away what two people wrote afterwards" are the same operation. The
difference is not in the delta, the tree, or the policy — it is in the log, and
the Gate has never been given a log. So `planRevert` computed the overlap, found
it, and the write path refused the revert rather than offering a change the Gate
would have waved through.

Refusing is the wrong answer to the right worry. The tree the reverter wants back
is recoverable — the log has every revision — so what the runtime was actually
doing was deciding, on the user's behalf and without asking, that they may not
have a rollback that costs something. 0019 makes the portal a review queue
precisely so that "this costs something, do you want it" is a question the
software is able to ask.

Three shapes were available for telling the Gate, and they differ in what the
Gate is allowed to be.

## Decision

**Work a change would write over is a stakes factor, declared on the proposal by
whatever computed the delta from a log.**

- **`ProposedChange.discards`** is an optional list of `{ revision, nodeIds }`.
  Absent means *not declared*, which is what every model-authored proposal is and
  will stay; it does not mean "checked and clean".
- **The factor is `discards-later-work`, at `high`.** It joins the six existing
  factors on the stakes axis, so `StakeAssessment` explains itself the way it
  already does: "discards work from revisions 4, 6 at 3 nodes".
- **The Gate gains a rule, not an axis.** `confirmDiscardsLaterWork` fires on the
  factor's presence and escalates to `requires-confirmation`. It sits after
  `confirmIrreversible` and before `confirmAboveCeiling`: below the refusal floor,
  so a host that has declared this much damage refusable still gets a refusal, and
  above the ceilings, so no origin's latitude can auto-apply it.
- **A model can never set it.** The reply grammar has no production for it and
  `modelInterpreter` builds its proposal field by field, so the only writer is an
  in-runtime interpreter. `revertInterpreter` is the first.
- **A revert plan reports rather than refuses.** `planRevert`'s `contested`
  outcome is gone; a `revertable` plan carries `discards`, empty for a clean undo.
  `revertRevision` proposes either way, and the `not-revertable` outcome now means
  only that no undo could be computed at all.

The declaration is trusted rather than recomputed because it can only ever make
the Gate stricter. 0002 rejected declared *reversibility* on the grounds that it
is "a claim rather than a computation" — and it was right, because that claim
buys latitude. A claim that costs its own author latitude needs no such defence:
the worst a lying declaration achieves is asking a person about a change nobody
had to be asked about.

## Consequences

- **A contested undo is now reachable.** It arrives in the review queue with the
  revisions it would write over named in both the disposition's reason and the
  proposal's rationale, and answering it applies it like any other hold. The
  discarded revisions stay in the log, so undoing the undo restores them: this is
  damage, not permanence, which is why it lands on stakes and not reversibility.
- **The Gate still sees exactly two axes and a policy.** A third input would have
  contradicted 0002; folding the declaration into the damage estimate in
  `assessChange` keeps the Gate's signature and its purity untouched, and keeps
  the "no input feeds both axes" rule intact — nothing about reversibility changes
  when a proposal declares a discard.
- **`assessStakes` takes a record, not a trailing argument.** `StakeInput` groups
  the analysis with the declaration for the reason `Commit.answeredBy` gives: an
  input that can be left off the end is one that will be, and leaving this one off
  silently lowers the stakes of a change that discards work.
- **`high` is a deliberate not-`critical`.** Critical is where the default refusal
  floor sits, and refusing is the behaviour this record replaces. A host that
  wants the old behaviour composes it — `refusalFloor: "high"` — rather than
  getting a second knob, which is 0002's own answer to "I want a hard block".
- **Contest detection stays conservative and asymmetric**, exactly as 0032
  describes: it compares the node ids two deltas *name*, so it over-reports where
  an insert names its parent and under-reports where a removal takes a subtree it
  never names. The cost of over-reporting has gone down, though — it used to buy a
  refusal, and now it buys a question.
- **A held undo is answered somewhere else than it is asked for.** Undo lives on
  `/history` and every hold queues on the tree's page, so the portal's report says
  where to go. A reviewer told "waiting on you" with nowhere named is the failure
  mode this exists to avoid.
- **The declaration outlives the request.** A hold is persisted and re-judged when
  someone answers it (0021), so `discards` is part of `proposedChangeSchema` and
  round-trips through JSON. A confirmation re-assesses, the factor fires again, and
  `confirmChange` applies rather than holding a second time — a person has already
  answered the question the rule exists to ask.
- **Nothing else can declare it yet, and that is a real limit.** The concept
  generalises past reverts — any interpreter that derives a delta from history
  could use it — but the runtime cannot verify a declaration, only trust it in the
  safe direction. If a host ever wires an interpreter that declares discards it
  did not compute, the result is spurious holds, not spurious applies.

## Alternatives considered

**A `contested` field on `ChangeAssessment`, as 0032 sketched.** The direct
reading of what 0032 asked for: give the Gate a third input beside stakes and
reversibility. Rejected because 0002's two axes are a contract the renderer, the
portal, and telemetry all read, and "the Gate is a pure function of two
independent axes" stops being true the moment there is a third. It would also
have put the field on the assessment, which is computed per judgment and thrown
away — so a held proposal read back from storage would have lost the reason it was
held, and the confirmation path would have re-assessed it as a clean undo and
applied it. The declaration has to live on the thing that gets persisted.

**Express it as a level rather than a rule.** Make the factor `critical` and let
the existing refusal floor catch it. Rejected: `critical` at the default floor is
a refusal, which is the behaviour being replaced, and any level below it is
subject to the per-origin ceilings — so the same contested undo would hold for a
`user-instruction` and auto-apply for a `developer`. What must not happen — work
discarded with nobody in the loop — does not depend on who asked, and a per-origin
mechanism cannot say that.

**Lower the proposal's confidence instead.** A contested undo could be given a
confidence below `minimumConfidence` and picked up by the existing rule. Rejected
as dishonest twice over: the inverse is computed exactly, so the self-grade is 1
(0007), and the confidence channel feeds calibration (0031), which would learn
that the deterministic interpreter is unreliable. A signal that means two things
means neither.

**Force the hold in the write path.** Have `revertRevision` see a contested plan
and take the proposal into custody regardless of what the Gate said. Rejected
outright: it makes a disposition something other than the Gate's answer, and 0002's
"the rule that fired is the explanation" is what makes every verdict auditable. A
hold nobody's rule asked for is a hold nobody can explain.

**Let the Gate read the log.** Give it a reader and let it compute the overlap
itself. Rejected: the Gate is pure, synchronous, and testable with no store —
which is what makes both the portal's preview and telemetry's replay possible.
Handing it IO to answer one question would cost the property every other
component depends on.

**Keep refusing, and offer a "revert to revision N" instead.** Rather than a
contested undo, compute a delta that makes the tree match an old revision
wholesale. Rejected as a different feature wearing this one's clothes: it discards
*more* work, not less, and it discards it silently, since a whole-tree diff names
no revisions at all. Worth building one day, on the same declaration this record
adds.
