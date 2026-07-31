# Deploying the portal

The portal is a Next.js app inside a pnpm workspace. `apps/portal/vercel.json`
pins the one setting that must not drift:

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
| Root Directory                    | `apps/portal` — **verify it, see below** |
| Framework preset                  | pinned by `vercel.json`      |
| Install / Build / Output commands | leave as default             |

Vercel reads `packageManager` from the root `package.json`, installs with the
committed lockfile, and runs the portal's `build` script.

### Root Directory is the one that bites, and it fails silently

**Setting it during the import is not enough — verify it after.** On the New
Project screen the field shows `apps/portal` as **greyed placeholder text**, which
looks identical to a value that has been set. Vercel's default is an empty Root
Directory, meaning the repository root.

That default fails in the worst possible way: **it does not error.** The repo root
is `@loom/runtime`, which has no framework and no `build` script, so Vercel finds
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
`apps/portal` → Save, then redeploy. That section only exists once the project
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

`apps/portal/vercel.json` pins `"framework": "nextjs"`, which overrides the
dashboard, so this is fixed from the repo and stays fixed. Setting the preset by
hand in **Settings → Build and Deployment → Framework Preset** works too, but it
lives where nobody reviews it.

### The workspace link, which you do not have to do anything about

`apps/portal` depends on `@loom/runtime` as `workspace:*`, which resolves to the
**repository root package**. An install scoped to `apps/portal` alone would have
nothing to link against.

Vercel controls that with **"Include source files outside of the Root Directory
in the Build Step"**, in the same settings section as Root Directory above. It is
**on by default** for every project created since August 2020, so a new import
already has it — do not go looking for it during the import.

Unlike Root Directory, this one fails loudly: the build stops at install or
compile with `Cannot find module '@loom/runtime'` or pnpm's
`ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`. That error, and nothing else, is what this
setting causes.

Verified by clean clone → `pnpm install --frozen-lockfile` → `pnpm build`, not by
reasoning about it.

## Environment

The write path (#18) calls a real model, so the portal now needs one secret:

| Variable                 | Scope       | Notes                                    |
| ------------------------ | ----------- | ---------------------------------------- |
| `LOOM_ANTHROPIC_API_KEY` | Server-side | Falls back to `ANTHROPIC_API_KEY`        |

**Never prefix it `NEXT_PUBLIC_`.** 0017 exists partly to keep that key off the
client, and a public prefix would undo the whole record in one keystroke.

Leaving it unset is a supported state rather than a broken one: the interpreter
reports `interpreter-unavailable` and the prompt box says so. A deployment with no
key is a perfectly good way to look at the read path.

Setting it makes the deployment worth protecting. **An unauthenticated prompt box
on a public URL is your model spend, available to anyone with the link.** Vercel's
Deployment Protection is the cheap answer until the portal has real auth.

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

Set it in Vercel (Production and Preview) and in `apps/portal/.env.local`.

**The value is the bare URL.** An environment entry is `KEY=value`, so a line that
reads `DATABASE_URL=DATABASE_URL=postgresql://…` puts the key name *inside* the
value. This happened twice — once locally, once in Vercel — and cost three failed
deployments, because `postgres.js` parses the URL when the client is constructed
and the client is constructed at module scope. It surfaced as:

```
TypeError: Invalid URL
Error: Failed to collect page data for /trees
```

Nothing in that mentions the environment. `lib/connection.ts` now catches it and
says so by name, but the fastest check is still to look at the value and confirm it
begins `postgresql://`.

### 4. Create the tables

```bash
pnpm --filter @loom/portal db:push
```

Once, from a machine with `.env.local` in place. Idempotent — every statement is
`IF NOT EXISTS`, so re-running is a no-op.

### 5. Lock the tables down — required

```sql
ALTER TABLE loom_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE loom_revisions ENABLE ROW LEVEL SECURITY;
```

Supabase exposes everything in the `public` schema through PostgREST using the
anon key, and that key is public by design. **Without this, anyone with the anon
key can read and write your trees.**

No policies are needed. That denies PostgREST entirely, while the portal is
unaffected: it connects as the role that owns the tables, and RLS does not apply
to a table's owner unless `FORCE ROW LEVEL SECURITY` is set.

### 6. Redeploy, and check the right thing

The tell is on `/trees`: the "No database is configured" note **disappears** when
`DATABASE_URL` is picked up. The proof is making a change through the prompt box
and reloading.

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
