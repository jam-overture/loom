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

`pnpm dev` serves the page with a rail down the right-hand side. It is a
development instrument, not part of the tree — deliberately, because the moment
the observer is a node on the page it starts proposing changes to itself.

It closes a loop:

1. **`sidebar.mjs`** watches. An `IntersectionObserver` for which section fills
   the screen, a one-second tick for how long it stayed, and one document-level
   click listener for nav links and questions. The page is not instrumented for
   any of it — the hooks are the `anchor` props it already had.
2. **`signals.mjs`** concludes. Readings are observations and never opinions; a
   *derivation* is the one sentence a person could argue with. It draws two:
   a much-opened question should start open, and a section readers actually
   spend their time in is too far down the page.
3. **`propose.mjs`** runs it through the ordinary pipeline. The derivation
   becomes an `EditIntent` with `origin: "system-signal"` — no special path.
4. **The Gate decides.** The default policy caps a behaviour-derived change at
   `low` stakes, so opening a question lands on its own and reordering the page
   comes back for a human. Saying yes calls `confirmChange`, which re-assesses
   against the tree as it stands.

`?rail=off` serves the page without it. `/reset` rebuilds the tree and clears
the readings, which is worth having twice in a row.

The tree is mutable state in the server process — one reader, one page, for the
life of the process. Wrong for anything real and right here.
