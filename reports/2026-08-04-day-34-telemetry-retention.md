# 2026-08-04 (day 34) — the journal can forget, and the tables lock themselves

**Build order section:** §6 — Telemetry. Both remaining §6 items, which are the
last open work before §7.

**Branch:** `day-34-telemetry-retention`, off `main` at `e164edc`. **Second run of
the day** — day 33's contested undo merged as #45 this morning.

---

## Where this run started

No maintainer feedback outstanding on the build order. #45 merged, and its one
human comment — *"tell me more about item number 2"*, about operator visibility of
sign-in lockouts — was answered in detail at 11:20 UTC with four options and a
recommendation. That question is still open and is not something this run should
answer on your behalf: the fork between options A and B is a retention decision
about a log of failed sign-ins, which is yours.

The one open PR, #46, is the lessons routine. Its comment hands three findings to
this routine explicitly. **Item 1 is fixed here** and the other two are answered
below.

That put the run on the build order, and on exactly the two items day 33
recommended: a telemetry retention policy, and the `loom_telemetry` RLS statement.

## What was built

### 1. The journal can be told to forget (0037)

The journal has only ever grown. Every intent, proposal, rationale and disposition
since day 20 is still in `loom_telemetry`, and nothing anywhere deletes from it.
"No retention policy" has been an open item in every report since it was built,
deferred each time on the grounds that a rule invented before anyone had read a
record would be guessing. `/activity` and `calibrationOf` have both read records
since, so that deferral has run out.

Two prior records are what make a delete safe to add at all. 0016 made the
revision log the truth; 0023 made telemetry a **narrowing of a stream the log
already carries**. Together they mean forgetting telemetry loses the *account* of
what was proposed and judged, and cannot lose a tree, a revision, or a held
proposal. So this is a question about `src/telemetry/` and must never become one
about `src/store/`.

**Three parts, three owners:**

- **`TelemetryJournal.forget({ before })`** deletes every record below a position
  and nothing else. It is told nothing about ages, policies, episodes or trees.
  Both implementations are four lines and cannot disagree about anything more
  interesting than that.
- **`retentionPlanOf(records, horizon)`** is a pure function returning a position.
  The whole rule is testable against a list of records with no journal, no clock
  and no paging in the way — the same seam `auditSnapshot` uses.
- **`applyRetention(journal, { policy, clock })`** carries a decision from one to
  the other, and **nothing schedules it**. `pnpm --filter @loom/portal
  telemetry:prune` is the portal running it as an ordinary consumer.

**Two rules bind what may go.** *Forgetting is a prefix, never a hole* — `seq` is
an opaque position rather than a count, and a hole in the middle makes "is this
window complete" unanswerable. And *an episode is never cut in half*: the cut
lands at the first record of the oldest episode the fold resolves as
`awaiting-answer` or `open`, so **a proposal still waiting on someone's answer is
never forgotten, however old it is**. A journal that kept a commit and forgot the
proposal it committed would be manufacturing the exact fault `episodesOf` exists
to detect.

**Age is measured against arrival.** `RecordedTelemetry` gains `recordedAt`,
stamped by the journal on the way in. `occurredAt` is what the host said, and an
age a writer can choose is an age a writer can dodge in both directions — a record
dated 1970 would evaporate on the next run and one dated 3000 would be immortal.

**A policy below one hour is refused.** The likeliest way to write a policy of
zero is a units mistake, and its cost is an empty journal.

The run is **incremental and idempotent**: it scans at most 5000 records, so a
journal far past its horizon is caught up over several runs rather than in one
long transaction, and that makes it safe to cron without knowing how far behind it
is. The outcome names what it kept and why — `keptUnsettled` for records held for
their own unfinished episode, `keptBehind` for settled records stranded behind
one. A `keptBehind` that stays large has told you something very old is still
waiting on a person.

Default horizon in the portal script is **90 days**, overridable with
`LOOM_TELEMETRY_MAX_AGE_MS`.

### 2. A table Loom creates is locked when it is created (0036)

`ALTER TABLE … ENABLE ROW LEVEL SECURITY` is now in the DDL, in the same statement
list as the `CREATE TABLE` it protects — for `loom_trees`, `loom_revisions`,
`loom_telemetry`, and the portal's `loom_signin_attempts`.

I did not treat this as a documentation chore, because the evidence says it is
not one. The lock has been step 5 of `docs/deployment.md`, headed **required**,
since the first table. `loom_telemetry` was created on day 20; "still needs its
RLS statement" was then carried in the report of every run from day 20 to day 33 —
**ten reports over fourteen days** — and cleared only when you ran it by hand on
day 27. `loom_signin_attempts` arrived on day 32 and started the same cycle. Both
tables sat unlocked on a live deployment for the interval between being created
and being remembered.

