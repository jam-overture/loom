# 0111. The revision an undo puts back is a field on provenance, because provenance is the part of a proposal a log keeps

**Status:** Accepted
**Date:** 2026-09-06
**Section:** §2

## Context

An undo is a change like any other
([0032](0032-an-undo-is-a-proposal-not-a-rewind.md)), so it is proposed, judged,
applied, and appended to the log under its own revision. That is what makes it
attributable and itself undoable, and it is the right shape.

It leaves a reader with a question the record could not answer. `revertRevision`
stamps `REVERT_INTERPRETER` — `loom/revert` — on the provenance, so a surface can
ask *is this change an undo* and get a real answer rather than pattern-matching
English. `(demo)/_lib/undo.ts` has done exactly that since 26 August.

**What no surface could ask is which revision the undo is of.** That number
existed only inside strings the runtime composed for people: `utterance` is
`Undo revision 1.` and the rationale is *"Undoes revision 1, applied … from
proposal …"*. Both are correct, both are prose, and neither is a field. A
surface needing the link had two options and both are bad:

- **Parse a sentence it does not own.** This is precisely what the interpreter
  stamp exists to avoid, and the sentence is written for the person answering a
  hold ([0019](0019-the-portal-is-a-review-queue-not-a-design-tool.md)) — so it
  is free to be reworded for a reader, and any parser of it is a latent break.
- **Carry the number itself.** `Loom demo` did this and was right to: `undoRevision`
  stamps its own `ChangeRecord.undoes` from the argument it passed, which is honest
  because it is that surface's own knowledge about its own request.

The second does not generalise, and `Loom demo` filed it saying so. **A surface
reading a log it did not write has no argument to stamp from.** The portal's
history screen is the obvious one: it pages revisions it had no part in and would
be left with the sentences.

## Decision

**`Provenance.undoes` is an optional positive integer: the revision this change
puts back.** It is set by `inverseInterpreter` from an optional `undoes` on
`InverseTerms`, and `revertInterpreter` supplies `plan.target.revision` — the
same number the rationale states in a sentence.

**It lives on provenance rather than on the proposal, and that is the whole
decision.** `ProposedChange` already carries two fields of this shape —
`repairOf` and `discards` — and either would have been a defensible home on
grounds of symmetry. Neither is stored. `StoredRevision` keeps the delta, the
proposal id, the provenance and the times; a proposal's other fields do not
survive into the log. Since the reader this was filed for is the one holding a
log and nothing else, a field anywhere but provenance would not have reached
them, and the finding would have been closed without being fixed.

Provenance is also where it belongs on the merits rather than only by
availability. Provenance answers *where did this change come from* in enough
detail to audit it later, and `interpreter: "loom/revert"` already says the
change came from undoing something. The revision completes that sentence, and
sits beside the stamp a surface already reads to know it is an undo.

**Optional, and absent on anything that is not an undo.** So absence means "this
puts nothing back" — which is true of the whole log written before the field
existed, and stays true forever. The same reading `authoredBy` and `discards`
were given ([0035](0035-discarded-work-is-a-stake-and-only-the-runtime-declares-it.md)),
and the reason no migration is needed: `loom_revisions.provenance` is a `jsonb`
column, so an optional field costs old rows nothing.

**A stateless caller may omit it, and should.** A surface undoing a change it
made in the same session has no revision to name — nothing was appended — and a
number it does not have would be worse on the record than the absence. This is
why `InverseTerms.undoes` is optional where `interpreter` and `rationale` are
required ([0109](0109-an-inverse-in-hand-is-proposable-without-a-store-and-it-is-never-stamped-loom-revert.md)).

**`undoneRevisions` reads it back, and resolves the chain.** Following `undoes`
one hop answers *did anything ever undo this*, which is a different question from
*is this undone now*, and the two disagree exactly when somebody changed their
mind twice: if 5 puts 3 back and 7 puts 5 back, then 3 is live again. A revision
therefore counts as undone only when some entry undoing it **stands** — is not
itself undone by an entry that stands. The function is a pure fold over entries
the caller already holds, because the caller is a history screen that has just
paged them to draw them.

## Consequences

- A surface can ask a log which of its changes have been put back, and get the
  answer that matches the tree rather than the answer one hop gives.
- The link is the runtime's rather than each surface's. `(demo)`'s
  `ChangeRecord.undoes` keeps working and is still the honest thing for a caller
  that knows its own request; what it no longer has to be is the only copy.
- **Provenance now carries a fact that is not about authorship.** This is the
  cost, and it is real: the record's own doc comment says provenance answers
  where a change came from, and "which revision it replaces" stretches that. The
  alternative stretched something worse — see below.
- Nothing migrates. Old entries parse unchanged and read as "puts nothing back",
  which is what they are.
- `undoneRevisions` is bounded by what it is given. An undo outside the entries
  passed is not seen, so an absence means "not undone within this stretch" — the
  same honesty `attributeTree`'s `examinedTo` reports for the same reason.

## Alternatives considered

- **A field on `ProposedChange`, beside `repairOf` and `discards`.** The
  symmetric choice, and rejected because it does not reach the reader: proposal
  fields do not survive into `StoredRevision`. Taking it would have meant either
  a second field on the store to carry it down, or closing the finding for the
  Gate's benefit while leaving the history screen exactly where it was.
- **Widening `StoredRevision` with its own `undoes` column.** Reaches the reader,
  and costs a schema change and a migration for a fact provenance could hold for
  nothing. It would also put the number somewhere the proposal path never sees,
  so the Gate and the log would disagree about where undo-ness is recorded.
- **Parsing the rationale.** Free, and the reason this was filed. A sentence
  written for a person is not an interface, and the first reworded rationale
  silently breaks every reader of it.
- **A `TreeOperation` or delta-level marker.** Rejected on 0001: a delta is
  self-contained and says what changes, not why or in place of what. This is the
  same argument that put `discards` on the proposal rather than in the delta.
- **Requiring `undoes` on `InverseTerms`.** Would have forced every stateless
  caller to invent a revision number, which is the one thing worse than the
  absence.
