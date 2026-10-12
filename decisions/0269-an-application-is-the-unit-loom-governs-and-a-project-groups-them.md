# 0269. An application is the unit Loom governs, and a project groups them

**Status:** Accepted
**Date:** 2026-10-12
**Section:** §3 (portal)
**Renumbered:** from 0268 on 12 October. #600 landed a different 0268 — *a page
is put back by proposing the change that puts it back* — while this was being
written, and 0097 makes a clash fatal and gives the record already on `main` the
number. Only the number moved.
**Supersedes:** [0260](0260-a-project-is-the-unit-loom-stores-governs-and-measures-under.md)

## Context

[0260](0260-a-project-is-the-unit-loom-stores-governs-and-measures-under.md) said
a project is the unit Loom stores, governs and measures under, and five tables
took a `project_id` on that basis. #608 then built the table that id pointed at.

**The word was wrong, and the maintainer said so the same day.** The hierarchy
he wants is three levels:

```
account  →  project  →  application
```

A project is a **logical grouping**, which a person may have several of; an
**application** is the thing with the pages, the signals, the policy and the
credentials. What 0260 described and what #608 built is the third of those under
the name of the second.

Two things made it cheap to correct and expensive to leave:

- **The data is one row.** `loom_projects` had been in `main` for about an hour
  and in the maintainer's database for less, because the `db:push` that should
  have created it never did — #608 added `ensureProjectStoreSchema` and did not
  wire it into `apps/loom/scripts/db-push.ts`, the one script a deployment runs.
  So the rename lands before anybody has rows under the old name.
- **The word is in 280 places.** It is in five columns, two stores, a contract
  suite, the deployment documentation and the portal's composition root. Every
  week it stays, that number grows and the correction stops being mechanical.

Asked what a project owns that an application does not, the maintainer was
explicit: *"it is just organizational right now. Later it may be members, policy
inheritance, etc, but for now…just organizational."*

## Decision

**An application is the unit everything is stored and governed under. A project
groups applications and owns nothing else. An account sits above both and is not
yet data.**

- `ApplicationId` wears `app_`, and the five scoped tables carry
  `application_id`. `prj_` moves to the grouping, where it always belonged —
  it has only ever meant *the thing with a name that a person organises by*.
- `Application` carries `projectId`, so there is one place a thing's project is
  recorded. **Nothing scoped by an application is also scoped by a project**:
  the project is reachable from the application, and storing it twice would be
  two facts to disagree.
- `Project` is `projectId`, `name`, `createdAt`. No host, because a project is
  not deployed anywhere. No policy and no members, because they were named as
  later work — and a level that owns nothing is cheap to carry, where a level
  that owns the wrong things is expensive to correct.
- **An account stays an `actor:key` pair in an environment variable.** That is
  what identity is today, per deployment, with no row anywhere. A hosted control
  plane ([0262](0262-the-control-plane-is-hosted-and-the-render-path-stays-in-the-customers-app.md))
  cannot run on it, so accounts are real work tied to the hosting decision
  rather than to this one. Naming the level now is what stops the next thing
  being built in its place.

## Alternatives considered

**Keep `project` as the leaf and add a word above it.** Cheapest in code and
wrong in the product: the maintainer's customers will read these words, and the
thing with the pages is an application in every description he has given of it.
A vocabulary the maintainer has to translate when he talks to his own users is a
tax paid forever to avoid an afternoon.

**Leave it until accounts are built.** The argument against is a number: 280
references today, and every one of them is in a file some other lane is also
editing. The merge cost of renaming later is not the rename.

**Two levels, as Supabase has.** Their Organization → Project is two, where
their Project is this Application. Put to the maintainer directly, with the
observation that everyone pays a navigation level whether or not they group.
He wanted three. It is his product and his customers, and a grouping he can
leave empty costs less than one he cannot add.

**A `project_id` on the five scoped tables too.** Rejected: it is derivable
through the application, and a denormalised copy is a second place to be wrong.
When a project does own something — inherited policy is the likeliest — the edge
to travel is `Application.projectId`, which exists.

## Consequences

- **A migration that renames rather than recreates**, guarded against running
  twice, because Postgres has no `RENAME … IF EXISTS`. `db:push` is hand-written
  additive DDL, so nothing is dropped and no data is at risk, but the rename and
  the `prj_default` → `app_default` carry both need explicit statements.
- **The order of the two `ensure` calls is load-bearing**, and a test holds it.
  `ensureApplicationStoreSchema` renames the old `loom_projects`;
  `ensureProjectStoreSchema` then creates a fresh one for the grouping. Run the
  other way round, `CREATE TABLE IF NOT EXISTS` sees the old table, skips, and
  the rename carries it off — leaving a deployment with no projects table and no
  error anywhere.
- **Each id update is guarded on its table existing.** A deployment adds a seam
  by adding its `ensure` call on purpose, so one that never switched telemetry or
  the policy log on has no such table; the first draft took the whole migration
  down with `42P01` instead of skipping it.
- `db:push` now creates both tables and carries the ids. The #608 omission is
  fixed in the same run, so the maintainer runs it once rather than twice.
- The portal's prototype screens still say *project* where they mean
  *application*. They are fixtures on a screen slated for replacement, and are
  left for the promotion rather than renamed twice.