The failure is not that people forget. It is that the DDL is code that runs and
the lock was prose that someone reads, with nothing connecting them. So they are
now one thing.

No policies accompany it: RLS with no policy denies every role except the table's
owner, and the owner is who Loom connects as (0022 put the runtime on plain SQL,
never on the REST layer). The tests read `pg_class.relrowsecurity` rather than
asserting the statement was issued — a test that checks its own DDL string proves
nothing about Postgres — and one test asserts the owner can still read its own
tables, so if that assumption ever stopped holding the failure would have a name.

**The one thing worth your eye:** a host connecting as a role that does *not* own
the tables will now have every query denied. That is outside the arrangement 0022
describes, it fails closed rather than open, and it is documented with its fix.
Our deployment connects as the owner, so this changes nothing for it.

### 3. `pnpm verify` now passes on a clean clone

Reported by the lessons routine on #46, and confirmed by reproducing it: `verify`
ran `typecheck` before `build`, but `typecheck` resolves `@loom/runtime/react` and
`@loom/runtime/sdk` through the `exports` map, which points at `dist/`. On a fresh
checkout it failed with four `TS2307`s in `src/cli/scaffold-fixture/`.

Fixed by swapping the order to `build && typecheck`, rather than by adding a
`paths` mapping back to `src/`. The reason for preferring it: with the build
first, the typecheck also proves the `exports` map resolves, which is the thing a
consumer actually depends on. A `paths` mapping would have made the fixture stop
testing that.

## Decisions I made that were not specified

**The journal knows about positions; the runtime knows about episodes.** The
alternative was one SQL `DELETE … WHERE recorded_at < $horizon`, which is smaller
and wrong twice over: it splits episodes, and it puts the rule in the database
where the memory journal cannot share it and the contract suite cannot check it —
so the two implementations would differ in the one behaviour that destroys data.

**The episode rule reuses `intentIdOf` and `proposalIdOf`.** Deriving "which
episode is this record about" a second time, in SQL, over a JSON path, would be
two implementations of one question in two languages. They would eventually
disagree, and the disagreement would be a journal that forgot half a story.

**Unsettled is `awaiting-answer` or `open`, read off the existing fold**, rather
than a new "is this finished" predicate. Both mean the window may not have seen
the end. Everything else is an ending, and an ended episode gains no more records
— with one narrow residual, named in 0037: a refusal that is repaired (0006)
happens inside the same request, so it cannot straddle a horizon of days.

**`forget` never rewinds the position counter.** A reader holding a cursor across
a prune would otherwise resume inside records it had already seen and conclude the
journal had gone backwards. There is a contract test for it in both
implementations.

**Retention is journal-wide, not per tree.** A per-tree horizon leaves one tree's
records interleaved with another's below the same cut, which is a hole by another
name. There is a test that says so.

**The prune is a portal script, not a route or a timer.** Same reasoning
`db-push.ts` gives about DDL, plus one of its own: a framework that deleted a
host's history on a schedule it picked would be making an operational decision
that is not its to make. The runtime supplies the rule; the host supplies the
moment. It also means retention has a real consumer rather than being an exported
API nobody has called.

**`describeRetention` returns one line for an operator.** An outcome nobody can
read is an outcome nobody acts on, and this is the first §6 thing whose result
lands in a terminal rather than on a page.

## Decision records

Added **0036 — A table Loom creates is locked when it is created** (§5 → §6) and
**0037 — The journal may forget, and only a whole episode at a time** (§6).
Nothing superseded; neither contradicts a standing record. Index regenerated with
`pnpm decisions:index`.

## The other two findings from #46

**Id uniqueness is enforced over the live tree, not over the log.** The lessons
routine is right, and it executed the case rather than inferring it: remove `n_4`,
then insert a node minted as `n_4`, and `rejectIdCollisions` accepts it — so `n_4`
is a card at revision 0 and a text node at revision 1. 0028 leans on ids as the
join key *across* the log for `auditSnapshot` and `compareTrees`.

I have **not** changed it this run, deliberately. Enforcing uniqueness over the
log rather than over the tree means the collision check needs the log, which turns
a pure function of a tree and a subtree into one that reads storage — that is a §1
contract change and it wants its own record and its own run, not a corner of this
one. Recorded here as the open question it is. **Recommendation:** worth doing,
next §1 unit; the honest interim is the sentence in `ids.ts` the lessons routine
suggested, and I would rather that came with the fix than instead of it.

**`compareTrees` reports a renamed slot under the `"type"` facet.** Also correct,
also not fixed here: it is a rename in output that `/audit` renders, so it is a §5
change with a user-visible string, and it belongs with whoever next touches that
page rather than bundled into a telemetry PR. **Recommendation:** rename the facet
to `"name"` for slots — it is a small, clean change and the audit page is the one
place output is read by a person under pressure.

