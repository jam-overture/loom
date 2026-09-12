# 0137. An undo already computed is assembled by the runtime, and stamped by its caller

**Status:** Accepted
**Date:** 2026-09-12
**Section:** §2 — The change pipeline

## Context

Undo has been a change like any other since 0032: interpreted, proposed,
assessed, gated, applied, logged. The piece that makes that true is
`revertInterpreter` — an interpreter with nothing to interpret, which turns an
inverse into a proposal carrying the provenance of something computed rather
than guessed, so the Gate weighs an undo on exactly the terms it weighs an
AI-authored change.

It has only ever been reachable through a store. `revertInterpreter` takes a
`RevertablePlan`, and a `RevertablePlan` is a reading of a log: it is produced by
`planRevert`, which replays a store to find the target delta, invert it, and
report what has been built on top since (0035).

That excludes every surface with no store, and 0081 makes the front door one
deliberately — a session per visitor on the most-crawled surface the project has
is a memory leak with an advertising budget. Such a surface is not short of an
inverse. `composeChange` hands one back on every applied change, so a surface
that ran the change is holding the undo before anybody asks for it. What it does
not have is the short piece between *here are the operations that put it back*
and *here is a proposal the Gate can weigh*: a proposal id, the delta stated
against the tree in hand, a rationale, the head check, and provenance.

`Loom marketing` wrote that piece by hand, in about thirty lines, and filed the
fact as a finding on 5 September: *a stateless surface can compute an undo and
cannot assemble one.* The thirty lines are a second implementation of a
judgement the runtime already makes, on the surface whose whole argument is that
what the runtime records is worth something.

## Decision

**The store-free half of undo is public, as `inverseInterpreter`, and
`revertInterpreter` is built from it.**

`inverseInterpreter(inverse, idFactory, clock)` takes a `ComputedInverse` — the
operations, the revision they were computed against, an interpreter id, a
rationale, and optionally the work they discard — and returns a
`ChangeInterpreter`. It lives in `src/runtime/`, not `src/write/`, because it
needs no store and a surface reaching for it should not import one.

`revertInterpreter` is that function with the log's half filled in: the
`loom/revert` stamp, the rationale naming the revision and what it costs, and
the discards `planRevert` found. The head check, the provenance of a computed
change, and the shape of the proposal are one implementation rather than two.

**The interpreter id is named by the caller and has no default.** It is the
stamp a reader uses to decide whether a record is an undo the runtime planned
off a log — `(demo)/_lib/undo.ts` reads exactly that. A default would let a
surface inherit `loom/revert` for a delta planned somewhere else, which is a
claim it cannot make. One line, and it is the line that stays true.

**Absence of `discards` keeps meaning "nobody looked at a log".** Only a caller
that read one can know, so the field is optional and an empty list is not
declared — the same statement as no list, and 0035 needs that reading to hold
forever.

## Consequences

A stateless surface offering an undo gets the portal's behaviour rather than its
own reading of it, and the divergence risk goes with it: the head check that
refuses a stale inverse is now impossible to forget, because it is not the
caller's to write.

`(marketing)/_lib/adapt/undo.ts` can drop its interpreter and keep its own
`loom/front-door-undo` stamp and its own words. That deletion is the marketing
lane's to make and is filed for them rather than done here.

The runtime's published surface grows by two names. `revertInterpreter`'s
behaviour is unchanged except for one sentence: the message when it declines a
moved head now reads *the undo was computed against revision N* rather than *the
revert was planned at revision N*, because one sentence serves both callers and
the fault is the same fault.

## Alternatives considered

**Leave it, and let each surface write the thirty lines.** Rejected because the
thirty lines are not boilerplate — they encode the head check, the confidence of
1, the `runtime` authorship that keeps calibration honest (0031), and the
conditional `discards`. Four of those five are silent when wrong.

**Give `inverseInterpreter` a default interpreter id.** Rejected above: a
surface inheriting `loom/revert` would be lying in its own provenance, and the
reader that checks the stamp would believe it.

**Widen `RevertablePlan` so a stateless caller can construct one.** Rejected.
Its `target` is a `StoredRevision` and its `discards` are a claim about a log; a
caller with neither would be filling in fields to satisfy a type, and 0035
depends on those fields meaning what they say.

**Export it from `@loom/runtime/write` beside `revertRevision`.** Rejected
because that entry point exists for the operations that need a store, and a
stateless surface importing it would take the store-shaped half of the module to
reach the half that has nothing to do with one.
