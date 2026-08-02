# 0028. A tree is auditable only if its host can reproduce the seed

**Status:** Accepted
**Date:** 2026-08-02
**Section:** §5 → §1

## Context

0016 made the log the truth and the snapshot a materialised view of it. That is
a claim, and `auditSnapshot` is the only thing that can check it: fold the log
from the tree's original shape and see whether the result is the tree being
served. It has existed since the store did and, until now, had never run outside
a test.

Folding needs a starting point, and neither of the two things a store holds is
one. The snapshot is the current tree, not the original. The log is every delta
*after* revision 0. So the seed is a parameter — `replay.ts` already says why:
"a caller that cannot supply one cannot audit, which is a real limitation, and a
better one than an audit that quietly starts from the answer it is trying to
check."

Building the page forced two questions that comment does not answer. What should
a host do about a tree whose seed it cannot produce? And what should an audit
say when it finds drift, given that `diverged` is a verdict nobody can act on?

## Decision

**A tree is auditable only if the host can reproduce its revision 0. A host that
cannot must say so, and must never audit that tree by another route. When an
audit finds drift, it reports both trees it compared and names the nodes that
disagree.**

### The seed comes from the host, and its absence is a stated limit

`seedFor(treeId)` in the portal is a registry of the trees this deployment can
prove the starting shape of — currently the one it seeds itself, re-derived from
the builder in source rather than read back from anywhere. That is what makes it
evidence: it is produced by the same code that created the tree, so a stored
copy being wrong, missing, or overwritten cannot make the audit agree.

A tree with no known seed is listed on `/audit` and marked unauditable, with the
reason. It is not hidden, because a page that omitted it would read as an audit
of everything there is.

### An audit that finds drift must say what drifted

`SnapshotAudit`'s `diverged` case now carries the stored tree as well as the
replayed one, and `compareTrees` (§1) turns the pair into a list of nodes: in the
snapshot but not produced by the log, produced by the log but not in the
snapshot, or present in both and different — in kind, primitive, props, text,
parent, or position.

Node ids are the join key, which is what makes the comparison worth having. Ids
are minted once and an accepted delta never re-mints them (0003), so a moved card
is one node that changed position rather than a subtree removed and an identical
subtree added.

`compareTrees` is a description and deliberately does not resemble a `TreeDelta`.
It cannot be applied, and nothing accepts it as an input to a write.

## Consequences

- **A host that wants auditable trees has to keep its seeds.** Deterministically
  in source is the cheapest way and the one the portal uses; a host that seeds
  from user input, or from a template it later edits, will find its trees
  unauditable and will not be told so until it tries. There is no warning at
  creation time, because `create` cannot know whether the caller will still be
  able to produce that tree tomorrow.
- **The audit's cost is unbounded in the length of the log,** which is exactly
  the cost 0016 introduced the snapshot to keep off the request path. So it stays
  on demand: a reviewer names a tree, and nothing runs it as a side effect of
  opening a page. Anything scheduled will need the same read, and that is an
  argument for a job rather than against the audit.
- **Nothing is scheduled yet**, so a drift that appears at 3am is found by the
  next person who looks. The page is the precondition for a job, not a substitute
  for one.
- **`compareTrees` is a general tree comparison in the runtime's public API,** and
  it will be reached for by things that are not audits — a preview of what a
  proposal would do, most obviously. That is a fair use and the reason it lives
  in §1 rather than in the portal, but it is also how a description gets mistaken
  for a plan: the guard is that it produces no operations and no ids anything
  could apply.
- **A props bag that differs only in key order is reported as a difference.**
  Props are rewritten wholesale (0009), so two orderings came from two different
  writes; treating them as equal would hide one. Callers that compare trees for
  other reasons may find this stricter than they want.

## Alternatives considered

**Keep revision 0 in the store — a `seed` column on `loom_trees`, or the initial
tree as log entry 0.** The strongest alternative, and rejected on scope rather
than merit: it is a schema change and a `TreeStore` contract change, and this run
had a page to build on top of the contract as it stands. It would make every
tree auditable regardless of host, which is a real gain. The counter-argument is
not decisive but worth recording: a stored seed is data, and the audit exists to
catch the case where the code that interprets stored data has drifted — so a
seed re-derived from source is checked by a slightly different route than a seed
read back from the same store being audited. This should be reconsidered the
first time a host other than the portal wants an audit.

**Fold from the snapshot when the seed is unknown.** Rejected outright. It
compares the tree with itself and agrees every time, which is worse than no
audit — a green tick that means nothing is how an unchecked claim gets believed.

**Hide unauditable trees from the page.** Rejected: the page would then show a
list of trees that all pass, which is indistinguishable from a deployment where
everything is fine.

**Put the tree comparison in the portal.** Rejected: the scheduled job that
should eventually run this needs the same explanation, and so does any host with
its own review UI. A verdict of "diverged" with no way to say how is the thing
this record exists to fix, and it would have been fixed only for one consumer.

**Make the comparison produce a `TreeDelta` that reconciles the two.** Rejected,
and this is the one worth being firm about. A second shape that describes change
would eventually be applied by somebody, and the log would gain entries no
proposal ever produced — which is 0001's whole claim, undone by a convenience.
Reconciling drift is a decision a person makes, and if it is ever automated it
should be by proposing a change through the same gate as everything else.
