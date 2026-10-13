# The screens #617 missed

**Date:** 2026-10-13
**Section:** §3 (portal)
**Branch:** `the-screens-617-missed`

## What was asked

To find the slow statement. The maintainer ran `pg_stat_statements` ordered by
`max_exec_time`, twice. **Nothing of ours is in it.** The slowest statement in
the whole database is `SELECT name FROM pg_timezone_names` at 1069ms — Supabase
Studio's own — and the slowest statement this repository issues is
`ALTER TABLE loom_trees ENABLE ROW LEVEL SECURITY` at **31ms**, which is DDL
from `db:push` and not in any request path. `head`, `list` and `forTree` do not
appear at all.

So the hunt ended, and the audit it was paired with ended the same way: there
is no slow query here to find. What there was instead is below.

## What this fixes

[#617](https://github.com/jam-overture/loom/pull/617) gave the store a budget,
so that a database which does not answer degrades instead of hanging. It
applied that budget at **three call sites**: the marketing read, the seeding
wait, and `/portal`.

**Nineteen screens in this portal read something.** #617 fixed one of them.

The other eighteen — the page list, the history, both checkups, all three page
inspectors, `/portal/app`, `/portal/[application]`, `/portal/activity`, both
rules screens, `/portal/trust`, `/portal/readers`, `/portal/pieces`,
`/portal/sign-ins` and two tree choosers — still awaited with no budget, which
is the 504 the maintainer hit, unchanged. Every one of them already had a
written, styled, tested branch saying *we couldn't load this — nothing has been
lost, listing only reads*. Not one of them could reach it, because reaching it
requires the store to **answer**.

**So the budget moves from the call site to the handle.** Seven handles are now
composed through a wrapper — the tree store, the holds, the projects, the
applications, the telemetry journal, the reader-signal buffer and its rollups,
plus the sign-in throttle — and each wrapper races a read against 1.5 seconds
and reports running out as `{ code: "unavailable", detail: "the store did not
answer within 1500ms" }`. Every one of those seven taxonomies already has an
`unavailable` member, and `describeStoreError` and its siblings already turn it
into a sentence.

That is why eighteen screens are fixed here without one of them changing. The
state was always drawable. What was missing was anything that put them in it.

The count is worth dwelling on, because the first pass of this change got it
wrong. It fixed the tree store and the holds, declared the portal covered, and
left six screens reading a telemetry journal that could still hang. The handles
were then found by listing every `await <handle>.<method>(` in the route groups
rather than from memory. *Which screens have I fixed* is the wrong question and
it is answerable incorrectly; *which handles exist* is the right one.

It is the same reasoning `postgres.ts` gives for the application scope — *every
read starts here, so a query cannot forget the project by omission* — applied
to the thing that actually went wrong. A rule written at a call site is a rule
the next call site has never heard of.

## Writes are deliberately not bounded

A read that gives up has cost nothing: the row is still the row. **A write that
gives up has an unknown outcome** — the statement may land a moment later — and
a caller told `unavailable` would be entitled to retry something that has
already happened.

So `create`, `append`, `hold`, `release`, `rename`, `record`, `receive`,
`opened`, `apply`, `forget`, `penalise` and `forgive` pass straight through, and
the write path takes its handles unbounded (`appStoreForWriting`,
`holdsForWriting`, `telemetryForWriting`, `readerSignalsForWriting`,
`readerTalliesForWriting`). Cutting off a `get` *inside* a `release` would tell
a reviewer their change was not held when it was, which is the one sentence on
that screen that must never be wrong; giving up on `penalise` would silently
stop counting sign-in failures, which is the one thing that table exists to do.

## The trap this nearly walked into

A seed asks `head` before it writes. That is #615, and it is why a request no
longer inserts blindly into `loom_trees`.

Hand that seed a **bounded** handle and a slow store makes the question answer
`unavailable`. The old test was `if (existing.ok) return` — so `unavailable`
falls through to `create`, and the blind `INSERT` is back in the request path on
exactly the slow database that made it fatal on 12 October.

Two things stop that:

- `absent(result)` is now the question, and it is true only for `not-found`.
  A store that **did not say** is not a store to write to.
- Seeding takes the unbounded handles. Bounded, a slow read would make the seed
  decline to write **and then finish** — so `waitForSeeding` would record it as
  done, and the deployment would never seed at all. Unbounded, the seed is cut
  off by its own budget one level up, which reports *still going*, keeps the
  promise, and lets the work land in the background.

Neither of those is a hypothetical: the first is a regression of a bug from
twelve hours ago, and the second was written wrong and then corrected while
writing the doc comment that explains it.

## Proved, not asserted

`silent-store.test.ts` asks the one question that covers all eleven screens —
*does the handle they read through answer at all* — rather than eleven
questions and a twelfth screen tomorrow that nobody writes one for.

It asks it of all seven handles, including the sign-in throttle — which is the
one that is not a screen. `attempt-sign-in.ts` reads the log **before**
comparing the key, on a form anyone on the internet can reach, so a log that did
not answer was a sign-in button that never came back. It still fails *closed*,
which is a policy question filed for the maintainer rather than one to settle
inside a timeout wrapper; what changes is that it fails at all.

With the budget taken off the handle:

```
× refuses a silent tree store instead of hanging on it
  → Test timed out in 20000ms
× refuses a silent project store, which is what the workspace screen lists
  → Test timed out in 20000ms
```

That timeout *is* the production failure: an await that never returns.
Restored, all three pass in 1.5 seconds each.

One existing test had to move with the change, and it is worth naming because
it was passing for the wrong reason. `store.test.ts` asserted *seeding writes
nothing the second time* by spying on `portalStore.create` — which is now the
wrapper, a different function object from the one the seed calls. The spy would
never have fired and the assertion would have held vacuously. It spies on
`appStoreForWriting.create` now.

`store-hangs.test.ts` moved for the same reason in the other direction: it
injected the hang *at* `appStore.head`, which now replaces the budget with the
thing the budget exists to contain. It injects under the handle instead, so
what it tests is the wrapper rather than a `within` that is no longer there.

## What is still true after this

A slow database should now mean: the marketing site serves its authored pages,
and **every** portal screen says it could not reach the store. Not a 504.

What is not claimed is that the budget is the right number. 1.5 seconds is
#617's, chosen because a healthy read is a primary-key lookup in single-digit
milliseconds — and after today's `pg_stat_statements`, the slowest statement
this repository issues anywhere is 31ms of DDL, so there is now evidence for it
rather than only an argument.

What none of this does is make a statement faster, and after today's
`pg_stat_statements` there is no longer any reason to think one needs to be.
The `57014` at 03:26:40 UTC arrived after #615 and #616 were both live and
before #617 was, with Supabase recovering from an acknowledged incident. On the
evidence, the database was unable to serve rather than asked to do too much —
which is the case this change is for.
