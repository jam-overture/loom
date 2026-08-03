# 2026-08-03 (day 28) — the last of the five adjectives

**Build order section:** §5 — the write path, reaching into §2 for one new
pipeline seam.

**Branch:** `day-28-revert-path`, off `main` at `59ee98c`

**First run since #37 merged.** Day 27's calibration report is in, which is what
unblocked this: the collision below could not be fixed on `main` until it was.

---

## Where this run started

Day 27's sense check found two clauses of Loom's thesis with no code behind them.
Calibration closed one. This closes the other.

**"Reversible" was proven but not offered.** `assessReversibility` has computed an
inverse delta for every proposal since day 2 — that is *how* the Gate answers
"can this be taken back", by being handed the thing that takes it back.
`invertDelta` had exactly one caller and that caller was the assessor. So the
runtime could prove a change was undoable and provide no way to undo it.

The maintainer approved the design and said to pick the approach. #37 merged
mid-run, so this went straight onto `main` rather than stacking.

---

## What was built

**`revertRevision` — undo as an ordinary write.**

- **`composeProposal`** in the pipeline: everything `composeChange` does except
  interpretation. A revert's delta is computed, not inferred, so there is nothing
  for a model to say — but the Gate, the policy, the events and the custody path
  are all deliberately identical. No repair attempt, because 0006 gives a refusal
  one more try *from the interpreter* and there is no interpreter here.
- **`replayBefore`** in the store: walks the log to just before a revision and
  stops, returning the tree that entry saw and the entry itself.
- **`revertProposal`**: inverts the entry against the tree it was applied to.
- **`/history` grows an undo button**, on the latest revision and nowhere else.

**Undoing revision 4 produces revision 5.** Nothing is rewound or rewritten. Both
entries stand, and the second says what it undid — a history that could be edited
would not be evidence of anything.

Recorded as **0032 — An undo is a proposal, and the log only grows.**

## The design fork that stopped the first attempt

This unit was designed at the end of day 27 and deliberately **not** built,
because starting it surfaced a collision with the PR that was still open.

A revert produces a proposal. `Provenance.confidence` is required on every
proposal. So a runtime-authored revert would have arrived at the calibration
report carrying a confidence **nobody graded** — quietly poisoning the exact
number #37 exists to produce, by averaging the runtime's fabricated 1 in with the
model's self-grades.

`Provenance` now carries `authoredBy: "model" | "runtime"`, defaulting to
`"model"` so every record written before the field existed reads correctly, and
calibration scores only model-authored claims — reporting the rest as
`runtimeAuthored` rather than dropping them.

Building on `main` before #37 landed would have meant shipping the poisoning and
fixing it afterwards. That is why `main` was left untouched overnight rather than
starting on the wrong base.

## Two limits, both deliberate

**Only the latest revision can be undone.** Reverting an older one means rebasing
its inverse onto head, and the nodes it names may have moved or gone. That is a
real feature with real conflict semantics to settle, and shipping it half-done —
silently dropping operations that no longer apply — would be worse than refusing.
Repeated application composes; each step is gated separately, which is more
ceremony and more review.

**A tree nobody can audit is a tree nobody can undo.** The inverse of a change is
a function of the state that change observed — the inverse of "remove this card"
has to carry the card, and the card only exists on the near side of the removal.
Reaching that state means replaying from a seed, so `revertRevision` takes one
exactly as `auditSnapshot` does. A host that cannot reproduce its revision 0 gets
a refusal rather than an inverse assembled out of the tree it is meant to undo.

Storing the inverse instead would have avoided the replay — the runtime already
computes one and throws it away. Rejected on 0016: derived data stored beside its
source eventually disagrees with it, and the disagreement is silent, which is the
precise failure `auditSnapshot` exists to catch.

---

## Verification

`pnpm verify` green: typecheck, compiled build, the full suite, Turbopack
production build.

Every revert fixture runs the whole path — real Gate, real policy, real store,
real journal, only the model scripted. The tests that matter are the ones
asserting a revert is *not* special: it carries a Gate disposition, it lands in
the journal as an ordinary ask, and it stays out of calibration's denominators.

Three test defects were caught and fixed while writing them, one of which was
mine overclaiming: a test named "is held for a human when the policy would hold
it" could not produce a hold with the default policy, because the inverse of a
removal is an insert and the policy accepts those outright. Renamed to what it
actually proves — that the change is put to the Gate rather than applied
straight to the tree — with the limitation stated in the comment rather than
papered over.

The one pre-existing test that broke was `interpreter.test.ts` asserting the
exact shape of provenance. That is the assertion doing its job.

---

## What is next

1. **The `GatePolicy` seam.** The maintainer's position is that adaptation
   belongs to consumers: Loom supplies the record, they feed their own models.
   The read side of that now exists. The write side does not — `GatePolicy` is a
   static value handed to the pipeline once, so a consumer whose model concludes
   "loosen the gate for layout changes on this tree" has no supported way to say
   it. Making policy resolvable per proposal by a host-supplied function keeps
   Loom from ever learning while making it steerable by something that does.
   `authoredBy` is already the field a consumer-authored proposal would use.
2. **Generating `decisions/README.md` from the record files.** Offered four times
   now. Two merge conflicts landed on that hand-maintained table within half an
   hour, and concurrent runs once produced two `0028`s.
3. **A rate limit on sign-in**, still an open question in 0027.
