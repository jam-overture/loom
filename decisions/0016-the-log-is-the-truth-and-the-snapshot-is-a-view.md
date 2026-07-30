# 0016. The log is the truth and the snapshot is a materialised view

**Status:** Accepted
**Date:** 2026-07-30
**Section:** §5

## Context

§1 through §4 produced a tree, a delta, a runtime that accepts or refuses a
change, a renderer that projects a tree to markup, and a registry of what may be
built. None of it persists anything. `TreeSource` has existed since §3 as a seam
with no implementation, which means §2 and §3 have only ever been connected
through fixtures — the Portal cannot be built on that.

Two storage shapes were on the table, and the choice is not reversible cheaply
because it decides what a "revision" *is* for every component downstream.

**Delta log only** (pure event sourcing). Store the seed and an append-only list
of deltas. The tree at any revision is the fold of the log up to it. History,
attribution, and reversibility are structural rather than bolted on — which is
close to the whole thesis of the project.

**Snapshot only.** Store the current tree; overwrite it on each change. Cheap
reads, and nothing else.

The interesting question was whether a snapshot adds anything to a log, given
that the log already contains the answer.

## Decision

**Store both. The log is the source of truth; the snapshot is a materialised
view of it. Every append writes both in one step.**

Two reasons, and the second is the one that actually decided it.

**Read cost.** §3 renders per request on an edge runtime. A pure log makes every
render O(history) — a tree edited a thousand times pays a thousand `applyDelta`
calls to answer a page view. That is a real cost but an ordinary one, and
snapshotting is the ordinary fix; on its own it would be a performance note, not
a decision record.

**Immunity to replay drift.** A log is a recipe, not a result. Replaying it
correctly forever requires `applyDelta` to be bit-stable forever, and §1 baked a
convention into every stored delta: `move` is detach-then-insert, so `index`
counts the *post-detach* child list. Every delta ever written is in that dialect.
Change the dialect — a bug fix, a clarification, an optimisation — and the log
silently stops meaning what it meant.

Under pure event sourcing that is undetectable, because the fold *is* the read: a
drifted fold is simply the new truth, and users' pages change shape with no
event, no error, and nothing to diff against. Keeping a snapshot makes replay a
*check* rather than a *dependency*. `auditSnapshot` folds the log from a known
seed and compares; disagreement is a test failure or a job alert instead of a
silent rewrite of history.

Two supporting rules follow from making the log authoritative:

- **The base-revision check runs before the apply.** `applyDelta` would also
  refuse a stale delta, but it would report a tree error. "Someone else wrote
  first" (`revision-conflict`, carrying both revisions) must be distinguishable
  from "this delta is malformed" (`delta-rejected`), because the first is
  retryable by re-interpreting against the new head and the second is not.
- **The audit's seed is a parameter, not something the store keeps.** The honest
  seed is revision 0, and a store that has been compacted may no longer have it.
  A caller who cannot supply one cannot audit — a real limitation, and a better
  one than an audit that starts from the answer it is checking.

## Consequences

- `append` is the only writer, and it must be atomic. In memory that is one
  `Map.set`; in SQL or KV it is a transaction. A log entry without its snapshot
  advance leaves the two disagreeing, which is the exact failure the audit is
  designed to detect and the exact failure a store should never create itself.
- Storage is roughly doubled. Accepted without much thought — a tree is small and
  a delta is smaller.
- The snapshot can be rebuilt from the log, so it is never the thing to back up
  carefully. Losing it costs a replay; losing the log costs the history.
- `treeSourceFromStore` hands the renderer the snapshot as `unknown`, so the
  render path still runs `parseTree`. Passing an already-parsed `LoomTree` would
  satisfy the type and skip the check — and a store is exactly where a tree that
  was valid under an older schema comes back from.
- Compaction is now possible but undesigned: dropping old log entries and
  promoting a later snapshot to the seed trades auditable history for space.
  Nothing needs it yet, and the design does not presume it.
- The audit compares by serialisation (`JSON.stringify`). That is sound because
  the tree is JSON by construction, but it makes key order significant. If any
  future code path builds a tree with keys in a different order, the audit will
  report divergence where there is none — a false alarm rather than a false
  pass, which is the right direction for this to fail in.

## Alternatives considered

**Pure event sourcing, no snapshot.** Rejected for the drift argument above, not
the performance one. The irony is that the purest version of "every change is
inspectable and reversible" is the version that cannot notice when its own
interpretation of those changes has moved.

**Snapshot only, no log.** Rejected outright — it contradicts 0001. A runtime
whose premise is that change is proposed, attributable, and reversible cannot
throw away what was proposed, by whom, and what it replaced.

**Snapshot plus a log kept only for display.** Tempting, and only one line of
reasoning away from what was built: if the log is decorative, nothing checks it,
and an append that fails to write its log entry is a bug nobody finds. Declaring
the log authoritative is what makes the audit meaningful.

**Periodic snapshots every N revisions, replaying the remainder.** The standard
event-sourcing compromise. Rejected as premature: it adds a tuning parameter and
a partial-replay path on the request seam, to save storage that is not scarce.
Worth revisiting if trees turn out to be large or edits very frequent.

**Deriving the audit from inverse deltas** (apply forward, then unapply back to
the seed, and check the seed matches). Rejected because it tests `applyDelta`
against `invertDelta` rather than against the snapshot — it would pass happily
while both drifted together in the same direction.
