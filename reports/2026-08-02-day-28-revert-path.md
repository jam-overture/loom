# 2026-08-02 (day 28) — the runtime can now take a change back

**Build order section:** §2, the Composition Runtime. It reaches into §5's store
to read the log, and adds nothing to §5's contract.

**Branch:** `day-28-revert-path`, off `day-27-calibration`
**PR:** opens against `day-27-calibration`, so the diff is only this unit.

**Third run of the day.** Day 27's calibration work is still open as #37 with no
maintainer reply yet, so nothing was waiting on review.

---

## Where this run started

Day 27's report ended with an audit of the project's own thesis and found two
clauses without code behind them. One — "adaptive" — it closed. The other it
named and left open, first on its own list of what to do next:

> **"Reversible" is proven but not offered.** `assessReversibility` computes the
> inverse delta up front and carries it through the pipeline, so the runtime can
> *say* a change is undoable. Nothing applies it — `invertDelta` has exactly one
> caller and it is the assessor.

That is a gap in §2, and the build order says an earlier section's gap comes
before anything later. So this run closed it.

---

## What was built

**A revision can be undone, and the undo is an ordinary change.**

There are three pieces and the middle one is the whole idea.

**`planRevert` (§5, `src/store/revert.ts`)** works out what undoing a revision
would mean. It replays the log from a seed to the revision *before* the target,
inverts the target's delta against the tree that delta actually observed, and
then keeps walking to head checking whether anything since has built on it. One
forward pass, because the three questions are about three points in the same
sequence and reading it three times would answer them about three different
moments of a log that is still growing.

It decides nothing. It returns either the operations, or an obstacle that names
itself: `contested` (with the revisions and nodes in the way), `out-of-range`,
`unreplayable`, `uninvertible`.

**`revertInterpreter` (§2, `src/write/revert.ts`)** turns a plan into a
`ProposedChange`. It implements `ChangeInterpreter` — the AI seam — and is
completely deterministic. That is the load-bearing part: everything downstream of
the seam cannot tell that no model was involved, so an undo is assessed, gated,
held, confirmed, applied, committed and narrated by exactly the code that does it
for an AI-authored change. No branch anywhere says "unless it is a revert".

**`revertRevision`** wires the two together and hands the result to
`commitIntent`, the one write path (0017).

Recorded as **0032 — an undo is a proposal, not a rewind.**

### What follows from that, and is tested

- Undoing revision 3 produces revision **4**. Nothing in Loom shortens a log.
- A revert is **attributable**: `origin` and `actor` are the caller's, and
  `provenance.interpreter` is `loom/revert`.
- A revert is **refusable**. Undoing an insert of a protected primitive destroys
  that primitive, which reaches the refusal floor, and the Gate refuses it — a
  human saying "put it back" does not make it safe.
- A revert is **holdable**, and a confirmed one records who allowed it in
  `answeredBy` (0029), through no code written this run.
- A revert is **itself revertable**, with no special case.
- A revert is **never repaired**. Repair (0006) exists so a model can offer a
  smaller version of what was refused; there is no smaller version of an undo, so
  `revertRevision` builds its runtime without a repairer even when the host wired
  one in. There is a test that a scripted repairer is never called.

---

## The part I decided conservatively, and why

**A revert whose target has been built on since is not proposed at all.**

Undoing revision 3 when revision 5 also configured the same node restores the
node to its revision-2 value, discarding revision 5's work. Nothing catches that:
the Gate sees a delta, not the history behind it, and a `configure` that clobbers
a later `configure` applies perfectly well. So an auto-applied contested revert
would be silently discarded work — and "inspectable" is the claim this project is
built on.

`planRevert` therefore reports `contested`, naming which revisions stand in the
way and which nodes they share, and proposes nothing.

The obvious refinement — offer it, but only ever as a held proposal — is left
open deliberately. It needs the Gate to be *told* a change is contested, and
`ChangeAssessment` carries no such field. Adding one is a §2 contract change and
belongs in its own record rather than smuggled into this one.

---

## Decisions I made that weren't specified

1. **The inverse is recomputed from the log, not stored on the revision.**
   Storing it would make revert one read instead of a replay. It would also put a
   derived value in the log beside the value it derives from, where the two can
   disagree and nothing is checking — the same trade 0016 accepted for the
   snapshot, which is a good trade when the derived value is read on every render
   and a bad one when it is read occasionally.

2. **`confidence` is 1 on a revert.** The inverse is computed, so any other
   number would be a lie. This has a consequence for §6 — see the open questions.

3. **`invertDelta` was split, not duplicated.** `invertOperations` returns the
   operations; `invertDelta` wraps them with an id and a base revision. A revert
   inverts at one revision and applies at another, so only the operations survive
   the journey. There is a test that the two still agree.

