# 0032. An undo is a proposal, and the log only grows

**Status:** Accepted
**Date:** 2026-08-03
**Section:** §5 → §2

## Context

Reversibility has been a first-class property since 0002: the Gate is handed the
inverse delta so that "can this be taken back" is answered by producing the thing
that takes it back, and `assessReversibility` computes one for every proposal.

Nothing ever applied one. `invertDelta` had exactly one caller and that caller
was the assessor. So the runtime could *prove* a change was undoable and offer no
way to undo it — the only clause in Loom's thesis that was a claim rather than a
capability.

Building the missing half raises three questions the existing records do not
answer: what an undo *is* to the rest of the system, how far back one can reach,
and where the inverse comes from.

## Decision

**An undo is an ordinary proposal.** It is composed, assessed, put to the same
Gate under the same policy, held if the policy holds it, and appended. The
pipeline grows one export — `composeProposal`, which skips interpretation and
does everything after it — because the change is computed rather than inferred
and there is nothing for a model to say. Everything downstream is deliberately
identical.

**Undoing revision 4 produces revision 5.** Nothing is rewound, removed or
rewritten. Both entries stand in the log, and the second says what it undid.

**Only the latest revision can be undone.** A request naming any other revision
is refused with `not-the-latest-revision`, which reports both the number asked
for and where the tree actually is.

**The inverse is recomputed, never stored.** Reverting replays the log from a
caller-supplied seed to the state the target delta observed, and inverts it
there. The seed is a parameter, exactly as `auditSnapshot` takes one.

**A revert is `authoredBy: "runtime"`.** `Provenance` gains that field —
`"model" | "runtime"`, defaulting to `"model"` so every record written before it
existed reads correctly — and calibration (0031) scores only model-authored
claims, reporting the rest as `runtimeAuthored` rather than dropping them.

## Consequences

Undo is now something a user can do, and it is subject to review like everything
else. An undo of a high-stakes change is held for a human exactly as the change
was, because "it is only putting things back" is a claim about intent and the
Gate judges deltas.

**A tree nobody can audit is a tree nobody can undo.** Both need the log
replayable from a known revision 0, so a host that cannot reproduce its seed
loses both capabilities together. That is a real limitation and it is the honest
one.

Reverting costs a replay of the log — O(log length) per undo. Fine at alpha, and
the first thing to revisit if logs get long. Checkpointing is the answer when it
comes, and it is a change to how replay finds a starting point rather than to
anything here.

Undoing a sequence means undoing it one entry at a time, newest first, with each
step gated separately. That is more ceremony than a range revert and it is also
more review, which is the trade this system exists to make.

`Provenance.authoredBy` gives consumers a way to tell a computed change from an
inferred one without matching on interpreter names. When a consumer's own model
starts proposing changes, that field is where it says so.

## Alternatives considered

**Store the inverse beside the revision.** Faster — the runtime already computes
one at assessment time and throws it away. Rejected on 0016: an inverse stored
beside the log is derived data that can disagree with its source, and the
disagreement would be silent, which is the exact failure `auditSnapshot` exists
to catch. `inverseRetentionBudget` also exists because inverses can be large, and
storing every one makes the log grow with content it can already reconstruct.

**Let a revert bypass the Gate.** Tempting, since the inverse of an accepted
change is "obviously" safe. It is not: 0002 refuses irreversible changes partly
because undoing the tree does not undo reality, and a change that reached a
payment flow is not made safe by being reversed. A revert that skipped judgment
would also be the one unreviewed write in a system whose whole claim is that
there are none.

**Revert any revision, rebasing onto head.** What a user eventually wants, and it
needs conflict handling: the nodes an old inverse names may have moved or gone.
That is a real feature with real semantics to settle, and shipping it half-done —
silently dropping operations that no longer apply — would be worse than refusing.
Reverting the latest is the honest subset, and repeated application composes.

**Give a revert `confidence: 0`, or make confidence optional.** Zero would be a
lie in the other direction, and optional confidence would push the "is this a
graded claim" question onto every consumer. `authoredBy` answers it once, in the
type.

**A fifth `IntentOrigin` for reverts.** The origin is still `user-instruction` —
a person asked. What differs is who wrote the delta, which is a fact about
authorship, not about where the ask came from.
