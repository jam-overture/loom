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

### Reader signals

The part of adaptation that happens on a live page. A render with
`addressed: true` puts node ids on published markup, and
`@loom/runtime/signals/broadcast` reports four closed kinds of signal from it —
`viewed`, `dwelled`, `activated`, `disclosed` — naming nodes and never content,
filed under the tree and revision the page was rendered from
([0136](decisions/0136-a-published-page-broadcasts-reader-signals-when-its-host-asks.md)).
Off unless a host starts it, and configured by the host rather than the tree.

Broadcasting is built. **Capturing, storing and showing signals are approved as
of 13 September** and planned in [`docs/signals.md`](docs/signals.md), which
supersedes the deferral in `reports/2026-09-12-reader-signals.md`: five steps in
order, each with the lane that owns it, and the rules the seam keeps — a signal
stays anonymous and node-shaped, and a funnel is correlated inside one page view
([0146](decisions/0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md)).
Read it before starting anything that consumes signals.

### 4b — The primitive library

§4 built the contract a primitive registers under. It never built anything to
register, and an empty registry is the reason nothing downstream can be shown:
the portal has no interesting tree to review, a marketplace would have nothing
to list, and no demo exists. The vocabulary is the gap between an architecture
and a product.

The source is the Hermes predecessor — 70 block definitions with 72 React
renderers, 54 shapes, 18 layouts, and a theme system of 29 palettes, 22 font
packs and 10 style presets. It is a **port, not a copy**; four things differ:

| | Hermes | Loom |
| --- | --- | --- |
| Prop model | `FieldDef[]` over a custom union | Zod schema per primitive |
| Composition | leaves in a flat `warp.blocks` list | nesting, via slots and children |
| Data | `binding` fields resolved from profile + integrations | plain JSON props, no resolution layer |
| Renderer contract | `{instance, resolvedFields, isOwner, onEdit}` | `{loom, props, children}`, spreading `loom.editable` |

Order, and the reason for it:

1. **Theme** — done ([0049](decisions/0049-a-theme-is-three-ids-in-the-tree.md),
   [0050](decisions/0050-the-runtimes-props-are-namespaced-and-the-root-mounts-the-theme.md)).
   Three registered ids on the root node, resolved per render and mounted by the
   root primitive as CSS custom properties, so a ported renderer reading
   `var(--loom-accent)` is styled and a re-theme is an ordinary `configure`.
