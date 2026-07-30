# 2026-07-30 (day 9) — §5 opens: persistence, and the loop closes

**Build order section:** §5 — Portal. This is its foundation, not its UI.

**Visual:** [2026-07-30-day-09-tree-store.svg](2026-07-30-day-09-tree-store.svg)

**Branch:** `day-09-tree-store`, off `main` at `cce4eae`

---

## Your question, answered

> "for storage I am leaning towards a delta log, but you tell me if there is
> benefit to a snapshot."

**Yes, and it is not the benefit you'd expect.** Your instinct on the log is
right and it is now the source of truth. The snapshot earns its place for two
reasons, and the interesting one is the second.

**Read cost.** §3 renders per request on an edge runtime. A pure log makes every
render O(history) — a tree edited a thousand times pays a thousand `applyDelta`
calls to answer one page view. Real, but ordinary; on its own that is a
performance note, not a decision.

**Immunity to replay drift.** This is the one. A log is a recipe, not a result.
Replaying it correctly *forever* requires `applyDelta` to be bit-stable forever,
and day 1 baked a convention into every delta we will ever store: `move` is
detach-then-insert, so `index` counts the **post-detach** child list. Every
stored delta is written in that dialect.

Change the dialect — a bug fix, a clarification, an optimisation — and under pure
event sourcing that change is **undetectable**, because the fold *is* the read. A
drifted fold is simply the new truth. Users' pages change shape with no event, no
error, and nothing to diff against.

Keeping a snapshot turns replay from a *dependency* into a *check*. `auditSnapshot`
folds the log from a known seed and compares; disagreement is a test failure or a
job alert instead of a silent rewrite of history. The irony worth noting: the
purest version of "every change is inspectable and reversible" is the version that
cannot notice when its own interpretation of those changes has moved.

So: **log is the truth, snapshot is a materialised view, one write produces both.**
Recorded as 0016.

---

## What was completed

`src/store/`, a new entry point (`@loom/runtime/store`), four modules:

**`store.ts` — the contract.** Four operations, `create` / `head` / `history` /
`append`, all returning `Promise<Result<…, StoreError>>` because a store is the
first genuinely remote seam in the codebase. `StoreError` distinguishes five
conditions, and two of them matter more than the rest:

```
revision-conflict {expected, found}   someone else wrote first  → retryable
delta-rejected    {error: TreeError}  this delta is malformed   → not retryable
```

**`memory.ts` — the reference implementation.** Deliberately not called a test
double: the ordering rules it enforces are the ones any backing store has to
enforce, so writing them once here is what a SQL or KV implementation gets checked
against. A real one differs in exactly one way, and the module says so: `append`
must be a transaction.

**`replay.ts` — the fold, and the audit it exists for.** `replayTree` and
`auditSnapshot`, which reports `agrees` / `diverged` / `unreplayable`. Nothing on
a request path calls it, which is the point.

**`source.ts` — the seam §3 left open.** `TreeSource` has existed since day 5
with no implementation, so §2 and §3 have only ever been connected through
fixtures. Now they aren't.

---

## The strongest thing in this run: the loop actually closes

Everything before today was a component with a fixture on each side. One test now
drives the whole path end to end — an utterance, through the Gate, into the store,
out of the renderer:

```
composeChange(runtime, tree, intent)   → outcome.kind === "applied"
store.append(treeId, {proposalId, delta, provenance, appliedAt})
                                       → revision 1
renderRequest({treeId}, {source: treeSourceFromStore(store), …})
                                       → markup contains "Thanks for visiting"
store.history(treeId)                  → provenance.origin, proposalId preserved
auditSnapshot(store, treeId, seed)     → {outcome: "agrees", revision: 1}
```

That last line is the part I care about. It is not enough that the render is
right; the render came from the snapshot, and the assertion is that the snapshot
is still what the log produces. The same test proves the change rendered *and*
that the history explaining it is intact.

---

## Three ordering decisions that are the whole design

1. **The base-revision check runs before the apply.** `applyDelta` would also
   refuse a stale delta — but it would report a *tree* error, and "someone else
   wrote first" must be distinguishable from "this delta is malformed". The first
   is fixed by re-interpreting against the new head; the second never is.

2. **The log and the snapshot are written in one step** (one `Map.set` here, a
   transaction anywhere real), so they cannot be observed disagreeing. A test
   asserts a refused append leaves *both* untouched.

3. **The audit's seed is a parameter, not something the store keeps.** The honest
   seed is revision 0, and a store that has been compacted may no longer have it.
   A caller who cannot supply one cannot audit — a real limitation, and a better
   one than an audit that starts from the answer it is checking.

---

## A flaw the typechecker caught that the tests could not

The stale-write test read:

```ts
await store.append(tree.treeId, appendOf(removalOf(tree, ids.header), 0))
```

All 21 store tests passed. `tsc` refused it: the `0` had landed in `appendOf`'s
`proposalId` slot, not `removalOf`'s `baseRevision`. The test passed **by
accident** — `removalOf` fell back to its default base revision, which happened to
also be 0, so the conflict fired for the right reason via the wrong route.

