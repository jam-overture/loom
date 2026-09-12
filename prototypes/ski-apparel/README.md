# Ski apparel — a Loom prototype

A single page about buying ski kit, built entirely from registered Loom
primitives. Nothing here is bespoke markup: every band on the page is a node in
a `LoomTree`, and the whole thing is one call to `renderLoomTree`.

```bash
pnpm install
pnpm dev          # http://localhost:4321
```

`pnpm build` writes `out/index.html` instead of serving.

## What it is for

Two questions, and it is a prototype because they are worth answering cheaply:

- **Is the vocabulary enough to build a real page a person would read?** Not a
  primitive gallery — a page with an argument in it, where the choice of band is
  driven by the content rather than by what happens to exist.
- **What is missing?** Anything this page had to fake, or reach for a near-enough
  primitive to express, belongs in `FINDINGS.md` for `Loom primitives`.

## Notes

`page.mjs` is the tree. `server.mjs` renders it and serves the result with the
theme's variables mounted. There is no build step, no bundler and no framework —
which is itself the point: a Loom page is data, and rendering it is a function
call.

## The signal rail

`pnpm dev` serves the page with a rail down the right-hand side showing what the
page can observe about being read: time on each section, clicks on the nav links
that jump to one, questions opened, and a feed of those events as they happen.

It is a development instrument, not part of the tree. And it observes only — it
draws no conclusions and changes nothing on the page.

- **`sidebar.mjs`** collects. An `IntersectionObserver` for which section fills
  the screen, a one-second tick for how long it stayed, and one document-level
  click listener. The page is not instrumented for any of it: the hooks are the
  `anchor` props it already had.
- **`signals.mjs`** folds each event into the readings. Pure; the server holds
  the result.

`?rail=off` serves the page without it. **Start over** clears the readings.
