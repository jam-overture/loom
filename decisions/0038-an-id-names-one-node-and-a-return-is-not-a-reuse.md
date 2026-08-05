# 0038. An id names one node, and a return is not a reuse

**Status:** Accepted
**Date:** 2026-08-05
**Section:** §1 → §5

## Context

0001 made the NodeId the address of a node for the life of the tree. 0028 leaned
on that when it made ids the join key for `compareTrees`, and said so plainly:
"ids are minted once and an accepted delta never re-mints them, so a moved card
is one node that changed position rather than a subtree removed and an identical
subtree added." `compare.ts` repeated the claim in its own header.

The claim was never checked, and it is not true. What `applyDelta` actually
enforces is narrower: `rejectIdCollisions` refuses an insert whose ids are
already in the **live tree**. A `remove` takes an id out of the live tree, so
nothing at all stops a later insert minting a fresh node onto it. The case is
two operations long and was demonstrated by running it: remove `n_4`, insert a
node minted as `n_4`, and every check passes. `n_4` is then a card at one
revision and a text node at the next, and every reader that follows an id across
the log — `compareTrees` between revisions, provenance, a reviewer reading
`/history` — is silently following two different nodes.

In production this is currently improbable rather than impossible: `randomIdFactory`
mints 20 base-36 characters, so the runtime does not collide with itself. The
exposure is a host that authors deltas directly, a host that supplies its own
`IdFactory`, and `sequentialIdFactory`, whose counters restart per instance.
"Improbable" is not what 0028 claimed, and an audit that rests on an unchecked
assumption is the kind of green tick 0028 itself warns about.

The obvious rule — an id, once retired, may never appear again — is wrong. The
inverse of a `remove` is an `insert` carrying the exact node that was removed
(`inverse.ts`), and an undo is a first-class operation (0032, 0035) that the
portal offers on every revision. A rule that forbade an id from ever returning
would forbid taking a removal back, and a detector that flagged every undo would
be noise over exactly the workflow Loom encourages.

## Decision

**An id names one node for the life of a tree's log. An id that left may come
back, but only as the node that left. This is enforced inside a delta, reported
across a log, and the two are the same rule at two ranges.**

### The question is never "did it return" but "did it return as itself"

Two nodes are the same node when their **fingerprints** match: kind, primitive
or slot name or text, props, ids, and children, recursively. `nodeFingerprint`
in `src/tree/identity.ts` is the single definition, used by both the enforcement
and the report, so the two can never disagree about what "the same node" means.

Ids are part of the fingerprint deliberately. A subtree rebuilt with fresh
children under a retired parent id is a new node wearing an old address, and
that is precisely the case worth catching. Props are compared by serialisation,
which is order-sensitive — the same choice `compareTrees` makes, for the same
reason 0009 gives.

A return that matches is a **restoration**: a real event in the tree's history,
reported as such, and not a fault. A return that does not match is a
**recycling**: from that revision on, one address names two nodes.

### Inside one delta, the rule is enforced

`applyDelta` now carries the ids the delta has removed, with the shape they had
when they left. An `insert` naming one of them with a different node is refused
with `recycled-node-id`. A `remove` retires every id in the subtree it takes,
not only the one it named — each of those is an address that could be reused.

`applyOperation` applied on its own retires nothing, because it is a rule about
what a *delta* may do to an id it removed. `invertOperations` walks operations
one at a time, and inverting a change must never be stricter than making it.

### Across a log, the rule is reported

Enforcing this across revisions would require the tree to carry the ids it has
retired: a `LoomTree` field, a `TREE_SCHEMA_VERSION` bump, a stored column, and
a migration of everything already built. That is not a decision to take
unilaterally, and it is not one this record makes.

Instead the fold that already exists reports it. `replayTree` and `auditSnapshot`
carry an `IdHistory` alongside the tree — derived from the consecutive states the
fold already produces, so no second pass and no second read of a log — and
`SnapshotAudit` gains `idReturns` on both replayable outcomes. `/audit` renders
recycled ids as their own finding with their own heading, and counts
restorations in a sentence.

### Recycling is a second finding, not a second verdict

An audit's verdict answers whether the log still produces the snapshot. Whether
an id still names one node is a different question, and a tree can pass the
first while failing the second. The page reports them separately rather than
letting one colour the other, because collapsing them would mean calling one of
those two things by the other's name — and "diverged" already means something
specific that an operator acts on differently.

`unreplayable` carries no id findings at all. A fold that stopped saw part of a
log, and part of a history is not a history.

## Consequences

- **`replayTree` returns `{ tree, idHistory }` rather than a tree.** A source
  change for every caller, all of them inside the runtime. The alternative was a
  second exported fold, which would read a whole log twice to learn something
  the first read went straight past.
- **A delta can now fail with a code that did not exist.** Only for a delta that
  removes an id and re-inserts a different node onto it in the same breath —
  which is the fault. Replaying a clean log is unaffected, so no stored log
  becomes unreplayable and nothing needs migrating.
- **The gap between the two ranges is real and is stated, not papered over.** A
  recycling spread across two deltas is still accepted at write time and found
  only when someone audits. `/audit` runs on demand and nothing schedules it
  (0028), so a recycling can sit unnoticed. That is the honest position until
  the schema question below is settled.
- **A restoration is reported for every id in the subtree**, so taking back the
  removal of a twenty-node card counts twenty restorations. Truthful, and the
  reason they are counted rather than listed.
- **`compareTrees` between two folds of one log is unaffected** either way: both
  sides read the same id the same way. The exposure is comparing across
  revisions, which is what `/history` does.
- **A host with its own `IdFactory` now has a way to find out it was wrong**,
  which it did not have before, and still no way to be stopped at write time.

## Alternatives considered

**Carry retired ids on the tree and enforce across the log.** The complete fix,
and the one a reasonable engineer reaches for first. Rejected for this run on
process rather than merit: it changes the §1 schema and forces a migration of
stored trees, the store contract, and replay, which is an escalation rather than
a refactor. It is raised for review as the natural follow-up. Its real cost is
also worth recording — the retired set grows without bound in the length of the
log, and a tree that has churned for a year carries every id it ever held.

**Forbid an id from ever returning.** Simple, and it breaks undo. `invertRemove`
re-inserts the node it removed, so this would make a removal the one change that
cannot be taken back — directly against 0032 and 0035.

**Report every return without distinguishing them.** No fingerprint, no
heuristic, much less code. Rejected because it would flag every undo as
suspicious, and a detector that fires on the expected case is one people learn
to scroll past. The distinction is the thing that makes the report worth
reading.

**Enforce at the write path by scanning the log.** `commit.ts` has the store, so
it could look. Rejected: it puts an unbounded read on the write path, which is
the cost 0016 introduced the snapshot to keep off it, and it would make every
write pay for a fault the runtime's own minting cannot produce.

**Compare node shape without ids.** Would let a subtree rebuilt with fresh
children count as restored. Rejected: the question is whether this is the node
that left, not whether it resembles it.

**Say nothing and fix the sentence in `ids.ts` instead.** The interim the last
run recommended if the fix were deferred again. Rejected now that the fix is
here: a comment describing a rule nothing enforces is how the claim in 0028 came
to be believed in the first place.
