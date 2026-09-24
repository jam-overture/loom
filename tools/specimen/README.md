# `pnpm specimen` — the picture

Four routine briefs ask a run for a screenshot. This is what takes one, so that
no run has to write it again.

```bash
# once per session — playwright-core is deliberately not a dependency here
mkdir -p /tmp/shot
(cd /tmp/shot && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install playwright-core)

# from the repository root
LOOM_PLAYWRIGHT=/tmp/shot/node_modules \
  pnpm specimen tools/specimen/example.specimen.ts --out reports
```

```
example-editorial-phone  390x844@2x  scrollWidth 390 / innerWidth 390
example-editorial-wide   1280x900@2x  scrollWidth 1280 / innerWidth 1280
…
```

One `.png` per theme per viewport, named `<specimen>-<theme>-<viewport>.png`.
The exit code is non-zero if any shot overflowed its viewport.

## Writing a specimen

A specimen is data, not a script: **what** to look at, committed beside the lane
that cares. `tools/specimen/example.specimen.ts` is the worked copy.

```ts
export default defineSpecimen({
  name: "pricing-band",
  title: "The pricing band",
  build: (theme) => aTreeWearing(theme),
  themes: [{ label: "editorial", selection: /* palette, fontPack, stylePreset */ }],
  // viewports defaults to [PHONE, WIDE] — 390×844 and 1280×900, both at 2×
})
```

### Photographing a form

A `loom.form` whose destination nothing resolved draws a notice over a
`disabled` fieldset at six-tenths opacity — correct, and useless as a picture of
the control *inside* the form. Declare where it posts:

```ts
export default defineSpecimen({
  // …
  endpoints: {
    "contact.enquiry": { action: "/contact", method: "post", fields: [] },
  },
})
```

A **target**, not an endpoint: the seam takes an async call that may mint a
token, and a photograph must not depend on a network. It is still validated the
way a host's answer is, so an action that leaves the origin is refused here
rather than in review.

### Photographing a behaviour

A specimen is static markup, and **every control in the behaviour vocabulary —
`copy`, `disclose`, `adjust`, `present`, `dismiss` — renders nothing until an
effect proves scripting runs.** So a specimen of a primitive that takes one
photographs the page without it, correctly, and there was no flag that changed
that until 24 September. Say `live`:

```ts
export default defineSpecimen({
  // …
  live: {
    states: [
      { label: "settled", do: [] },
      { label: "presented", do: [{ click: ".loom-control-present" }] },
    ],
  },
})
```

The pages are then bundled with esbuild and hydrated in the browser before the
shutter, and each state is a shot named `<specimen>-<theme>-<viewport>-<state>`.
A state's `do` is the same step list `pnpm shoot` takes. `live: {}` hydrates and
declares no states, which is one picture of the page as it settles.

A specimen that says nothing about `live` is unchanged in every respect — no
bundle, no browser JavaScript, and the same file names it had.

Every control carries `loom-control` and `loom-control-<behaviour>`, which is
what a step clicks. What a control publishes is `data-loom-disclosed`,
`data-loom-presented` or the `--loom-adjust` custom property, and the primitive's
own rules read those — see `src/render/behaviour.ts`.

### Registering a primitive for one specimen

`primitives` takes entries from `definePrimitive` and registers them beside the
starter library, for this specimen only:

```ts
export default defineSpecimen({
  // …
  primitives: [aSubjectThatPlacesTheControl],
})
```

It is for photographing a **seam**: the smallest primitive that holds the thing
under test, so a run does not have to add one to `src/primitives/` — another
lane's directory — to have a subject. A primitive anybody's page should be able
to use is not this; it is a finding for `Loom primitives`.
`tools/specimen/behaviour.specimen.ts` is the worked copy of both halves.

Put it beside the code it photographs. Nothing in this directory is any lane's
content, and the harness imports no specimen but the example.

## Why it is shaped like this

Recorded in
[0116](../../decisions/0116-a-screenshot-is-taken-by-the-repository-and-playwright-is-never-a-dependency.md),
with the alternatives. The four things that cost eleven private rewrites:

| obstacle | what the harness does |
| --- | --- |
| `playwright install` cannot reach its CDN, and the browsers are already here | reads `PLAYWRIGHT_BROWSERS_PATH`, derives the Chromium path from the directory, and **writes no build number down** |
| `playwright`'s postinstall re-fetches ~200MB through a proxy that blocks it | `playwright-core` only, resolved at call time from `LOOM_PLAYWRIGHT` or `NODE_PATH`, never a dependency |
| an image URL may not be `file:` or `data:` (0053), so a specimen with an avatar will not render | serves the pages over `http://127.0.0.1` on an ephemeral port |
| a band that reveals on scroll photographs blank | every context is opened with `reducedMotion: "reduce"` |

## The other subject: `pnpm shoot`

A specimen is a tree this harness renders itself. When the subject is a page
something else is already serving — a `next start`, a preview deployment, a
static directory — the entry point is `pnpm shoot`, and the list lives beside
the lane that cares:

```bash
LOOM_PLAYWRIGHT=/tmp/shot/node_modules pnpm shoot shots.json
```

```json
{
  "baseUrl": "http://localhost:3000",
  "outDir": "reports",
  "shots": [
    { "path": "/the-record", "out": "2026-09-08-the-record", "viewport": "phone" },
    { "path": "/portal", "out": "portal", "waitFor": "[data-signed-in]", "fullPage": true }
  ]
}
```

### Reaching a state a load does not produce

The block worth photographing is often three presses in — a figure that is empty
until a reader scrolls, a disclosure that exists only once opened. `do` runs
after `waitFor` and before the shutter; `clip` points the shutter at one element
instead of the viewport:

```json
{
  "path": "/what-your-readers-do",
  "out": "signals-figure",
  "do": [{ "click": "[data-cta]" }, { "wait": 400 }],
  "clip": "[data-figure]"
}
```

Four steps and no more: `click`, `fill`, `wait` and `waitFor`. Every one of them
names a state to arrive at and none of them reports what is there — the moment
this grows a way to assert or to branch, the harness has become a test runner
with a camera attached ([0159](../../decisions/0159-an-instrument-may-reach-a-state-and-may-never-assert-one.md)).

A `do` list is a sequence against **one** page, so anchor navigation is
prevented for its duration — otherwise step two runs somewhere else and the
picture is silently of another page. The page's own delegated listeners still
see every click, which is what keeps a reader-signal broadcaster measurable
under the shutter. The page is measured for overflow **after** the steps, since
the steps are what produce the state being photographed. `clip` and `fullPage`
are refused together rather than resolved by precedence.

Everything after the plan is this directory's: the same browser, the same launch
flags, the same reduced motion, the same overflow line, the same naming. Only
what to point at differs. [0117](../../decisions/0117-one-harness-two-subjects-a-tree-it-renders-and-an-address-you-serve.md)
is why the two are one harness and what it cost when they were two.

## What it does not do

- **It does not start your application.** `pnpm specimen` needs no server;
  `pnpm shoot` photographs one you are already running. Getting a signed-in
  portal screen up — `next build`, `next start`, that lane's environment —
  remains the portal's own recipe.
- **It does not diff against baselines.** Visual regression is a different
  project; this makes it possible later and presumes none of it.
- **It runs in no CI job.** It is a tool a run drives when it has something to
  look at.
