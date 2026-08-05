# 0036. A table Loom creates is locked when it is created

**Status:** Accepted
**Date:** 2026-08-04
**Section:** §5 → §6

## Context

0022 put the backing store on Postgres reached by plain SQL through Drizzle, and
named Supabase as the host it is deployed against. That host fronts everything in
the `public` schema with PostgREST, reachable using an anon key that is public by
design. A table in that schema is world-readable and world-writable from the
moment it exists unless row level security is enabled on it.

Loom's answer to this has been a step in `docs/deployment.md`, numbered 5, headed
"required", listing an `ALTER TABLE … ENABLE ROW LEVEL SECURITY` per table with a
sentence saying every table added later needs one too.

That step has not worked. `loom_telemetry` was created on day 20; "still needs its
RLS statement" was then carried as an open item in the report of every run from
day 20 to day 33 — ten reports over fourteen days — and cleared only when a human
went and ran it by hand on day 27. `loom_signin_attempts` arrived on day 32 and
went through the same cycle. Both tables existed, unlocked, on a live deployment
for the interval between being created and being remembered.

The failure is not that people forget. It is that the instruction and the thing
it protects live in different artefacts: the DDL is code that runs, and the lock
is prose that someone reads. Nothing connects them, so nothing notices.

## Decision

**`ALTER TABLE … ENABLE ROW LEVEL SECURITY` is part of the DDL, in the same list
as the `CREATE TABLE` it protects.** `ensureTreeStoreSchema` locks `loom_trees`
and `loom_revisions`, `ensureTelemetrySchema` locks `loom_telemetry`, and the
portal's `ensureSignInAttemptsSchema` locks `loom_signin_attempts`. A table Loom
creates has no window in which it is exposed.

- **No policies accompany it.** RLS with no policy denies every role except the
  table's owner, and the owner is who Loom connects as. 0022 put the runtime on
  plain SQL rather than on the REST layer, so the effect is to close a door Loom
  does not use.
- **It is idempotent, like the rest of the DDL.** Enabling it twice is not an
  error, so a redeploy does not have to know whether it ran, and a database
  created before this record is locked by the next `db:push`.
- **The catalogue is what the tests read.** `rowSecurityOn` queries
  `pg_class.relrowsecurity` rather than asserting the statement was issued. A
  test that checks its own DDL string proves nothing about Postgres.
- **The portal's table follows the same rule under its own ownership.**
  `loom_signin_attempts` belongs to the portal, not to `@loom/runtime` (0018), so
  its statement lives in the portal's DDL. The rule is shared; the ownership is
  not.
- **A host that connects as a non-owner is outside the arrangement 0022
  describes**, and every query it makes will be denied. That is stated in
  `docs/deployment.md` rather than worked around.

## Consequences

The manual step is gone from the deployment instructions, replaced by a note that
it happens automatically and a query for checking that it took.

A host on a database that is not Supabase, and has no REST layer in front of it,
now gets RLS it did not ask for. It costs that host nothing — it connects as the
owner, and an owner is unaffected — and it is worth more than the alternative,
which is a framework whose safe default depends on knowing which managed Postgres
you are on.

The failure mode moves and gets louder. Previously: a table quietly readable by
anyone with a public key, indefinitely, with nothing to notice it. Now: a host
that connects as a non-owner finds every query denied, immediately, on the first
deploy. That is a failure that fails closed, announces itself, and has one
documented fix.

This does not make Loom multi-tenant. RLS here denies a role; it does not scope
rows to a tenant. 0022 reserved that for §7 and it stays reserved — the policies
a marketplace needs are a different piece of work that this makes room for rather
than performs.

## Alternatives considered

**Leave it in the deployment document.** Rejected on evidence rather than on
principle. Fourteen days of reports carrying the same unresolved line is the
measurement, and the second table repeated the first table's history exactly.

**Have the app enable it on boot.** Rejected for the reason `db-push.ts` already
gives about DDL: several serverless instances starting at once is a race, and a
migration that runs implicitly is a migration nobody decided to run. The lock
belongs with the creation, and the creation is already a deliberate script.

**Check it at runtime and warn.** A read of `pg_class` on startup, with a warning
when a table is unlocked. Rejected: it costs a query on every cold start to
produce a log line in a place nobody is watching, and having detected the
problem it would still not fix it. Fixing it is one statement — so issue the
statement.

**Ship policies as well, scoped by a tenant column.** Rejected as premature and
as the wrong record. Loom has no tenant concept; inventing one here would be
deciding §7's data model as a side effect of a security fix.

**Add `FORCE ROW LEVEL SECURITY`.** Rejected. It would apply RLS to the owner
too, which with no policies means denying Loom access to its own tables. It is
the right tool once policies exist, and meaningless before.
