# The word that was one level off

**Date:** 2026-10-12
**Section:** §3 (portal)
**Branch:** `hierarchy-application-under-project`

## What was asked

The maintainer gave the hierarchy he wants, in one line:

> User Account > Projects (user can have multiple for logical grouping) >
> Applications (grouped under projects).

Three levels. The repository had two, and the one it had was called by the wrong
name.

## What was wrong

[0260](../decisions/0260-a-project-is-the-unit-loom-stores-governs-and-measures-under.md)
said a project is the unit Loom stores, governs and measures under, and five
tables took a `project_id`. #608 built the table that id pointed at, four hours
before this.

**That unit is an application.** It owns the pages, the signals, the policy and
the credentials, which is exactly what the maintainer described applications
doing. His *project* — the grouping — did not exist, and neither did an account:
sign-in is a roster of `actor:key` pairs parsed from an environment variable,
one per deployment, with no row anywhere.

A detail worth recording: in the deployment documentation written for #608 I had
called the table *"The applications you have registered"*. The prose had drifted
to the right word before anybody said it.

## What was done

| | |
|---|---|
| `loom_projects` → `loom_applications` | and `project_id` → `application_id` on five tables |
| `prj_` → `app_` | `ApplicationId` wears the new prefix; `prj_` moves to the grouping, where it always belonged |
| a new `loom_projects` | three columns — id, name, created — because the grouping owns nothing yet |
| `Application.projectId` | one place a thing's project is recorded, and nothing scoped by an application is also scoped by a project |
| `db:push` | creates both tables, carries the ids, **and runs the ensure #608 forgot** |

[0269](../decisions/0269-an-application-is-the-unit-loom-governs-and-a-project-groups-them.md)
records it and supersedes 0260.

**An account stays an environment variable.** Naming the level is what stops the
next thing being built in its place; building it is tied to the hosting decision
(0262) rather than to this.

## The bug this change also fixes

**`db:push` never created the table #608 added.** The DDL and
`ensureProjectStoreSchema` landed; the call in `apps/loom/scripts/db-push.ts` —
the one script a deployment runs — did not. The maintainer ran `db:push` and it
did nothing for it.

Nothing broke, because the seed returns an error result that is swallowed and
nothing reads applications yet. It would have broken the moment a screen did.
Fixed here so he runs `db:push` once rather than twice.

## Three things the tests found, in order of how badly they would have ended

**1. The ordering that silently loses a table.** `ensureApplicationStoreSchema`
renames the old `loom_projects`; `ensureProjectStoreSchema` creates a fresh one
under the freed name. Run the other way round — which is how I first wrote it —
`CREATE TABLE IF NOT EXISTS` sees the old table, skips, and the rename then
carries it off. **The deployment ends with no projects table and no error
anywhere.** A test holds the order now, and `db:push` says why in a comment.

**2. A migration that falls over on a deployment that uses fewer seams.** The
first draft's `UPDATE`s were unguarded, and a deployment that never switched
telemetry or the policy log on has no such table — `42P01`, and the whole
migration down. Each is guarded on its table existing.

**3. `Delta application` became `Deltan application`.** A global
`"a application"` → `"an application"` across the tree hit the inside of
*Delta application* in `src/tree/apply.ts`, a file this change has no business
touching. Caught by looking at the diff rather than by a test, and the file is
reverted.

## The migration, and what it is safe against

`db:push` is hand-written additive DDL rather than drizzle-kit, so **nothing is
ever dropped** and no data is at risk from a diff being computed wrongly. What
it cannot do on its own is rename, so:

- The table rename is a `DO $$ … $$` block that asks the catalogue first, since
  Postgres has no `RENAME … IF EXISTS`. It distinguishes the old table from the
  new one by the `host` column, which only the old one has.
- The id carry — `prj_default` → `app_default` across six tables — is a separate
  list, because it is data rather than schema and a host reading `db:push`
  should see which rows are touched.
- Both are idempotent, and tested twice over: on a database in the old state, on
  one that never saw it, and on one already migrated.

The deployment documentation page refused to build on `DO $$`, which is the
third time that guard has caught a schema change in this lane. It now reads a
guarded block as *a step that leaves no trace in the shape* and skips it —
honest, because the table it produces is declared by the `CREATE TABLE` after
it. Anything that is not a guarded block still throws.

## Tests

`pnpm verify` green: **217 files / 4856 framework tests**, **436 files / 8322
application tests**, 133 prerendered pages 0 run together, 1795 visuals none
over budget.

| | |
|---|---|
| the migration | 6 tests, against a database built by hand in the pre-rename state rather than by the code under test |
| the application contract | 10, run twice — memory and Postgres |
| the project contract | 8, run twice |
| Postgres-only | 4 each: row level security, idempotent migration, the simultaneous-creation race, an unreachable database |
| the deployment page | 27, including the live check that every table it names really exists |

Nothing skipped, nothing weakened.

## What the maintainer has to do

**Run `pnpm db:push` again.** It renames one table, adds one column, creates one
table, and carries `prj_default` to `app_default` in six. It drops nothing.

## What is next

The workspace screen. The hierarchy it draws is now the one in the database:
projects on the landing screen, applications inside them, pages inside those.

## Open questions

- **The prototype screens still say *project* where they mean *application*.**
  They are fixtures on screens slated for replacement, so they are left rather
  than renamed twice. If the promotion slips, they should be renamed.
- **An account is still an environment variable.** It is the level above all of
  this and the only one with nothing behind it.
