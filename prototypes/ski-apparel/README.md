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