2. **Ten primitives, not seventy** — done
   ([0051](decisions/0051-a-slot-is-a-region-the-primitive-places.md),
   [0052](decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md),
   [0053](decisions/0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md)).
   Chosen to cover the *contract* rather than the catalogue: four that compose,
   two of them through named slots; five leaves; one with a rich prop schema and
   a cross-field rule; one driven by an enum that changes what is rendered; and
   one container/child pair that shows how every remaining Hermes list block
   decomposes. See [the starter library](#the-starter-primitives).
3. **The demo vocabulary, and then the demo** — done. The vocabulary came first
   (eight composed primitives, taking the library to eighteen) because a page
   built from `section` + `prose` + `stat-grid` is a layout demo, and what this
   step has to produce is something that looks like a product. The demo list and
   the marketing list are one list, so §4d builds the real site from these rather
   than beside them.

   The demo itself is `/demo`, public, in the portal deployment
   ([0056](decisions/0056-the-demo-is-public-and-shares-nothing-but-the-deployment.md)):
   a real page on the left, and on the right the record of every change to it —
   the proposal with its rationale and provenance, the stakes factors and the
   reversibility verdict, which rule fired under which policy, the revision it
   produced and what it replaced, and an undo that is a proposal like any other.
   Five scripted changes cover all four delta operations and need no key
   ([0057](decisions/0057-a-preset-is-a-deterministic-interpreter.md)); free text
   goes to the model when one is configured. It is the first end-to-end run of
   §1–§6 against something not written to pass its own tests.

   Three things approved on #68 rode along with the vocabulary and are done:
   `auditRegistry` probes for slot placement and reports which primitives are
   leaves; the theme registry joins the catalogue the model is shown; and
   decomposed pairs have a naming rule
   ([0054](decisions/0054-a-container-is-its-childs-name-plus-the-arrangement.md)).
4. **Data** — the seam the port hits at the first primitive that needs any
   ([§4e](#4e--data-what-a-primitive-cannot-be-told-in-props), done), **text** —
   the strings a primitive owns rather than reads from the tree
   ([§4f](#4f--text-the-strings-a-primitive-owns), done), and **submissions** —
   where a form's contents go
   ([§4g](#4g--submissions-where-a-forms-contents-go), done). All three are the
   same shape of gap: something a page needs that props cannot carry.
5. **The remaining primitives**, which by then are mechanical — and they come
   after §4c and §4d, because a site that shows the runtime is worth more than
   the fifty-second block. Only then §7, since a marketplace of primitives needs
   primitives.

Refinement inside §1–§6 is **reactive from here**: driven by what the port
breaks, not run as its own stream.

### 4e — Data: what a primitive cannot be told in props

Five of the seventy Hermes blocks resolve a `binding` rather than reading a
prop: `about` binds three fields to one profile, and `services`, `products`,
`feed` and `marquee` bind a list to a connected integration. Ported without an
answer they become an author typing their own services in by hand, which is not
the block anyone used.

**A binding is a question the tree asks, and never an answer**
([0058](decisions/0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md)).
`loom:data` is the second key in the reserved namespace 0050 opened, and it
names a registered source and the params to ask it with:

```json
"loom:data": { "services": { "source": "catalogue.services", "params": { "limit": 6 } } }
```

Resolution happens in three steps, and the middle one is the only IO in serving
a page: `planTreeData` reads every binding out of the tree as a pure pass and
deduplicates it, `resolveDataPlan` asks every question at once, and
`renderLoomTree` takes the finished answers and stays as synchronous as it was.
`renderRequest` is where the three meet.

A source is registered like a primitive is. `defineSource` declares what it
accepts and what it answers, both as Zod; the registry is the allowlist a
binding can reach, params are checked before the adapter is called and the
answer after. A primitive reads `loom.data`, beside `props` rather than merged
into it, and every answer is either `ready` or `unavailable` **with a reason** —
"you have no services yet" and "we could not reach your services" are different
sentences and a shape that cannot tell them apart eventually shows the wrong one.

What is not built yet is the authoring half: a primitive declaring which binding
names it reads, so the catalogue can tell a model that `loom.services` wants a
`services` binding. Until then a bound tree is hand-authored, and no starter
primitive binds anything.

### 4f — Text: the strings a primitive owns

Almost every user-facing string on a page comes from the tree. A few cannot: a
marker glyph carries an accessible name the visible label does not say, and
making that a prop would put an accessible name in the space a model writes.
Left inline in the component it is untranslatable, and a German deployment
renders an English "Not included" in the middle of a German pricing table — the
gap the primitives routine hit at `loom.perk` and filed.

**A primitive declares the strings it owns; a deployment may replace them**
([0060](decisions/0060-a-primitive-owns-a-string-and-a-deployment-may-replace-it.md)).
`definePrimitive` takes a `text` map in the author's own language, the keys are
typed so a component can only read what it declared, and what reaches
`loom.text` is the translation where there is one and the declared string where
there is not — never a missing key.

```ts
text: { excluded: "Not included", coming: "Coming soon" }
```

A registry is a `TextResolver` over its own declarations, so an untranslated
deployment is the base case rather than a fallback path. `textResolverFor` lays a
dictionary over it, merging once per dictionary rather than once per node;
`textCatalogue` is the extraction a translation file is written from, and
`textCoverage` says what a dictionary answers, what it does not, and which of its
keys name nothing. Which language a visitor gets stays the host's decision — the
framework never reads a request header.

### 4g — Submissions: where a form's contents go

Three of the seventy Hermes blocks are blocked on a seam rather than on a
primitive, and two of them are the same one: `contactform` and `newsletter` are a
field list and a submit. The field list is an ordinary
[0052](decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)
decomposition. The submit is a decision about where a deployment's data goes,
and a URL in a prop is AI-authored by definition — a scheme allowlist does not
help, because `https://collect.example.com/harvest` passes it.

**A submission names a destination, and never carries one**
([0065](decisions/0065-a-submission-names-a-destination-and-never-carries-one.md)).
A node names a registered endpoint and nothing else:

```json
"loom:submit": { "to": "contact.enquiry" }
```

`defineEndpoint` is the host's half — it answers with an `action`, a `method`,
and the hidden `fields` a form must carry, a CSRF token being why that list
exists. Resolution happens before the walk, beside the data seam and at the same
time as it, so the renderer stays synchronous. A form has a target, or an
`unavailable` with a reason, or nothing at all when the tree never said — three
states, because a submit button that silently goes nowhere is the failure the
shape exists to prevent. There are deliberately no params: a deployment with two
lists registers two endpoints, and the id is the whole AI-authored surface.

### 4c — The documentation site ← current

Modelled on `nextjs.org/docs`. Two decisions are settled and are not worth
relitigating:

- **MDX for prose and code blocks.** Documentation is prose, and prose is not
  improved by being a node tree. The tree model earns its keep where a page is
  *configured* rather than written.
- **Every rendered example on the page is a real `LoomTree`**, mounted through
  the runtime with a working propose-a-change box beside it. An example is a
  registry entry, so an example that cannot render is a failing test rather than
  a stale snippet — which is only affordable because a demonstrated change is a
  deterministic interpreter
  ([0057](decisions/0057-a-preset-is-a-deterministic-interpreter.md)) and needs
  no key to run.

### 4d — The marketing site

**Built entirely in Loom**: composed sections, themed, adapting. It reuses the
§4b step 3 primitives — the site is the proof, not a brochure about it — and it
embeds the demo rather than describing it, which is why the demo is public
([0056](decisions/0056-the-demo-is-public-and-shares-nothing-but-the-deployment.md)).

Positioning, audience and licensing are the maintainer's and are not engineering
questions. They are asked, not invented.

## Layout

```
src/
├── ids.ts             # Brand-typed NodeId / TreeId / DeltaId + the IdFactory seam
├── json.ts            # The JSON value space every boundary is restricted to
├── primitive-type.ts  # Primitive type and slot name identifiers
├── reserved-props.ts  # The `loom:` namespace: the runtime's own props
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
│   ├── theme.ts         # The reserved prop namespace, and the theme read from it
│   ├── text.ts          # The strings a primitive owns, and the seam that translates them
│   ├── render.ts        # The tree, projected into React
│   └── request.ts       # Per-request resolution: load, validate, render
├── data/                # The data seam — the only IO in serving a page
│   ├── source.ts          # Source ids and binding names
│   ├── binding.ts         # What a node asks, as it appears in the tree
│   ├── adapter.ts         # defineSource, the adapter contract, the registry
│   ├── plan.ts            # The tree's questions, deduplicated — a pure pass
│   ├── resolve.ts         # Asking them, all at once, catching everything
│   ├── resolution.ts      # The answers, indexed the way the walk needs them
│   └── catalogue.ts       # What a deployment can ask about, as data
├── submit/              # The submission seam — where a form's contents go
│   ├── endpoint.ts        # defineEndpoint, the target contract, the registry
│   ├── declaration.ts     # What a node names, as it appears in the tree
│   ├── plan.ts            # The tree's endpoints, deduplicated — a pure pass
│   ├── resolve.ts         # Asking them, all at once, catching everything
│   ├── resolution.ts      # The targets, indexed the way the walk needs them
│   └── catalogue.ts       # Where a deployment will accept a submission
├── catalogue.ts         # What a deployment can build with, as data
├── primitives/          # The starter library — a separate entry point
│   ├── tokens.ts        # The only way a primitive names a colour or a length
│   ├── url.ts           # The scheme allowlist every href and src is held to
│   ├── loom.page.ts     # …and one module per primitive, named for its type
│   └── index.ts         # The ten, and a registry over them
├── sdk/                 # The framework SDK — a separate entry point
│   ├── definition.ts    # The registration contract: definePrimitive
│   ├── registry.ts      # The registry: resolver and validator in one object
│   ├── conformance.ts   # Does a primitive spread loom.editable?
│   ├── audit.ts         # The conformance check a host runs
│   ├── text.ts          # Dictionaries, extraction, and what a translation covers
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
    ├── attribution.ts   # Who placed each node, walked back out of the log
    └── source.ts        # The store as the renderer's TreeSource
```

## The workspace

The repo is a pnpm workspace with two packages. `@loom/runtime` is the root;
`@loom/app` is `apps/loom`, and it depends on the runtime as `workspace:*` so it
can only reach the published entry points — a deep import into `src/` does not
resolve. When a surface needs something the public API does not expose, that is a
framework gap to close in the framework (see
[0018](decisions/0018-the-portal-is-a-consumer-not-an-insider.md)).

**`apps/loom` is one Next.js application with four surfaces in it**, one route
group each ([0067](decisions/0067-the-four-surfaces-are-one-application.md)). A
route group contributes nothing to a URL, so what a group holds is the surface's
own root layout, its own stylesheet and its own code — and what a reader types is
the segment underneath it.

```
apps/loom/
├── proxy.ts             # Sign-in, scoped to /portal and nothing else
└── app/
    ├── (marketing)/     # /             — the site, composed in Loom
    ├── (docs)/          # /docs         — prose, in MDX
    ├── (lessons)/       # /lessons      — the course
    └── (portal)/        # /portal       — behind sign-in
        ├── globals.css  #   The silver design system, as tokens
        ├── layout.tsx   #   Topbar, rail, and the content column
        ├── _components/ #   Topbar, sidebar, nav items
        ├── _lib/        #   View models, the store, auth
        └── portal/      #   The routes themselves
```

Three of the four are **built in Loom** — they compose registered primitives and
may not grow a component library of their own. The portal is the stated exception
(0067): it is a tool for reviewing Loom trees rather than content built out of
them.

`pnpm verify` at the root compiles the runtime, typechecks it, runs its tests,
then runs the application's typecheck, tests and build. The build is part of it
because prerendering is what proves the surfaces render.

**The build comes first, and that order is load-bearing.** `src/cli/scaffold-fixture/`
is checked-in scaffold output, and it imports `@loom/runtime/react` and
`@loom/runtime/sdk` the way a consumer does — through the `exports` map, which
points at `dist/`. Typechecking before the build fails on a clean clone with four
`TS2307`s, so the build has to have run. Keeping it in this order rather than
mapping those specifiers back to `src/` means the typecheck also proves the
`exports` map resolves, which is the thing a consumer actually depends on.

The runtime compiles to `dist/` and every entry point resolves there (0030), so
the application consumes it as an ordinary Node package rather than as TypeScript
source. `apps/loom` builds the runtime before its own typecheck and build,
because a clean clone has no `dist` and a build order that is not written down is
one that fails somewhere else.

## Deploying

All four surfaces deploy to Vercel as one project from `apps/loom`. Settings, and
what a deployment can and cannot do before a backing store lands, are in
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

A primitive receives three props — `loom` (its node id, type, edit-mode
decoration, its named regions, and — on the root node only — the mounted theme),
`props` (the node's props, unspread), and `children`. Rendering is
pure and total: it has no hooks and no IO, so it runs per request at the edge or
in a Server Component, and anything it could not render comes back in
`diagnostics` rather than as a thrown error.

### Named regions

A primitive that treats one part of its contents differently from the rest
declares a slot, and places it. The element's `slot` children arrive on
`loom.slots` keyed by name, and are **not** in `children` — so a region is a
place the primitive chooses, rather than a position in a list that any `move`
could change (0051):

```tsx
const Split = ({ loom, children }) => (
  <div {...loom.editable} style={{ display: "flex", flexWrap: "wrap" }}>
    <div>{loom.slots.start}{children}</div>
    <div>{loom.slots.end}</div>
  </div>
)
```

A region the primitive does not place renders nothing. A host still projects
into a region by name through `renderRequest`'s `slots` option, and what it
projects reaches the primitive the same way.

## Wearing a theme

A theme is three registered ids — a palette, a font pack, a style preset —
carried on the root node under the runtime's reserved prop key, so changing one
is an ordinary `configure` the Gate weighs like any other change (0049):

```ts
import { createThemeRegistry } from "@loom/runtime"
import { THEME_PROP_KEY } from "@loom/runtime/react"

const root = {
  kind: "element",
  type: "loom.page",
  props: { [THEME_PROP_KEY]: { palette: "bold", fontPack: "bold-sans", stylePreset: "airy-modern" } },
  // …
}

const rendered = await renderRequest(request, { source, resolver, themes: createThemeRegistry() })
```

The renderer resolves the selection, flattens it into `--loom-*` custom
properties, and hands them to the **root** primitive as `loom.theme`. A
primitive applies it as its `style` and reads colour, type and spacing back out
through `var(--loom-accent)` and friends, so it never learns which palette it is
wearing and a re-theme touches no node below the root:

```tsx
const Page = ({ loom, children }) => (
  <main {...loom.editable} style={loom.theme}>{children}</main>
)
```

Prop keys beginning with `loom:` belong to the runtime: they are read at the
render seam and never reach a primitive or its schema, so a root primitive can
declare `.strict()` props and still wear a theme. A theme that cannot be
resolved renders unstyled with a diagnostic, never a blank page, and there is no
fallback theme — the page is a function of the tree, not of deployment config.
Both are argued in
[0050](decisions/0050-the-runtimes-props-are-namespaced-and-the-root-mounts-the-theme.md).

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

## The starter primitives

A deployment does not have to start from an empty registry. `@loom/runtime/primitives`
ships ten, ported from the Hermes predecessor and chosen to cover the primitive
contract rather than the catalogue:

```ts
import { createStarterPrimitiveRegistry } from "@loom/runtime/primitives"

const registry = createStarterPrimitiveRegistry([myOwnPrimitive])   // Result, like any other
```

| | | |
| --- | --- | --- |
| `loom.page` | root, composes | Mounts the theme; one column, at a chosen measure |
| `loom.section` | composes, slot `heading` | A band of the page, with its heading placed above the content |
| `loom.split` | composes, slots `start` `end` | Two regions side by side, wrapping to one column with no media query |
| `loom.stat-grid` | composes | A responsive grid of `loom.stat` children |
| `loom.stat` | leaf | One figure, its label, and an optional caption |
| `loom.heading` | leaf | `level` sets both the outline and the size; the text is child nodes |
| `loom.prose` | leaf | A paragraph; the text is child nodes |
| `loom.divider` | leaf | Three genuinely different renderings, selected by one enum |
| `loom.media` | leaf | An image; alt text required unless it says it is decorative |
| `loom.action` | leaf | A call to action; its destination is scheme-checked |

Every one of them reads colour, type and spacing through `var(--loom-*)` and
hard-codes none of it, which is what makes a re-theme one `configure` on the
root. That is enforced by a test: the whole sample page is rendered under both
starter palettes, and the markup below the root has to be byte-identical and to
contain no literal colour.

Two rules govern the port, and the remaining sixty follow them:

- **A repeated item is a child node; a fixed field is a prop**
  ([0052](decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)).
  Hermes held a stat list in an array field; here the grid is a primitive and
  each stat is a node, so adding one is an `insert` the Gate weighs, the log
  attributes and the inverse removes.
- **A URL is checked against a scheme allowlist, never merely parsed**
  ([0053](decisions/0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md)).
  `z.string().url()` accepts `javascript:alert(1)`, and props in a Loom tree are
  AI-authored.

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
