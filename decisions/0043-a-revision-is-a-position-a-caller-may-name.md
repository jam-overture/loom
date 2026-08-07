# 0043 — A revision is a position a caller may name

**Status:** Accepted
**Date:** 2026-08-07
**Section:** §5 → §1

## Context

0041 made attribution real: a reviewer pointing at a node is told which revision
placed it, who asked, who wrote it and who allowed it. It stops one step short of
the question that always comes next — *what did that revision actually do* —
which `/history` already answers in full, with the delta, the confidence and an
undo button.

Nothing joined the two. A credit said "added at revision 4" and a reviewer who
wanted revision 4 had to open `/history`, land on the newest page, and click
"← earlier" until it appeared. On a tree with three hundred accepted changes that
is three clicks and a lot of reading; on any tree it is a number the page already
knows being retyped by hand.

The obvious fix — link the number — is not available, because `revisions` could
not be asked for a page holding a particular entry. 0026 gave the log two
positions to read from, both of them ends, and one way to resume: an **opaque
cursor**, which is only meaningful because a page handed it back. A caller with a
revision number and no cursor has nowhere to start.

Both in-repo implementations happen to encode a cursor as the revision it names,
so the portal could have written `cursor: String(4)` and it would have worked
today. That is precisely the shape to refuse. A cursor is opaque by contract; a
consumer that reads one is a consumer that breaks the first time an
implementation encodes a compound key, a timestamp, or a page token — silently,
and only in production, because the in-repo suites would still pass.

The alternative available without any contract change is walking: read the newest
page, and keep following `older` until the revision appears. That is an unbounded
read expressed as a loop, on a request path, to answer a question about one
entry — the exact cost profile 0026 exists to remove.

## Decision

**`revisions` accepts a revision the caller names as the position to open at,
alongside — and never together with — a cursor it was handed.**

```ts
type RevisionStart =
  | { cursor?: string; at?: never }
  | { at?: number; cursor?: never }

type RevisionReadRequest = RevisionStart & {
  direction?: PageDirection
  limit?: number
}
```

Nothing else about the read changes: the same clamped limit, the same two-ended
page, the same promise that entries arrive in applied order whichever end they
came from.

### A revision is legitimately a position, and a cursor is not the same thing

`revision` is dense, consecutive from 1, unique per tree, and already the entry's
identity — 0026 said as much when it rejected paging by proposal id. It is the
key every implementation orders by, because the contract requires a page to be
ascending in it. A caller naming one is naming something public and stable, not
guessing at a private encoding.

The two starts are kept apart rather than merged for the same reason. A cursor is
**exclusive** — resume beside where you were. An anchor is **inclusive** — a
reader sent to revision 4 is there to read revision 4. Collapsing them would make
the caller's meaning depend on where the value came from, which is the kind of
thing that is right in review and wrong six months later.

### Mutually exclusive in the type, not by a precedence rule

A request carrying both positions does not typecheck. The alternative is a
documented rule about which one wins, and a rule like that is a read quietly
ignoring half of what it was asked — the failure this contract avoids everywhere
else. Where a caller genuinely holds both (the portal does: a link brought the
reader to a revision, then they paged away from it), resolving that is the
caller's job, in one tested function, rather than the store's.

### An anchored page has to establish its far end rather than assume it

A cursor's page names both ends for free: a cursor came from a page, so entries
exist at the position it names and the far side is bounded by definition. An
anchor sits **inside** the page it produces, so the same reasoning would claim a
newer page exists whenever anyone opened at the newest revision — offering a
reader the page after the last one.

Both answers come from what the store already knows. Paging older, the far side
holds entries only if the head revision has gone past the anchor, which is the
row the store read to distinguish "no tree" from "a tree with no changes". Paging
newer, the far side holds entries only if the anchor is past the first, which
density settles without a read. Neither costs a query.

### A revision the log does not hold is a stale link, not an error

The page is whatever falls on the named side — the newest page for an anchor
beyond the head, an empty one for an anchor before the start. A store that
refused would make every consumer handle a fourth error case for a link that has
simply aged, and `/history` says plainly that the revision is not on the page
rather than quietly showing a different one.

## Consequences

- Every revision a node's credit names is a link, and the page it opens marks the
  row it was asked for. Attribution now reaches the change it attributes.
- `TreeStore` grows a capability rather than changing one. Existing callers —
  `replayTree`, `planRevert`, `attributeTree`, the portal's paging — are
  untouched, and every read is still bounded and still clamped.
- Anything else holding a revision number can now open at it without holding a
  cursor. `/audit` names revisions in its findings and `/activity` names them on
  episodes; both become linkable without further contract work.
- Two more helpers implementations must call in agreement — `anchorBound` and
  `anchorResumes` — written once, tested directly, and applied by both backends,
  the same treatment `pageEnds` gets and for the same reason.
- The contract suite grew a block both implementations run, including the case
  that distinguishes an anchor from a cursor: opening at the newest entry names
  no newer end.
- A fractional or out-of-range anchor is rounded or answered rather than refused,
  so a caller cannot learn about a bad revision from the store. The portal
  refuses those at the URL instead, where the mistake is.
- The tree schema and the delta model are untouched. Nothing stored changes
  shape; this is how stored entries are *found*.

## Alternatives considered

**Let the portal build a cursor from a revision.** It works today in both
implementations, costs nothing, and is a landmine. A cursor is opaque by
contract, so this is a consumer depending on an encoding it was explicitly not
promised — and the day an implementation pages by `(applied_at, revision)` or by
a provider's page token, the portal breaks in production while every in-repo
suite stays green. Refused as the kind of convenience that makes a contract
decorative.

**Have the portal page backwards until the revision appears.** No contract change
and no new concepts, which is its only appeal. It is an unbounded read written as
a loop, on a request path, and its cost grows with the age of the log — the exact
property 0026 removed from this contract. A reviewer looking at an old node would
pay for every change made since.

**Make cursors non-opaque and document them as revision numbers.** Superficially
simpler: one position instead of two. It gives up the freedom to encode anything
else in a cursor forever, in a contract §4's SDK is about to invite others to
implement, and it still would not distinguish inclusive from exclusive — a
reviewer sent to revision 4 would land beside it rather than on it.

**A separate read — `revisionAt(treeId, revision)` — returning one entry.**
Cleanly typed, no union, no anchor arithmetic. Rejected because the caller does
not want one entry: `/history` is a page with the neighbours around it, so this
would be a second read whose only use is to be followed by the first. 0026's own
reasoning applies — a convenience built on the primitive, not a second primitive.

**Make the anchor exclusive, matching a cursor.** Would remove `anchorBound`
entirely, and the caller could ask for `at: revision + 1`. Rejected: it puts
off-by-one arithmetic into every consumer that holds a revision, and the one
thing a caller naming a revision certainly wants is to see it.

**Centre the anchored revision in its page.** A page holding as many entries
after the named one as before reads well for a reviewer. Rejected because it is
two reads in one, and it breaks the promise that `direction` describes which
entries a page contains — a centred page is taken from neither end and can
resume in neither direction without a rule this contract does not have.
