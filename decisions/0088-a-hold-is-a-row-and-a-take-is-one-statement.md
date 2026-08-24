# 0088. A hold is a row, and taking it is one statement

**Status:** Accepted
**Date:** 2026-08-23
**Section:** §3

## Context

`HoldStore` states its own requirement in the first line of its doc comment, and
has stated it since the day it was written:

> A proposal the Gate marked `requires-confirmation` has to survive the request
> that produced it, because the human who answers it arrives later.

Until now there was exactly one implementation of it and it was a `Map` in
process memory. `@loom/runtime/postgres` shipped `postgresTreeStore` and no
counterpart, so the log — the thing that already survives everything — had two
backends held to one contract by one suite, while the custody beside it had one
backend that could not keep the promise its interface was written to make.

On a long-lived server that is fine and the memory store is the right choice. On
the serverless hosts [0022](0022-the-backing-store-is-postgres-reached-by-sql.md)
targets, it is the exact failure the comment rules out: the process that judged
the change is usually gone before the reviewer opens the page, and the hold went
with it. Nothing reported that, because from the runtime's point of view a hold
that vanished and a hold that was never made are the same absence.

Filed by `Loom docs` on 23 August, while writing the page that documents this
module — the gap was found by having to describe it honestly to a reader.

## Decision

**A held proposal is a row in `loom_holds`, keyed by its own proposal id, and
`release` is a single `DELETE … RETURNING`.**

Three things follow from that sentence and each is load-bearing.

**A third table, not a column on either existing one.** A hold cannot live in the
log: [0016](0016-the-log-is-the-truth-and-the-snapshot-is-a-view.md) makes the
log the truth and a revision the count of its entries, so a row for a change that
advanced nothing would break the invariant `auditSnapshot` checks the snapshot
against. It cannot live on `loom_trees` either — a tree can have several changes
waiting on it at once.

**The proposal is stored whole, as JSON.** `intent`, `proposal` and `disposition`
go into `jsonb` columns for the reason `loom_revisions.delta` does: they are
Zod-validated shapes owned by §2 and §3, and columns would duplicate those
definitions and drift from them. It is also the only shape that keeps the
interface's promise that a confirmation can be *re-judged*, which needs the
proposal as it was rather than a reconstruction of it. They are parsed on the way
out, never cast — a hold is created by one deployment and answered by whichever
one is serving when the reviewer returns, so it is the shape most likely to
outlive its writer.

**`release` is a take, and one statement is what makes it one.** The interface
already says why: removing and returning in one step is what makes answering a
proposal exactly once a property of the store rather than a rule every caller has
to remember. A select-then-delete would let two reviewers pressing *confirm* at
the same moment both come away holding the same change, and both apply it. The
in-memory store gets that property from being single-threaded. Postgres has to be
made to get it on purpose, and `DELETE … RETURNING` is how.

Alongside it, and the half worth more than the backend: **`HoldStore` now has a
contract suite**, `describeHoldStoreContract`, run against both implementations
the way `describeTreeStoreContract` is. `held.ts` has called `memoryHoldStore`
the reference implementation since it was written; that was a promise, and this
is what makes it a fact.

## Consequences

**The contract suite found a disagreement on its first run, and it was in the
fixtures rather than in either store.** Every held-proposal fixture carried
`operations: []`, and `treeDeltaSchema` requires at least one operation — so the
tests had been building holds that were not valid holds. The `Map` never noticed,
because it stores what it is handed. Postgres accepted the write and refused the
read, which is the worst possible place to find out. This is precisely the class
of fault a second implementation exists to expose: not a bug in either store, but
a thing everyone had agreed to without checking.

**A deployment chooses.** Nothing switches automatically. `memoryHoldStore` stays
the default and stays correct for a single long-lived process; a host that needs
holds to survive constructs `postgresHoldStore` with the same handle it already
gives the tree store. The portal has not adopted it — that is its own routine's
change, filed for it.

**`ensureHoldStoreSchema` is separate from `ensureTreeStoreSchema`.** The two
stores are separately useful, and a function whose name promises trees should not
quietly create something else. `db:push` calls both, so the table exists on every
deployment that has run it and adopting the store later is a code change rather
than a database step.

**The table is locked on creation**, like every other
([0036](0036-a-table-loom-creates-is-locked-when-it-is-created.md)), and carries
one index on `(tree_id, held_at)` — `forTree` is the review queue's only read and
the one query here that is not a primary-key lookup.

**Expiry is not built.** `HoldError`'s `not-held` already says it covers "never
held, already answered, **or expired**", and nothing expires anything in either
implementation. A row now persists until it is answered, which on a real
deployment means a proposal nobody returns to waits forever. That is a policy
question — how long a hold is good for, and whether a stale one is discarded or
shown as stale — and it is not settled by picking a backend. Recorded as open
rather than guessed at.

## Alternatives considered

**Fold the holds into `loom_revisions` with a `pending` flag.** Rejected, and it
is the alternative most likely to be proposed again. It would put every held
change in the same table as every applied one, which reads as tidy until 0016 is
applied to it: a revision *is* an entry in the log, the snapshot's revision is the
count of them, and a pending row would either be counted — advancing a tree that
did not change — or excluded, at which point every query against the log carries a
predicate that exists to undo the decision to share the table.

**Shred `intent`, `proposal` and `disposition` into columns.** Rejected for the
reason given above, and for one more: the Gate's disposition has already gained a
field once ([0029](0029-the-approval-belongs-on-the-revision.md) added the
approver, and `policyFingerprint` arrived later still). Columns would have made
each of those a migration.

**A generic key-value table, so holds and any later ephemeral state share one.**
Rejected as premature. There is one thing that needs this shape, and a table
designed for a second unnamed use is a table designed against a guess. The
alternative costs one `CREATE TABLE` when the second thing arrives.

**Leave the memory store as the only one and document the limit.** This is what
the documentation site did, correctly, and it is why the finding exists. It is
the right answer for a page that has to describe today's runtime and the wrong
one for the runtime, because the deployment target §3 names is exactly the one
where it fails.

**Build the contract suite and stop there.** Genuinely tempting — the suite is
the more valuable half, and the finding said so. Rejected because a contract with
one implementation is a contract nothing has been checked against: the suite's
whole worth is that a second implementation has to agree with the first, and the
fixture fault above is the evidence. Building both together is what found it.
