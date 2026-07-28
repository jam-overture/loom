# 0003 — AI drafts a change; the runtime names what it creates

**Status:** Accepted
**Date:** 2026-07-28
**Section:** §2 — Composition Runtime

## Context

Record 0001 makes `NodeId` the address every downstream system uses, and makes id
stability the property that lets an edit to a live tree mean something over time.
Building the model-backed interpreter forces the question that leaves open: when
a model proposes inserting a node, who decides that node's id?

The path of least resistance is to have the model emit a complete `LoomNode`,
id included, and validate it. It is one schema instead of two, and the reply is
already a `TreeDelta`. It also hands identity to the least accountable component
in the system.

## Decision

A model does not produce a `TreeDelta`. It produces a **draft**: the same four
operations, but inserted nodes carry no `id`. `materializeDelta` turns a
validated draft into a real delta, minting every new id through the existing
`IdFactory` seam.

Consequences of that split, all deliberate:

- Existing nodes are addressed only by ids copied from the rendered tree. An id
  that does not match the id scheme is a malformed proposal, not a new node.
- Delta identity (`deltaId`), tree identity (`treeId`), and the base revision
  are supplied by the runtime, never by the model.
- The delta is authored against the revision the **intent** named, not the tree
  as it stands when the model is called. A stale intent therefore produces a
  proposal that fails to apply — reported as `not-applicable` — rather than
  being silently re-targeted at a tree the asker never saw.

The interpreter also distinguishes three answers from a model — a change, "the
tree already satisfies this", and "I did not understand" — and maps the latter
two onto `InterpretationError` codes. Neither is a proposal, so neither reaches
the Gate. A malformed or unparseable reply is a fourth case, also an
`InterpretationError`; it is never a rejected proposal and never an exception.

## Consequences

- Id collisions from a model are impossible by construction, not by validation.
  `applyDelta`'s collision check remains, but it now guards against runtime bugs
  rather than against the proposer.
- Provenance can say truthfully that the runtime named every node in the tree.
  Node-level provenance (which delta last touched a node) stays answerable
  because ids are ours to hand out.
- There are two schemas to keep in step — the draft and the AST — and a
  projection function between them. That cost is accepted; see 0004 for why the
  projection has to exist anyway.
- "I did not understand" and "you may not do that" stay separable in telemetry,
  which is what makes it possible to judge an interpreter and a policy
  independently.

## Alternatives considered

**The model emits complete `LoomNode`s with ids.** Rejected. It gives the
non-deterministic component authority over the system's addressing scheme, and
it makes id uniqueness a validation problem on every proposal. A model that
reuses an id it saw in the tree would express "insert" and "collide" with the
same bytes.

**The model emits placeholder handles (`$0`, `$1`) that the runtime resolves.**
Rejected. It is the flat-IR shape record 0001 turned down, arriving through a
side door: correlating handles across operations reintroduces a parallel
addressing scheme that only the interpreter understands.

**Accept model-supplied ids but rewrite them before applying.** Rejected as the
worst of both: the wire format implies the model chose identity while the
runtime silently overrules it, so a reader of a recorded proposal cannot tell
which ids were real.

**Author the delta against the tree's current revision rather than the intent's.**
Rejected. It would make every proposal apply cleanly, including proposals
answering a question about a tree that no longer exists. Losing the
revision-mismatch signal would trade a loud failure for a quiet wrong answer.
