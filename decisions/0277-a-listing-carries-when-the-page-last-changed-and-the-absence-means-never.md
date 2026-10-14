# 0277. A listing carries when the page last changed, and an absent stamp means never

**Status:** Accepted
**Date:** 2026-10-14
**Section:** §5 (the store), §3 (portal)

## Context

`TreeListing` was `{ treeId, revision }` and nothing else.

[0020](0020-a-store-handle-is-the-scope-and-a-listing-is-a-page.md) settled that
shape, and settled the ordering with it: pages come back by `treeId` ascending,
not by recency. It recorded *Order by recency* as a rejected alternative, and
the reason it gave was not that recency is the wrong thing to want — it says
plainly that recency is "what a portal actually wants, and what almost every
listing UI shows". The reason was that **there was nothing to sort on**:

> Rejected because the store has no timestamp to sort on: §1 kept time out of
> the document deliberately (minting one is a side effect, and every function in
> `tree/` is pure), and `create` takes no `createdAt` the way `append` takes an
> `appliedAt`.

And it named its own way out:

> Recency ordering is available later by adding a stamped field to the *store's*
> entry — a store change, not a schema change — and would supersede this.

On 13 October `Loom portal` filed the bill for that deferral. The prototype's
`Pages` submenu offers four entries; **Changed recently** is one, and
`_lib/page-filter.ts` says why it could not be built:

> `changed` cannot be computed. `TreeListing` is `{ treeId, revision }` and
> nothing else; a revision number is a count of what has happened to *one*
> page, so it does not compare across two. Ordering by it would put a page
> edited nine times last March above one edited twice this morning.

That is exactly right, and the screen did the right thing with it: `/portal/pages`
reads `?filter=changed` as no filter at all rather than sorting by a number that
does not mean what the label says.

The fact, meanwhile, exists. `loom_revisions.applied_at` has carried it per
entry since the log was written, and `StoredRevision.appliedAt` publishes it. A
listing simply never looked.

## Decision

**`TreeListing` grows `changedAt?: string` — the `appliedAt` of the newest entry
in that tree's log.** This is the stamped field 0020 named, and it is the half of
that record's rejected alternative that needs nobody's permission: the *fact*,
not the *order*.

```ts
export type TreeListing = {
  readonly treeId: TreeId
  readonly revision: number
  /** The newest log entry's `appliedAt`; absent when `revision` is 0. */
  readonly changedAt?: string
}
```

Four properties, each of which is a thing a store may not do otherwise.

**1. It is the log's stamp, not a clock the store read.** `appliedAt` is when the
runtime applied the delta, which the log already records and a caller reading
`revisions` already sees. Two reads of one fact, and the contract suite asserts
they agree by comparing the listing against what `revisions` hands back rather
than against a literal. `loom_trees` has carried an `updated_at` defaulted to
`now()` since it was created, and **that column is deliberately not used**: it is
the database's clock rather than the runtime's, so a listing built on it would
disagree with the log it claims to summarise.

**2. Absent means never changed, which is exactly `revision === 0`.** A tree is
created without a log entry. A store that filled this with the creation time
would be answering *when did this appear*, which is not the question — and 0020
is explicit that `create` takes no stamp the way `append` takes an `appliedAt`.
A reader may depend on the biconditional: the stamp is present if and only if
the revision is above zero.

**3. The key is absent, not `undefined`.** The same property a patch field's
cleared state was given on an open branch this week, for the same reason: a
`Map` and a `NULL` column reach an absence by different routes, and nothing
downstream should be able to tell which route a row took. Not cross-referenced
by number here, because that record is not on `main` yet and a citation that
does not resolve is the failure this repository already checks for.

**4. This extends 0020 part 3 rather than contradicting it, and 0020 is left as
it stands.** That part reads "a listing is a summary — `treeId` and `revision` —
not a tree", and the summary is now three fields rather than two. It is
nevertheless the move 0020's own alternatives section authorises in terms —
"adding a stamped field to the *store's* entry — a store change, not a schema
change" — so it ships as `Accepted` rather than waiting, and 0020 is **not**
marked superseded. The part of that record that is a decision rather than an
enumeration is part 2, the ordering, and part 2 is untouched. If the maintainer
reads the enumeration as the decision, this is the record to refuse; the change
is one optional field and reversing it costs a line in each store.

**5. The ordering does not change.** Pages still come back by `treeId`
ascending. 0020's ordering decision stands, and whether to add a second one is
[0278](0278-a-listing-ordered-by-recency-is-a-second-ordering-and-a-second-cursor.md),
which is `Proposed` and not implemented.

## Consequences

- **A deployment whose pages fit in one page of listings can draw *Changed
  recently* honestly today**, by sorting the page it holds. `MAX_LISTING_LIMIT`
  is 200, so that covers more real deployments than it sounds like. It is also a
  claim a surface has to make carefully, and the limit is stated on the type:
  sorting a page sorts that page and not the store, so beyond one page the newest
  tree overall may sit on a page the caller never asked for.
- **It does not close the finding it came from.** `/portal/pages` can order what
  it has; it cannot yet ask the store for the most recently changed pages across
  a deployment of any size. That needs 0278.
- **No migration, and no DDL.** The value is derived from a column that already
  exists, by a join on the log's existing primary key — `(application_id,
  tree_id, revision)` — so it is a point lookup per listed tree rather than a
  scan, and a database written before today answers unchanged.
- **One more read on the listing path**, folded into the same query. A
  `leftJoin` rather than an inner one, because a tree at revision 0 has no entry
  and an inner join would drop it from the listing — turning a missing stamp
  into a missing page.
- `appliedAtSchema` is now shared between the revision read and the listing
  read, so a listing cannot publish a string the revision it came from would
  have refused.

## Alternatives considered

**Use `loom_trees.updated_at`, which already exists.** One column, no join, and
it is already indexed by being in the row. Rejected: it is `DEFAULT now()`,
which is the database's clock at the moment the row was written, not the
runtime's at the moment the change was applied. Those differ by the write
latency on a good day and by whatever a retry or a backfill did on a bad one.
The in-memory store has no such column and would have to mint one, which is
`tree/`-adjacent side-effecting time of exactly the kind 0020 refused. A listing
whose stamp disagrees with the log is worse than a listing with no stamp,
because only the first one can be believed and acted on.

**Put the stamp in the tree document.** Rejected as an escalation against 0001
and for 0020's own reason: §1 kept time out of the document, every function in
`tree/` is pure, and minting an instant is a side effect. This is the store's
fact about the tree, not the document's fact about itself — which is why it can
be told honestly here and could not be told there.

**Stamp on `create` as well, so every listing has a `changedAt`.** Tempting
because a field that is always present is easier to consume than one that is
sometimes absent, and a surface would not have to handle the gap. Rejected
because it makes the field mean two different things depending on the row — *when
it changed* for some, *when it appeared* for others — with nothing to tell them
apart. The absence is information: it says this page has never been touched
since it was made, which is a thing a review queue wants to show differently
rather than sort into the middle of a list. `revision === 0` already says it and
the two now agree.

**Report the whole newest entry, not just its stamp.** More useful — a listing
could then show who changed a page and why without a second read. Rejected for
0020's third part: a listing is a summary, and the reason it is a summary is
that an index page must not load per-row payloads. A `Provenance` and a
`TreeDelta` per listed tree is the read the snapshot exists to avoid, one level
up.

**Leave it, and let the portal page through everything and sort client-side.**
Rejected: it is the read 0020 calls "a contract that degrades from 'fine' to 'an
outage' purely as a function of how well the product does", reached by a
different door.
