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

`apps/loom/.env.example` is the full list with the commentary. Ten variables,
**one** of which is required:

| Variable                         | Required | Notes                                   |
| -------------------------------- | -------- | --------------------------------------- |
| `LOOM_PORTAL_SESSION_SECRET`     | **yes**  | Signs sessions. ≥ 32 chars              |
| `LOOM_ANTHROPIC_API_KEY`         | no       | Falls back to `ANTHROPIC_API_KEY`       |
| `DATABASE_URL`                   | no       | Absent means memory — see below         |
| `LOOM_PORTAL_TRUSTED_PROXY_HOPS` | no       | Proxies in front. 1 unless you added one |
| `LOOM_SITE_ORIGIN`               | in production | The domain, pinned. See [The domain](#the-domain-and-going-public) |
| `LOOM_SITE_PROJECT`              | no       | The project the site's readers are counted under. Unset is the deployment's own. See [Reader signals](#8-reader-signals--nothing-arrives-until-you-open-the-door) |
| `LOOM_SUPABASE_URL`              | for passwords | Supabase project URL. See [Email and password](#email-and-password) |
| `LOOM_SUPABASE_ANON_KEY`         | for passwords | Supabase anon key. Server-side only |
| `LOOM_PORTAL_EMAILS`             | for passwords | Comma-separated addresses allowed an account. Unset is nobody |

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
```

**An account is a row, not a variable**
([0285](../decisions/0285-an-account-is-a-row-with-a-minted-key-and-a-role-is-a-ceiling-on-the-gates-own-scale.md)),
so there is a second step and it is a command rather than an edit:

```bash
pnpm db:push                               # once, so the tables exist
pnpm portal:account ana@example.com        # prints a key, once
```

The key **is** the identity. Somebody pastes it at `/portal/sign-in` and the
accounts table says who that is — there is no name field, because a name that
can be typed is a name anyone can type. The actor lands in `Provenance.actor`,
so pick something a reader will recognise.

**It is printed once and stored as a digest**, which means there is nowhere to
read it back from. Somebody who loses one is given another, and the one they
lost stops working — run the same command again with the same actor, which is
the whole of what rotation is here.

Add a role at the same time, when you already know the project:

```bash
pnpm portal:account ana@example.com prj_a1b2c3 owner
```

`viewer`, `approver` or `owner` — an acceptance ceiling on the Gate's own stake
scale rather than a second permission system. Whoever registers a project is
made its owner without this.

### Email and password

Signing up, signing in and resetting a password with an email address
([0310](../decisions/0310-a-person-signs-in-with-an-email-and-a-password-the-provider-holds-and-the-deployment-names-who-may.md))
needs Supabase Auth and a list of who may. Without all three variables the
sign-in page offers keys alone.

1. In Vercel, set `LOOM_SUPABASE_URL` (Supabase → Project Settings → API →
   Project URL), `LOOM_SUPABASE_ANON_KEY` (same page, the `anon` key) and
   `LOOM_PORTAL_EMAILS` (for example `ana@example.com,ben@example.com`).
2. In Supabase → Authentication → URL Configuration, set **Site URL** to the
   production domain and add `https://<your domain>/**` under **Redirect
   URLs**. Without it, confirmation and reset links land on Supabase's default
   instead of `/portal/sign-in` and `/portal/reset-password`.
3. Redeploy, then sign up at `/portal/sign-up` and follow the confirmation
   email.

The actor is the address, lowercased. An address that held a key-only account
under another name is a new actor, so grant it its roles:

```bash
pnpm portal:account ana@example.com prj_a1b2c3 owner
```

An address not on the list cannot sign up, is refused at sign-in as if the
password were wrong, and is never sent a reset email. Supabase's own limit on
emails per hour applies to confirmation and reset links; its built-in mail
sender is enough for a handful of people.

**Set the secret, or the portal admits nobody.** This is the one place where
absent configuration does not degrade gracefully, and that is deliberate: an
empty `DATABASE_URL` announces itself the moment a write vanishes, whereas a
portal that fell back to open access would look exactly like one that is
working. The sign-in page names the variable when it is missing.

Consequences worth knowing before you rely on it:

- **The portal needs a database to admit anybody.** An account is a row and the
  command that mints one writes to Postgres, so a deployment with no
  `DATABASE_URL` has an accounts table nothing can put a row in. It says so in
  those words rather than answering *that key was not recognised*. This is the
  one thing that changed when the roster went: it used to work without one,
  because it was configuration.
- **Adding or removing somebody is a command, not a redeploy.** That is the
  other thing that changed.
- **Rotating the session secret signs everyone out** — and no longer locks
  anyone out. Keys are digested unkeyed precisely so that rotating the secret
  ends every session rather than every account.
- **A leaked key is a leaked identity** until you mint a new one for that actor.
  Treat pasting one anywhere as a rotation trigger, exactly like the database
  password.
- **Sessions last twelve hours** and do not renew themselves by being used.

### The sign-in throttle

Five failures from one caller inside an hour, and the sixth is refused for a
minute — doubling to a quarter of an hour, and forgotten after an hour of
silence (0034). A correct key clears the count, so somebody who mistypes and
then gets it right starts clean.

**An unreachable accounts table is not a failed attempt.** The lookup can fail
now that it is a table, and a failure refuses the sign-in without counting
against the caller — otherwise an outage would leave everyone who tried during
it part-way to a lockout for something they did not do.

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
cap is a lockout of everybody that any anonymous caller could trigger.
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
  than allowed uncounted — so a database configured without this table admits
  nobody at all. The sign-in page says as much and names `db:push`; running it
  fixes it in seconds.
- `loom_portal_accounts` and `loom_portal_memberships` (0285). **Miss these and
  nobody can sign in either**, for a different reason: who may sign in is a
  table now rather than a variable, and there is nowhere to put the row that
  `pnpm portal:account` writes. These two are the portal's own, like the attempt
  log above and unlike everything else on this list.
- `loom_ingest_keys` (0298). **Miss this and every customer's readers are
  refused** with a `503` naming the lookup, because the intake asks it about
  every delivery, and the marketing site counts nobody because it has no key
  to post with. The table is this deployment's own, like the two above.
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
`keepalive` fetch where it does not. Pass `{ url }` to send somewhere else. A
batch is labelled `text/plain`, which a browser sends across origins without a
preflight, so a page on another site reaches this deployment with no CORS set up
on either side.

**Whose readers they are.** A project's pages post with its key,
`/api/reader-signals?key=lk_…`, and every batch is filed under the project the
key names (0298). Registering a project in the portal mints its key, and the
project's **Connect your site** screen (`/portal/<project>/connect`) shows it in
the snippet to paste, with a button for an owner to replace it. For a project
nobody registered through the portal, mint one with:

```bash
pnpm signals:key prj_a1b2c3
```

Minting another ends the one before it. The key is printed in every page that
sends one, so it is not a secret: it says which project a delivery is for, and
the origin check is what stops it being used from another site. A delivery
with **no key** is refused, this deployment's own pages included.

**The marketing site needs its key too.** It posts with the key of the
deployment's own project, read from the same table, so after switching intake
on run:

```bash
pnpm signals:key prj_default
```

Until then the site mounts no broadcaster and counts nobody.

**Counting the site under a project you registered.** The deployment's own
project has no members, so its *Signals* screen is one nobody can open. To
watch the site's readers in the portal, set `LOOM_SITE_PROJECT` to the id of a
project you registered (the `prj_…` in its address) and redeploy. The site then
posts with that project's key, read from the same table, so replacing the key
on its *Connect your site* screen moves the site with it. Give that project the
site's own host, `www.loomjs.org`, or leave its host blank: a project that
names any other host, `loomjs.org` included, refuses the site's deliveries. An
owner changes it under *Where signals are taken from* on the same screen. A setting that names
nothing usable (not a project id, a closed project, one without exactly one
site) mounts no broadcaster rather than falling back to the deployment's own
project.

**Who may post, and how often.** The endpoint is public — a published page is
public, so a session check is not available, and 0146 forbids the endpoint
learning anything about who is posting. What it does instead:

| | |
| --- | --- |
| no key | `403`, saying to add `?key=` |
| a key this deployment did not issue, or has replaced | `403` |
| a key whose project is closed | `403` |
| a key whose project names its host, from any other origin or from none | `403`, naming the origin. Exact host and port; a subdomain is another site |
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
`loom_reader_funnels`, then forgets exactly those — for every project in turn,
closed ones included, since a closed project's last batches are still owed a
count. Counting and forgetting are
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

### 10. The site's own pages — publish them to see them by name

A project's *Pages* tab, and the page names on its *Signals* screen, come from
what its site published to `/api/pages`
([0312](../decisions/0312-a-site-hands-loom-a-snapshot-of-its-pages-with-a-secret-key-and-loom-never-runs-its-code.md)).
Until something is published, *Signals* shows each page by its id.

This deployment's own site publishes the same way a customer's build would.
On the *Connect your site* screen of the project the site counts under (the
one `LOOM_SITE_PROJECT` names, from step 8), an owner presses *Make a publish
key*. The key is shown once, so copy it then. Then, from `apps/loom`:

```bash
LOOM_PUBLISH_KEY=lp_… pnpm pages:publish https://www.loomjs.org
```

It sends every page the site's code authors, and prints the deployment's
answer: `loom: published 4 pages`, or why they were refused. Run it again
whenever a page is added or its heading changes. A page left out of a later
run keeps its last version rather than disappearing.

The key is a secret, unlike the ingest key: anybody holding it can change what
the portal believes your pages are. It is read from the environment so it
stays out of your shell history. Making a new one on the same screen ends the
old one.

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