## Test coverage and status

`pnpm verify` green end to end, **run from a clean `dist/`** to confirm the fix in
item 3: build, typecheck, both suites, portal build.

- **Runtime: 852 tests / 73 files** — up from 795 / 72. Fifty-seven new tests, one
  new test file (`retention.test.ts`, 32 tests).
- **Portal: 220 tests / 24 files** — unchanged; nothing in the portal's own code
  changed except its DDL and a new script.

What they hold down:

- **The plan:** forgets a settled episode entirely older than the horizon; stops
  at the horizon rather than at the end of what it was given; keeps a held episode
  however old; keeps an episode the window never saw finish; keeps an episode
  whose story crosses the horizon; forgets a settled episode sitting in front of
  an unsettled one; keeps a settled episode stranded behind one and counts it
  separately; forgets a record whose proposal was never proposed; and plans
  nothing further against what its own plan left behind.
- **The property, asserted against the fold rather than against counts:** whatever
  survives a prune still reads as whole episodes, with `unattributed` empty and
  the resolutions unchanged.
- **The policy:** accepts at the floor, refuses 7, 0 and a negative; the horizon
  is `now` minus the age; an unreadable clock is no horizon rather than the epoch.
- **The operation:** forgets and leaves the rest; reports nothing to forget on a
  young journal; leaves an old held proposal alone; forgets nothing more on a
  second run; forgets only as far as its scan reached and catches up next run;
  refuses a policy below the floor *without reading the journal*; refuses a clock
  it cannot read; reports a read failure and a delete failure as `unavailable`
  rather than guessing; and uses the system clock when given none.
- **The contract, run against both implementations:** a journal stamps
  `recordedAt` itself and the writer's `occurredAt` never becomes it; `forget`
  drops below a position and keeps the rest, is a no-op below the oldest record,
  is idempotent, spans every tree, empties a journal asked to forget everything,
  accepts a position an empty journal has nothing below, and never hands out a
  position it forgot.
- **RLS:** enabled on all three runtime tables after a push; a table created
  without it is locked by the next push; still enabled after a second push; and
  the owner can still read its own tables.

**Nothing skipped, nothing weakened.** The live API smoke test **ran** this
session rather than skipping — `LOOM_ANTHROPIC_API_KEY` is present in this
environment — and passed against the real API. No model id changed: the
interpreter still defaults to `claude-opus-5`, and nothing in this unit calls a
model, since retention is entirely deterministic.

## Open questions and blockers for the next session

1. **Nothing runs the prune on the deployment.** The script exists and is
   documented; no cron calls it. That is the deliberate split in 0037 — the host
   picks the moment — but it means the journal keeps growing until you schedule
   it. **Recommendation:** add a Vercel cron on `telemetry:prune`, nightly, once
   you are happy with the 90-day default. Say the word and I will wire it.

2. **RLS now fails closed for a non-owner role.** Detailed above. Our deployment
   connects as the owner so nothing changes for it, but it is a behaviour change a
   library is making to your database. **Recommendation:** keep it; the failure is
   loud, immediate, and has one documented fix, which is strictly better than a
   table silently readable by anyone with the anon key.

3. **Id recycling across the log** (new, from #46). Real, executed, and a §1
   contract question. **Recommendation:** worth its own run and its own record.

4. **`compareTrees` names a renamed slot's facet `"type"`** (new, from #46).
   **Recommendation:** rename to `"name"` with the next §5 change to `/audit`.

5. **Sign-in lockouts are still invisible to an operator** (day 32, and the
   maintainer's live question on #45). Four options were set out in detail at
   11:20 UTC today. **The fork is yours:** should the portal keep a *history* of
   refused sign-ins, or is current lockout state enough? Option A — a read-only
   panel over the table that already exists — I would build regardless of how that
   lands, and would pick it up next run if you say nothing.

6. **Compaction instead of deletion.** 0037 rejects it for now: a summary row is a
   second representation of facts the fold already derives. It would preserve
   calibration's denominator indefinitely at a fraction of the size, though.
   **Recommendation:** revisit when someone has actually lost a number they
   wanted.

7. **Carried, unchanged:** the portal has no component test harness (day 26); a
   scheduled snapshot audit still has nowhere for its result to go; a missed
   `db:push` is still a sign-in outage (day 32); `policyId` is a name rather than
   a fingerprint (day 31); calibration does not segment by policy (day 31); the
   reply schema sits near its 3500-byte guard; there is no node-level provenance;
   and the README's layout tree stops at `store/` and never grew `telemetry/`,
   `write/` or `interpretation/`'s later additions.

**§6 has no open items left.** Sections 1–6 are functional end to end and the
remaining work in each is the list above. On the build order, §7 — Marketplace —
is what comes next, and it is the one section I would not start without you
saying so.
