# Loom

An AI-powered adaptive UI runtime. A UI is a validated tree; AI proposes discrete
changes to that tree; a pure Gate function decides what is allowed; the runtime
applies what survives and renders the result.

Pre-production alpha. Nothing here is stable yet.

## Why a tree and a delta, not generated code

AI that emits UI code cannot be reviewed, gated, or reverted at a useful
granularity. Loom narrows what AI may produce to a `TreeDelta` — an ordered list
of four discrete operations against an existing tree. That makes every proposed
change addressable ("insert a checkout button into the sidebar"), reviewable by a
pure function, attributable in telemetry, and reversible.

## Build order

1. **Tree schema** — the AST, the NodeId scheme, `TreeDelta`. ← current
2. **Composition Runtime** — `EditIntent → ProposedChange → Gate → Disposition → Apply`
3. **Adaptive Renderer** — edge/RSC resolver, tree → React, per request
4. **Framework SDK** — primitive registration contract, CLI scaffolding
5. **Portal** — a thin UI over the persisted tree
6. **Telemetry** — proposal, provenance, disposition, and outcome, captured from day one
7. **Marketplace** — last

## Layout

```
src/
├── ids.ts             # Brand-typed NodeId / TreeId / DeltaId + the IdFactory seam
├── json.ts            # The JSON value space every boundary is restricted to
├── primitive-type.ts  # Primitive type and slot name identifiers
├── result.ts          # Result<T, E> — nothing throws across a seam
├── testing/           # Deterministic fixtures
└── tree/
    ├── node.ts          # The discriminated-union AST: element | text | slot
    ├── tree.ts          # The LoomTree document, revisions, boundary parsing
    ├── navigation.ts    # Read-only traversal
    ├── configuration.ts # The settable surface of each node kind
    ├── mutation.ts      # Immutable structural edits
    ├── delta.ts         # TreeDelta and its four operations
    ├── apply.ts         # Pure, atomic delta application
    └── builders.ts      # Construction helpers for trusted callers
```

## Commands

```bash
pnpm verify
```

`pnpm typecheck`, `pnpm test`, `pnpm test:coverage` run the pieces individually.

## Daily reports

Each session's report and its diagram live in [`reports/`](reports/).
