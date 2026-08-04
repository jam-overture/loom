# 2026-08-04 (day 33) — a contested undo is offered, not refused

**Build order section:** §2 — Composition Runtime. The gap 0032 left open in its
own Alternatives section, and the earliest open section in the build order.

**Branch:** `day-33-contested-undo`, off `main` (everything through day 32 is
merged: #41, #42, #43 and #44 all landed).

---

## Where this run started

No open PRs and no review comments to act on — #43 (day 32's sign-in throttle)
and #44 (the lessons) were both merged since the last run, so there was no
maintainer feedback outstanding and nothing stacked to continue.

That put the question back on the build order. §5 and §6 both have open items,
but §2 had one older than either: 0032 shipped undo three runs ago and, in the
same record, said what it had not done.

> "Offering it *only* as a held proposal is the obvious refinement and is left
> open; it needs the Gate to be told that a change is contested, which is an
> input `ChangeAssessment` does not currently carry, and adding one is a §2
> contract change worth its own record."

Day 28's report recommended the same thing to whoever picked it up next. This is
that run.

## The problem, in one sentence

Undoing revision 1 and undoing revision 1 *while throwing away what revisions 2
and 6 did to the same nodes* are the same four operations, so the Gate could not
tell them apart — and rather than let it auto-apply a silent rollback, the write
path refused every contested undo outright.

Refusing was the safe answer to the right worry and the wrong answer to the
user. The tree they wanted back is recoverable from the log, so what the runtime
was really doing was deciding, without asking, that nobody may have a rollback
that costs something. 0019 makes the portal a review queue exactly so that "this
costs something — do you want it" is a question the software can ask.

## What was built

Six files, and the shape of the change is that **the Gate learned a new fact
without gaining a new input**.

- **`ProposedChange.discards`** — an optional `[{ revision, nodeIds }]` on the
  proposal. Absent means *not declared*, which is what every model-authored
  proposal is; it never means "checked and clean".
- **`assessStakes`** takes a `StakeInput` record now (the analysis plus the
  declaration) and grows a seventh factor, `discards-later-work`, at `high`.
- **`gate`** grows a sixth escalation rule, `confirmDiscardsLaterWork`, fourth in
  precedence: it fires on the factor's presence, after `confirmIrreversible` and
  before `confirmAboveCeiling`.
- **`planRevert`** no longer has a `contested` outcome. A `revertable` plan
  carries `discards`, empty for a clean undo, and the operations come back either
  way.
- **`revertInterpreter`** declares them, and names them in the rationale as well,
  because the Gate reads the declaration and the person answering the hold reads
  the prose.
- **`revertRevision`** proposes either way. `not-revertable` now means only that
  no undo could be computed at all — out of range, unreplayable, uninvertible.

Net effect: a contested undo arrives in the tree's review queue saying "discards
work from revision 2 at 1 node", and answering it applies it as revision 3 with
`answeredBy` recorded. Revision 2 stays in the log, so the undo is itself
undoable.

## The four decisions inside it, and why not the obvious ones

Recorded in **0035**. The short version:

**A stakes factor, not a third axis.** 0032 sketched a `contested` field on
`ChangeAssessment`. That would make the Gate a function of three inputs, and
0002's two-axis separation is a contract the renderer, the portal, and telemetry
all read. Discarding work *is* damage, so it belongs on the axis that already
measures damage — and it does not touch reversibility, so nothing double-counts.
There was a second, decisive reason: an assessment is recomputed per judgment and
thrown away, so a hold read back from storage would have lost the reason it was
held, and the confirmation path would have re-assessed it as a clean undo and
applied it. The declaration has to live on the thing that gets persisted.

**A rule, not a level.** `critical` would hit the default refusal floor, which is
the behaviour being replaced. Anything below it is subject to the per-origin
ceilings, so the same contested undo would hold for a `user-instruction` and
auto-apply for a `developer`. What must not happen — work discarded with nobody in
the loop — does not depend on who asked, and only a rule can say that. The rule
sits *below* the refusal floor, so a host that wants the old behaviour composes it
with `refusalFloor: "high"` rather than getting a second knob.

**Declared, not recomputed — because it can only cost its author latitude.** 0002
rejected declared reversibility as "a claim rather than a computation", and it was
right, because that claim *buys* latitude. This one spends it: the worst a lying
declaration achieves is asking a person about a change nobody had to be asked
about. That asymmetry is what makes trusting it sound, and it is stated in the
record rather than assumed.

**A model can never set it.** The reply grammar has no production for the field
and `modelInterpreter` builds its proposal field by field, so the only writer is
an in-runtime interpreter. Two tests hold that down, including one asserting the
string "discard" appears nowhere in the emitted JSON Schema — which also means the
field costs nothing against 0014's grammar budget.

## Decisions I made that were not specified

**`assessStakes` takes a record rather than a trailing argument.** `StakeInput`
groups the analysis with the declaration, for the reason `Commit.answeredBy` gives
in its own comment: an input that can be left off the end is one that will be, and
leaving this one off silently lowers the stakes of a change that discards work.
The cost is a mechanical signature change across six factor functions and their
tests.

**The plan reports rather than refuses, and the union got smaller.** Folding
`contested` into `revertable` means `UnrevertablePlan` — `Exclude<…,
"revertable">` — drops it automatically, so the type says what the new rule is
without anyone maintaining a second list. One vocabulary end to end: `discards`
on the plan, on the proposal, in the factor, in the reason code.

**`revision` must be positive and `nodeIds` non-empty in the schema.** Revision 0
is a seed rather than work someone did, and an entry naming no node claims damage
it cannot point at. Both are refused at the boundary.

**The portal tells a reviewer where to answer.** Undo is offered on `/history` and
every hold queues on the tree's page, so a held undo would otherwise say "waiting
on you" and name nowhere. `revertReportOf` in `lib/outcome.ts` adds the pointer
and reads a plan that produced no undo as *inapplicable* rather than as a refusal —
the runtime did not decline it, it could not compute it. It is a pure function
beside `reportOf` so it is tested without invoking a server action, which is the
pattern that file already exists for. `/trees/[treeId]` is revalidated on a hold
now, since that is where the new card appears.

**The README's build-order marker.** It still said "§4 ← current" while §5 and §6
were shipping. Replaced with a plain statement that 1–6 are built and that what is
open lives in the reports, because a marker in a README is a thing that goes stale
quietly.

## Decision records

Added **0035 — Discarded work is a stake, and only the runtime may declare it**
(§2 → §5). **0032 is now `Accepted — partially superseded by 0035`**; its text is
untouched. Index regenerated with `pnpm decisions:index`.

### ARCHITECTURAL — worth your eye, though I did not treat it as blocking

0035 reverses a bullet in 0032's Decision section ("a revert whose target was
built on afterwards is not proposed at all"). I shipped it rather than leaving it
`Proposed`, on this reasoning: 0032 named this exact refinement in its own
Alternatives, said it was "left open", specified the mechanism it needed, and said
it wanted its own record — and its stated reason for rejecting was a limitation,
not a principle ("the Gate cannot see the difference between a clean undo and a
partial rollback"). This run removes that limitation, so the reasoning is
satisfied rather than contradicted. 0029 set the precedent for a partial
supersession done this way.

If you read that bullet as binding rather than provisional, this is the diff to
send back — it is confined to the six files above and the record, and reverting it
is a clean revert.

## Test coverage and status

`pnpm verify` green end to end: typecheck, compiled build, both suites, Turbopack
production build.

- **Runtime: 795 tests / 72 files** — up from 769. Twenty-six new tests, no new
  files: every one of them landed beside the behaviour it covers.
- **Portal: 220 tests / 24 files** — up from 217.

What they hold down:

- **The factor:** raises an otherwise unremarkable change to `high` and no higher,
  names every revision, counts distinct nodes across overlapping entries, reads
  singular for one, adds nothing when nothing was declared, and cannot be
  suppressed by any vocabulary knob a host sets.
- **The rule:** holds for the widest origin a policy can give (`developer`, and a
  policy that trusts every origin at `critical`); leaves an undeclared change
  exactly where it was; is *refused* rather than held when the host's refusal floor
  reaches `high`; is refused outright below the confidence floor; and reports
  irreversibility ahead of itself when both fire, because "this cannot be undone"
  is the graver thing to tell someone.
- **The plan:** reports the discards and still returns the operations, names every
  later revision that reached the same nodes rather than only the first, counts a
  later change inside a subtree the undo would remove, and describes a clean plan
  in exactly the words it used before.
- **End to end through the write path:** a contested undo is held rather than
  applied, declares the revisions on the proposal itself, names them in the
  rationale, narrates `proposal-held` rather than nothing at all, applies on
  confirmation with the log intact at `[1, 2, 3]` and `answeredBy` recorded,
  leaves the tree untouched when the reviewer says no, and declares nothing when
  no later revision touched the same nodes.
- **The round trip:** `discards` survives JSON, absence stays absence, and an
  entry naming no node or revision 0 is refused — because a hold is persisted and
  re-judged, and a declaration that did not survive would be a hold whose reason
  evaporated between the asking and the answering.
- **The guard:** a model-authored proposal never carries the field, and the
  emitted JSON Schema does not contain the string "discard".

**Nothing skipped, nothing weakened.** The live smoke test **ran** this session
rather than skipping — `LOOM_ANTHROPIC_API_KEY` is present in this environment, so
day 32's fix to that test is confirmed working — and it passed against the real
API. No model id changed this run: the interpreter still defaults to
`claude-opus-5`, and nothing in this unit calls a model, since a revert is
interpreted deterministically.

## Open questions and blockers for the next session

1. **0035 reverses a bullet in 0032.** Detailed above. **Recommendation:** keep
   it. The record it supersedes asked for this and said what it would take.

2. **Nothing else can declare a discard yet.** The concept generalises — any
   interpreter deriving a delta from history could use it — but the revert
   interpreter is the only writer today, and the runtime cannot verify a
   declaration, only trust it in the safe direction. **Recommendation:** leave it
   until a second producer exists; a verifier would need the Gate to hold a log,
   which is the property that makes it testable and pure.

3. **A whole-tree "restore revision N" is not built.** 0035 rejects it as a
   different feature: it discards *more* work and names no revisions while doing
   it. Worth building on this declaration one day. **Recommendation:** not soon.

4. **Nothing surfaces a sign-in lockout to an operator** (from day 32,
   unanswered). A refused sign-in is not a runtime event, so 0023 keeps it out of
   telemetry, and there is no other place the portal reports anything.
   **Recommendation unchanged:** a second event stream is a bigger decision than
   one run should make alone; it wants your call before it is built.

5. **A missed `db:push` is a sign-in outage** (from day 32, unanswered).
   Documented and recoverable in one command, and the deliberate price of failing
   closed — but still worth your eye.

6. **`policyId` is a name, not a fingerprint** (day 31, unanswered).
   **Recommendation unchanged:** wait for evidence of real drift.

7. **Calibration still does not segment by policy** (day 31, unanswered).
   **Recommendation unchanged:** leave it to consumers, per 0031.

8. **Carried, unchanged:** the portal has no component test harness (day 26); a
   scheduled snapshot audit still has nowhere for its result to go; `loom_telemetry`
   still needs its RLS statement; there is no telemetry retention policy; the reply
   schema sits near its 3500-byte guard; and there is no node-level provenance.
   The two §6 items — retention and RLS — are the next thing I would pick up if
   nothing above takes priority.
