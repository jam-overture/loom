# 0188. A specimen may ask to be hydrated, and one function builds the page for both renders

**Status:** Accepted
**Date:** 2026-09-24
**Section:** §4 — the SDK and the harness, not the library

> **Why this number.** `0187` is the highest on `main` and neither open pull
> request (#386, #387) adds a record, so `0188` is the next free one everywhere.
>
> **Why `Accepted`.** It changes no schema, adds no node kind and supersedes
> nothing. It adds an opt-in field to a harness type and moves a function
> between two files in `tools/`; a specimen that says nothing is the specimen it
> was, down to the bytes of its pictures.

## Context

Two things were true of the specimen harness on the morning of 24 September,
and each was a limit the other could not reach.

**A specimen is static markup, so no behaviour could be photographed.** Five
controls shipped into the runtime between 24 August and 23 September — `copy`,
`disclose`, `adjust`, `present`, `dismiss` — and every one of them returns
`null` until an effect proves scripting runs. That is deliberate and correct on
a served page, and it means a specimen of a primitive that takes one
photographs the page without the thing it was taken for. Not one of the five had
ever been in a picture in this repository. Three lanes in four days wrote a
private bundle-and-serve script instead, which is the drift
[0117](0117-one-harness-two-subjects-a-tree-it-renders-and-an-address-you-serve.md) folded two
harnesses into one to stop.

**A specimen could be answered, but only where the answering happened.**
[0185](0185-a-probe-is-handed-answers-the-way-it-is-handed-props.md) gave a
specimen `answers`, and `renderSpecimen` grew a `resolveTreeData` call to use
them. `renderSpecimen` imports `react-dom/server`.

The second fact is what made the two units collide. Hydration is React checking
that the client's first render agrees with the server's markup, so the cheapest
way to have nothing differ is to have one function build the page and to call it
on both sides. That function cannot live in a module that imports a server
renderer. Lifting it out is not a refactor that could be deferred: it is the
thing that makes hydration safe, and it lands in the same four files the data
seam had just rebuilt.

So the question this record answers is not *may a specimen be hydrated* — it is
**where the data seam runs for a page that is going to be hydrated**, and
whether a specimen may declare `answers` and `live` together at all.

## Decision

**1. A specimen may declare `live`, and its absence is the guarantee.** A
specimen that says nothing renders through `renderToStaticMarkup`, carries no
bundle, no script tag and no attribute, and produces the file names four
reports' worth of shots already quote. A live specimen takes `renderToString`,
which is the renderer React supports on the other end of a `hydrateRoot`.

**2. A state is a third dimension of the plan, beside themes and viewports.**
One document serves all of a page's states, because a state is reached in the
browser rather than rendered. A static specimen has one *nameless* state, which
is what leaves every existing name alone. The steps are `pnpm shoot`'s and
[0159](0159-an-instrument-may-reach-a-state-and-may-never-assert-one.md) holds
unchanged: a state names somewhere to arrive at, and nothing observes what the
press produced.

**3. `specimenElement` builds a specimen's page, and it owns every seam the
page needs** — the primitive registry, the endpoints, the sources, the theme
registry, the resolved submissions and the resolved data. It is its own module
because `render.ts` imports `react-dom/server` and a browser must not. The
server renderer and the browser both call it, so nothing is serialised onto the
page for the two to disagree about: the document carries the planned page's
*name*, and the client re-runs the same pure planner to find it.

**4. A live specimen may declare `answers`, and nothing arbitrates between the
two.** The property hydration needs is not that the data seam was skipped; it is
that running it twice gives the same result. That holds here **structurally
rather than by promise**: a specimen declares a `SubmissionTarget` and a
`SpecimenAnswer`, never an endpoint that mints a token or an adapter that
queries a database. The harness is what wraps each declaration in the seam's own
type, so there is no way for a specimen to hand either resolver something that
can reach a network, be slow, or answer twice differently. Both seams were
already built this way, for the reason a photograph must not depend on a
network — and that reason turns out to be the same one that makes them safe in a
browser.

**5. `additionalPrimitives` becomes `Specimen.primitives`.** It was a parameter
of `renderSpecimen` from the day that function was written and the CLI could
never pass one. It has to move for a live specimen to work at all: the browser
builds the same registry from the same module, and a flag reaches the server
only.

## Consequences

- **esbuild becomes a devDependency of the runtime**, imported by
  `tools/specimen/bundle.ts` alone. Nothing under `src/` knows it exists, and
  `pnpm build` is `tsc` over `src/`. It is the first bundler in this repository.
- **Only a live specimen pays for any of it.** No bundle is built, no browser
  JavaScript is served and no attribute is written for a specimen that does not
  ask.
- **React is bundled in production mode.** The development build warns on a
  hydration mismatch and then patches the DOM to match the client, which is a
  page no reader is ever served.
- **A mismatch is silent, so the photograph is not the evidence.** Production
  React settles a disagreement by keeping the server's markup and saying
  nothing. What tests the agreement is building the page twice and comparing —
  a test, not a shot. The pictures are evidence about the controls.
- **A live page that fails to build in the browser keeps the server's markup**
  and writes one line to the console. `hydrate.ts` never falls back to
  `createRoot`, because that would paint over the one disagreement worth
  catching.
- **`RenderError` has one home.** The three codes — `registry`, `endpoints`,
  `sources` — are defined in `element.ts` and re-exported by `render.ts`, so the
  two modules cannot drift into two different sets.

## Alternatives considered

**Serialise the tree, the resolved data and the theme into the document, and
rebuild the client's page from those.** Rejected: it is a second projection of
the same values, and the two can drift. The failure mode is a hydration mismatch
that production React resolves in silence — the exact class of bug this design
is arranged to make impossible rather than to detect.

**Refuse a specimen that declares both `answers` and `live`.** This was the
conservative reading, and it was the open question when the two units met. It is
rejected because the property it protects is already guaranteed by a stronger
mechanism: a specimen cannot express a non-deterministic answer. A refusal would
also make the one subject that needs both seams at once — a bound band under a
control that only exists after hydration — unphotographable, which is most of
what this unit is for.

**Resolve data on the server only and hand the client an empty resolution.**
Rejected for the same reason as serialising: the client would render a bound
region differently from the server on the first pass, which is a mismatch by
construction.

**Let a state be a second specimen.** Rejected: two specimens rendering the same
page is two documents, two builds and two chances for them to differ, for a
picture whose whole point is that it is the same page a moment later.

**Keep the element builder inside `render.ts` and import it from the browser
anyway.** Rejected: it pulls `react-dom/server` into the bundle, which is both
large and wrong — the client has no business holding a server renderer.

**A `--primitives` flag on the CLI instead of `Specimen.primitives`.** Rejected
for the reason `args.ts` gives about themes and viewports, and one more: a flag
reaches the server and not the browser, so the two would build different
registries and React would resolve the difference in silence.
