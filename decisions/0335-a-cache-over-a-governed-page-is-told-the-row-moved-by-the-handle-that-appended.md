# 0335. A cache over a governed page is told the row moved, by the handle that appended

**Status:** Accepted
**Date:** 2026-11-02
**Section:** §5, §3

## Context

The maintainer, on 31 October 2026:

> *"Also, the performance across the site is pretty slow. Lets make sure to
> prioritize improving the performance. For example, just switching to 'Why
> use it' takes several seconds."*

`Loom marketing` measured it and split it in two. The large half is 2.4MB of
library stylesheet serialised once per primitive into the flight payload, which
is `src/primitives/`' and is filed for that lane. The small half is the server
time:

> Every marketing request makes one query — `siteStore.head` for the page's row
> — and renders the tree. ~100ms per request, on a pool where every query waits
> for the last.

[0259](0259-a-surface-the-portal-governs-renders-from-the-store-and-a-page-built-at-render-time-is-not-one.md)
is why the query exists: those pages are rows the portal governs, their builders
are the seed, and a change somebody accepts is a new revision the next reader is
meant to get.
[0331](0331-a-marketing-page-is-served-per-request-because-the-store-governs-it.md)
then refused to make the query disappear by freezing the row, and named the one
door it was leaving open:

> Caching a governed page per request — `revalidate`, a tag, a short TTL — is
> the thing that would recover the ~100ms **without** freezing the row, and it
> is not decided here. It needs the portal to invalidate on append, which spans
> two lanes, and it is filed rather than guessed at.

The finding filed beside it supplied the sentence this record is built on:
**what makes a cache correct here is invalidation on append**. What it could
not supply is anywhere for that to live, because the reader and the writer are
in different route groups and no lane may edit both.

## Decision

**The runtime publishes the two halves of being told, and neither of them knows
what a cache is.** `src/store/cache.ts`:

- **`treeCacheTag(treeId)`** — the tag a cached reading of one tree carries,
  derived rather than written down. A reader and a writer in different route
  groups, or in different applications, compute it the same way from the same
  fact, so there is no second spelling to get wrong.
- **`cachingTreeStore(store, cache)`** — a handle whose `head` is answered
  through a read-through seam the host supplies, and whose every other method
  is the store's.
- **`invalidatingTreeStore(store, invalidate)`** — a handle that expires the
  tree's tag once an append is history.

A host hands in a read-through and a way to expire a tag. What sits behind them
— Next.js' data cache, a Redis, nothing at all — never reaches the package.

### What makes it correct rather than merely fast

**There is no window.** Nothing here takes a duration. An entry leaves because
the row moved, so no reader is ever served a previous revision because a clock
had not run out — which is the defect every TTL has and the reason 0331 refused
one.

**A refusal is never remembered.** `not-found` is what an unseeded page answers
and `unavailable` is what a store that did not respond answers; remembering
either would be a surface serving its authored fallback until something appended
to a row that does not exist. The seam states it as an obligation on the host —
*a rejecting loader is not remembered* — because rejection is the only decline a
read-through cache can express: by the time there is a value to judge, the cache
has already been asked for it.

**A cached tree is parsed, not asserted.** The value has been somewhere, at
minimum through JSON. One that does not parse is refused as `unavailable` in the
same words the Postgres store refuses a row it cannot read back, so a screen
that draws one draws the other.

**The invalidation sits on the handle that appends, not on the places that
compose a change.** What a cache has to be told is *this row is not what it was*,
and that is true of an accepted change, a confirmation, a revert
([0268](0268-a-page-is-put-back-by-proposing-the-change-that-puts-it-back-and-a-store-never-deletes.md)),
a reseed ([0272](0272-who-presses-a-reseed-is-the-gate-s-question-and-the-answer-is-what-the-reseed-costs.md))
and a host's own migration alike. Wrapping the store catches the category;
listening to the runtime's event stream would catch whichever members of it
happen to be proposed.

