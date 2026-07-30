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
3. **Adaptive Renderer** — edge/RSC resolver, tree → React, per request
4. **Framework SDK** — primitive registration contract, CLI scaffolding ← current
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
├── interpretation/      # The model-backed ChangeInterpreter
│   ├── client.ts        # ModelClient — the whole network boundary
│   ├── draft.ts         # What a model may say: the AST, minus identity
│   ├── schema.ts        # The JSON Schema its reply is constrained to
│   ├── render.ts        # The tree as an outline the model can address
│   ├── prompt.ts        # Prompt assembly and the provenance hash
│   ├── materialize.ts   # Draft → TreeDelta, minting every new id
│   ├── interpreter.ts   # The ChangeInterpreter itself
│   └── anthropic.ts     # Vendor adapter — a separate entry point
├── render/              # The adaptive renderer — a separate entry point
│   ├── primitive.ts     # What a primitive receives; the resolver seam
│   ├── props.ts         # The prop-validation seam
│   ├── editable.ts      # Edit-mode decoration, as attributes
│   ├── diagnostics.ts   # What rendering could not honour
│   ├── render.ts        # The tree, projected into React
│   └── request.ts       # Per-request resolution: load, validate, render
├── catalogue.ts         # What a deployment can build with, as data
└── sdk/                 # The framework SDK — a separate entry point
    ├── definition.ts    # The registration contract: definePrimitive
    ├── registry.ts      # The registry: resolver and validator in one object
    ├── conformance.ts   # Does a primitive spread loom.editable?
    ├── audit.ts         # The conformance check a host runs
    └── catalogue.ts     # The registry, projected for consumers outside it
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

That test reads **`LOOM_ANTHROPIC_API_KEY` first**, falling back to
`ANTHROPIC_API_KEY`. The scheduled agent that develops this repo authenticates
with `ANTHROPIC_API_KEY` itself and strips it from the environment of the
processes it spawns, so a key set under the standard name never reaches Vitest
there. Set `LOOM_ANTHROPIC_API_KEY` in that environment; the standard name works
everywhere else.

## Optional: the React renderer

The renderer is a separate entry point too, and `react` is an optional peer
dependency, so a host that only composes and stores trees never installs it:

```bash
pnpm add react   # optional peer dependency
```

```ts
import { renderRequest, staticPrimitiveResolver } from "@loom/runtime/react"

const rendered = await renderRequest(
  { treeId, editMode: false },
  { source, resolver: staticPrimitiveResolver({ "loom.page": Page, "loom.card": Card }) }
)
```

A primitive receives three props — `loom` (its node id, type, and edit-mode
decoration), `props` (the node's props, unspread), and `children`. Rendering is
pure and total: it has no hooks and no IO, so it runs per request at the edge or
in a Server Component, and anything it could not render comes back in
`diagnostics` rather than as a thrown error.

## Registering primitives

A primitive declares what a tree may set on it. The registry is both the
renderer's resolver and its prop validator, because a component's narrowed prop
type is only sound when the same object vetted the props:

```ts
import { catalogueOf, createPrimitiveRegistry, definePrimitive } from "@loom/runtime/sdk"

const card = definePrimitive({
  type: "loom.card",
  description: "A bounded block of related content",
  props: z.object({ variant: z.enum(["outlined", "filled"]), elevation: z.number().optional() }).strict(),
  component: ({ loom, props, children }) =>
    <article {...loom.editable} data-variant={props.variant}>{children}</article>,
})

const registry = createPrimitiveRegistry([card])   // Result — refuses duplicates and bad identifiers
if (!registry.ok) throw new Error(describeRegistryError(registry.error))

const rendered = await renderRequest(request, {
  source,
  resolver: registry.value,
  validator: registry.value,
})
```

A node whose props fail its primitive's schema is omitted with an `invalid-props`
diagnostic, exactly as an unknown primitive is. Validation is a predicate, never a
codec: a primitive is handed the tree's props unchanged, so the page is a function
of the tree and not of which schema version a deployment happens to run.

`catalogueOf(registry)` projects the registry into plain data. Give it to
`modelInterpreter({ …, catalogue })` and the model is told what it may build
instead of guessing at type names.

`auditRegistry(registry)` probes every primitive for the edit-mode contract and
reports which ones would be invisible to the portal. It is a function a host runs
in a test or a build step — registration itself never calls a primitive.

## Daily reports

Each session's report and its diagram live in [`reports/`](reports/).
