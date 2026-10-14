# Six round trips to learn nothing

**Date:** 2026-10-13
**Section:** §3 (portal)
**Branch:** `seeding-is-not-a-requests-work`

## What was asked

The maintainer, with a screenshot of *Your applications*: **"Still errors."**

The screenshot is the fix from [#621](https://github.com/jam-overture/loom/pull/621)
working exactly as designed — a styled notice instead of a five-minute 504 —
and it is still a portal that will not show somebody their applications. It
also contains the diagnosis, which nothing before it did.

## What the screenshot says

> the application store is unavailable: the store did not answer within 1500ms

Two facts are hiding in that sentence.

**The projects read succeeded.** The screen asks for both on one line:

```ts
const [projects, applications] = await Promise.all([
  portalProjects.list(),
  portalApplications.list(),
])
```

and its failure branch tests `projects` first. The message names the
*application* store, so the projects read came back inside the budget and the
applications read did not. Two reads issued in the same instant, one query
apart in the queue, on opposite sides of 1500ms. **A store that could not be
reached would have failed the first one.**

**Nothing of ours is slow.** `pg_stat_statements` on this database, ordered by
`max_exec_time` and run twice: the slowest statement this repository issues
anywhere is `ALTER TABLE loom_trees ENABLE ROW LEVEL SECURITY` at **31ms**, and
that is DDL from `db:push`. `head`, `list` and `forTree` do not appear.

So the time is not in the query. It is in front of it.

## What was in front of it

`max: 1`. One connection per instance, so every query on that instance is one
round trip after the last.

A `/portal` request began with `ensureSeeded()`, which is **six** of them: the
demonstration page, the site's three pages, the default project, the default
application. On a deployment seeded weeks ago all six answer *already there*.
Six round trips to learn nothing — and they are not even finished when the
screen's own reads are issued, because `ensureSeeded` gives up waiting at two
seconds and lets the page proceed while the queries are still in flight.

So the two reads the screen is actually for were queued behind the tail of a
seed that had already been told it could stop mattering. The budget started
when they were issued; the connection was busy; one made it and one did not.

A budget cannot fix a queue. The only thing that does is not joining it.

## What this changes

**Seeding is `db:push`'s work.** It was already the only way this deployment
gets its tables, and `db-push.ts` already said why: *a migration that runs
implicitly is a migration nobody decided to run.* Rows are the same case. The
twelve screens and the marketing read that called it no longer do, and
`db:push` calls `seedDeployment()` after the schema.

A marketing request now makes **one** store call. It made four.

**Two budgets, because the two surfaces are not in the same situation.** The
site falls back to the page it was authored as, so waiting longer buys it
almost nothing: it keeps 1.5 seconds. The portal falls back to a sentence, so
waiting is worth something there: it gets 5 seconds, roughly half a serverless
function's default ceiling, leaving room to render the answer either way.

1500ms was never argued for against a cold connection. A serverless instance
opens a TLS connection to the pooler and authenticates before its first query,
and that is most of the 1.48 seconds a sign-in round trip took on 12 October —
a round trip whose database work was two primary-key lookups. **A budget
shorter than a cold connection reports an outage every time an instance is
new.**

## Proved, not asserted

The claim is a number, so the test is a number. With seeding put back into the
marketing read:

```
× what one request costs > reaches the database once, and writes nothing
  → expected { reads: 4, writes: +0 } to deeply equal { reads: 1, writes: +0 }
```

Four is the old shape exactly: three seeding reads, then the page. Nothing here
asserts *how fast* — that depends on a network this suite does not have — only
that a request asks the store for the page it is serving and for nothing else.

Two tests had to move, and both would otherwise have passed while asserting
nothing. `stored.test.ts` spied on `appStore.head` to make the store refuse;
the marketing surface reads through `siteStore` now, so the spy would not have
fired and the fallback would have been checked against a store that answered
normally — it failed loudly, which is why it is mentioned here rather than
discovered later. `store.test.ts` calls `seedDeployment()` the way the script
does, instead of resetting a memo that no longer exists.

## The trap moving it there set, and how it was caught

`db:push` is a script, and a script's static imports are evaluated **before its
first statement runs** — including `loadEnvConfig`, which is what puts
`DATABASE_URL` from `.env.local` into the environment in the first place.

`app/_lib/app/database.ts` resolves the connection string at module scope. So a
plain `import { seedDeployment } from "../app/(portal)/_lib/store"` at the top
of `db-push.ts` would have read the environment before the environment existed,
found nothing, and fallen back to the memory store. `seedDeployment()` would
have written this deployment's pages into a `Map`, the script would have
printed that everything was present, and the portal would have come up empty
with nothing anywhere saying why.

That is the same silhouette as the `db:push` bug from 12 October — a step that
ran, succeeded, and did nothing — so it is guarded twice. The import is
dynamic, after `loadEnvConfig`; and the script refuses to seed at all when the
app's store is not durable.

Both halves were run rather than reasoned about. With a `DATABASE_URL` reachable
only through `.env.local` and the import made static again:

```
loom: db:push resolved the schema's connection string but the app's store fell
back to memory, which means seeding would write to a Map and vanish. Nothing
has been seeded.
```

With the dynamic import, the same invocation gets past the guard and fails
where it should — `ECONNREFUSED` on the first `CREATE TABLE`, against the
unreachable host the test pointed it at.

## What this does not fix

The cold connection itself. If a first query still costs the better part of a
second, every cold instance pays it; this change stops *multiplying* that by
seven and gives the portal room to absorb it, but the floor is the floor.

The two levers left are both outside this repository: whether `DATABASE_URL`
points at the transaction pooler (`…pooler.supabase.com:6543`) rather than a
direct connection, and whether the function and the database are in the same
region. Worth checking in that order before anybody changes another number
here.
