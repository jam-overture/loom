# 0241 — A policy is a logged object, and what changed is a view over the log

**Status:** Accepted
**Date:** 2026-10-08
**Section:** §2 → §5

## Context

Loom's whole premise is that a change to a page is logged, judged and reversible.
Every revision of a tree carries the provenance that produced it
([0016](0016-the-log-is-the-truth-and-the-snapshot-is-a-view.md)), every judgment
says which policy made it, and a reviewer can walk back from a node to the person
who asked for it.

**The policy was the one object in that system that could change silently.**

A `Disposition` carries `policyId`, which
[0033](0033-the-policy-is-resolved-per-change-and-named-on-the-verdict.md) made
host-declared under a contract — *a name identifies content*, so a host that
edits a policy renames it. The runtime could not check that and said so. The
check arrived as `policyFingerprintOf`: a digest stored beside the name, so a
reader can prove that two judgments naming one policy ran under different rules.

That is as far as a digest goes. `rulesetContinuityOf` reports `changed` and
cannot say *what* changed, because a hash has no middle — two fingerprints either
match or they do not. So the question a reader of a changed policy actually has
had no answer anywhere: **what changed, when, and who did it.** A refusal rate
that moved in the week somebody nudged `minimumConfidence` in a config file is
either explained by that edit or is a fault, and nothing in the repository could
tell those apart. `/portal/trust`'s own policy breakdown warns about a
calibration window straddling a policy change and cannot explain one.

[0200](0200-the-portal-may-place-a-lever-beside-the-evidence-and-a-model-may-never-pull-one.md)
(`Proposed`) decides that the portal may put a policy control next to the
measurement arguing for it, and that **a change to policy is a change a person
made, recorded as one** — who, when, and what it was before. It was filed as an
open finding against this lane by `Loom portal` on 27 September, with the
reasoning for why it could not be the portal's: a portal-side history of policy
edits would be a second source of truth, free to disagree with whatever the
framework did later.
[0018](0018-the-portal-is-a-consumer-not-an-insider.md) in its
usual direction.

## Decision

**A policy is a logged object. The log keeps whole policies, and everything a
reader wants to know about an edit is derived from the pair either side of it.**

Three things, and the division between them is the decision:

**`PolicyLog`** (`src/runtime/policy-log.ts`) is an append-only log of policy
revisions, dense and 1-based per `policyId`, each carrying the whole `GatePolicy`
as it was, the actor who made it so, and the instant. Two implementations, one
contract suite, published as `@jam-overture/loom/testing/contracts` like the other
three seams.

**`policyChangeOf(was, now)`** (`src/runtime/policy-change.ts`) answers what
moved between two policies, field by field, and **which way it moved the Gate** —
`stricter`, `looser`, `mixed`, or `incomparable` for a field that has no order.
It is pure and synchronous, so it may be called on the decision path as well as
in a report.

**The join is the fingerprint already on a `Disposition`.** `judgedUnder(policyId,
fingerprint)` turns the digest a judgment recorded into the policy text it was
made under.

Four properties are the substance of the decision.

**1. The log stores policies, never diffs.** This is 0016's relationship applied
to the thing doing the judging rather than to the thing being judged: the log is
the truth and every description of a change is a view. A recorded diff would be a
second copy of a fact the two policies already determine — free to drift, and
unable to answer about a pair nobody anticipated.

**2. An actor is required, and the runtime never supplies one.** 0200 says a
change to policy is a change a person made; a log whose whole point is *who did
this* cannot have that field be optional. The one genuinely unattributable case —
judgments made before this log existed — is answered by the absence of a revision
rather than by an invented one, the same way `loom_revisions.answered_by` is null
on every row written before 0029.

**3. Recording what is already current is not a revision.** A host builds its
policy at boot and `fixedPolicy` closes over it, so a deployment that recorded on
start would append one revision per process and the log would be a list of
restarts. The log answers `unchanged` and hands back the head. **Idempotence is
against the head and never against history**: a policy taken to B and back to A
is a decision somebody made at a time, and swallowing it would lose the revert.

**4. A digest that names two revisions is reported as naming two.** The
consequence of 3: a policy changed and changed back has two revisions with one
fingerprint — correctly, they are the same rules — and nothing can say which of
them a judgment ran under. `judgedUnder` answers `ambiguous` with both rather
than returning the oldest or the newest, either of which would be a confident
wrong answer.

**The direction of an edit is a judgement this record takes.** Each policy field
is declared with which way raising or adding it moves the Gate, in a mapped type
over `GatePolicy` so that a field added to the policy is a compile error until
somebody says. Two of the fourteen are not the obvious way round and are the
reason the table is worth having rather than being obvious:

- **`refusalFloor` raised is looser.** The floor is the level *at which* a change
  is refused, so lifting it refuses less.
