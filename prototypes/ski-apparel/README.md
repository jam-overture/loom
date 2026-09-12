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

`pnpm dev` serves the page with a rail down the right-hand side, driven by the
framework's own broadcaster, `@loom/runtime/signals`. There is no hand-written
collector.

What happens, end to end:

1. **The page is rendered `addressed: true`**, so every component carries its node
   id and type, and the root carries the tree id and revision. `?rail=off` is the
   page a visitor gets: no rail and no ids.
2. **`rail.client.mjs` starts `broadcastReaderSignals`** with the settings a host
   would choose — which primitive types to report on, and a one-second batch. The
   dev server bundles it with esbuild at startup.
3. **Each batch is read twice.** The rail listens for the `loom:signals` DOM event
   and folds batches into what it shows (`readings.mjs`). `send` posts the same
   batch to the dev server, which checks it with `parseReaderSignalBatch` and
   prints what arrived — or why it refused it. Nothing is stored.
4. **Words come from the tree, not the signal.** A signal names a node and never
   its content, so the page embeds a small legend built from the tree
   (`legend.mjs`): which node is which section, where each link jumps, what each
   question asks.

**Start over** clears what the rail has counted.
