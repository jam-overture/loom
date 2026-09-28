# Deploying Loom

**One deployment, four surfaces.** `apps/loom` is a single Next.js application
inside a pnpm workspace, and its four route groups are the marketing site at `/`,
the documentation at `/docs`, the lessons at `/lessons` and the portal at
`/portal` ([0067](../decisions/0067-the-four-surfaces-are-one-application.md)).
One domain and one session: a visitor signs in on the way into `/portal` and is
the same person everywhere else on the deployment.

> **If you are looking at a Vercel project created before 19 August 2026**, it
> points at `apps/portal`, `apps/docs` or `apps/marketing` and none of those
> directories exist any more. Repoint **one** project's Root Directory at
> `apps/loom` and delete the others — the sections below are written for that one
> project. Everything a deleted project held that matters is environment
> variables, and they are listed under [Environment](#environment).

`apps/loom/vercel.json` pins the one setting that must not drift:

```json
{ "framework": "nextjs" }
```

That is deliberate. Everything else Vercel infers correctly, but the framework
preset is decided **once, at project creation, by detection** — and if detection
runs against the wrong directory it silently saves "Other" and never
re-evaluates. Pinning it in the repo makes the deployment describe itself instead
of depending on dashboard state nobody can review.

## Vercel settings

Import `jam-overture/loom` and set:

| Setting                           | Value                        |
| --------------------------------- | ---------------------------- |
| Root Directory                    | `apps/loom` — **verify it, see below** |
| Framework preset                  | pinned by `vercel.json`      |
| Install / Build / Output commands | leave as default             |

Vercel reads `packageManager` from the root `package.json`, installs with the
committed lockfile, and runs the application's `build` script.

### Root Directory is the one that bites, and it fails silently

**Setting it during the import is not enough — verify it after.** On the New
Project screen the field shows `apps/loom` as **greyed placeholder text**, which
looks identical to a value that has been set. Vercel's default is an empty Root
Directory, meaning the repository root.

That default fails in the worst possible way: **it does not error.** The repo root
is `@jam-overture/loom`, which has no framework and no `build` script, so Vercel finds
nothing to do, produces an empty output, and reports a green deployment. Every
path then returns `404: NOT_FOUND` from the edge.

The tell is in the build log, and it is unmistakable:

```
Running "vercel build"
Build Completed in /vercel/output [160ms]
Skipping cache upload because no files were prepared
```

**No install step, and a build measured in milliseconds.** A real build installs
dependencies and prints a Next.js route table, and takes minutes.

To fix or confirm: **Settings → Build and Deployment → Root Directory** → Edit →
`apps/loom` → Save, then redeploy. That section only exists once the project
does, which is why it cannot be fully settled during the import.

### Its aftershock: the framework preset

Fixing Root Directory does not undo what the wrong one caused. Detection runs
**once, at project creation**, so a project first created against the repo root
saved its preset as "Other" and kept it. The build then succeeds in full — install,
compile, TypeScript, route table — and fails on the last line:

```
Error: No Output Directory named "public" found after the Build completed.
```

"Other" means static site, and a static site is expected to leave a `public`
directory behind. Next.js leaves `.next`.

`apps/loom/vercel.json` pins `"framework": "nextjs"`, which overrides the
dashboard, so this is fixed from the repo and stays fixed. Setting the preset by
hand in **Settings → Build and Deployment → Framework Preset** works too, but it
lives where nobody reviews it.

### The workspace link, which you do not have to do anything about

`apps/loom` depends on `@jam-overture/loom` as `workspace:*`, which resolves to the
**repository root package**. An install scoped to `apps/loom` alone would have
nothing to link against.

Vercel controls that with **"Include source files outside of the Root Directory
in the Build Step"**, in the same settings section as Root Directory above. It is
**on by default** for every project created since August 2020, so a new import
already has it — do not go looking for it during the import.

Unlike Root Directory, this one fails loudly: the build stops at install or
compile with `Cannot find module '@jam-overture/loom'` or pnpm's
`ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`. That error, and nothing else, is what this
setting causes.

Verified by clean clone → `pnpm install --frozen-lockfile` → `pnpm build`, not by
reasoning about it.

## The domain, and going public

A fresh project is private: Vercel's Deployment Protection puts a login in front
of every path, which is right while nothing is meant to be found. Going public is
three things, and the first is the one that is silently wrong if you skip it.

### 1. Pin the origin

Add the domain in Vercel → Settings → Domains, create the DNS records it asks
for, and wait for the certificate. Then set, for Production:

```
LOOM_SITE_ORIGIN=https://your-domain
```

Nothing fails without it. The site answers on the domain, looks correct in a
browser, and quietly tells every machine that reads it that it lives somewhere
else: `siteOrigin()` falls back to `VERCEL_URL`, so the canonical of every page,
every entry in `sitemap.xml`, the OG tags an unfurler reads and every internal
link in the page tree name the deployment's `*.vercel.app` host. A search engine
takes that as the address of the site.

### 2. Decide what becomes public, because it is not only the marketing site

**Deployment Protection is per deployment, not per path.** One application serves
four surfaces (0067), so lifting it publishes `/`, `/docs`, `/lessons` and
`/demo` in the same instant.

The portal is the exception and does not depend on that setting: every page under
`/portal` calls `requireActor` for itself, and `guarded-pages.test.ts` sweeps the
directory so a page added later cannot quietly skip it. A public deployment still
admits nobody to the portal who has no key.

Reader signals are unaffected too: intake is off unless `LOOM_SIGNAL_INTAKE=on`,
so `/api/reader-signals` answers `404` on a deployment that never asked for them.

### 3. Lift the protection, and redeploy

Settings → Deployment Protection → **Only Preview Deployments**. Previews stay
behind the login, which is what keeps one pull request's preview from being found
before it is merged.

Then redeploy, so the build carries the origin.

### Check it from outside

From a browser or shell with no Vercel session — the point is to see what a
stranger sees:

```bash
curl -sI https://your-domain/ | head -1          # 200, no login redirect
curl -s  https://your-domain/robots.txt          # Allow: /, /portal disallowed
curl -s  https://your-domain/sitemap.xml | head  # every URL on your domain
curl -sI https://your-domain/portal | head -1    # still sends you to sign-in
```

Indexing needs nothing further. `isPublicDeployment()` reads `VERCEL_ENV`, so
production serves a crawlable `robots.txt` and a preview serves *disallow
everything* — which is what stops one preview per pull request each announcing
itself, in the format a machine reads as fact, as this product.

## Environment

`apps/loom/.env.example` is the full list with the commentary. Five variables,
two of which are required:

| Variable                         | Required | Notes                                   |
| -------------------------------- | -------- | --------------------------------------- |
| `LOOM_PORTAL_SESSION_SECRET`     | **yes**  | Signs sessions. ≥ 32 chars              |
| `LOOM_PORTAL_REVIEWERS`          | **yes**  | `actor:key` pairs. Keys ≥ 24 chars      |
| `LOOM_ANTHROPIC_API_KEY`         | no       | Falls back to `ANTHROPIC_API_KEY`       |
| `DATABASE_URL`                   | no       | Absent means memory — see below         |
| `LOOM_PORTAL_TRUSTED_PROXY_HOPS` | no       | Proxies in front. 1 unless you added one |
| `LOOM_SITE_ORIGIN`               | in production | The domain, pinned. See [The domain](#the-domain-and-going-public) |

**Never prefix any of them `NEXT_PUBLIC_`.** 0017 exists partly to keep the model
key off the client, and a public prefix would undo the whole record in one
keystroke. The same goes double for the session secret, which signs identity.

Leaving the model key unset is a supported state rather than a broken one: the
interpreter reports `interpreter-unavailable` and the prompt box says so. A
deployment with no key is a perfectly good way to look at the read path.

## Identity — required, and it fails closed

Every change is recorded against whoever asked for it (0027), so the portal will
not show a tree to someone it cannot name.

```bash
openssl rand -hex 32   # LOOM_PORTAL_SESSION_SECRET
openssl rand -hex 24   # one key per reviewer
```

```
LOOM_PORTAL_REVIEWERS=ana@example.com:2f4c…,bo@example.com:9ab1…
```

The key **is** the identity. A reviewer pastes a key at `/portal/sign-in` and the roster
says who that is — there is no name field, because a name that can be typed is a
name anyone can type. The actor lands in `Provenance.actor` and is what
`/portal/history` and `/portal/activity` show, so pick something a reader will recognise.

**Set both, or the portal admits nobody.** This is the one place where absent
configuration does not degrade gracefully, and that is deliberate: an empty
`DATABASE_URL` announces itself the moment a write vanishes, whereas a portal
that fell back to open access would look exactly like one that is working. The
sign-in page names whichever variable is missing.

Consequences worth knowing before you rely on it:

- **Adding or removing a reviewer is a redeploy.** The roster is configuration.
- **Rotating the session secret signs everyone out.** It is the only way to
  invalidate an outstanding session; there is no per-session revocation.
- **A leaked key is a leaked identity** until you rotate that key. Treat pasting
  one anywhere as a rotation trigger, exactly like the database password.
- **Sessions last twelve hours** and do not renew themselves by being used.

### The sign-in throttle

Five failures from one caller inside an hour, and the sixth is refused for a
minute — doubling to a quarter of an hour, and forgotten after an hour of
silence (0034). A correct key clears the count, so a reviewer who mistypes and
then gets it right starts clean.

Two things to know before you rely on it:

- **It needs `DATABASE_URL` to be worth much.** Without one the count lives in a
  server process, and a serverless deployment has many — so a caller is counted
  once per instance rather than once. It is a real throttle on `pnpm dev` and a
  soft one in production.
- **It counts by forwarded-for address**, read from the right by
  `LOOM_PORTAL_TRUSTED_PROXY_HOPS` — 1 on Vercel, which is the default. Put a
  CDN or WAF in front and it becomes 2, and getting it wrong in the *high*
  direction is the one that matters: the app would then read an entry the caller
  wrote, and a caller who picks their own address is not throttled at all.

What it stores is a keyed digest of the address, never the address, so the table
cannot be read as a visitor log. Rotating `LOOM_PORTAL_SESSION_SECRET` therefore
clears every outstanding lockout as well as every session.

A caller who rotates addresses evades it, which is why the deliberate
non-decision in 0034 is worth knowing: there is no global cap, because a global
cap is a lockout of every reviewer that any anonymous caller could trigger.
Vercel's Deployment Protection in front of this is still worth having.

## The database

The store is Postgres, hosted on Supabase (0022). Setting it up is six steps, and
two of them are the ones that go wrong.

### 1. A project of its own

A **new** Supabase project, not one shared with anything that has users. The store
issues `CREATE TABLE`, and this is pre-production alpha software whose schema will
change.

Save the database password when it is shown — it is displayed once.

### 2. The transaction pooler string

Project → **Connect** → **Transaction pooler**:

```
postgresql://postgres.<project-ref>:<password>@<region>.pooler.supabase.com:6543/postgres
```

**Port 6543, not 5432.** Transaction mode pools per transaction, which is what
serverless needs, and it is why the driver is built with `prepare: false` —
prepared statements cannot survive across pooled transactions. Session mode (5432)
would hold a connection per function instance and exhaust the pool.

### 3. `DATABASE_URL`, and the mistake that costs a deployment

Set it in Vercel (Production and Preview) and in `apps/loom/.env.local`.

**The value is the bare URL.** An environment entry is `KEY=value`, so a line that
reads `DATABASE_URL=DATABASE_URL=postgresql://…` puts the key name *inside* the
value. This happened twice — once locally, once in Vercel — and cost three failed
deployments, because `postgres.js` parses the URL when the client is constructed
and the client is constructed at module scope. It surfaced as:

```
TypeError: Invalid URL
Error: Failed to collect page data for /portal/trees
```

Nothing in that mentions the environment. `app/(portal)/_lib/connection.ts` now catches it and
says so by name, but the fastest check is still to look at the value and confirm it
begins `postgresql://`.

### 4. Create the tables

```bash
pnpm --filter @loom/app db:push
```

Once, from a machine with `.env.local` in place. Idempotent — every statement is
`IF NOT EXISTS`, so re-running is a no-op. It creates five tables: `loom_trees`
and `loom_revisions` for the store, `loom_holds` for the changes the Gate held
back, `loom_telemetry` for the journal §6 records into, and
`loom_signin_attempts` for the sign-in throttle. The last of those belongs to the
portal rather than to `@jam-overture/loom` — the runtime takes an actor and never asks
how a host established one.

**Re-run it whenever the schema changes, not only on a new database.**
`CREATE TABLE IF NOT EXISTS` leaves an existing table alone, columns and all, so
a column added after a deployment reaches it only through the `ALTER TABLE …
ADD COLUMN IF NOT EXISTS` beside it. A deployment that skips the re-run keeps
serving and fails the write that needed the column.

Three so far, and the last two are the ones to get right:

- `loom_revisions.answered_by` (0029), which every confirmation of a held
  proposal writes.
- `loom_signin_attempts` (0034). **Miss this one and nobody can sign in.** The
  throttle fails closed by design — an attempt it cannot count is refused rather
  than allowed uncounted — so a database configured without this table admits no
  reviewer at all. The sign-in page says as much and names `db:push`; running it
  fixes it in seconds.
- `loom_holds` (0088), which is where a change the Gate held back waits for the
  human who answers it. **Only a deployment that uses `postgresHoldStore` needs
  it**, and one that stays on the in-memory store keeps working without it — but
  that store cannot hold anything across a request, so on the serverless hosts
  described above a proposal marked *requires confirmation* is gone before the
  confirmation arrives. `db:push` creates the table either way, so adopting the
  Postgres store later is a code change and not a database step.

### 5. The tables are locked down for you

`db:push` runs `ALTER TABLE … ENABLE ROW LEVEL SECURITY` on every table it
creates, so there is nothing to do here and no window in which a new table is
exposed. It was a manual step until 0036; if you have a database that predates
that, re-running `db:push` locks it.

Why it matters: Supabase exposes everything in the `public` schema through
PostgREST using the anon key, and that key is public by design. Without RLS,
anyone with the anon key can read and write your trees.

No policies accompany it, deliberately. RLS with no policy denies every role
except the table's owner, and the owner is who the portal connects as — Loom
reaches Postgres over plain SQL and never over PostgREST (0022), so the effect is
to close a door Loom does not use.

**If you connect as a role that does not own the tables, every query will be
denied** and the portal will report the database as unavailable. That is outside
the arrangement 0022 describes; grant that role a policy, or connect as the
owner.

To check it took:

```sql
SELECT relname, relrowsecurity FROM pg_class
WHERE relname LIKE 'loom\_%';
```

### 6. Redeploy, and check the right thing

The tell is on `/portal/trees`: the "No database is configured" note **disappears** when
`DATABASE_URL` is picked up. The proof is making a change through the prompt box
and reloading.

### 7. Telemetry retention — optional, and nothing runs it for you

The journal only grows. Nothing in Loom deletes from it on its own, because when
to forget is your decision and a framework that made it on a timer it chose would
be deciding for you (0037).

```bash
pnpm --filter @loom/app telemetry:prune
```

Defaults to a **90-day** horizon; set `LOOM_TELEMETRY_MAX_AGE_MS` to change it.
Ages below one hour are refused — the most likely way to write one is a units
mistake, and the cost of that mistake is an empty journal.

Safe to run on a schedule, safe to run twice, and safe to interrupt. It is
incremental: a journal far past its horizon is caught up over several runs rather
than in one long transaction. It never splits an episode, so a proposal still
waiting on someone's answer survives however old it is — and the run says so:

```
loom: forgot 1284 telemetry records, keeping 7 older records for 1 unfinished episode
```

A large "keeping …" that does not shrink means something very old is still held
awaiting an answer. `/portal/activity` is where to find it.

This deletes the *account* of what happened — proposals, dispositions, rationales.
It cannot touch a tree or a revision: those live in `loom_trees` and
`loom_revisions`, which this never reads (0016, 0023).

### 8. Reader signals — nothing arrives until you open the door

Reader signals are off unless you ask for them (0136), and that is now true at
both ends. A page says nothing unless its own code starts a broadcaster, and
**this deployment keeps nothing unless you set one variable**:

```bash
LOOM_SIGNAL_INTAKE=on
```

Unset, `/api/reader-signals` answers `404` to every delivery — a deployment that
never asked for reader signals does not have that endpoint and does not have a
table filling up because the application it deployed happens to carry a route.

A value that is neither on nor off is **not** read as off. `LOOM_SIGNAL_INTAKE=enabled`
gets a `503` naming what you typed, because a deployment that configured
something and got silence is the failure nobody notices.

Ask any deployment which of those it is:

```bash
curl https://your-deployment/api/reader-signals
```

```json
{ "intake": "on", "durable": true, "maxBytes": 65536, "deliveries": 120,
  "windowMs": 60000, "subjects": 3, "detail": "reader signals are being collected" }
```

`durable: false` means `DATABASE_URL` is unset, so batches are being kept in the
instance's memory — fine for `pnpm dev`, and on serverless it means the collector
in step 9 reads a database no instance wrote to.

**The page has to be told to post.** Rendering with `addressed: true` and starting
a broadcaster is still the host's call, per page:

```ts
broadcastReaderSignals(root, { send: deliverReaderSignals() })
```

`deliverReaderSignals` posts to `/api/reader-signals` — `sendBeacon` where the
browser has it, so the last batch of a page view survives the page closing, and a
`keepalive` fetch where it does not. Pass `{ url }` to send somewhere else; note
that a beacon cannot preflight, so a cross-origin URL needs CORS on the far end
or the browser refuses the delivery before it is sent.

**Who may post, and how often.** The endpoint is public — a published page is
public, so a session check is not available, and 0146 forbids the endpoint
learning anything about who is posting. What it does instead:

| | |
| --- | --- |
| a delivery over **64 KB** | `413`. That is the ceiling `sendBeacon` itself imposes, so a larger delivery did not come from one. Measured off the bytes, never off `content-length` |
| more than **120 deliveries a minute** from one sender | `429` with `Retry-After`. A broadcaster flushes every five seconds, so that is eight tabs' worth |
| a delivery that is not a batch | `400`, naming which batch of the delivery and why. Nothing is kept unless all of it parses |

A sender is a keyed digest of the forwarded-for entry `LOOM_PORTAL_TRUSTED_PROXY_HOPS`
hops from the right — the same reading the sign-in throttle uses, and the only one
a caller cannot steer by sending a header. The key is random, minted per process
and never stored, so the digests are meaningless to the next process and there is
nothing anywhere that could turn one back into an address.

**The counter is in memory, so it is per instance.** A deployment running eight
instances tolerates roughly eight times that rate. That is the same caveat the
sign-in throttle carries, and the answer is the same: a durable counter would mean
a database write to decide whether to allow a database write.

### 9. Reader signals — the buffer only empties when you run this

Different from retention above, and the difference matters. Telemetry pruning is
optional housekeeping; this is the **only** thing that turns reader signals into
numbers. A deployment with signals switched on and nothing running this counts
nothing at all — the tallies stay at zero while `loom_reader_signals` becomes the
largest table it owns.

```bash
pnpm --filter @loom/app signals:collect
```

It counts every batch older than the window into `loom_reader_tallies` and
`loom_reader_funnels`, then forgets exactly those. Counting and forgetting are
one operation on purpose (0158): a rollup reports what its window *added*, so a
batch counted twice is counted twice forever.

The three tables it reads and writes are created by `db:push` in step 3, with row
level security on like the rest — so if you granted policies to a non-owner role
there, grant them here too. The check in step 5 already lists them.

Defaults to a **one-hour** window; set `LOOM_SIGNAL_WINDOW_MS` to change it.
Windows below a minute are refused. That one number decides three things at once,
and they do not all want the same answer:

| The window is also… | Longer | Shorter |
| --- | --- | --- |
| how long a page view has to finish | fewer views straddle a boundary, so `views` over-counts less (0147) | more of them do |
| how long a view key lives | it lives longer | it expires sooner, which is 0146's argument |
| how far the tallies lag the buffer | more lag | fresher numbers |

Safe to run on a schedule and safe to interrupt. It is incremental — a buffer
far behind is caught up over several runs — and it says when there is more:

```
loom: counted 214 batches into 38 tallies over 96 views, and forgot 214 — more is waiting
```

**Two collections must not overlap.** Both would count the same batches and the
counters would double. The script takes a Postgres advisory lock, so a second
run says so and does nothing: a cron that overruns its own interval is harmless,
and so are two hosts running it against one database, because the lock is held
in the database rather than in the process. What is **not** covered is calling
`collectReaderSignals` from your own route handler without taking that lock —
the runtime cannot serialise it for you, since a journal and a store are two
handles with no shared transaction between them.

One line needs acting on rather than reading:

```
loom: counted 214 batches and could not forget them, so the next run counts them
again unless the buffer is pruned below 91422: …
```

The counters took the window and the buffer would not drop it. Delete
`loom_reader_signals` rows below the position it names, or fix the database
before the next run; a second run over the same batches doubles those counters
permanently.

**An empty buffer is the honest answer to three different questions**, and step 8
is how you tell them apart: the door is shut, or it is open and no page on this
deployment has been told to post, or pages are posting and you have not run this
yet. The collector says which of its own — it reports nothing ripe rather than
nothing at all — and `GET /api/reader-signals` answers the first two.

### If the password leaks

Rotate it in Project Settings → Database → Reset database password, then update
Vercel and `.env.local`. The tables survive a rotation; only the credential
changes. A connection string carries the password in plain text, so treat pasting
one anywhere — chat, an issue, a log — as a rotation trigger.

## What a deployment can and cannot do

**Works.** The shell, the primitives, the tree listing, the outline, addressing,
and the preview pane rendering a stored tree. Reads are consistent across
instances because the seed is deterministic.

**Survives only with a database configured.** Without `DATABASE_URL` the store is
`memoryTreeStore`, which lives in a server process — and on Vercel there are many
short-lived ones, so an append lands on the instance that served the request and
is absent from the next. A change visibly applies and then vanishes, which reads
as a broken runtime rather than as missing persistence.

That state is supported rather than broken, and the trees page says which one it
is in, so the warning disappears once it stops being true. Locally `pnpm dev` is a
single process and memory persists for as long as it runs.

A **malformed** connection string is different from an absent one: it throws
rather than falling back. A build that succeeded and then quietly served a portal
which forgets every write would be worse than one that refuses.

## Why Postgres

`append` has to be a transaction (0016): the log entry and the snapshot advance
land together or not at all, because a log entry without its snapshot advance is
exactly the divergence `auditSnapshot` exists to detect — and a store must never
manufacture the fault its own audit is designed to catch.

That rules out plain KV, and it is the only requirement the database itself has to
satisfy. Everything else about the choice — auth, familiarity, RLS — is about what
surrounds it, which is why 0022 chose a host rather than a dialect. The
implementation is plain SQL through Drizzle and is named `postgresTreeStore`, so
moving hosts would not be a rewrite.
