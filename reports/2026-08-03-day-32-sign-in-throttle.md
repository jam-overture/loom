# 2026-08-03 (day 32) — a sign-in that cannot be counted is refused

**Build order section:** §5 — Loom Portal. The last open item in 0027, and the
oldest tracked gap in the repository.

**Branch:** `day-32-sign-in-throttle`, off `day-31-policy-seam` (PR #42)

---

## Where this run started

No review comments on #42 — the only two comments on it are Vercel's bot and the
previous run's own report. So nothing to act on, and the next thing in the build
order rather than a reply.

Three runs ago 0027 shipped identity with this in its own consequences:

> **There is no rate limit on sign-in.** The key is long and compared in constant
> time, but nothing slows down an attacker guessing.

It has been listed as open in every report since. It is a §5 gap, and §7 is the
only section after it, so there was nothing later to be getting on with instead.

## What was built

A sign-in throttle, in five files that each do one thing.

- **`throttle.ts`** — the arithmetic, and no clock, no storage, no request. Five
  failures inside an hour, and the sixth is refused for a minute, doubling to a
  quarter of an hour and forgotten after an hour of silence.
- **`subject.ts`** — who an attempt is counted against. Reads the forwarded-for
  list *from the right* by a configured hop count, then stores an HMAC of what it
  found rather than the address itself.
- **`attempts.ts`** — the `AttemptLog` seam and the memory implementation.
- **`attempts-postgres.ts`** — the durable one, plus the portal's first table of
  its own.
- **`attempt-sign-in.ts`** — the order of operations, which is the part with
  security consequences and therefore the part that had to be testable.

`identity.ts` now assembles those four things and mints a cookie if the answer is
yes. It decides nothing itself.

## The four decisions inside it

Recorded properly in **0034**; the short version, because they are the run.

**An attempt that cannot be counted is refused.** This is 0027's own argument one
layer down: it made absent identity configuration fail closed because a portal
that degrades to open access looks exactly like one that is working. A throttle
that stops counting when its store is unreachable degrades to precisely that.

**The log is asked before the key is compared.** A lockout has to take away the
oracle, not only the throughput — otherwise the roster keeps answering the
question the caller came to ask, and the lockout costs them time alone.

**The subject is a keyed digest, not an address.** The throttle needs to
recognise a caller, not locate one, and a table of addresses beside a public form
is a visitor log nobody asked this portal to keep. Keyed rather than hashed
because the IPv4 space is four bytes wide, so an unkeyed digest of an address is
a reversible encoding of it.

**There is no global cap.** The obvious backstop against a caller who rotates
addresses is a deployment-wide ceiling — and it has to be checked before the key
is compared, which makes it a lockout of every reviewer that any anonymous caller
can trigger with a loop. That trade is worse than the hole it fills. The record
says so, and says where the defence actually belongs: in front of the app, not
inside the request it is trying to refuse.

## Decisions I made that were not specified

**The table belongs to the portal, not to `@loom/runtime`.** `loom_signin_attempts`,
its DDL and its Drizzle schema all live in `apps/portal`. The runtime takes an
actor on an intent and has never asked how a host established one; shipping a
sign-in attempts table from the framework would be it asserting that its
consumers authenticate people. This is the first table the portal owns, and that
is the shape 0018 says a consumer should have.

**One statement, not a transaction.** `penalise` is a single
`INSERT … ON CONFLICT DO UPDATE … RETURNING`. A read-then-write passes every
obvious test and loses to eight concurrent requests, which is a `for` loop away
from being the first thing an attacker tries. The cost is that the "reset if
stale" rule is written twice — once in `afterFailure`, once as SQL `CASE`
expressions — and the contract suite runs against both implementations so a
disagreement fails a test rather than becoming a throttle that behaves
differently in production than in development.

**`forgetBefore` takes the policy and the clock but not the record.** That is
what lets the same cutoff be handed to a SQL statement as a parameter: the
database compares one column to one number and every rule about what staleness
means stays in TypeScript. It reaches back past the longest possible lockout as
well as past the window, so a subject cannot be forgotten while still serving
one.

**The table cannot outgrow the window.** A new subject's first failure sweeps
everything already forgotten — which is exactly the request an address-rotating
caller sends, so the sweep runs when it is needed and not otherwise. Without it,
an endpoint reachable with no session would be an unbounded write. The subject's
own row is excluded from the delete so it cannot race the upsert that just wrote
it.

**The unavailable message names `db:push`.** It is fixed text with nothing from
the database in it. An operator who deploys this without re-running the migration
locks their whole roster out, and a bare "try again shortly" would leave them
with no thread to pull. It is the same trade the sign-in page already makes when
it names a missing environment variable.

## A defect the tests found

`assess` computed `lastFailureAt + lockout` and compared it to now, which reads
correctly until the lockout owed is zero: then the boundary is `lastFailureAt`
itself, and a record whose last failure is *ahead* of the clock — two instances
disagreeing by a second is enough — locked a caller who owed nothing. It answers
`allowed` before the arithmetic now, and the case that caught it is in
`throttle.test.ts`.

## Decision records

Added **0034 — A sign-in that cannot be counted is refused** (§5). Nothing
superseded: 0027 named this gap in its own consequences and left it open, so this
fills it in rather than replacing anything. Index regenerated with
`pnpm decisions:index`.

## Test coverage and status

`pnpm verify` green end to end: typecheck, compiled build, both suites, Turbopack
production build.

- **Runtime: 769 tests / 72 files** — unchanged. Nothing in `src/` moved.
- **Portal: 217 tests / 24 files** — up from 135 / 18. Eighty-two new tests, six
  new files.

What they hold down, rather than which file they are in:

- The arithmetic: nothing owed below the threshold, the base wait at it, doubling
  after it, a ceiling that a thousand failures cannot exceed, and a record that
  survives the lockout it imposed so the next failure escalates instead of
  starting over.
- A subject still serving a lockout longer than the window is not forgotten.
- The forwarded-for reading ignores entries a caller could have written
  themselves, and a malformed hop count falls back to one — the safe direction.
- The digest is stable, differs per address, differs per deployment, and does not
  contain the address it stands for.
- **The `AttemptLog` contract suite runs against both implementations**, memory
  and PGlite. Eleven cases each, including eight concurrent failures for one
  subject counting to eight — the test a read-then-write implementation fails and
  every other test in the suite passes.
- Postgres specifics: one row per subject however many attempts, the sweep firing
  on a new subject and not on a returning one, a dropped table reported rather
  than thrown, and a stored row that no longer makes sense refused rather than
  acted on.
- The order of operations: a locked-out caller's key is never compared, a correct
  key is refused during a lockout, a correct key clears the count, and one
  subject's failures are counted against nobody else.
- Fail-closed: a log that cannot answer refuses the attempt and does not compare
  the key first; a log that cannot *record* refuses too; a log that cannot
  *forget* still signs in a valid key.
- A repository guard, in the shape of `guarded-pages.test.ts`: the roster
  comparison appears in exactly one file outside its own definition, and that
  file hands it to `attemptSignIn` rather than calling it directly. A second
  sign-in path added later fails this rather than shipping unthrottled.

The PGlite suite adds roughly ninety seconds to the portal run. That is the same
bargain the runtime's Postgres suites already make, and the `ON CONFLICT` is
doing the work that makes the throttle countable under concurrency — a fake would
prove nothing about it.

**Nothing skipped, nothing weakened.** `signIn` and the sign-in form are the two
pieces without direct tests: both are Next-coupled, and everything they decide
was moved out of them into `attemptSignIn` for exactly that reason. The guard
test above is what stops that arrangement quietly coming apart.

## Open questions and blockers for the next session

1. **A missed `db:push` is now a sign-in outage.** Failing closed means a
   deployment with a database but no `loom_signin_attempts` table admits nobody
   until the migration runs. Documented in `docs/deployment.md`, recoverable in
   one command, and the deliberate price of the decision — but it is the first
   time this portal can be locked out by a step nobody took, and worth a
   maintainer's eye.

2. **Nothing surfaces a lockout to an operator.** A refused sign-in is not a
   runtime event, so 0023 keeps it out of telemetry, and there is no other place
   this portal reports anything. "Somebody has been trying keys against your
   deployment" is currently unobservable. Deliberately unbuilt rather than
   forgotten — a second event stream is a bigger decision than this run should
   make on its own.

3. **`policyId` is still a name, not a fingerprint** (from day 31, unanswered).
   Recommendation unchanged: wait for evidence of real drift.

4. **Calibration still does not segment by policy** (from day 31, unanswered).
   Recommendation unchanged: leave it to consumers, per 0031.

5. **#42 and #41 are both unreviewed**, and this branch stacks on #42. If either
   needs changes, this diff moves with them.