- **`registeredPrimitiveTypes` arriving where it was empty is stricter**, which
  is the opposite of the ordinary reading of a longer allowlist. `gatePolicySchema`
  documents why: an empty list is *undeclared*, not a library of nothing, so a
  list arriving is a limit arriving where there was no limit
  ([0173](0173-a-change-may-not-add-a-node-the-deployment-cannot-draw.md)).
  Every edit inside a declared list reads the ordinary way round, and emptying it
  removes the check.

**A rename has no direction.** It is reported as a field that changed and is
skipped by the fold, so an edit that renamed a policy *and* raised a threshold is
`stricter` rather than `mixed`. Counting the rename would have hidden the one half
that is knowable.

## Consequences

**Nothing on the decision path changed, and nothing was added to a payload, a
tree, a delta or the vocabulary of kinds.** The Gate, `GatePolicy` and
`PolicySource` are untouched; `Disposition` is untouched. A deployment that does
not want a policy log carries one more table's worth of DDL it never runs.

**The log is a seam a host may not take.** `PolicyLog`'s operations are promises
over storage, and `policy-source.ts` requires resolution to be synchronous and
pure, so recording is not on the decision path: a host loads its policy, records
it once, and closes over the value it already has. A log that resolved a policy
per judgment would make every decision await a read and every replay unable to
reproduce one.

**`loom_policy_revisions` is a fourth table and carries one denormalised
column.** `fingerprint` is a column rather than a JSON path because of the query
it exists for — a screen showing a page of records resolves one per record — and
the runtime computes it from the policy beside it and never accepts one from a
caller, so the two cannot disagree. The composite primary key is load-bearing
exactly as `loom_revisions`' is: two recorders racing at one head both compute
`N + 1` and the database refuses the second, which is why the Postgres
implementation needs no transaction. A `SELECT … FOR UPDATE` could not have served
anyway — the first revision of a policy has no row to lock.

**`rulesetContinuityOf` keeps its job and gains an explanation.** It still reports
`changed` and `incomparable` over the fingerprints in a segment, which is the
right reading when there is no log; where there is one, the segment's fingerprints
resolve to revisions and `policyHistoryOf` says what the edits between them were.
A calibration window that straddles a policy change becomes legible for the first
time, which is what the finding asked for.

**What this does not do.** It does not record a policy change *as it happens* —
nothing in the runtime calls `record`, because nothing in the runtime edits a
policy. A host or the portal's policy control is the writer, which is the half
0200 authorises and this one makes possible. And it does not replace the
fingerprint: a judgment whose policy was never recorded is still a judgment with a
digest, and `judgedUnder` reports `unrecorded` with the shapes it does hold rather
than failing.

## Alternatives considered

**Store the diff instead of the policy.** Rejected on 0016's own argument. A log
of edits is smaller and answers the common question directly, and it cannot answer
a question nobody anticipated — *what were the rules on the 3rd* is a fold from the
beginning rather than a read, and a fold that meets an edit it cannot apply has no
answer at all. Two copies of a fact are two things that can disagree, and the
policy is the copy that matters.

**Make it a column, or a row, on the tree log.** Rejected: a policy revision is
not a tree revision. It is not keyed by a tree, it does not advance one, and one
revision of one policy judges changes to every tree a deployment holds. 0016 makes
a tree's revision the count of its log entries, so an entry that advanced nothing
would break the invariant `auditSnapshot` checks — the same argument that put
`loom_holds` in its own table.

**Put the actor on the policy itself**, as a field of `GatePolicy`. Rejected
twice over: it would change the fingerprint, so every host that reassigned
ownership of a policy would have its whole corpus read as judged under different
rules; and it would say who owns the policy rather than who changed it, which is
the question.

**Let a `PolicySource` resolve from the log.** Rejected. It is the obvious next
thought and it is the one thing this seam must not do. `policy-source.ts` gives
the reasons in full: an awaited resolution makes every decision slower and every
replay unreproducible, because a replay cannot fetch what the original run
fetched. Recording is a thing a host does when it changes a policy, not a thing
the Gate does when it judges.

**Resolve an ambiguous fingerprint to the newest matching revision.** Rejected,
and it is the alternative most likely to be reached for because it makes the
signature simpler. A policy taken to B and back to A would then have every
judgment from its first era attributed to its third, with an actor and an instant
that are wrong and look authoritative. A reader told *one of these two, and I
cannot say which* can go and look; a reader told the wrong one cannot.

**An `at` anchor on the paged read**, as `RevisionReadRequest` has. Not rejected
on principle — declined as unearned. A tree log has thousands of entries and a
reader is sent to one, which is what an inclusive anchor is for; a policy has tens
over a deployment's life, so a screen showing a history pages from an end. It is
additive the day a screen needs it.
