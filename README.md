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
4. **Framework SDK** — primitive registration contract, CLI scaffolding
5. **Portal** — a thin UI over the persisted tree
6. **Telemetry** — proposal, provenance, disposition, and outcome, captured from day one
7. **Marketplace** — last, and not started

Sections 1–6 are built and run end to end. What is still open in each is tracked
in the latest report in [`reports/`](reports/) rather than here, because a marker
in a README is a thing that goes stale quietly.

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
│   ├── policy-source.ts # Which policy judges a given change
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
├── sdk/                 # The framework SDK — a separate entry point
│   ├── definition.ts    # The registration contract: definePrimitive
│   ├── registry.ts      # The registry: resolver and validator in one object
│   ├── conformance.ts   # Does a primitive spread loom.editable?
│   ├── audit.ts         # The conformance check a host runs
│   └── catalogue.ts     # The registry, projected for consumers outside it
├── cli/                 # Scaffolding — a separate entry point
│   ├── args.ts          # The grammar: two commands, one option
│   ├── templates.ts     # What gets written, as pure functions of a name
│   ├── plan.ts          # What a command would write, decided before writing
│   ├── filesystem.ts    # The one impure seam
│   ├── run.ts           # parse → plan → write
│   ├── main.ts          # The executable entry point
│   └── scaffold-fixture/ # `loom init`'s output, committed so it is typechecked
└── store/               # Persistence — a separate entry point
    ├── store.ts         # TreeStore: the contract, and what it may refuse
    ├── memory.ts        # The reference implementation: log plus snapshot
    ├── replay.ts        # Folding the log, and auditing the snapshot against it
    └── source.ts        # The store as the renderer's TreeSource
```

## The workspace

The repo is a pnpm workspace. `@loom/runtime` is the root package; `apps/portal`
is the §5 Portal, and it depends on the runtime as `workspace:*` so it can only
reach the published entry points — a deep import into `src/` does not resolve.
When the portal needs something the public API does not expose, that is a
framework gap to close in the framework (see
[0018](decisions/0018-the-portal-is-a-consumer-not-an-insider.md)).

```
apps/portal/
├── app/
│   ├── globals.css      # The silver design system, as tokens
│   ├── layout.tsx       # Topbar, rail, and the content column
│   └── _components/
│       └── shell/       # Topbar, sidebar, nav items
└── lib/nav.ts           # Active-section matching, as a pure function
```

`pnpm verify` at the root compiles the runtime, typechecks it, runs its tests,
then runs the portal's typecheck, tests and build. The portal's build is part of
it because prerendering is what proves the shell renders.

**The build comes first, and that order is load-bearing.** `src/cli/scaffold-fixture/`
is checked-in scaffold output, and it imports `@loom/runtime/react` and
`@loom/runtime/sdk` the way a consumer does — through the `exports` map, which
points at `dist/`. Typechecking before the build fails on a clean clone with four
`TS2307`s, so the build has to have run. Keeping it in this order rather than
mapping those specifiers back to `src/` means the typecheck also proves the
`exports` map resolves, which is the thing a consumer actually depends on.

The runtime compiles to `dist/` and every entry point resolves there (0030), so
the portal consumes it as an ordinary Node package rather than as TypeScript
source. `apps/portal` builds the runtime before its own typecheck and build,
because a clean clone has no `dist` and a build order that is not written down is
one that fails somewhere else.

## Deploying

The portal deploys to Vercel from `apps/portal`. Settings, and what a deployment
can and cannot do before a backing store lands, are in
[`docs/deployment.md`](docs/deployment.md).

## Learning Loom

`lessons/` is a course on the ideas rather than the API. Each lesson starts from
a problem, shows why the obvious solution fails, and only then shows what Loom
does instead — with exercises you run. [Start with the syllabus](lessons/README.md).

New to the codebase? Read [lesson 01](lessons/01-why-a-runtime.md) before
anything else; it is the thesis the rest of the system defends.

## Decisions

`decisions/` holds numbered architectural decision records — what was chosen,
what was rejected, and why. [Start with the index](decisions/README.md).

Decision records and lessons answer different questions. A record says *what we
decided and what we rejected*; it is written for someone deciding whether to
change it. A lesson says *why this is the right shape and how to think in it*;
it is written for someone learning. Neither substitutes for the other.

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

## Scaffolding

```
loom init [--dir <directory>]
loom add primitive <type> [--dir <directory>]
```

`init` writes a starter primitive, a generated registry, and a conformance test
that runs `auditRegistry` — so the check exists from the first commit rather than
being something to remember later. `add primitive` declares one more and
regenerates the registry from the directory's contents.

A primitive's module is named after its type verbatim (`commerce.product-card.ts`)
because that is what lets the registry be regenerated exactly; the registry is a
generated file and says so. Both are argued in
[0015](decisions/0015-the-registry-is-generated-and-a-filename-is-a-type.md).

Nothing is written unless the whole command can complete: a clash with an existing
file is reported before the first write, so a refused command leaves the directory
as it was.

```bash
pnpm loom init
pnpm loom add primitive commerce.product-card
```

`bin` points at `src/cli/main.ts`, which runs through `tsx` — this package has no
build step, and Node's own type stripping does not resolve the `.js` import
specifiers the repo uses to their `.ts` sources. That makes `tsx` a dependency of
the executable rather than a convenience. When a build step exists, `bin` should
point at the emitted entry and the shebang should go.

The CLI is usable as library code too: `runCli(argv, nodeFileSystem)` from
`@loom/runtime/cli`, which is what its tests drive.

## Daily reports

Each session's report and its diagram live in [`reports/`](reports/).
