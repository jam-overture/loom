# Both seams in one element — the two units that met in the same four files

**Date:** 2026-09-24 · **Routine:** `Loom daily build` (framework core) ·
**Section:** §4 — the SDK and the harness, not the library

## What this run did

It composed two units of this lane's own that were built one day apart without
seeing each other, and shipped the result as one reviewable change.

[#378](https://github.com/jam-overture/loom/pull/378) gave a specimen `answers`
— a declared reply per source, so a bound primitive could be photographed in a
state other than its failure. It landed on `main` in the morning of 23
September. [#380](https://github.com/jam-overture/loom/pull/380) gave a specimen
`live` — hydration in the browser before the shutter, so the five controls in
the behaviour vocabulary could be photographed at all. It was opened on the
morning of 24 September, against a `main` that did not yet carry the first.

Both rebuilt `tools/specimen/render.ts`, `specimen.ts`, `specimen.test.ts` and
`README.md`. The conflict was not mechanical, and the earlier run said so rather
than resolving it at merge time: `element.ts` — the one function a hydrating
browser and a server renderer both call — was written against a `render.ts` with
no data seam, so combining them decides **where the data seam runs for a page
that is going to be hydrated**, and whether a specimen may declare `answers` and
`live` together at all.

**It may, and nothing arbitrates between the two.** That is this run's decision
and the whole of what was open.

### The argument, in one page

The specimen below declares a primitive, a set of answers and a list of states —
all three at once, which nothing in this repository could do yesterday.

| before — the static harness | after — hydrated, and answered |
| --- | --- |
| ![static](2026-09-24-framework-both-seams-in-one-element-static.png) | ![settled](2026-09-24-framework-both-seams-in-one-element-settled.png) |

No *Copy*, no *Menu*, no slider and no *Open the panel* on the left. Both regions
— the menu and the panel — are *visible* there, because the rules that hide them
key on attributes only a mounted control writes. That is the seam failing in the
safe direction, photographed.

The band at the foot has rows in **both** pictures, and that is deliberate and
worth being precise about: the rows are resolved on the server whether or not
the page is live. What the pictures show is that the page can be built with both
seams declared. What the pictures cannot show is the browser's own resolve
agreeing with the server's — production React settles a hydration mismatch by
keeping the server's markup and saying nothing. That claim is a test, below.

Three states, reached by pressing:

| disclosed | presented | dismissed |
| --- | --- | --- |
| ![disclosed](2026-09-24-framework-both-seams-in-one-element-disclosed.png) | ![presented](2026-09-24-framework-both-seams-in-one-element-presented.png) | ![dismissed](2026-09-24-framework-both-seams-in-one-element-dismissed.png) |

**The `dismissed` shot is byte-identical to the `settled` one** — same md5
(`a964564c4d2b685384b04ef427f60550`), same 238,718 bytes. `present` and `dismiss`
are the vocabulary's first *pair*, and that is the pair closing itself, measured
rather than asserted.

## What changed

```ts
export default defineSpecimen({
  // …
  primitives: [aSubjectThatPlacesTheControl],
  answers: { "controls.shipped": { answer: [/* … */] } },
  live: {
    states: [
      { label: "settled", do: [] },
      { label: "presented", do: [{ click: ".loom-control-present" }] },
    ],
  },
})
```

- **`specimenElement` owns every seam a page needs** — the primitive registry,
  the endpoints, the sources, the theme registry, the resolved submissions and
  the resolved data. It is its own module because `render.ts` imports
  `react-dom/server` and a browser must not. Both renders call it, so nothing is
  serialised onto the page for the two to disagree about: the document carries
  the planned page's *name*, and the client re-runs the same pure planner.
- **`answers` and `live` compose, structurally rather than by promise.** A
  specimen declares a `SubmissionTarget` and a `SpecimenAnswer`, never an
  endpoint that mints a token or an adapter that queries a database — the
  harness is what wraps each declaration in the seam's own type. So there is no
  way for a specimen to hand either resolver something that can reach a network,
  be slow, or answer twice differently. Both seams were already built that way
  because a photograph must not depend on a network, and that turns out to be
  the same property that makes them safe in a browser.
- **`RenderError` has one home.** Its three codes — `registry`, `endpoints`,
  `sources` — are defined in `element.ts` and re-exported by `render.ts`, so the
  two modules cannot drift into two different sets. #378's `"sources"` code
  moved with the function that raises it.
- **`live` is opt-in, and its absence is the guarantee.** A specimen that says
  nothing renders through `renderToStaticMarkup`, carries no bundle, no script
  tag and no attribute, and produces the same file names four reports' worth of
  shots already quote. A live page renders through `renderToString`, which is
  what React supports on the other end of a `hydrateRoot`.
- **A state is a third dimension of the plan**, beside themes and viewports. One
  document serves all of a page's states, because a state is reached in the
  browser rather than rendered. A static specimen has one *nameless* state,
  which is what leaves every existing name alone.
- **`additionalPrimitives` became `Specimen.primitives`.** It was a parameter of
  `renderSpecimen` from the day that function was written and the CLI could
  never pass one. It had to move for `live` to work at all — the browser builds
  the same registry from the same module, and a flag reaches only the server.
- **esbuild is a devDependency of the runtime**, imported by
  `tools/specimen/bundle.ts` alone. Nothing under `src/` knows it exists. React
  is built in production mode, whose hydration does not patch a mismatch into a
  page no reader is served.

## Decisions nobody specified, and why they went this way

**A live specimen may declare answers rather than being refused.** The
conservative reading was to refuse the combination until someone had thought
about it. Rejected because the property that refusal would protect is already
guaranteed by a stronger mechanism — a specimen cannot express a
non-deterministic answer — and because refusing it makes the one subject that
needs both seams at once unphotographable, which is most of what the unit is
for.

**The bound band went on the behaviour specimen rather than into a third
specimen file, and `answers.specimen.ts` was left alone.** The composition needs
one page that declares all three fields; making the existing data-seam specimen
live would have changed how an already-reviewed artefact is rendered for no gain,
and a third file would have been a specimen whose only subject is that two
fields can coexist.

**The picture's claim was narrowed after it was taken.** The first cut of the
page said the rows being present *was* the two seams agreeing. That is not true
of a photograph, for the reason given above, and both the page's prose and the
specimen's doc comment now say what the picture is and is not evidence of. The
agreement is asserted by a test instead.

**One record rather than two.** Where the data seam runs for a hydrated page is
not a separate decision from hydration; it is the same decision made properly
the second time. Splitting it would have produced two records that have to be
read together.

## Records

- **Added [0188](../decisions/0188-a-specimen-may-ask-to-be-hydrated-and-one-function-builds-the-page-for-both-renders.md)**
  — *A specimen may ask to be hydrated, and one function builds the page for both
  renders.* `Accepted`. It supersedes nothing.
- `0188` was also the number claimed by #380's record, which never merged. That
  branch is replaced by this one, so the number is used once.
- `pnpm decisions:index` regenerated. It prints its usual notes about numbers
  with no record on `main`; those gaps are pre-existing and unrelated.

## Findings

**Closed, both owned by this lane:**

- *no behaviour control can appear in a specimen* (20 September, this lane's
  own) — recommendation (1) taken, both halves.
- *`npx prettier` is not this repository's formatter* (23 September, `Loom
  marketing`) — answered with a paragraph under *Standards* in
  `docs/routines.md`, which is the second of the two remedies that entry
  offered. The first cannot be had: that run's own measurement shows no prettier
  options string reproduces the existing style.

**Filed:** none. Two things found while building are open questions below rather
than findings, because both are this lane's own and neither blocks anyone.

## Open questions

- **The adjust control is photographed and never dragged.** A state can `click`
  and `fill`, and neither sets a range input's value. The slider hydrates and
  the fill bar reads its `var()` fallback at 50. A real gap in `pnpm shoot`'s
  step vocabulary rather than in this unit, and not worth a fifth step until a
  second lane wants one.
- **The `.next` ordering question is still open and was not taken.**
  `@loom/app`'s verify typechecks against the route map of the *previous* build,
  which is correct whenever the last build was this tree. `pnpm clean` removing
  the artefact is the mitigation; the cure is one of three orderings and each
  costs every lane something on every run. Not one to pick unilaterally on a
  gate four surfaces share.
- **#380 is now redundant** and this run has not closed it — see the pull
  request comment. It carries the same unit against a `main` that has moved, and
  its `Vercel` check is red for the commit-identity reason `docs/routines.md`
  describes.

## The gate

| | |
| --- | --- |
| `pnpm verify` | **green, exit 0** |
| runtime | **3,047 passed** in 159 files |
| application | **5,529 passed** in 305 files |
| `tools/specimen/specimen.test.ts` | **90 tests**, up from 72 on `main` (79 on #380) |
| `pnpm specimen` on the behaviour specimen | 4 shots, exit 0, no overflow at 1280 |

Nothing skipped, nothing weakened, nothing failed. The five pictures above were
taken by the harness in this run, not by a deployment.
