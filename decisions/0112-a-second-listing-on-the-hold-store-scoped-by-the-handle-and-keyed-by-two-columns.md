# 0112. A hold store lists what the handle can see, and its cursor is two columns because an instant is not a key

**Status:** Accepted
**Date:** 2026-09-06
**Section:** §5

## Context

`HoldStore` had one listing, and its doc comment said why: *"`forTree` is scoped
by tree because that is the only listing a review queue needs; like `TreeStore`
(0020), a handle is the scope of what it can see."*

That was true while the review queue was a section of one page's screen. It
stopped being true when the portal's front door became the queue over every page
— the surface that answers *does anything need me?* before a reader has a tree in
mind. `Loom portal` filed it on 1 September after building that screen out of the
two reads it had:

1. `TreeStore.list` — one bounded page of trees, plus a cursor;
2. `HoldStore.forTree` — **once per tree on that page.**

Two things are wrong with that, and the second is worse than the first.

**It is O(pages) queries for a question with a one-row answer.** Fifty round
trips to a database to find out that nothing is waiting. It also blocks the
obvious next thing on the surface — a count beside *Waiting on you* in the rail —
because a badge in the shell would pay that cost on every screen in the portal
rather than on one. The badge is deliberately absent for that reason.

**It cannot be complete, and nothing fails when it isn't.** A listing is bounded
by contract (0020), so a deployment with more pages than the bound has holds the
screen never looks for. Unlike a read that errors, the queue simply prints the
same confident *"Nothing is waiting for you."* it prints when it has swept
everything. That branch made the gap visible rather than closing it — it reads
the cursor and says on screen what it did not check — which is worth something,
and worth less than the read existing.

## Decision

**`HoldStore` gains a second listing, `waiting`, and it is `TreeStore.list`'s
shape applied to holds.**

```ts
readonly waiting: (request?: HoldListRequest) => Promise<Result<HoldPage, HoldError>>
```

**1. It is scoped by the handle, and takes no scope argument.** This is 0020 part
1 unchanged, and it is what makes the addition permissible rather than a
widening: every hold `waiting` returns is one the same handle could already have
reached by naming its tree. A tenant gets a handle narrowed to its own holds, the
way it gets one narrowed to its own trees, and a listing that reached further
than reading would be the thing 0020 refused.

**2. Its cursor names two columns — `(heldAt, proposalId)` — and this is the part
0020 did not have to decide.** `TreeStore.list` orders by `treeId`, which is
unique, so a key and a position are the same thing there. A hold's instant is
neither unique nor close to it: the Gate holding two changes in one judgement
writes one instant twice, and every fixture in the contract suite shares one by
default. A cursor naming only an instant repeats a hold or skips one depending on
which side of the comparison it falls, which is the single failure a cursor
exists to prevent. `proposalId` is the table's primary key, so the pair is total
and stable — 0020's requirement, met by adding the tiebreak rather than by
abandoning the order the queue wants.

**The order is oldest-first, because that is the answer to the question.** The
hold that has waited longest is the closest to going stale. 0020 rejected recency
for trees on the grounds that *"recency is a view over data the store does not
hold"* — a `LoomTree` carries no timestamp. That argument does not transfer: a
hold carries `heldAt` as a stored column, `forTree` has always ordered by it, and
ordering the deployment-wide read any other way would have made the store's two
listings disagree.

**One comparator, written once.** `compareHolds` states the order and both
listings use it; `postgresHoldStore` restates it in `ORDER BY` because ordering
has to happen in the statement for an index to serve it, and its `WHERE` is the
row-value comparison `(held_at, proposal_id) > (…, …)` — the same predicate said
in SQL. The contract suite holds the two to the same answer. This is why
`forTree` gained the tiebreak as well: two listings in one store sorting ties
differently is a bug waiting for the first duplicate instant.

**`HOLD_STORE_DDL` grows a second index**, on `(held_at, proposal_id)`. Without
it the read is a sort over every hold in the deployment, which is the cost this
record exists to remove. It is `CREATE INDEX IF NOT EXISTS` like everything
beside it, so an existing deployment gains it the next time the schema is pushed.

**Rows, not a count.** The queue wants what is waiting, and a count is derivable
from a page in a way a page is not derivable from a count.

## Consequences

- The portal's front door becomes one query. The rail badge it deferred is now
  affordable, and complete rather than bounded by how many trees fit on a page.
- **`HoldStore` is a five-method interface, and this is a breaking change to
  it.** Both implementations in the repository are updated; a host that wrote its
  own no longer compiles until it adds the method. This is the cost, it is
  deliberate, and pre-production alpha is when it is cheapest.
- The page is smaller than a tree listing's — 25 by default, 100 at most —
  because a held proposal is the heaviest row this store keeps: a whole delta,
  the intent that asked for it, and the judgment that held it. A reviewer reads
  them one at a time.
- An unreadable cursor starts at the beginning, which is what `cursorPosition`
  already promised for every other listing in Loom. A cursor is a value that has
  been through a URL, so this is the case that arrives rather than a hypothetical.
- **Lexicographic order over `heldAt` is exact only at a fixed precision.**
  `z.string().datetime()` accepts both `…:00Z` and `…:00.000Z`, and the second
  sorts before the first for the same instant. Paging stays correct regardless —
  both implementations compare the same strings the same way, so nothing repeats
  or is skipped — but "oldest first" can be off by a hair between two writers that
  format differently. Pre-existing in `forTree`; written down here rather than
  fixed, because narrowing what the schema accepts would refuse holds already
  stored.

## Alternatives considered

- **Leave it, and let the surface page trees and ask each one.** What the portal
  does today, and what it filed. It is slow in proportion to how well the product
  does, and it cannot be complete — the failure mode being a confident wrong
  sentence rather than an error is what makes it worth a framework change.
- **A count, `waiting(): Promise<number>`.** Cheaper, and enough for the rail
  badge alone. Rejected because the queue screen wants the rows, so a count would
  have been a second read alongside the first rather than instead of it.
- **A cursor of the instant alone.** The obvious reading of "ordered by `heldAt`",
  and wrong for the reason above: ties are the common case here, not the edge.
- **Ordering by `proposalId` alone**, exactly mirroring `TreeStore.list`. Total
  and stable for free, and no tiebreak to design. Rejected because it puts a
  queue in id order, which is arbitrary to a reviewer, and would have made the
  store's two listings disagree about what a queue is.
- **A `scope` argument, so a caller could ask for one tenant's holds.** Rejected
  on 0020 part 1: it would give the store two scoping models and let listing
  reach further than reading already can.
- **Paging `forTree` as well.** Considered and left alone. The holds against one
  document are bounded by how many changes it can have in flight, and widening a
  read nobody has complained about is the refinement the brief says to be
  reactive about.
