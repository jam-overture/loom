# The promise that never cleared

**Date:** 2026-10-13
**Section:** §3 (portal)
**Branch:** `seeding-cannot-hold-a-page-hostage`

## What the evidence said

`/portal` hung. The maintainer's network panel is the thing that located it:

```
sign-in?from=%2Fportal   303   1.48 s
?_rsc=…                  200   126–140 ms
```

**A 303 from the sign-in action only happens on success** — `redirect()` fired.
So the key was accepted, the roster was read, and the attempt log — a database
read — answered in under a second and a half. The database was reachable and
responsive. The browser then followed that redirect to `/portal`, and that is
what never came back.

Sign-in does not seed. The portal does.

## The cause

```ts
carrier[SEEDING_KEY] ??= (async () => { … })()
await carrier[SEEDING_KEY]
```

The memoised promise is stored once and **never cleared**, which is correct
while it resolves and is a trap when it does not:

- **A hung promise hangs everything behind it.** One stuck query on the first
  request to reach an instance poisons that instance: every later request awaits
  the same pending promise, forever, long after the database recovers, until the
  instance is recycled.
- **A rejected promise rejects forever.** `??=` keeps it, so a transient failure
  on the first request becomes a permanent one for the life of the process.

[#615](https://github.com/jam-overture/loom/pull/615) removed the writes that
made a stall likely. It did not touch the structure that turns one stall into a
dead instance, which is why the portal was still hanging after it shipped.

## The fix

**A seed gets a budget.** `waitForSeeding` races the work against two seconds —
long enough that a healthy seed always wins, since on a warm instance it is six
primary-key `SELECT`s, and short enough that somebody is looking at a screen
rather than at a spinner.

Past the budget the page renders anyway, from a store that may not be seeded
yet. **A screen saying *nothing here* beats a screen that never arrives**, and
the seeding is not cancelled — it finishes in the background and the next
request finds its rows.

**A failed seed is forgotten**, so the next request tries again instead of
inheriting a rejected promise. A seed that is merely still going is kept:
it is doing the work, and starting a second would be two.

## What this is not

It is not a claim that the database was healthy. Supabase was showing *"We are
investigating multiple technical issues"* and the maintainer's Postgres log pane
was empty for sixty minutes, so some of what happened yesterday is theirs and
cannot be seen from here.

What is this repository's, and provable from the code, is that **one bad minute
at the database becomes a permanently dead instance**. That is true whoever
caused the bad minute, and it is what this changes.

## Also found, not fixed here

**Sign-in fails closed when the attempt log cannot be read.** `attemptSignIn`
reads `loom_signin_attempts` *before* comparing the key, and returns
`unavailable` if that read fails — so a database wobble locks every reviewer out
of the portal, including out of the screen they would use to find out why. The
author reasoned about exactly this hazard three lines further down, for the
success path: *"refusing them because a row could not be deleted would turn a
housekeeping error into a lockout"*. The same hazard sits on the read and was
not noticed, because there it is not housekeeping — it is the throttle's input.

Whether to fail open on `unavailable` is a security judgement about the
maintainer's product, not a defect to fix unasked. It is filed.

## Tests

`pnpm verify` green: **217 files / 4856** framework tests, **438 files / 8359**
application tests (+4), 133 prerendered pages 0 run together.

Four tests on the budget, including the one that matters: a seed that never
finishes is given up on rather than waited for. A rejected seed does not throw
at the page.

## Open questions

- **Seeding still runs in a request.** It is a deployment's job. This makes it
  unable to hold a page hostage, which is not the same as it not being there.
- **`max: 1` on the pool.** One slow query still blocks every other thing an
  instance wanted. The number should be chosen on evidence.
- **The marketing site is dynamic and uncached**, and every render reads the
  store. Still the largest latency item once this is through.
