# 0109. An inverse in hand is proposable without a store, and the runtime never puts its own name on one it did not plan

**Status:** Accepted
**Date:** 2026-09-05
**Section:** §2

## Context

The runtime computes the inverse of every change at assessment time.
`assessReversibility` hands it back on `Reversibility.inverse`, and that is what
makes "this can be undone" a thing the runtime shows rather than claims
(the point [0032](0032-an-undo-is-a-proposal-not-a-rewind.md) turns on).

Until now the only way to *offer* one back was `revertRevision`. It plans an
undo by replaying a store: given a revision number it finds the delta, inverts
it, and reports which later revisions named a node the undo touches
([0035](0035-discarded-work-is-a-stake-and-only-the-runtime-declares-it.md)).
That is the right path when the undo is being recovered from a log, because only
a log can answer what has been built on top since.

It is the wrong path — and an unreachable one — when the inverse never left the
process. `revertInterpreter` was exported beside `revertRevision`, but it takes a
`RevertablePlan` whose `target` is a `StoredRevision`, so **the whole path was
reachable only through a store.**

`Loom marketing` hit that on 5 September making the front door's *Put it back*
do what its label says. That surface has no store and is not getting one
([0081](0081-the-front-door-demonstrates-statelessly-and-the-address-is-the-state.md)):
a session per visitor on the most-crawled surface the project has is a memory
leak with an advertising budget. It composed the change and the undo in one
request, so the inverse was already in hand and nothing had been built on it —
no log to replay and nothing to contest. It wrote the missing piece by hand, in
about thirty lines, and filed the workaround as the finding.

Read side by side, that file and `revertInterpreter` were the same interpreter.
Same empty interpretation seam, same head check, same `authoredBy: "runtime"`,
same confidence of 1, same reasoning quoted for both. The differences were two,
and both were things a store supplies and a stateless caller cannot: a rationale
naming the revision being undone, and the declaration of what applying it writes
over.

## Decision

**`inverseInterpreter(inverse, terms, ids, clock)` is public, lives in
`src/runtime/`, and depends on no store.** It takes operations and the revision
they were computed against — a `TreeDelta` satisfies that shape, which is what
`Reversibility.inverse` is — and turns them into a proposal the Gate weighs like
any other. `revertInterpreter` is now that function plus the two log-shaped
fields, and is unchanged in behaviour.

**Both `terms.interpreter` and `terms.rationale` are required. Neither is
defaulted, and in particular there is no default of `REVERT_INTERPRETER`.**

That is the half of this worth arguing, because a default would have been
convenient and is the reason to write a record rather than a line of prose.
`REVERT_INTERPRETER` — `"loom/revert"` — is what `revertRevision` stamps on a
delta **it** planned off a log, and `(demo)/_lib/undo.ts` reads that stamp back
to decide whether a record in front of a reader is an undo. That is the runtime
saying so, rather than a surface pattern-matching an utterance, and it only
means anything while the stamp is narrow. A shared default would put one name on
undos planned by unrelated callers and quietly turn a provenance field into a
category label.

A default rationale would be the same mistake in the other field: the runtime
writing a sentence about a provenance it does not know, on the one field the
person answering a hold actually reads ([0019](0019-the-portal-is-a-review-queue-not-a-design-tool.md)).

**An empty `discards` list is dropped rather than declared.** Absence has to keep
meaning "nobody looked at a log", not "a log was checked and was clean" (0035) —
and every stateless caller is a caller with no log, so this is now the common
case rather than the corner one.

## Consequences

Every surface that holds an inverse can offer an undo that behaves identically
to the portal's — same seam, same head check, same provenance grade, same Gate —
without a store and without rebuilding it. The second half of the recorded
differentiator, *and how to undo it*, stops costing a surface a file to
demonstrate.

`(marketing)`'s `_lib/adapt/undo.ts` can now be about thirty lines shorter, and
that is its lane's call and its lane's timing. The finding is closed by the
export existing, not by that file changing; nothing breaks if it never does.

Naming the interpreter is now a decision at each call site rather than something
inherited. That is one more line for a caller, and it is the line that keeps
`REVERT_INTERPRETER` meaning what `(demo)` reads it as meaning.

The head check refuses on a moved revision with one wording now rather than two.
`revertInterpreter` previously said *"the revert was planned at revision X"*; it
now says *"the inverse was computed against revision X"*. No test asserted the
old sentence and the error code is unchanged.

## Alternatives considered

**Leave it, and let each surface write its own thirty lines.** What happened, and
the finding is the argument against it: the lines that get rewritten are the
provenance ones, and a surface inventing its own idea of what an undo's
provenance says is exactly the drift the record exists to prevent.

**Give `revertInterpreter` an overload taking a bare inverse.** One export, no new
name — and it would have had to default the interpreter stamp to
`REVERT_INTERPRETER` to stay one function, which is the thing this record exists
to refuse.

**Default the stamp to something new, like `loom/inverse`.** Removes the call-site
line, and reintroduces the problem one level down: two unrelated surfaces sharing
a stamp, and no way for a reader to tell which planned what. A stamp is worth
having only while it is narrow.

**Put it in `src/write/` beside `revertRevision`.** Where the code was, and where a
stateless caller cannot reach it — `src/write/` is the store-coupled half by
construction. The whole point of the finding is that this piece has no store
dependency, so it belongs with the interpreter seam it implements.
