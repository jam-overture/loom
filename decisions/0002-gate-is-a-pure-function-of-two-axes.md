# 0002 — The Gate is a pure function of two independent axes

**Status:** Accepted
**Date:** 2026-07-28
**Section:** §2 — Composition Runtime

> Recorded retroactively on 2026-07-28, from the day-02 report and PR #2. The
> decision shipped with §2; this record exists because the two-axis separation
> is a contract the renderer, the portal, and telemetry all depend on.

> **Amended 2026-08-28**, under [0099](0099-a-record-is-amended-when-only-the-count-moved.md).
> The rule count below read *six* and the ladder has had seven rungs since 19
> August: 0035 added the sixth and 0071 the seventh, and neither reverses
> anything here. The number is now held against `ESCALATION_LADDER` by
> `src/record-claims.test.ts`, so this sentence cannot go stale again.

## Context

Something has to decide whether a proposed change may be applied, and that
decision has to be explainable to a user, reproducible in a test, and
comparable across a telemetry corpus. The tempting shape is a risk score with
tunable weights, which is easy to tune and impossible to explain.

Two properties of a change pull in different directions: how much damage it
does, and whether the damage can be taken back. Collapsing them loses the
distinction between "large but undoable" and "small but permanent" — and it is
the second that most needs a human in the loop.

## Decision

`gate(assessment, policy) -> Disposition` is a pure function. No IO, no clock,
no tree, no state. It sees a `ChangeAssessment` and a `GatePolicy` and returns
`accepted`, `requires-confirmation`, or `rejected`, with reasons attached.

Stakes and reversibility are assessed **separately and orthogonally**. No input
may feed both axes: a property that raises the damage estimate must not also
mark the change irreversible, and vice versa. Stakes are recorded as named
factors rather than collapsed to a number, so a disposition can say "removes 14
nodes and destroys `commerce.cart`" instead of "high".

The decision is seven ordered rules, first match wins; the order encodes
precedence. Irreversibility is escalated **before** the stakes ceiling is
consulted, so a small permanent change is never quietly auto-applied.

Reversibility is computed, not guessed: it is derived by producing the inverse
delta up front. Every operation has an exact inverse, so undo is a delta rather
than a snapshot.

`GatePolicy` separates two kinds of knob. Vocabulary knobs (which primitives and
prop keys are consequential) are host-supplied and default to empty, because
Loom Core cannot know that `commerce.checkout` matters more than `layout.stack`.
Structural knobs (how large a removal is "large") are host-independent and ship
with opinionated defaults.

## Consequences

- The Gate is exhaustively testable with no tree, no model, and no clock.
- A disposition is explainable by construction: the rule that fired is the
  explanation.
- Auto-apply ceilings are per origin — who asked is a real input to how much
  latitude a change gets, and this is the one place origin is load-bearing
  rather than merely recorded.
- Adding a rule means choosing its position in the precedence order, which is a
  visible decision rather than a weight nudge.
- A host that wants a hard block on some primitive composes two knobs (declare
  the type protected, lower the refusal floor) rather than getting it as a side
  effect of one.

## Alternatives considered

**A weighted risk score with a threshold.** Rejected: tunable but not
explainable, and the Gate has to justify itself to a user, a test, and a
telemetry corpus. A score also invites silent recalibration.

**One combined "risk" axis.** Rejected during implementation, by a failing test:
a change that was small, confident, and irreversible was being refused outright
instead of escalated, because out-of-tree effects were feeding both axes and
double-counting. The test was right and the design was wrong.

**Reversibility as a declared property of a primitive.** Rejected as the primary
mechanism: it is a claim rather than a computation. Producing the inverse delta
proves reversibility and proves the original delta applies at the same time.
Declared out-of-tree effects remain as a host-supplied input to that
computation, but they are not the computation.

**Snapshot-based undo.** Rejected: it makes undo a storage problem instead of a
delta problem, and it cannot answer "what changed" — only "what it looked like
before".
