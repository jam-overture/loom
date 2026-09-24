# 0188. A specimen may ask to be hydrated, and only then is there anything to press

**Status:** Accepted
**Date:** 2026-09-24
**Section:** §1 (process)

## Context

[0117](0117-one-harness-two-subjects-a-tree-it-renders-and-an-address-you-serve.md)
folded two private screenshot scripts into one harness with two subjects: a tree
it renders itself (`pnpm specimen`) and an address something else serves
(`pnpm shoot`). A specimen is `renderToStaticMarkup` with no dev server and no
hydration, which is what makes it cheap and what makes it honest — what is
photographed is the render seam's own output, with nothing in between.

That subject has one blind spot, and the behaviour seam is entirely inside it.
Every control the runtime builds — `copy`, `disclose`, `adjust`, `present`,
`dismiss` — renders `null` until an effect proves scripting runs
(`src/render/behaviour.ts`), which is deliberate, correct on a served page, and
the reason a page with scripting off does not get a dead button. It also means a
specimen of a primitive that takes one photographs the page **without** the
control, correctly, with no flag that changes it.

Five members shipped between 24 August and 23 September and **not one of them had
ever appeared in a picture in this repository.** Three lanes in four days
bundled a page by hand, served it on `127.0.0.1` and pointed `pnpm shoot` at it
instead — the private script 0117 exists to stop, reappearing for the one thing
it left out.

A second gap sat beside it and could not be closed alone. `renderSpecimen` took
an `additionalPrimitives` list from the day it was written and nothing could ever
pass one: it was a parameter of the renderer rather than a field of the subject,
so the CLI — which is what actually runs a specimen — always called it with none.
The consequence is not a missing convenience. A run photographing a **seam** has
nothing of its own to photograph it on, so it must add a primitive to
`src/primitives/` to have a subject, which is another lane's directory.

## Decision

### 1. `live` is opt-in, and its absence is the whole guarantee

```ts
readonly live?: { readonly states?: readonly SpecimenState[] }
```

A specimen that says nothing renders, serves and photographs exactly as it did:
`renderToStaticMarkup`, no bundle, no browser JavaScript, no attribute on the
body, and the same file names four reports' worth of shots already quote. Saying
`live: {}` buys hydration; declaring `states` buys the presses.

### 2. A state is a third dimension of the plan, not a second specimen

```ts
type SpecimenState = { readonly label: string; readonly do: readonly ShotStep[] }
```

A picture of a dialog is two pictures, shut and open, of one page. So states sit
beside themes and viewports in `planShots`, the document is rendered once for all
of them, and the shot is named `<specimen>-<theme>-<viewport>-<state>`. A
specimen with no states has one nameless state whose steps are empty, which is
what keeps every existing name unchanged.

The steps are `pnpm shoot`'s, unchanged.
[0159](0159-an-instrument-may-reach-a-state-and-may-never-assert-one.md) holds
here exactly as it does there: a state names somewhere to arrive at and nothing
observes what the press produced.

### 3. Both renders call one function, and nothing is serialised onto the page

`tools/specimen/element.ts` builds one page's element — registry, endpoints,
themes, submissions — and is called by the server renderer and by the browser
alike. The document carries one thing the browser did not already have: the
planned page's **name**, in `data-loom-specimen-page`, which the client looks up
by re-running the same pure planner.

Hydration is React checking that the client's first render agrees with the
server's markup, so anything either side decides separately is a disagreement it
resolves by keeping the server's and telling nobody. One function is the cheapest
way to have nothing differ.

### 4. A live specimen is bundled with esbuild, and only a live specimen is

The generated entry imports the lane's own specimen module and hands it to
`hydrateSpecimen`. esbuild is a devDependency of the runtime, imported by
`tools/specimen/bundle.ts` alone; nothing under `src/` knows it exists, for the
reason `playwright-core` is kept out entirely — this is a tool for taking a
picture, not part of what ships.

The bundle defines `process.env.NODE_ENV` as `production`. React's development
build patches a hydration mismatch into the client's render, which would
photograph a page no reader is ever served.

### 5. `additionalPrimitives` becomes `Specimen.primitives`

The list moves from a parameter of `renderSpecimen` to a field of the subject.
It had to move for `live` to work at all — the browser builds the same registry
from the same module, and a flag reaches only one of the two — and it is where
`args.ts` already says this kind of fact belongs: what to photograph is a
property of the specimen, committed beside the lane that cares.

What goes there is a primitive that exists to be looked at. A primitive
anybody's page should be able to use is not this; it is a finding for
`Loom primitives`.

## Consequences

- **The behaviour vocabulary is photographable, and has been photographed.**
  `tools/specimen/behaviour.specimen.ts` places all five controls on a subject
  registered for that specimen alone. The `dismissed` shot is byte-identical to
  the `settled` one, which is the pair closing itself, measured rather than
  asserted.
- **A live specimen renders through `renderToString`.**
  `renderToStaticMarkup` is documented as markup that is not to be hydrated, so
  a live page takes the renderer React supports on the other end of a
  `hydrateRoot`. A static specimen keeps the cheaper one and every picture ever
  taken is unchanged.
- **A live body holds the markup and nothing else** — no wrapper element and no
  newline round it. A whitespace text node is a node React must reconcile; a
  wrapper costs a box and would stop a live specimen's picture being comparable
  with a static one's.
- **The harness gains a build step**, which is what `renderToStaticMarkup` was
  chosen to avoid. It is paid only by a specimen that asks, runs before the
  browser is looked for so a bad module reports in a second, and produces no
  file on disk that a later run could read stale.
- **A failed hydration leaves the server's markup on screen** and writes one line
  to the console. There is deliberately no `createRoot` fallback: it would draw a
  page that looked right and paint over the single most useful thing a live
  specimen can catch.

## Alternatives considered

- **A second entry point, `pnpm specimen --live`.** Rejected on `args.ts`'s own
  rule: what to photograph is a property of the specimen, not of one invocation,
  and a flag would let one run disagree with the next about what a shot is
  called. It also cannot carry `primitives`, which the browser needs.
- **Hydrate every specimen.** Rejected. It would put a bundle, a script tag and a
  paint into every picture this harness has ever taken, to serve the specimens
  that need none of it, and it would make `renderToString` the only renderer for
  a subject chosen because it needed no framework behind it.
- **Leave it, and tell lanes to use `pnpm shoot` against their own served page.**
  This is what the portal and the demo do and it works for them, because they
  have an application. A framework seam has no page — which is why the last three
  lanes to want this wrote a bundler and a server by hand, and why the fourth
  would have.
- **Serialise the tree, the resolved submissions and the theme into the
  document and rebuild the client's element from those.** Rejected: it is a
  second projection of values the module can produce exactly, and the first thing
  it can drift from is the markup it has to match.
- **`createRoot` when hydration fails.** Rejected; see Consequences.
- **A `<div>` container to hydrate into.** Rejected for the box it costs on every
  live page, which is a difference between a live picture and a static one that
  has nothing to do with the subject.
