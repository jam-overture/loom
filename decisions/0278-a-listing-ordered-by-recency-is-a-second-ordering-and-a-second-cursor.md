# 0278. A listing ordered by recency is a second ordering, and a second cursor

**Status:** Proposed — ARCHITECTURAL, needs review
**Date:** 2026-10-14
**Section:** §5 (the store), §3 (portal)

> **Nothing in this record is implemented.** It would supersede part 2 of
> [0020](0020-a-store-handle-is-the-scope-and-a-listing-is-a-page.md), which is
> `Accepted`, so it waits for the maintainer rather than shipping. 0020 is left
> as it stands and is **not** marked superseded.

## Context

[0277](0277-a-listing-carries-when-the-page-last-changed-and-the-absence-means-never.md)
put the fact on the listing: every tree now reports `changedAt`, the stamp of
the newest entry in its log. That was the half of 0020's rejected recency
ordering that needed nobody's permission, because 0020's stated reason for the
rejection was that there was nothing to sort on.

**There is now, and the order is still by id.** A caller can sort the page it
holds, which is honest for a deployment whose pages fit in one page and is
useless past that: the hundred most recently changed pages of a thousand are
spread across every page of a listing ordered by id, so no amount of client-side
sorting finds them without reading all thousand.

This record is the second half, and it is the maintainer's rather than mine
because 0020 part 2 is `Accepted` and says this:

> **2. Listing is keyset pagination, ordered by `treeId` ascending** [...]
> Ordering has to be total and stable for a cursor to mean anything, and
> `treeId` is the only key every implementation is guaranteed to have.

0020's own rejected-alternatives section anticipates the supersession —
"recency ordering is available later by adding a stamped field to the store's
entry [...] and would supersede this" — so this is the path that record named
rather than a contradiction of it. It is written as `Proposed` anyway, because
`docs/routines.md` reserves a change to an `Accepted` decision for the
maintainer and the distinction between *the path a record named* and *a reversal
of it* is not mine to make on my own reading.

## The question, in the form it actually arrives

**"Changed recently" is two different features**, and the portal's prototype
does not say which it means. `_lib/page-filter.ts` lists it under `Pages`
alongside *all of them*, *the front door* and *the ones waiting on you* — a
list of filters — while the name reads like a sort.

- **As a sort:** *show me every page, newest first.* A total reordering of the
  listing. Pages through the whole deployment; always returns something.
- **As a filter:** *show me the pages changed in the last N days.* Keeps the id
  ordering and narrows the set. Returns nothing on a quiet deployment, which is
  a true and useful answer.

They want different contracts, and building one does not give you the other.

## Decision (proposed)

**Add the sort, not the filter**, as an explicit second ordering on
`ListRequest`:

```ts
export type ListRequest = {
  readonly cursor?: string
  readonly limit?: number
  /** Default `"tree"`, which is 0020's ordering and the only one before this. */
  readonly order?: "tree" | "recent"
}
```

with `"recent"` meaning **`changedAt` descending, `treeId` ascending as the
tie-break**, and trees that have never changed sorting last in `treeId` order.

Three things this has to get right, and they are the work:

**1. The cursor becomes composite.** A keyset page into `(changedAt, treeId)`
needs both halves, so the cursor stops being a tree id and becomes an opaque
encoding of the pair. 0020 already made the cursor opaque to the caller and
passed back unread, so this costs no contract change — but a cursor minted under
one order and replayed under the other is now a thing a caller can do, and the
store has to refuse it rather than silently resume somewhere arbitrary. The
order belongs *in* the cursor for that reason.

**2. Lexicographic text ordering is not chronological ordering.**
`loom_revisions.applied_at` is `text`, validated on read as
`z.string().datetime()`. That admits both `2026-01-01T00:00:00Z` and
`2026-01-01T00:00:00.000Z` for the same instant, and they sort in the wrong
order as strings — `.` is below `Z`. So the Postgres implementation must order
and compare on `applied_at::timestamptz`, not on the text, and the in-memory one
must compare parsed instants. An expression index on the cast would be wanted
before this is fast; it is not needed for it to be correct.

**3. The never-changed trees need a defined place.** Last, and in id order among
themselves, so the ordering stays total — which is the property 0020 insists on
and the one a composite key over a nullable column most easily loses.

## Consequences

- **The portal's *Changed recently* becomes buildable** at any size, which is the
  finding this came from.
- **Two orderings is two cursor schemes**, and every future listing feature pays
  that cost once. It is the thing 0020 was protecting against, and the honest
  statement is that the protection has a price the product is now paying on the
  other side.
- **A page of a recency listing is not stable under writes** the way an id page
  is: a tree changed while a caller is paging can move from a page they have not
  read to one they have. Keyset pagination makes this a skip rather than a
  duplicate, which is the right failure, but it is a behaviour difference between
  the two orders and belongs on the type.
- Supersedes 0020 part 2 only. Parts 1 (the handle is the scope) and 3 (a
  listing is a summary) stand, and 0277 extends part 3 rather than replacing it.

## Alternatives considered

**The filter instead of the sort — `changedSince?: string`.** Cheaper: it keeps
one ordering and one cursor, and adds a `WHERE` clause. Attractive for exactly
that. Rejected as the primary reading because *recently* then needs a window the
product has to choose and a person has to understand, and the honest answer on a
quiet deployment is an empty screen where the person asked for a list. It is
also strictly weaker: a sort can answer "what changed lately" by reading the
first page, where a filter cannot answer "newest first" at all. Worth adding
later beside the sort; not worth having instead of it.

**Both at once.** Rejected for now as the shape most likely to be wrong in
detail before either has a caller. The sort has a user waiting.

**Materialise a `changed_at` column on `loom_trees` and index it.** The
performant version, and the one a mature store would have. Rejected for now
because it is a write-path change and a backfill — the column would be wrong on
every row written before it existed, and the log is append-only so nobody may
invent the missing values. The join 0277 uses answers correctly today; this is
the optimisation to reach for when a listing is measurably slow, with a
measurement rather than ahead of one.

**Let the surface page the whole deployment and sort.** Rejected: it is 0020's
"fine to an outage as a function of how well the product does", and it puts the
cost on every surface that wants the feature rather than once in the store.
