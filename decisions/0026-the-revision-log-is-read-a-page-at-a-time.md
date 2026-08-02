# 0026 — The revision log is read a page at a time, from either end

**Status:** Accepted
**Date:** 2026-08-01
**Section:** §5

## Context

`TreeStore.history(treeId)` returned the whole log: every delta ever accepted
into a tree, in one array, with no limit the caller could name and none the store
imposed. That was fine while its only consumer was `auditSnapshot`, which
genuinely needs all of it, and while nothing rendered it.

Building the portal's `/history` view made it the wrong shape for the same reason
0025 found the telemetry journal's paging was the wrong shape one day earlier. A
revision log is append-only, grows once per accepted change, and is never
compacted. The question asked of it is almost always *what changed lately* —
which forward-only, unpaged reading answers only after loading every change ever
accepted. The cost grows with the tree's age and grows fastest exactly when the
log is most worth reading.

It also left one unbounded read in a contract whose every other read is bounded.
0020 clamps a tree listing because "a caller can ask a store for everything it
holds by omitting the limit" is a thing worth preventing; `history` let a caller
do precisely that, for the largest thing the store holds.

The two logs are separate contracts that happen to agree, and there was no reason
for them to disagree on a question neither of them is really about.

## Decision

**The log is read as a page taken from one end, and a page always comes back in
applied order.** `history` is replaced by `revisions`:

```ts
revisions: (
  treeId: TreeId,
  request?: RevisionReadRequest
) => Promise<Result<RevisionPage, StoreError>>

type RevisionReadRequest = {
  cursor?: string
  direction?: "newer" | "older"   // default "newer"
  limit?: number                  // clamped: 100 default, 500 max
}

type RevisionPage = {
  revisions: readonly StoredRevision[]  // always ascending by revision
  older: string | null
  newer: string | null
}
```

This is 0025's shape, deliberately: same direction values, same defaults, same
two-ended cursors, same promise that a page's order never depends on which end it
came from. `direction` defaults to `"newer"`, so the default read is the oldest
page — what a fold wants — and a reader asks for `"older"` explicitly, exactly as
`/activity` does.

The end-naming logic is no longer telemetry's. `pageEnds` and `cursorPosition`
move to `paging.ts` alongside `clampLimit`, and both logs call them. Which ends a
page names is a property of keyset paging, not of what is being paged, and it is
the part most likely to drift between four implementations and least likely to be
noticed when it does.

**`auditSnapshot` walks the log rather than being handed it.** It is the one
caller that legitimately needs every entry, and it now follows `newer` until the
cursor is `null`, folding each page into the tree the previous one produced. A
page boundary is not a semantic boundary — it is where the read stopped.

## Consequences

- The newest page of a tree's log is one seek on the `(tree_id, revision)`
  primary key rather than a scan of the log, and stays that way as the tree ages.
- Every read in `TreeStore` is now bounded. There is no operation a caller can
  invoke that returns an amount of data proportional to how long the deployment
  has been running.
- `TreeReader` is `head | revisions`, so the renderer's tree source and the audit
  still depend on the two reads they use and not on the write half.
- Breaking change to `TreeStore`, which is implemented twice in-repo (memory,
  Postgres) and consumed by `auditSnapshot`, `treeSourceFromStore` and the
  portal. All were updated in the same commit. Nothing outside the repo
  implements it yet, which is why this was worth doing now rather than after
  §4's SDK invites anyone else to.
- An audit of a long log now costs several round trips where it cost one. It is
  a scheduled job, not a request path, and the alternative was every caller
  holding an unbounded read so that one of them could avoid a loop.
- The tree schema and the delta model are untouched. Nothing stored changes
  shape; this is how stored entries are *read*.

## Alternatives considered

**Keep `history` for the audit and add a paged `revisions` beside it.** Two reads
of the same data, one of them unbounded, and every future implementation has to
get both right. The unbounded one would remain callable by anything holding a
store handle, which is the property this decision exists to remove. The audit's
need is real but it is a *fold over the whole log*, and that is expressible as a
loop over pages — a convenience built on the primitive, not a second primitive.

**Page the log by a cursor that names a proposal id rather than a revision.**
Rejected: `revision` is dense, consecutive from 1, unique per tree, and already
the entry's identity. A cursor built on anything else would be a second ordering
to keep consistent with the first.

**Make the default direction `"older"`,** since a viewer is the more common
caller. Rejected because the correctness-critical caller is the fold, and a
default that quietly hands a fold the *newest* page would produce a `revision-gap`
at best and a silently partial audit at worst. The default should be the one that
is safe when someone forgets to think about it.

**Give the two logs different paging vocabularies,** since one is per-tree and
the other spans trees. Rejected: the difference is in what they scope, not in how
they page, and a reader who learns `direction`/`older`/`newer` once should not
have to check which contract they are holding.

**Leave `history` alone and cap the portal's rendering instead.** Rejected as the
kind of fix that makes the view honest and the contract dishonest: the read still
loads everything, and the next consumer pays the cost again without knowing it
signed up for one.
