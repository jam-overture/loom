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

1. **Tree schema** — the AST, the NodeId scheme, `TreeDelta`
2. **Composition Runtime** — `EditIntent → ProposedChange → Gate → Disposition → Apply`
3. **Adaptive Renderer** — edge/RSC resolver, tree → React, per request ← current
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
├── testing/           # Deterministic fixtures and test doubles
├── tree/
│   ├── node.ts          # The discriminated-union AST: element | text | slot
│   ├── tree.ts          # The LoomTree document, revisions, boundary parsing
│   ├── navigation.ts    # Read-only traversal
│   ├── configuration.ts # The settable surface of each node kind
│   ├── mutation.ts      # Immutable structural edits
│   ├── delta.ts         # TreeDelta and its four operations
│   ├── apply.ts         # Pure, atomic delta application
│   ├── inverse.ts       # The delta that undoes a delta
│   └── builders.ts      # Construction helpers for trusted callers
├── runtime/
│   ├── intent.ts        # EditIntent — what someone wants, before interpretation
│   ├── proposal.ts      # ProposedChange + Provenance — what came back, and from where
│   ├── interpreter.ts   # The AI seam; the only non-deterministic step
│   ├── analysis.ts      # Pure facts about what a delta does
│   ├── stakes.ts        # How much damage, as named factors
│   ├── reversibility.ts # Whether it can be taken back, via the inverse
│   ├── policy.ts        # GatePolicy — the knobs, host and structural
│   ├── gate.ts          # The pure decision function
│   ├── events.ts        # RuntimeEvent, EventSink, Clock
│   └── pipeline.ts      # composeChange / confirmChange
└── interpretation/      # The model-backed ChangeInterpreter
    ├── client.ts        # ModelClient — the whole network boundary
    ├── draft.ts         # What a model may say: the AST, minus identity
    ├── schema.ts        # The JSON Schema its reply is constrained to
    ├── render.ts        # The tree as an outline the model can address
    ├── prompt.ts        # Prompt assembly and the provenance hash
    ├── materialize.ts   # Draft → TreeDelta, minting every new id
    ├── interpreter.ts   # The ChangeInterpreter itself
    └── anthropic.ts     # Vendor adapter — a separate entry point
```

## Decisions

`decisions/` holds numbered architectural decision records — what was chosen,
what was rejected, and why. [Start with the index](decisions/README.md).

## Commands

```bash
pnpm verify
```

`pnpm typecheck`, `pnpm test`, `pnpm test:coverage` run the pieces individually.

## Optional: the Anthropic interpreter

The model client is a one-method seam, and the Anthropic adapter is a separate
entry point so that hosts bringing their own model never load it:

```bash
pnpm add @anthropic-ai/sdk   # optional peer dependency
```

```ts
import Anthropic from "@anthropic-ai/sdk"
import { modelInterpreter, randomIdFactory, systemClock } from "@loom/runtime"
import { anthropicModelClient } from "@loom/runtime/anthropic"

const interpreter = modelInterpreter({
  client: anthropicModelClient(new Anthropic().messages),
  idFactory: randomIdFactory,
  clock: systemClock,
})
```

`ANTHROPIC_API_KEY` is read from the environment by the SDK. One live smoke test
exercises the real API and skips when the key is absent, so `pnpm verify` is
green offline.

## Daily reports

Each session's report and its diagram live in [`reports/`](reports/).
