# 2026-08-05 (day 36) — what the throttle is absorbing, without saying who

**Build order section:** §5 — Loom Portal. The item day 35 said it would pick up
next run, and the one still-open half of your live question on #45.

**Branch:** `day-36-signin-pressure`, off `main` at `489fd98`. Second run today —
day 35 was this morning.

---

## Where this run started

One open PR, **#49**, and it is the lessons routine's, not this one's: it
corrects lesson 04 where 0038 made its stated output false. It touches no code
and is not a review comment, so it needed nothing from this run.

No maintainer feedback outstanding on #48 or #45. Your one live comment — *"tell
me more about item number 2"* — was answered in full on 4 August with options
A/B/C/D and a recommendation, and the fork it ends on is still open:

> should the portal *keep a history* of refused sign-ins, or is showing current
> lockout state enough?

Day 35 said it would build **option A regardless**, since A is right either way
and costs nothing that B would have to undo. That is this run.

## What was built

### The gap, stated exactly

A lockout is **computed, never recorded**. `assess(record, now, policy)` derives
it from a failure count and two timestamps at the moment somebody knocks. A
successful sign-in calls `forgive`, which deletes the row. A new subject's first
failure sweeps whatever has aged out. So the table holds only failures in
progress, nothing anywhere says "this caller was locked out at 14:32", and an
operator's only instrument was a psql session opened while it was happening.

### `survey` — one reading operation that may not ask about a subject

`AttemptLog` had three operations and a comment explaining why it would never
have a fourth: "a store that could be asked anything else would be a store
somebody eventually asks who has been trying". That reasoning is right about the
danger and wrong about the remedy — a seam with no query language does not
prevent the report, it prevents the *safe* one and leaves the operator in psql,
where every column is available and no rule applies.

So the fourth operation exists and is narrow. `survey(cutoff, limit)` returns
four **exact** totals over every live row — subjects, failures, earliest first
failure, latest last failure — and a capped sample of those rows, newest first,
**with their subjects removed**. Not the digest, not a count per digest, not a
stable handle standing in for one: a caller holding digests can count how often
each returns, which is a visitor log assembled one read at a time. The Postgres
statement does not select the column, so the rule is enforced by what is fetched
rather than by what a caller remembers to drop.

The rows cross the seam at all because the alternative is worse. Computing
lockouts in SQL would restate `lockoutFor` — the doubling, the ceiling, the
threshold — as a second definition of what a lockout is. `afterFailure` is
already written twice for atomicity's sake and needs a contract suite to police
it; nothing here justifies a third. `readPressure` is pure, takes `now`, and runs
the same `assess` the sign-in path runs, so the page cannot disagree with the
door.

### A capped count that says so

A survey is limited (500), and a limit can hide rows. The sample arrives newest
first, and a row whose last failure is older than `maxLockoutMs` cannot still be
serving a lockout — so when the oldest row seen is already past that horizon, the
count is **exact despite the truncation**. Otherwise `lockedIsExact` is false and
the page says "at least 500". An operator acting on "3 locked out" must not be
reading their own page size back.

### `/sign-ins`

Behind the session like every other page, in its own nav group because a lockout
is not something the runtime did — it is something this portal did to somebody
trying to reach it, and filing it beside the runtime's history would imply the
two come from one log.

It states the policy in force, because "3 locked out" is unreadable without
knowing what locks anyone. It states that counting is per address and therefore a
**floor** on what is being tried rather than a measure of it. It says when the
attempt log is memory rather than Postgres, since on a serverless host that makes
the page a report on whichever instance answered it.

There is nothing to click. An unlock button is a way to defeat the throttle from
a browser; the lever for a stuck reviewer is the key they hold, and the lever for
an attacker is in front of the app (0034).

### Found on the way: every guarded page was shipping a cached redirect

`next build` marked `/sign-ins` **static**. Its prerendered output was a `307` to
`/sign-in`, with a stale time, ready to be served to whoever asked next — because
a guarded page has no cookie at build time, `requireActor` redirects, and Next
keeps that redirect as the page.

**`/primitives` was already in exactly that state on `main`.** A signed-in
reviewer, let through by the proxy, was answered from the build with a redirect
to sign in. The pages that escaped escaped by accident: `/activity`, `/audit`,
`/calibration` and `/history` read `searchParams`, which is a dynamic API.

Fixed for the whole segment — `export const dynamic = "force-dynamic"` in the
root layout — rather than per page, because a page whose correctness depends on
which query parameters it happens to accept breaks the day it stops accepting
one. Every route now builds as `ƒ`. There is a test on it, since the failure is
invisible in `pnpm dev`.

## Decisions I made that were not specified

**The totals are exact and only the sample is capped.** A page reporting "2
subjects" after fetching one row would be reading its own page size. It costs a
second statement and it is the difference between a number and an impression.

**`survey` does not sweep.** `recall` drops stale records as it reads them; a
survey that did the same would make the table's contents depend on how often
somebody looked at it. A report is not a reason to forget anything.

**Elapsed times round down, waits round up.** `describeWait` already rounds a
remaining wait up, because a wait reported as elapsed invites a retry that is
refused again. `describeSince` rounds down, because a failure reported as older
than it is makes a burst look finished. Each is wrong in the direction that does
not mislead.

