# 0022. The backing store is Postgres, reached by SQL

**Status:** Accepted
**Date:** 2026-07-31
**Section:** §5

## Context

`memoryTreeStore` lives in a server process. On a serverless deployment there are
many short-lived processes, so an append succeeds on the instance that served the
request and is absent from the next — a change that visibly applies and then
vanishes. That reads as a broken runtime rather than as missing persistence, so
the deployed write path is not trustworthy until a real store exists.

0016 already fixed the constraint that decides the technology: **`append` must be
a transaction.** The log entry and the snapshot advance have to land together or
not at all, because a log entry without its snapshot advance is exactly the
divergence `auditSnapshot` exists to detect — and a store must never manufacture
the fault its own audit is designed to catch.

That rules out plain KV. It leaves a relational database, and the host was chosen
on grounds other than SQL, since every candidate satisfies the transaction
requirement identically.

## Decision

**Supabase Postgres is the host. The implementation is plain Postgres reached
through Drizzle, and it is named `postgresTreeStore` rather than
`supabaseTreeStore`, because nothing in it is Supabase-specific.**

The host was chosen for what surrounds the database, not the database:

- **Auth is needed soon.** An unauthenticated prompt box on a public URL is model
  spend available to anyone with the link. Supabase brings auth; the alternative
  was choosing an auth provider separately and wiring it.
- **Operational familiarity.** The same team runs Supabase in two other projects,
  which is a real engineering factor rather than a soft one.
- **RLS for §7.** A marketplace implies multi-tenancy, and scoping trees per
  tenant is what RLS is for.

**Database access is Drizzle over the connection string. `supabase-js` is never
used for it.** PostgREST cannot execute a multi-statement transaction, so the
client Supabase's own documentation steers toward cannot satisfy 0016. This is a
rule, not a preference.

### Two tables, one transaction

`loom_revisions` is the log — append-only, primary key `(tree_id, revision)`.
`loom_trees` is the snapshot — one row per tree. `append` inserts the log entry
and updates the snapshot inside a single transaction.

The log's composite primary key is doing real work: it makes **the database
enforce the revision sequence**, so two concurrent writers at the same base
revision cannot both succeed even if both passed the base-revision check before
either committed. The in-memory store gets that from being single-threaded; a
real one has to get it from a constraint.

### The store takes a database handle, not a connection string

`postgresTreeStore(db)` receives an already-constructed Drizzle handle. Choosing a
driver, a pooler and a connection lifetime belongs to the host, not to the store
— and injecting the handle is what lets the tests run against an embedded
Postgres.

## Consequences

- **The contract test now runs against both implementations.** `memory.ts` claimed
  to be "the reference implementation... what a SQL or KV implementation will be
  checked against." That was a promise until now; one shared suite executed
  against both stores is what cashes it. A behavioural disagreement is a test
  failure rather than a discovery in production.
- **Tests use PGlite**, Postgres compiled to WebAssembly, so they exercise real
  Postgres semantics — real transactions, real constraint violations — with no
  external database and no Docker. `pnpm verify` stays green offline, which is the
  same rule the live model test already follows.
- Serverless requires the **transaction-mode pooler**, and transaction-mode
  pooling does not support prepared statements — so the postgres.js driver must be
  constructed with `prepare: false`. Getting this wrong produces confusing runtime
  errors rather than a clear refusal.
- **Loom gets its own Supabase project.** The team's other project holds live
  alpha user data under a standing "never modify" constraint. Sharing a project to
  save a few minutes would put that data one bad migration away from a system that
  is explicitly pre-production.
- The store is now the second implementation of `TreeStore`, which means the
  interface has been tested for the thing interfaces are for. Anything the
  contract cannot express is now visible.
- Migrations become a thing this repo has. The schema is small and additive; the
  constraint that matters is that `loom_revisions` is never updated or deleted
  from, only inserted into.

## Alternatives considered

**Neon.** Genuinely better at one thing: a branched database per preview
deployment, which pairs well with the per-PR previews that now exist. Rejected
because auth is a near-term need and preview data isolation is not — an alpha with
one seeded demo tree does not benefit. Worth revisiting if preview isolation
starts to matter, and the swap is cheap precisely because this implementation is
plain Postgres.

**Vercel Postgres.** Considered and discarded on a point of fact: it was folded
into Neon in December 2024 and shut down in June 2025. Recorded because it was
recommended in conversation before being checked, and the correction is part of
the trail.

**Supabase via `supabase-js`.** Rejected — PostgREST cannot do a transaction, so
it cannot implement `append`. The rule is written into the decision above because
the platform's documentation actively steers toward this client.

**A single table with the snapshot derived on read.** Rejected: it is pure event
sourcing again, which 0016 already refused. The snapshot exists so that replay is
a check rather than a dependency.

**Naming it `supabaseTreeStore`.** Rejected for accuracy. Nothing in the
implementation touches a Supabase API, so the name would imply a coupling that
does not exist and would make a later host change look like a rewrite.
