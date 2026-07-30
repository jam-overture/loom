# 0020. A store handle is the scope, and a listing is a keyset page

**Status:** Accepted
**Date:** 2026-07-30
**Section:** §5

## Context

`TreeStore` had `create`, `head`, `history` and `append`, and no way to ask what
it holds. The portal could therefore only show a tree whose id it already knew,
which for one process meant the tree it had seeded itself. Day 11 named this a
framework gap to be closed in the framework (0018) rather than worked around in
the portal, and deferred it on the grounds that the obvious signature —
`list(): Promise<readonly TreeId[]>` — is a contract only the in-memory reference
implementation could honour.

Three questions were open, and they are not independent.

**Scope.** A real deployment does not want every caller to enumerate every tree.
But a `LoomTree` carries no owner: §1 made the document a root and a revision, and
adding a tenant field to it would be a schema change and an escalation against
0001. So whatever scoping means, it cannot live in the tree.

**Ordering and size.** A listing that returns everything is a contract that
degrades from "fine" to "an outage" purely as a function of how well the product
does. Any bounded listing needs an order, and the order has to be total and stable
or a cursor into it means nothing.

**Shape.** A listing of `LoomTree` values would make an index page load every
document it lists in full, which is the read the snapshot was introduced to avoid.

## Decision

**Three parts, one record, because answering any of them separately would have
produced an interface the other two had to fight.**

**1. The store handle is the scope. `list` takes no scope argument.**

`head` and `history` take no scope argument either — a handle can already read
anything it can name. Adding a scope parameter to `list` alone would give the
store two different scoping models and let listing reach further, or less far,
than reading. A tenant gets a handle narrowed to its own trees, which is a
decision a host makes once when it builds the store rather than one every caller
has to remember to pass.

**2. Listing is keyset pagination, ordered by `treeId` ascending, with the limit
clamped by the implementation.**

```ts
list(request?: { cursor?: string; limit?: number })
  : Promise<Result<{ trees: readonly TreeListing[]; cursor: string | null }, StoreError>>
```

The cursor is opaque to the caller and is passed back unread; `null` means there
is no next page. `clampListingLimit` lives in the contract module rather than in
each implementation, so a caller cannot get an unbounded read by omitting a limit
or naming a large one. A cursor naming a tree that no longer exists resumes from
the next key rather than erroring — keyset pagination resumes from a *key*, not
from a position, so there is nothing to be confused about.

**3. A listing is a summary — `treeId` and `revision` — not a tree.**

`revision` is enough on its own: it starts at 0 and increments once per accepted
delta, so it is also the number of entries in the log.

## Consequences

- The portal's `/trees` becomes a real listing with real pagination, and stops
  exporting the id of the tree it seeded. The last piece of "the portal knows
  something because it put it there" is gone.
- Multi-tenancy becomes a store-construction concern. A SQL implementation
  narrows by a column in the handle it hands out; the reference implementation
  has one process and one tenant, and says so.
- **Ordering is by id, so the portal cannot show most-recently-changed first.**
  That is a real cost, taken deliberately — see below.
- Adding `list` widened `TreeStore` for every implementer, including test
  doubles that never call it. That pressure is what produced `TreeReader`
  (`head` + `history`), which is what `auditSnapshot` and `treeSourceFromStore`
  now take. Read-only consumers no longer depend on the ability to write.

## Alternatives considered

**A scope parameter — `list(scope: JsonObject)`.** Tempting because
`RenderRequest.context` already establishes opaque host context as a seam. Rejected
because scoping a read differently from every other read is how a store grows two
security models, and the weaker one is the one that eventually gets used. A scope
that is a parameter is a scope a caller can get wrong; a scope that is the handle
is one they never hold in the first place.

**Order by recency.** What a portal actually wants, and what almost every listing
UI shows. Rejected because the store has no timestamp to sort on: §1 kept time out
of the document deliberately (minting one is a side effect, and every function in
`tree/` is pure), and `create` takes no `createdAt` the way `append` takes an
`appliedAt`. Sorting by a field only some implementations could fill would make
the order depend on the backing store, which is precisely what a cursor cannot
survive. Recency ordering is available later by adding a stamped field to the
*store's* entry — a store change, not a schema change — and would supersede this.

**Offset pagination — `list({ offset, limit })`.** Simpler to implement and
simpler to explain. Rejected because an offset into a set that is being written to
skips and repeats rows, and the portal is a review queue over a set that is
explicitly being written to.

**Return full `LoomTree` values.** Rejected: an index page would load every
document it lists, which is the read the snapshot exists to avoid, and it would
make the cost of listing a function of how large the trees are rather than how
many there are.

**Put an owner on the tree and scope by it.** The version most people would reach
for. Rejected as an escalation: it changes the §1 schema, it makes every stored
tree carry a field the renderer has no use for, and it hard-codes one
multi-tenancy model into the document format. Scope belongs to the deployment,
not to the document.

**Leave `list` off and let the portal remember what it seeded.** What day 11 did,
honestly labelled. Rejected now for the reason 0018 gives: the first host's job is
to find the framework's missing pieces, and a host that routes around one has
found nothing.