**`head` alone is cached.** It is the read a visitor waits for, and the cost of
being wrong about it is bounded by a tag naming exactly the tree it read.
`revisions` is a history screen, where somebody asking what happened is owed the
answer as it is now. `list` spans trees, so no tag derived from a tree id could
clear it correctly, and a page list missing a page somebody has since added is a
worse screen than a slow one.

**`create` is not an invalidation.** Nothing cached can be wrong about a tree
that has just come into existence, because a refusal is never remembered — so an
absent page stays absent for exactly as long as it is absent.

## Consequences

- **This deployment does not cache yet, and that is deliberate.** Switching it
  on requires every handle that can append to a tree to be the invalidating one,
  and on this deployment one of them is not: `(portal)/_lib/write.ts` builds its
  own `postgresTreeStore(portalDatabase, { application })` per application and
  appends through it, so a change accepted in the portal would not expire the
  entry a marketing request is holding. `Loom portal` is paused, that file is
  its lane, and a cache that is wrong for the one case 0259 is about is worse
  than the ~100ms. It is filed with the two lines it needs.
- The partial wiring was built and taken out again rather than shipped. The
  app's own writing handle — `appStoreForWriting` — has no `append` caller at
  all today; it is `head` and `create` for seeding. Wrapping it would have
  announced nothing to nobody and read as though the deployment were covered.
- **Nothing is asked of `Loom marketing`.** The handle that surface reads
  through is declared in the shell, so when the portal's half lands the cache
  goes on one line there and no route, layout or page of that surface changes.
  Every route keeps the `force-dynamic` 0331 requires; what is recovered is the
  query, not the render.
- A host embedding Loom gets the arrangement without writing it, which is the
  half of this that is not about one deployment.
- The portal's own handle would not be cached even then. Its screens make
  several queries each and recovering those is worth doing, but an operator
  asking what a page is at is the one reader who should see the row; if that
  changes it is a separate record, and the tag it would need already exists.

## Alternatives considered

**Prerender the pages.** Rejected by 0331 and for its reason: the portal would
go on governing a page nobody is served.

**`revalidate`, a short TTL, or a tag expiry with a stale-while-revalidate
profile.** Rejected. Each serves a row that is up to the window stale, which is
prerendering with a smaller number on it. The last is the subtle one: it hands
the reader *after* an append the revision *before* it, which is exactly the
reader the invalidation exists for.

**Cache the rendered page rather than the read.** Rejected, and it is the
tempting one, because it would recover the render as well as the query. It
cannot be reconciled with what else a marketing request reads: the palette and
the served origin are per-request facts, so the cached unit would have to be
keyed by them or lose them — and 0331's whole argument is that a route whose
dynamism is an arrangement rather than a declaration is one edit from frozen.
The query is what was measured; the render was not.

**Listen for `change-committed` on the runtime's event stream.** Rejected as the
mechanism, though it would work for every change that goes through a
composition. An append is the category that matters and the stream carries a
subset of it, so a revert or a migration would invalidate nothing and nothing
would say so. The stream stays what it is for, which is telling §6 what
happened.

**A process-wide announcer the package holds, so that a store built anywhere
invalidates without being handed anything.** Rejected, and it is the only one
that would have let this deployment cache today without another lane's edit.
Every side effect in this package enters through a seam — the clock, the ids,
the event sink — and ambient state that a published `postgresTreeStore` reads
from a module variable is the opposite of that. It would also hide the thing
worth seeing, which is *which handles announce*. If it is ever wanted it is an
architectural question and deserves its own record.

**Hang the announcer on the `LoomDatabase` handle, which the shell builds and
every store on this deployment is handed.** Rejected on the same grounds plus a
worse one: `LoomDatabase` is the narrowest Drizzle type two drivers share, and
widening it into a wrapper would reach every Postgres store, the migration, the
PGlite harnesses and two other lanes' journals — a large change to a database
seam in order to carry a cache concern.

**Ship the application wiring half-done and file the gap.** Rejected. A cache
that is correct for seeding and silently wrong for the portal is the failure
0259 names arriving by a third door, and it would be discovered by a reader
being served last week's page rather than by a test.
