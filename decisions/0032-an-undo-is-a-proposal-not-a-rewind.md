# 0032. An undo is a proposal, not a rewind

**Status:** Accepted — partially superseded by 0035
**Date:** 2026-08-02
**Section:** §2 → §5

## Context

Since day 2 the runtime has computed the inverse of every change before deciding
whether to allow it. `assessReversibility` produces the inverse delta up front —
that is what makes `reversible` a computed property rather than a guess (0002's
two axes depend on it) — and the inverse travels through the assessment, into the
`change-applied` event, and out of `composeChange` in the `applied` outcome.

Nothing ever applied it. `invertDelta` had exactly one caller and it was the
assessor. So "reversible" was a claim the runtime made about a change and was
never asked to honour: a deployment could be told a change was undoable and have
no way to undo it.

Closing that leaves one real question, and it is not "how do we apply the
inverse". It is **what an undo is**. Three answers were available, and they
differ in what they do to the record rather than in what they do to the tree.

## Decision

**A revert is an ordinary change: interpreted, proposed, assessed, gated,
applied, and appended to the log as a new revision.** It has no private route
into the store.

- **The undo is computed from the log, not stored.** `planRevert` replays from a
  seed to the revision before the target, inverts the target's delta against the
  tree that delta actually observed, and returns the resulting operations.
  Nothing new is persisted to make undo possible.
- **The inversion is an interpreter.** `revertInterpreter` implements
  `ChangeInterpreter` (0005) and is deterministic. Everything downstream of the
  seam cannot tell no model was involved, which is precisely what makes an undo
  gateable on the same terms as an AI-authored change.
- **`Provenance.interpreter` is `loom/revert` and `confidence` is 1.** The
  inverse is computed, so 1 is the honest self-grade (0007) rather than a
  flattering one.
- **The Gate judges it on its own merits.** A revert that destroys a protected
  primitive is refused; one above its origin's ceiling is held for confirmation
  and answered like any other hold. Undoing is not privileged over doing.
- **No repairer.** Repair (0006) exists so a model can offer a smaller version of
  what was refused. There is no smaller version of an undo, so `revertRevision`
  builds a runtime without one — an omission stated in code rather than left to
  whatever the host wired in.
- **A revert whose target was built on afterwards is not proposed at all.**
  `planRevert` reports it as `contested`, naming the revisions and the nodes.

## Consequences

- **The log only ever grows.** Undoing revision 3 produces revision 4. There is
  no operation anywhere in Loom that shortens a log, and "who undid this, when,
  and why" is answerable by exactly the machinery that answers it for every other
  change: the revision's provenance, its disposition in the journal, and
  `answeredBy` (0029) when a human had to allow it.
- **An undo is itself undoable**, with no special case, because it is a revision
  like any other.
- **Reverting needs the seed** — the same requirement 0028 imposed on
  `auditSnapshot`, now imposed on an operation an ordinary user initiates rather
  than one an operator runs occasionally. This meaningfully raises the cost of
  0028's decision and strengthens the case for its leading alternative: keeping
  revision 0 in the store. That alternative is still not taken here, because
  taking it is a store contract change and this run had a §2 gap to close.
- **Replay is O(log length) per revert.** Acceptable for a human-initiated,
  infrequent operation; unacceptable if anything ever reverts on a request path.
  A checkpoint seed is already supported (any tree, not only revision 0), so the
  mitigation exists before it is needed.
- **Contest detection is conservative and asymmetric.** It compares the node ids
  two deltas *name*, so it over-reports where an insert names its parent and
  under-reports where a removal takes a subtree it never names. Over-reporting
  costs a revert that must be done a different way; under-reporting is caught by
  `applyDelta`, because an operation that depends on a node something else
  removed fails rather than passing quietly. The safe direction was chosen in
  each case.
- **Calibration (0031) will see a top confidence band it did not earn.** A
  deployment that reverts often accumulates `confidence: 1` claims that always
  survive, from an interpreter that cannot be wrong. The report is not lying —
  those claims did survive — but it stops being a statement about the model.
  Segmenting the report by `provenance.interpreter` is the fix and it belongs to
  §6; recorded here because this decision is what creates the need.

## Alternatives considered

**Store the inverse delta on the revision.** The inverse already exists at
assessment time and is discarded; writing it to `loom_revisions` would make
revert a single read. Rejected: it puts a derived value in the log beside the
value it derives from, where the two can disagree and nothing is checking. That
is the exact trade 0016 accepted for the snapshot, and it is a good trade there —
a snapshot is read on every render — and a bad one here, where an inverse is read
rarely. It also doubles what the log costs to store, permanently, for a feature
used occasionally.

**Rewind the log.** Delete revisions back to the target and reset the snapshot.
Rejected outright: it makes undo the one operation that changes a tree without
being judged, and the log the one record with a hole in it. Every claim Loom
makes about AI-authored change — inspectable, gateable, attributable, reversible
— is a claim about the record, and an operation that edits the record is not a
feature, it is the hole through which all four leak.

**Apply the inverse straight to the store, skipping the Gate.** Tempting on the
grounds that an undo is by definition safe: it restores a state that already
existed. It is not safe. Restoring a state is a change *from the current one*,
and the current one may be what a user is looking at, what a payment flow depends
on, or what a later change assumed. An undo that re-inserts a `commerce.checkout`
is a checkout going live, whatever it is called. The Gate exists to weigh exactly
that, and "it used to be like this" is not an argument it should be denied the
chance to hear.

**Let a contested revert proceed with a warning.** Compute the inverse anyway and
put the discarded revisions in the rationale, leaving it to a reviewer. Rejected
for now: the Gate cannot see the difference between a clean undo and a partial
rollback that silently drops later work — both are just deltas — so a contested
revert that the Gate auto-applies would be discarded work with nobody in the
loop. Offering it *only* as a held proposal is the obvious refinement and is left
open; it needs the Gate to be told that a change is contested, which is an input
`ChangeAssessment` does not currently carry, and adding one is a §2 contract
change worth its own record.

**A `revert` operation in the delta model.** A fifth `TreeOperation` naming a
revision. Rejected: it would make deltas non-self-contained — an operation whose
meaning depends on a log outside itself — and 0001's whole argument for four
discrete operations is that each is individually reviewable. It would also make
every consumer of a delta, including the renderer and the portal, need a store to
understand one.