Worth recording because of what it says about the guardrails: Vitest cannot see
this, since a misplaced argument still produces a runnable call. The single most
valuable thing in `pnpm verify` today was the typecheck, on a test file.

Fixed by moving the argument. `expected: 0, found: 1` is now asserted from an
explicitly stated base revision.

---

## Decisions I made that weren't specified

1. **`treeSourceFromStore` returns the snapshot as `unknown`**, so the render
   path still runs `parseTree`. Handing the renderer an already-parsed `LoomTree`
   would satisfy the type and skip the check — and a store is exactly where a tree
   that was valid under an older schema comes back from.

2. **`create` refuses a tree that already exists** (`already-exists`) rather than
   overwriting. An overwriting `create` is a silent history deletion.

3. **`history` on a tree that does not exist is `not-found`, not `[]`.** "No tree"
   and "a tree with no changes yet" are different answers and a caller may need to
   tell them apart. A test pins both.

4. **`memoryTreeStore` exposes `size()`** beyond the interface, for tests and the
   dev portal. It is on the concrete type, not on `TreeStore` — no consumer of the
   contract can come to depend on it.

5. **The audit compares by serialisation.** Sound because the tree is JSON by
   construction, but it makes key order significant: a future path that builds a
   tree with keys in another order would report divergence where there is none.
   That is a false alarm rather than a false pass, which is the correct direction
   for this to fail in. Noted in 0016 rather than fixed, because a structural
   comparator is only worth writing once something actually trips it.

6. **No compaction.** The design permits it — promote a later snapshot to the seed
   and drop the entries before it — but it trades auditable history for space that
   is not scarce, and nothing needs it. Recorded as undesigned, not as a TODO.

7. **No model work in this run**, so no model id decision. The interpreter default
   is unchanged.

---

## Decision records

| #    | Title                                                        | Status   |
| ---- | ------------------------------------------------------------ | -------- |
| 0016 | The log is the truth and the snapshot is a materialised view   | Accepted |

Nothing superseded, no `Accepted` record contradicted. **No ARCHITECTURAL
escalation** — the store consumes the tree schema and the delta model without
touching either. Changes to existing files are limited to `package.json` (a
`./store` entry point), the README's structure listing, and the decisions index.

---

## Test coverage / status

```
Test files  51 passed
Tests       451 passed | 0 skipped
```

`pnpm verify` green. **25 new tests** across four files.

What they pin down:

- a created tree reads back at revision 0 with an empty log; creating it twice is
  refused
- an append advances the snapshot and appends to the log **in the same step**, and
  the log keeps `provenance`, `proposalId` and `appliedAt`
- a second writer at the same base revision is refused with both revisions named
- a delta that cannot apply reports `delta-rejected`, not a conflict
- **a refused append leaves the snapshot and the log exactly as they were**
- trees are kept separate; a tree the store does not have is `not-found` on every
  operation, including `append`
- replaying a log reproduces the head the store arrived at independently
- an empty log replays to the seed; a log with a gap or a repeat is refused with
  the expected and found revisions
- a delta that stops applying reports **which revision** it stopped at
- the audit `agrees` on a changed tree and on an untouched one, reports `diverged`
  against a store deliberately built to hold a stale snapshot with an advanced log,
  reports `unreplayable` on a gapped log, and **passes a store failure through
  rather than reporting agreement**
- a missing tree surfaces through the render path as `source-failed` /
  `not-found`, not as a crash
- every `StoreError` code describes to a non-empty message, a conflict names
  **both** revisions, and a rejected delta carries the underlying tree error
  through — `describeStoreError` reaches a portal and telemetry, so a branch that
  swallowed its detail would be invisible until someone needed it
- the end-to-end loop above

The divergence test is the one that justifies the module: it forces the exact
condition — snapshot and log disagreeing — that a pure event-sourced design could
not represent, let alone detect.

---

## Open questions for the next session

1. **The Portal UI itself is the next unit**, and this run deliberately stopped
   short of it. It inherits three things already recorded: nearest-decorated-
   ancestor addressing (0010), undecorated primitives as a condition to degrade
   over rather than reject (0012), and `PrimitiveCatalogue` as its insert menu
   (0013). What it still needs decided is whether an edit goes through
   `composeChange` on the server or is composed client-side and posted — I have a
   view, and it is a decision record, so I will write it as `Proposed` rather than
   assume it.

2. **A real store implementation is not written.** `memoryTreeStore` is the
   reference, and the contract exists precisely so a SQL or KV one is a swap. That
   is a deployment question (§7-adjacent) and it needs to know where Loom runs
   before it is worth answering.

3. **The schema is at 3381 of a 3500 guard.** Untouched by this run and still the
   nearest cliff.

4. **One live call is still thin evidence** for how often a real model emits an
   unparseable prop bag. A §6 telemetry question.

5. **Node-level provenance.** (Carried from day 1.) The log now records provenance
   per *revision*, which is a partial answer: you can find which change introduced
   a node, but only by folding. Still unforced.