4. **Contest detection compares the ids two deltas *name*, not the ids they
   affect.** `namedNodeIds` needs no tree, which matters because two deltas from
   different points in a log cannot both be analysed against one tree. It
   over-reports on `insert` (which names its parent) and under-reports on
   `remove` (which does not name the subtree it destroys). Both were chosen in
   the safe direction: over-reporting costs a revert that has to be done another
   way, and under-reporting is caught by `applyDelta`, which fails on an
   operation depending on a node something else removed.

5. **The intent is synthesised inside `revertRevision`.** The utterance behind a
   revert is not a sentence anybody typed, it is a revision number. `origin` and
   `actor` still come from the caller, because undoing a change is still someone
   asking for a change and the Gate weighs who asked.

6. **A seed may be any tree, not only revision 0.** Entries at or below the
   seed's revision are skipped rather than replayed, so a host that checkpoints
   can hand one in. Nothing uses this yet; it is the mitigation for a replay cost
   that will eventually matter, built while the code was open rather than after.

---

## Decision records

| #    | Title                               | Status   |
| ---- | ----------------------------------- | -------- |
| 0032 | An undo is a proposal, not a rewind | Accepted |

Nothing superseded. 0032 is consistent with 0016, 0017, 0028 and 0031, and says
where it makes each of them cost more.

---

## Test coverage / status

```
@loom/runtime   69 files, 721 tests   green   (was 66 / 680)
@loom/portal    18 files, 135 tests   green + build   (unchanged)
```

`pnpm verify` green across the workspace — typecheck, compiled build, tests, and
the portal's Turbopack production build — offline, with no database and no API
key. Nothing skipped, nothing weakened.

**41 new tests**, in three files:

- `src/tree/naming.test.ts` (6) — what each operation names, including the two
  asymmetries above stated as tests rather than as comments.
- `src/store/revert.test.ts` (18) — undoing head; undoing an older revision and
  leaving later ones standing; restoring a removed subtree from the log alone;
  replaying from a checkpoint seed; contested by an overlapping configure;
  contested by a change *inside* a subtree the undo would remove; not contested
  by an unrelated change; the three bounds; and four cases over a log that does
  not add up — a gap, a head claiming a revision the log lacks, a delta that no
  longer applies, and a target that cannot be inverted.
- `src/write/revert.test.ts` (15) — the pipeline end to end, the event sequence,
  provenance, undoing an undo, held-then-confirmed with `answeredBy`, refused at
  the refusal floor, the repairer never being called, and the interpreter
  declining a tree it was not planned against.
- Two more in `src/tree/inverse.test.ts` for the split.

Every revert test drives a real memory store with a real log and the real Gate.
The four "log that does not add up" cases use a reader over a log a real store
could not produce, which is the only way to reach those branches.

**No portal work this run**, so no untested component was added. The gap day 26
opened — the portal has no component test harness — is unchanged and still
recommended below.

---

## Open questions for the next session

1. **Reverting needs the seed, and that changes the weight of 0028.** Until now
   only `auditSnapshot` needed a reproducible revision 0 — an operator's
   occasional job. Now an ordinary user action needs it, and a host that cannot
   reproduce its seed cannot offer undo at all. **Recommend taking 0028's leading
   alternative and keeping revision 0 in the store.** It has been declined twice
   on scope, both times correctly; this is the run that changes the argument.

2. **Calibration will show a top band it did not earn.** Reverts land in
   `provenance` as `confidence: 1` from an interpreter that cannot be wrong, and
   they always survive. `calibrationOf` folds every episode alike, so a
   deployment that reverts often reads as a well-calibrated model. **Recommend
   segmenting the report by `provenance.interpreter` rather than excluding
   anything** — an operator wants to see the deterministic band separately, not
   to have it hidden. Deliberately not touched this run: §6 is under review in
   #37 and changing it underneath that review would be unhelpful.

3. **Contested reverts have no path at all.** They are reported and refused.
   **Recommend** letting the Gate see contest and offering them only as held
   proposals — which needs a field on `ChangeAssessment`, so it is a §2 contract
   change and wants its own record. Not urgent.

4. **Nothing in the portal invokes a revert yet.** The capability is in the
   framework and the portal is a consumer of it (0018). Worth noting that 0019
   calls the portal a review queue and not a design tool, and a revert button is
   arguably the latter — **recommend** putting it on `/history`, where the log is
   already shown, as "undo this revision", rather than anywhere that looks like
   editing.

5. **Carried, unchanged:** the portal has no component test harness (day 26); a
   scheduled audit still needs somewhere for its result to go; `loom_telemetry`
   still needs its RLS statement; `decisions/README.md` is still hand-maintained
   and has caused two merge conflicts and one duplicated number; no retention
   policy; the reply schema sits at 3381 of a 3500 guard; node-level provenance;
   and sign-in has no rate limit (0027).

6. **A smaller thing worth knowing:** every call to `sampleTree()` mints the same
   `treeId`, because it builds a fresh unnamespaced `sequentialIdFactory`. A test
   that wants a tree the store has never seen has to override the id. Harmless
   today and surprising; noted rather than changed, since fixtures are shared and
   this run was not the place.
