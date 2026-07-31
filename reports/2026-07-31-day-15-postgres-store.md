# 2026-07-31 (day 15) — the backing store

**Build order section:** §5 — Portal. The persistence the deployed write path needs.

**Branch:** `day-15-postgres-store`, off `main` at `272afe6`

---

## Supabase, and why the earlier answer was weak

You asked whether Supabase would be better than the Neon / Vercel Postgres I had
suggested. It is, and the suggestion deserved the challenge — I named those
because we were in a Vercel context, which is a reflex rather than an argument.
One of them was not even a live product: Vercel Postgres was folded into Neon in
December 2024 and shut down in June 2025.

The reframe that decides it: **they are all Postgres.** 0016 requires `append` to
be a transaction, and every candidate does transactions identically. On the
constraint that actually shapes the design there is nothing to choose between
them, so the decision belongs to what surrounds the database — auth, which is a
near-term need for an unauthenticated prompt box that spends money; operational
familiarity; and RLS for the multi-tenancy §7 implies.

Recorded as **0022**, along with the thing that makes it work: **`supabase-js` is
never used for database access.** PostgREST cannot execute a multi-statement
transaction, so the client the platform's documentation steers toward cannot
implement `append`. That is a rule, not a preference.

---

## What was built

**`postgresTreeStore`**, a second implementation of `TreeStore` — named for the
database rather than the host, because nothing in it touches a Supabase API.
Calling it `supabaseTreeStore` would imply a coupling that does not exist and make
a later host change look like a rewrite.

Two tables. `loom_revisions` is the append-only log; `loom_trees` is the snapshot.
`append` writes both inside one transaction.

**The log's composite primary key `(tree_id, revision)` is load-bearing.** It makes
the *database* enforce the revision sequence, so two writers racing at the same
base revision cannot both commit even if both passed the base-revision check
before either finished. The in-memory store gets that property from being
single-threaded; a real one has to get it from a constraint. A test inserts a
duplicate revision directly and asserts the database refuses it.

**The store takes a database handle, not a connection string.** Choosing a driver,
a pooler and a connection lifetime belongs to the host — and injecting the handle
is what lets the tests run this exact code against an embedded Postgres.

---

## The strongest thing here: one contract, two implementations

`memory.ts` has described itself as "the reference implementation … what a SQL or
KV implementation will be checked against" since the day it was written. That was
a promise. `src/testing/store-contract.ts` is what makes it true: **one suite, run
against both stores.**

A behavioural disagreement between memory and Postgres is now a test failure
rather than something discovered in production. It also means the interface has
finally been tested for the thing interfaces are for — a second implementation is
the only way to find out what a contract failed to say.

Two consequences fell straight out of writing it:

- **`memory.test.ts` was deleted.** Every test in it was contract behaviour, so
  keeping it would have been maintaining the same assertions twice. What was
  genuinely memory-specific turned out to be nothing; `clampListingLimit` is a
  pure function and moved to its own file next to the module that exports it.
- **Two list behaviours were only ever asserted for memory** — resuming from a
  cursor that names no stored tree, and clamping a limit rather than honouring it.
  Both are now required of Postgres too, and keyset pagination is exactly where a
  SQL implementation would plausibly have got the first one wrong.

**Tests run against PGlite** — Postgres compiled to WebAssembly — so they exercise
real transactions and real constraint violations with no external database and no
Docker. `pnpm verify` stays green offline, which is the rule the live model test
already follows.

---

## Two things the tests caught

**A wrapped error.** `create` on a duplicate returned `unavailable` instead of
`already-exists`. Drizzle wraps the driver's error, so SQLSTATE 23505 sits down
the `cause` chain rather than on the error that was thrown. The fix walks the
chain, which is also what makes it work across drivers instead of against
whichever one happened to be tested first.

**Multiple DDL statements in one prepared statement.** PGlite refuses them — and
so does any connection in transaction-pooling mode, which is exactly the
configuration Supabase requires on serverless. Splitting the schema into one
statement per entry is not a test-environment workaround; it is the shape that
works everywhere. That is why `TREE_STORE_DDL` is a list.

---

## Decisions I made that weren't specified

1. **`drizzle-orm` is an optional peer dependency, and Postgres is its own entry
   point** (`@loom/runtime/postgres`). A host that only uses the memory store must
   not be made to install Drizzle — the same rule react and the Anthropic SDK
   already follow. `@loom/runtime/store` deliberately does not re-export the
   schema, because that would drag Drizzle into the entry point that exists to
   work without it.

2. **The tree is stored as one JSON document, not shredded into node rows.** It is
   read and written whole, and a decomposed schema would need migrating every time
   §1 touches the AST.

3. **Rows are parsed on the way out, not cast.** The log is the one place where
   data is guaranteed to outlive the code that wrote it, so a stored revision is
   validated with the same Zod schemas §1 and §2 own. A document that no longer
   parses is reported as `unavailable` rather than served.

4. **`db:push` is a script, not something the app does on boot.** DDL issued by
   several serverless instances starting at once is a race, and a migration that
   runs implicitly is one nobody decided to run.

5. **The portal uses Postgres when `DATABASE_URL` is set and memory when it is
   not**, and both are supported states — the same shape as the interpreter, where
   absence degrades honestly. The trees page now says which one it is instead of
   warning unconditionally, so the warning disappears once it stops being true.

6. **`prepare: false` on the driver.** Transaction-mode pooling does not support
   prepared statements, and getting this wrong produces confusing runtime errors
   rather than a clear refusal.

---

## Decision records

| #    | Title                                        | Status   |
| ---- | -------------------------------------------- | -------- |
| 0022 | The backing store is Postgres, reached by SQL | Accepted |

Nothing superseded, no `Accepted` record contradicted. **No ARCHITECTURAL
escalation** — this implements an interface that already existed and changes
neither the tree schema nor the delta model.

---

## Test coverage / status

```
@loom/runtime   57 files, 533 tests   green
@loom/portal     4 files,  25 tests   green + build
```

`pnpm verify` green across the workspace, with no database required.

Beyond the shared contract now running twice, the Postgres-specific tests assert:
the log entry and the snapshot land in the same transaction; **a refused append
leaves no log row behind** — the divergence `auditSnapshot` exists to detect, which
a store must never manufacture itself; the database refuses a duplicate revision;
and a stored document that no longer parses is reported rather than served.

---

## What you need to do to turn it on

1. Create a **new Supabase project** — not the one holding live alpha data.
2. Put the **transaction-mode pooler** connection string (port 6543) in
   `DATABASE_URL`, in Vercel and in `.env.local`.
3. Run `pnpm --filter @loom/portal db:push` once.

Until `DATABASE_URL` is set nothing changes: the portal still runs on memory and
still says so.

---

## Open questions for the next session

1. **Auth.** The strongest argument for Supabase was that the portal needs it, and
   it still does not have it. An unauthenticated prompt box on a public URL is
   model spend for anyone with the link — Deployment Protection is the stopgap.
2. **Not yet exercised against real Supabase.** PGlite is real Postgres, but it is
   not a pooler, and the `prepare: false` requirement is exactly the kind of thing
   that only fails against the real thing. First deploy with `DATABASE_URL` set is
   the test.
3. **`auditSnapshot` has no schedule.** It exists, and nothing runs it. With a
   durable log that becomes worth wiring to something.
4. **The compile step.** Unchanged, still worked around with `extensionAlias`.
5. **The schema is at 3381 of a 3500 guard.** Carried.
6. **Node-level provenance.** (Carried from day 1.) Still unforced.
