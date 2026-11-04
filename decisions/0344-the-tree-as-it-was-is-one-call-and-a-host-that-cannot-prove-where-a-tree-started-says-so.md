# 0344 — The tree as it was is one call, and a host that cannot prove where a tree started says so

**Status:** Accepted

**Date:** 3 November 2026

**Section:** §2 (the store)

## Context

[0016](0016-the-log-is-the-truth-and-the-snapshot-is-a-view.md) keeps two things:
the head snapshot, and a log of every delta from revision 1. Revision 0 is in
neither. [0028](0028-a-tree-is-auditable-only-if-its-host-can-reproduce-the-seed.md)
decided where it comes from instead — **the host**, re-derived from the code that
created the tree, which is what makes a seed evidence rather than a second copy
of the data being checked. A backward fold is not an alternative:
`invertOperations` inverts each operation against the state that operation
observed, so inverting the newest delta needs the version before it, and the
walk a consumer would want to make is the one that cannot start.

[0228](0228-the-tree-as-it-was-is-a-fold-bounded-at-both-ends-and-the-head-is-answered-from-the-log.md)
published the fold: `treeAt(reader, { treeId, revision, seed })`. **A consumer
still could not use it**, and three readings said so in writing — the
before-and-after reading, the skipped-parts reading across a version gap, and the
drop-off reading across one. `Loom portal` filed the reason on 4 October:
`treeAt` takes a seed, a `TreeReader` has no way to ask for one, and so a
consumer holding a reader can reconstruct no version but the current one.

What 0028 left in one deployment is the **lookup**, not the policy. `seedFor`
was the portal's own registry, and the absence of a seed had no published shape
at all — so `progression.ts` invented `{ kind: "unknown-start" }` for it, and the
next consumer would have invented its own name for the same fact.

## Decision

**A seed source is a published seam, a history is a reader joined to one, and
"this host cannot prove where this tree started" is an answer rather than a case
each caller discovers.**

### The seam

`SeedSource = (treeId: TreeId) => LoomTree | undefined`, in
`src/store/history.ts`. A plain function, and **synchronous on purpose** — the
reason is 0028's rather than convenience. A seed is evidence only because it is
re-derived from the source that built the tree; a lookup that needed IO would be
reading a seed back from storage, which is the route 0028 rejected outright
because it compares the data with itself.

`seedRegistry(map)` builds one over a fixed set of trees, from thunks rather than
trees: a deployment naming every seed it knows should not build all of them to
answer about one. Nothing is cached between calls, so two answers for one tree
are two independent derivations — the property the audit depends on.

### The answer

`TreeHistory` has two methods, `at(treeId, revision)` and
`atEach(treeId, revisions)`, returning `TreeVersion` — `TreeAtRevision` plus one
new member:

```ts
{ outcome: "unseeded", treeId, revision }
```

`unseeded` is **a statement about the host, not about the log or the revision.**
The store may hold a perfectly readable history this deployment cannot fold. It
costs no read at all: a history that cannot answer does not open the log to find
that out, which is also what makes the two cases distinguishable — the same store
read through a history that can seed it answers.

`describeTreeVersion` extends `describeTreeAt` with that one sentence and defers
to it for every answer the fold produces.

### What is not here

**No seed is stored and the schema is untouched.** `head` is not re-exported on
the history either: a `TreeReader` already has it, and a second way to ask for
the current tree would be one that folds the whole log to produce what the
snapshot already holds.

## Consequences

- **A consumer holding a reader and a seed source can read any version**, so the
  three readings filed against this gap are unblocked. Each is one line of
  wiring in the lane that owns the screen, not a framework change.
- **A deployment must name its seeds once.** The portal's `seedTree()` is
  already the right shape; what changes is that it is handed to a history rather
  than threaded through every function that folds.
- **A tree whose seed the host cannot produce is now legible everywhere rather
  than in one portal module.** A screen that shows versions can say which trees
  it cannot show and why, and the reason is reportable rather than inferred from
  a missing row.
- **`unseeded` is a fourth member on a union four modules switch on.** Anything
  exhaustively matching `TreeVersion` rather than `TreeAtRevision` has a case to
  add; `TreeAtRevision`'s own consumers are untouched, which is why the new
  member is on a new type rather than added to that one.
- **The absence is still per-host rather than per-tree.** Two deployments reading
  one database disagree about which trees are seedable, and both are right. A
  reading that crossed deployments would need the stored seed below.

## Alternatives considered

**Store revision 0 — a `seed` column on `loom_trees`, or the initial tree as log
entry 0.** 0028 named this as its strongest alternative and rejected it on scope,
saying it "should be reconsidered the first time a host other than the portal
wants an audit." That condition is not yet met: the three readings asking for a
past version are all the portal's own trees, which it can seed. Reconsidered and
deferred again, now with a second argument on the other side — a stored seed is
data, and the audit exists to catch the case where the code interpreting stored
data has drifted, so a seed read back from the store being audited is checked by
a weaker route than one re-derived from source. It is also a schema change and a
`TreeStore` contract change, which is **`ARCHITECTURAL — needs review`** under
this lane's standing rule, and this record does not take it.

**Fold from the snapshot when the seed is unknown.** Rejected, and 0028 rejected
it before: it compares the tree with itself and agrees every time. It is
recorded again because it is the shape a seam like this invites — the types line
up and the tests go green. `history.test.ts` plants it and fails.

**Make `SeedSource` asynchronous.** Rejected on 0028's grounds, above. The cost
is a host whose seeds genuinely live behind IO, which would have to resolve them
before building the history; that host's seeds are stored data and the honest
answer for it is the stored seed, not an async lookup that looks like evidence.

**Return `undefined` from `at` when there is no seed, rather than an answer.**
Rejected. It is the shape that produced `{ kind: "unknown-start" }` in the first
place: every caller invents a name for the absence, and the one caller that
forgets reads it as "no such revision". An outcome is a thing a screen can print.

**Put the lookup on `TreeStore` itself.** Rejected. A store is scoped to what a
handle can see (0020); seeds are a fact about the host's *source code*, not about
its data, and a method on the store would make every implementation and every
test double grow one. The history composes the two instead, which is also what
lets a caller build one over a reader it did not get from a store.

**Wire the portal's three readings in this change.** Rejected: the readings are
`Loom portal`'s files and that lane is paused. A migration of the consumer and a
new seam in one pull request is also the shape that cannot be reviewed.