**The read error shows its detail here and not on the sign-in form.** The
difference is who is reading: a visitor learns nothing about what is behind this
portal, and a reviewer who has already signed in is the person who has to fix it.

**`/sign-ins` is one character from the one public route.** `isPublicPath`
already matched on segment boundaries, so it was safe on arrival — and the real
neighbour is now named in a test rather than left to a generic case about
`/sign-inbox`.

**Third nav group rather than a sixth item in the second.** Stated above; the
grouping is the claim that these come from different logs.

## Decision records

Added **0039 — The attempt log is counted, never enumerated** (§5). Nothing
superseded. It does not contradict a standing record: 0023 keeps sign-ins out of
telemetry and this reads the portal's own table instead, which is what 0018 says
the split is for. It supersedes a *comment* in `attempts.ts`, not a record, and
the comment now says why the fourth operation is safe.

The record also bounds the work it did not do: if option B is ever built, a
history table may hold counts, times and verdicts — never a subject, and never
anything that stands in for one.

## Test coverage and status

`pnpm verify` green end to end: build, typecheck, both suites, portal build.

- **Runtime: 886 tests / 74 files — all 886 passing, nothing skipped.** The live
  API smoke test **ran against the real API and passed** (6.3s). Yesterday's
  provider 529s have cleared; the skip-on-429/5xx guard day 35 added did not
  fire, which is what it was built for.
- **Portal: 272 tests / 26 files** — up from 227 / 24. Forty-five new tests, two
  new files (`pressure.test.ts`, `signin-view.test.ts`).

What they hold down:

- **The seam, against both implementations** (nine cases, run twice — Postgres
  computes its totals in SQL and memory in JavaScript, and nothing else makes
  them agree): an empty log reports nulls rather than zeroes for its dates;
  subjects and failures are counted separately; the span runs from the earliest
  first failure to the latest last one; a record past the cutoff is out of the
  totals as well as out of the sample; a forgiven subject is gone; records come
  back newest first; a cap limits the sample and not the totals; a cap keeps the
  newest; each record carries its own count.
- **Postgres specifically:** a survey against a dropped table reports failure
  rather than an empty result, and `count`/`sum`/`max` arrive as numbers rather
  than as the strings a `bigint` aggregate is handed over as.
- **The arithmetic:** totals pass through rather than being recomputed from a
  capped sample; nobody under the threshold is locked; a caller past it with time
  left is; a served-out lockout is not; the longest wait is the longest and not
  the first seen; and the four cap cases — nothing dropped, dropped but past the
  horizon, dropped and still lockable, and totals with no sample at all.
- **The wording:** rounding in both directions, singular and plural for one
  caller and two, a floor rendered as "at least", the recency clause omitted when
  there is no date, three distinct tones, and the policy sentence containing the
  four numbers a reader would otherwise go to the source for.
- **The routes:** `/sign-ins` is not public though it sits one character from the
  route that is, and the root layout declares per-request rendering.

**Nothing weakened, nothing skipped.**

## Open questions and blockers for the next session

1. **Your fork on #45 is still open, and A is now built.** Should the portal keep
   a **history** of refused sign-ins (option B — a portal-owned audit table, a
   migration, a retention rule), or is current state enough? **Recommendation:
   not yet.** A answers "is this happening now", which is the operational
   question; B answers "did it happen overnight", which is a governance decision
   about retaining failed attempts against a public form. If you want B, say so
   and 0039 already fixes what it may hold.
2. **Still nothing schedules anything** — not the telemetry prune (day 34), not
   the snapshot audit (day 28), and now not this page either: a burst that ended
   before anyone looked has aged out and is gone. **Recommendation: one nightly
   cron** covering the prune and the audit. This page is deliberately not on that
   list — a current-state reader has nothing to schedule; if you want overnight
   coverage, that is option B above.
3. **A 400 and a 529 are the same error to the runtime** (day 35, unanswered).
   `ModelClientError.unavailable` means "ask again later" and
   `anthropicModelClient` puts every thrown SDK error into it.
   **Recommendation: split it in the next §2 unit** — a `rejected` case beside
   `unavailable`.
4. **ARCHITECTURAL, from day 35, still yours: should a tree carry the ids it has
   retired?** Unchanged. **Recommendation: not yet**; the audit finds a recycling
   after the fact and the runtime's own minting cannot produce one.
5. **The prerender defect deserves one look from you.** I fixed it for the whole
   segment because it was breaking the page I was shipping and had already
   shipped `/primitives` broken. If you would rather each page declared its own
   rendering, that is a one-line move per page and I will make it.
6. **Carried, unchanged:** RLS fails closed for a non-owner role (day 34, by
   design); the portal has no component test harness (day 26) — `/sign-ins` is
   tested through its two pure modules and not through its markup, which is the
   same limitation `/audit` has; a missed `db:push` is still a sign-in outage
   (day 32); `policyId` is a name rather than a fingerprint (day 31); calibration
   does not segment by policy (day 31); the reply schema sits near its 3500-byte
   guard; there is no node-level provenance; and the README's layout tree still
   stops at `store/`.

**No model id changed.** The interpreter still defaults to `claude-opus-5`;
nothing in this unit calls a model, and everything it computes is deterministic.

**§7 — Marketplace — remains the only section I will not start without you saying
so.** Sections 1–6 are functional end to end; what is left in each is the list
above.
