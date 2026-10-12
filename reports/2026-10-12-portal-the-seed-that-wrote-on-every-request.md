# The seed that wrote on every request

**Date:** 2026-10-12
**Section:** §3 (portal)
**Branch:** `seed-is-not-a-request-s-job`

## What happened

`www.loomjs.org/portal` and `/` returned **504** after five minutes. Vercel:

```
Vercel Runtime Timeout Error: Task timed out after 300 seconds
FUNCTION_INVOCATION_TIMEOUT
Execution Duration / Maximum   5m / 5m
```

Middleware answered in 11ms, so nothing at the edge. Supabase, in one second:

```
23505  duplicate key value violates unique constraint "loom_trees_pkey"        ×4
23505  duplicate key value violates unique constraint "loom_applications_pkey"
23505  duplicate key value violates unique constraint "loom_projects_pkey"
57014  canceling statement due to statement timeout
```

## The cause, which is this lane's

Every portal screen awaits `ensureSeeded`, and every marketing page awaits
`ensureSiteSeeded`. Both put their rows in by **inserting blindly and letting
the primary key answer** *already there*.

On one machine that is a tidy idiom. On a serverless host it is six failing
INSERTs per cold start — the six in the log above, in the same second.

**A failing INSERT is not free.** Postgres takes a lock on the key it collided
with and holds it until the transaction ends, so a second instance inserting the
same key waits for the first. The pool is `max: 1`, deliberately, so everything
else that instance wanted queues behind the wait. Enough cold starts at once and
the queue outlives the function.

Two of those six are three hours old: #608 and #610 added `ensureDefaultProject`
and `ensureDefaultApplication` to the same per-request `Promise.all`, which is
what took it from uncomfortable to fatal.

## The fix

**Ask before writing.** A `SELECT` on a primary key takes no lock and answers in
a millisecond; the steady state — the row is already there, which is every
request after the first — now writes nothing at all.

The constraint is still the backstop, so two instances that both find a row
absent are still safe: one wins, the other is refused, neither overwrites. What
changed is that nobody asks the constraint a question they could have asked the
index.

The four seeds also run in sequence rather than through `Promise.all`. Four
concurrent statements on a pool of one connection are four statements in a queue
wearing a costume.

## What the test holds

```
× seeding a store that is already seeded > writes nothing the second time
  → expected "create" to not be called at all, but actually been called 4 times
```

That is the test failing against the first version of the fix, which is the
useful part of this report. A memory store cannot reproduce a lock, so the test
holds the thing that removes it: seed, reset the memoisation, seed again, and
assert nothing was written.

## The bug inside the fix, which the test caught and the compiler did not

The first version asked `portalStore.head(tree.id)`. A `LoomTree` is identified
by `treeId`; `tree.id` is `undefined`, so every check said *not found* and every
seed wrote exactly as before.

**`pnpm tsc --noEmit` at the repository root does not cover `apps/`** — its
`include` is `src/**` and `tools/**`. The application has its own typecheck,
inside `pnpm --filter @loom/app verify`, and that is the one that would have
caught it. I ran the root one, saw `0`, and believed it.

## Tests

`pnpm verify` green: **217 files / 4856** framework tests, **437 files / 8355**
application tests (+13), 133 prerendered pages 0 run together.

## What this does not fix, and is not claimed to

I cannot reach the deployment or the database from here, so **this is the cause
of the six duplicate-key errors and a sound mechanism for the timeout behind
them — not a measurement of the timeout itself.** If 504s continue after this
deploys, the next thing to look at is the pool: `max: 1` means one slow query
blocks every other thing that instance wanted, and a connection count is a
number somebody should choose on evidence rather than inherit.

## Open questions

- **Seeding does not belong in a request at all.** It is a deployment's job, and
  `db:push` is where it would go. That is the right change and a larger one; this
  is the one that stops the bleeding.
- **The marketing site is dynamic and uncached.** `/` and `/how-it-works` are `ƒ`
  in the build, every render reads the store, and there is not one
  `unstable_cache` or `revalidate` in the application. Caching the read, keyed by
  tree and invalidated when a change lands, is the larger win.
