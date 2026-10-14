# A slow store is an absent one

**Date:** 2026-10-13
**Section:** §3 (portal)
**Branch:** `a-slow-store-is-an-absent-one`

## What was asked

`loomjs.org` served nothing — not the portal, not the marketing root. The
maintainer: *"How could this break so badly. This is very concerning."* That
question is answered at the end of this report, because it deserves a better
answer than a changelog.

## What this fixes

`pageTreeFor` has always carried this, in its own words:

> The builder is the seed and the fallback, in that order. A store that has not
> been written yet, **or one that cannot be read**, serves the authored page
> rather than nothing — a site that refuses to load because a database is down
> would be a worse product than one that serves what it was written as.

That was true of a store that **refused** and false of one that **hung**. A
refusal is a `Result` the caller inspects; a hang is nothing at all, so the
fallback never ran and the page waited instead. The right behaviour was written
down, tested, and unreachable.

`within(work, budget)` turns a hang into the absence every caller already
handles:

- The marketing read gets **1.5 seconds**, then serves the page it was authored
  as.
- The workspace screen's reads get the same, and draw the notice they already
  had for a store that refuses.

It also closed a second hole nobody had looked for: the fallback did not handle
a **thrown** error either, only an `err()` Result. `await appStore.head(…)` on a
rejected promise propagated straight out of the page.

The budget helper moves from `(portal)/_lib` to `app/_lib/app`, where both
surfaces can reach it. `(marketing)` importing it from `(portal)` was a lane
crossing introduced yesterday and undone here.

## Proved, not asserted

With the fix reverted:

```
× a page whose store will not answer > serves the page it was authored as
  → Test timed out in 20000ms
× serves the authored page when the store throws, as it always did
  → no database
```

Restored, both pass. The first is the maintainer's hang, reproduced in a test.

The test uses the real `SiteRoute` and context types. The first draft used
`as never`, which is the cast that produced two tests passing for the wrong
reason earlier in this session; it was rewritten rather than kept.

## How this broke so badly

Three fixes in a day on the same defect, which is itself the answer. The chain
is this lane's, and each link was survivable alone:

1. **[0259](../decisions/0259-a-surface-the-portal-governs-renders-from-the-store-and-a-page-built-at-render-time-is-not-one.md)
   moved the marketing site from static pages to a store read.** A site that
   could not fail became one where every page view depends on Postgres. That the
   portal should govern those pages was the maintainer's direction; reading them
   per request, uncached and unbounded, was this lane's implementation.
2. **Seeding ran in the request path** — six blind `INSERT`s per cold start,
   using the primary key as the question. Fixed by
   [#615](https://github.com/jam-overture/loom/pull/615).
3. **The seed's promise was memoised with `??=` and never cleared**, so one
   stall poisoned an instance permanently. Fixed by
   [#616](https://github.com/jam-overture/loom/pull/616).
4. **Two more seeds were added to that same concurrent batch** by #608 and #610,
   hours before it fell over.
5. **The fallback handled a refusal and not a hang.** Fixed here.

Any one is a bad afternoon. Together they turn *the database is slow for ten
minutes* into *the site is down and stays down after it recovers*.

**The single mistake underneath all five: this lane tested that it works and
never tested that it fails well.** Every fix today was a failure mode discovered
one at a time that should have been designed for on the day the site was made to
depend on a database. The test in this change — *make the store hang, ask for a
page* — is the shape that was missing, and it should have existed in 0259.

## Tests

`pnpm verify` green: **217 files / 4856** framework tests, **439 files / 8365**
application tests (+6), 133 prerendered pages 0 run together, 1801 visuals none
over budget.

## What is still true and not fixed

- **A statement of ours is slow.** `57014 canceling statement due to statement
  timeout` appeared with Supabase's status page green, so this is not the
  provider. These three changes mean a slow statement cannot take a page down;
  none of them makes it fast. `pg_stat_statements` ordered by `max_exec_time`
  names it, and that is the fix worth having.
- **The marketing site still reads the store on every render**, uncached. The
  budget means it degrades instead of hanging, which is not the same as being
  fast.
- **Seeding still runs in a request.** It is a deployment's job.
- **`max: 1` on the pool**, still a number nobody chose on evidence.
- **Sign-in still fails closed** when the attempt log cannot be read, so a
  database wobble locks every reviewer out. Filed; it is a security judgement
  for the maintainer rather than a defect to fix unasked.

## Open questions

- **Is 1.5 seconds right?** It is long enough that a healthy primary-key read
  always wins and short enough that a reader gets a page. It is a guess refined
  by nothing, and the first real measurement should replace it.
