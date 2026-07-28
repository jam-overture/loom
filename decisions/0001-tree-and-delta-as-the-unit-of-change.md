# 0001 — The tree and the delta are the unit of AI-authored change

**Status:** Accepted
**Date:** 2026-07-27
**Section:** §1 — Tree schema

> Recorded retroactively on 2026-07-28, from the day-01 report and PR #1. The
> decision itself was made and shipped on 2026-07-27; this record exists because
> the reasoning is load-bearing for everything after it and was previously only
> captured in prose.

## Context

Loom exists to make AI-authored user interfaces reviewable. The obvious approach
— have a model emit component code — was the starting point to argue against,
because it decides the whole shape of the system. Generated code cannot be
gated, attributed, or reverted at a useful granularity: a diff is not a
proposal, a linter is not a policy, and "revert the commit" is not the same as
"undo the change the user asked for".

## Decision

The UI is data: a validated discriminated-union AST of three node kinds
(`element`, `text`, `slot`) with a root that is always an element. The **only**
way that tree changes is a `TreeDelta` — an ordered list of four discrete
operations (`insert`, `move`, `remove`, `configure`) against a named base
revision, applied atomically.

Two consequences are deliberate rather than incidental:

- **Whole-tree replacement is not an operation.** The Gate has to reason about
  changes one at a time, and a replacement collapses that reasoning into a
  single opaque diff.
- **Node identity is stable and positional paths are derived.** A `NodeId` is
  minted once, at insert, and never changes on move or configure, because every
  downstream system — deltas, provenance, telemetry, the editable decorator —
  addresses nodes by id.

Zod is the source of truth at every boundary; TypeScript types are inferred from
it. Nothing throws across a module seam; fallible operations return `Result`.

## Consequences

- Every proposed change is addressable in words ("insert a checkout button into
  the sidebar"), reviewable by a pure function, attributable, and reversible.
- The operation count is held at four because `configure` covers all three node
  kinds through one uniform settable surface. A fifth operation is a schema
  change and needs a record.
- Anything AI produces has to be expressible as these four operations. That is a
  real capability limit, accepted on purpose: it is what makes the output
  gateable.
- No timestamps in the core tree — `revision` is the ordering primitive, and
  storage and telemetry stamp their own times.

## Alternatives considered

**Generated component code.** Rejected: unreviewable and unrevertable at the
granularity a Gate needs. This is the decision the whole project turns on.

**The Hermes beta's flat `warp.blocks` IR.** Read as prior art, not imported. A
flat block list cannot express nesting, so a card inside a section inside a page
has no representation; every layout question becomes a convention. The two are
not migration-compatible, which is expected at this stage.

**A `fragment` node kind, and conditional/looping nodes.** Rejected: a fragment
is expressible as a registered primitive, and a second way to say the same thing
complicates every traversal. Control-flow nodes would embed logic the Gate
cannot reason about — adaptation happens by proposing a delta, not by baking
branches into the tree.

**Positional paths as the addressing scheme.** Rejected: a path changes when a
sibling is inserted, so every stored reference — telemetry, provenance, an open
editor — silently rots.
