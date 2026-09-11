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

## What it does not do

- **It does not photograph a running application.** A specimen is a tree
  rendered by the render seam — no dev server, no hydration. Photographing a
  signed-in portal screen needs `next build`, `next start` and that lane's
  environment, and remains the portal's own recipe.
- **It does not diff against baselines.** Visual regression is a different
  project; this makes it possible later and presumes none of it.
- **It runs in no CI job.** It is a tool a run drives when it has something to
  look at.
