# The scripts that build what they import

**Date:** 2026-10-12
**Section:** §3 (portal)
**Branch:** `scripts-build-what-they-import`

## What happened

The maintainer pulled the branch that renamed `loom_projects` to
`loom_applications`, ran `pnpm db:push`, and got:

```
SyntaxError: The requested module '@jam-overture/loom/postgres' does not
provide an export named 'ensureApplicationStoreSchema'
```

The export exists. `dist/` did not have it yet, because `db:push` imports from
the **built** package and nothing had built it since the pull.

**The error says nothing about that.** It reads as a broken module, and the
first thing it invites is checking whether the export is really there — which it
is, in source, which makes the message look like a lie.

## What was done

`db:push`, `telemetry:prune` and `signals:collect` now build
`@jam-overture/loom` before running. All three import from its built output, so
all three had the same trap; `apps/loom`'s own `build` script already does this
and these did not.

Proved rather than assumed: `dist/` was deleted entirely and `pnpm db:push` run
from that state. It builds, then reaches the `DATABASE_URL` check — which is the
script working. The maintainer then hit the same `DATABASE_URL` line on his own
machine, which is how we know the import error is gone rather than hidden.

The cost is about fifteen seconds of `tsc` on a command run by hand a few times
a release. The thing it buys is that a stale `dist/` can no longer present
itself as a missing export.

## Tests

`pnpm verify` green: **217 files / 4856** framework tests, **436 files / 8322**
application tests, 133 prerendered pages 0 run together. No test covers this —
it is a package script, and what holds it is the deleted-`dist/` run above.

## Open questions

None. If a fourth script is added that imports from the built package, it needs
the same prefix; there is no check for that, and a comment in `db-push.ts` is
what a reader finds instead.
