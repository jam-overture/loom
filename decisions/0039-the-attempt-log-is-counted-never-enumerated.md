# 0039. The attempt log is counted, never enumerated

**Status:** Accepted
**Date:** 2026-08-05
**Section:** §5

## Context

Day 32 shipped the sign-in throttle and left a gap it named in its own report: a
lockout is *computed*. `assess(record, now, policy)` derives it from a failure
count and two timestamps at the moment somebody knocks, and nothing anywhere
records that it happened. A successful sign-in calls `forgive`, which deletes the
row, so the table only ever holds failures in progress — and a new subject's
first failure sweeps everything already forgotten, so a burst that ended an hour
ago has been deleted.

The consequence, stated on #45 and unanswered since: "somebody has been trying
keys against your deployment" was answerable only by opening a psql session while
it was still happening. An operator had no channel at all.

`loom_signin_attempts` is not a candidate for the telemetry journal, and 0023 is
why. Telemetry narrows an event stream the runtime already emits, its event names
mirror `RuntimeEvent` one for one, and a sign-in is not a runtime event — the
runtime takes an actor on an intent and never asks how a host established one
(0018). Admitting one would also need a sentinel tree id, since journal rows are
keyed by `tree_id` and `seq`. So the answer had to come from the portal's own
table or not at all.

What makes that table awkward to report on is the property it was built to have.
`subject.ts` stores an HMAC of the client address rather than the address,
deliberately, so that a table sitting behind a public form is not a visitor log.
`attempts.ts` said the same thing in its own words: three operations and no query
language, because "a store that could be asked anything else would be a store
somebody eventually asks who has been trying".

That reasoning is right about the danger and wrong about the remedy. A seam with
no query language does not prevent the report — it prevents the *safe* one, and
leaves the operator reaching for psql, where every column is available and no
rule applies at all.

## Decision

**The attempt log gains one reading operation, and it may not ask about a
subject.** `survey(cutoff, limit)` answers with four exact totals over every live
row — subjects, failures, earliest first failure, latest last failure — and a
capped sample of those rows, newest first, **with their subjects removed**.

Three rules make that more than a convention.

**No caller receives a subject.** Not the digest, not a count per digest, not a
stable handle standing in for one. The totals are the same either way, and a
caller holding digests can count how often each returns — which is a visitor log
assembled one read at a time, arrived at by a route nobody decided to take. The
Postgres statement does not select the column, so the restriction is enforced by
what is fetched rather than by what the caller remembers to drop.

**The rows come back because the arithmetic must not be restated.** `lockoutFor`
doubles a wait per failure over a ceiling; expressing that in SQL would make a
second definition of what a lockout is. `afterFailure` is already written twice
for atomicity's sake and needs a contract suite to police the duplication;
nothing here justifies a third. So the sample crosses the seam and `readPressure`
— pure, no clock, no IO — reads it with the same `assess` the sign-in path runs.

**A capped count says so.** A survey is limited, and the limit can hide rows. The
sample arrives newest first and a row older than `maxLockoutMs` cannot be serving
a lockout, so when the oldest row seen is already past that horizon the count is
exact despite the truncation; otherwise `lockedIsExact` is false and the page
says "at least". An operator acting on "3 locked out" must not be reading a page
size.

**What is reported is a floor, and the page says so too.** Counting is per
address; a caller with a range of them is a stranger each time. Nothing here
measures how much guessing is happening — only how much of it arrived the same
way twice.

**The page reads and offers nothing to click.** No unlock button. Clearing a
count from a browser is a way to defeat the throttle from a browser; the lever
for a stuck reviewer is the key they hold, and the lever for an attacker is in
front of the app (0034).

## Consequences

- An operator can see sign-in pressure without database access, and sees it
  through the same `assess` the form runs, so the page cannot disagree with the
  door.
- `AttemptLog` has a fourth operation, and both implementations plus the shared
  contract suite carry it. The suite grew nine cases: the Postgres totals are
  computed in SQL and the memory ones in JavaScript, and nothing else makes them
  agree on what "live" means, on what an empty table reports, or on which rows a
  cap keeps.
- The survey is an aggregate scan of a table the sweep keeps small, and it runs
  when an operator opens a page, never on a request path.
- **This is still current state only.** Nothing is written, so nothing is
  retained: a burst that ended before anyone looked has aged out and is gone.
  Answering "was anyone locked out overnight" needs a second table and a
  retention decision to govern it (option B on #45), and this record does not
  take it.
- The rule bounds that future work rather than blocking it. A history table would
  be a *record of events*, and 0039 says what it may hold: counts, times, and
  verdicts, never a subject and never anything that stands in for one.

## Alternatives considered

**Leave the seam at three operations and let an operator use psql.** The honest
description of the status quo. It concentrates the risk rather than removing it —
psql sees the subject column, sees every row, and applies no rule at all — and it
makes the answer available only to whoever holds the database credential, which
is not the same set of people as "reviewers who can sign in".

**Return rows with their subjects and ask callers to be careful.** Simpler, and
the sample would then support a "top offenders" table. Rejected: the digest is
stable across requests, so a caller that kept them could count returns per caller
and would have built the visitor log `subject.ts` exists to prevent. A rule
enforced by what the query selects survives the next person to write a caller.

**Compute the lockouts in SQL and return only counts.** No rows would cross the
seam at all, which is the strictest reading of "counted, never enumerated". It
would put a second definition of `lockoutFor` — the doubling, the ceiling, the
threshold — into a `CASE` expression, in a codebase that already carries one such
duplication and needed a contract suite to keep it honest. Rejected: the risk
being managed is a report about people, and rows without identity are not that
report.

**Write a row per refused attempt to a new portal-owned audit table.** Option B
on #45. It answers the questions a current-state page cannot, and it is a
retention decision about failed attempts against a public form — a thing that
then has to be governed. Not one run's call, and not a prerequisite for the
reading this record ships.

**Admit sign-ins into the telemetry journal.** One place to look for everything.
Rejected as it was on #45: it contradicts 0023's membership rule and makes
`@loom/runtime` assert that its consumers authenticate people, which 0018 spent a
record saying it does not get to do.
