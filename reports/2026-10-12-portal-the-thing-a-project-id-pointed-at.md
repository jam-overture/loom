# The thing a project id pointed at

**Date:** 2026-10-12
**Section:** §3 (portal)
**Branch:** `project-store`

## What was asked

The maintainer asked where the portal revisions were, having gone to `/portal`
and found the old screens. The new ones are at `/portal/preview`, and the answer
to *why are they not the portal yet* turned out to be a gap rather than a
to-do.

## The gap

[0260](../decisions/0260-a-project-is-the-unit-loom-stores-governs-and-measures-under.md)
decided what a project is. Five tables carry `project_id` — trees, revisions,
holds, the policy log and the journal — so every row knows which project it
belongs to.

**Nothing stored the project.** `Project` was a type nothing wrote and
`projectIdSchema` minted ids for a table that did not exist; `project_id` was a
foreign key to nothing. The portal's first screen lists the projects you have,
so it had nothing to list, and it lists fixtures. The maintainer's own sentence
— *"the whole portal is geared toward one app when I can have many"* — stopped
being true of the schema in the morning and stayed true of the data.

That is this run's own gap: I landed the project **dimension** and wrote the
promotion plan without the **entity**.

## What was done

`loom_projects`, and a `ProjectStore` with two implementations.

- `src/project/store.ts` — the contract and its four errors.
- `src/project/memory.ts` — `memoryProjectStore`.
- `src/store/postgres-projects.ts` — `postgresProjectStore`.
- `src/store/schema.ts`, `src/store/migrate.ts` — the table,
  `PROJECT_STORE_DDL` and `ensureProjectStoreSchema`, with row level security
  as every other table here has.
- `apps/loom/app/_lib/app/store.ts` — `appProjects`, composed beside the tree
  store, Postgres when there is a `DATABASE_URL` and a `Map` when there is not.
- `apps/loom/app/(portal)/_lib/store.ts` — `prj_default` is seeded, named
  *Your application*, create-if-absent so a deployment that renames it keeps the
  name.
- The deployment documentation gains the seam, so a host is told to create it.

**There is no delete.** `TreeStore` refuses one and the reason is stronger here:
a project's rows are its trees, its revisions, its holds, its policy history and
its journal, so a delete either orphans all of them or cascades through the
governance record this product exists to keep. *The project says it was closed*
beats *the project is gone*, and closing is not built either — nothing can close
what nothing has opened.

## Two bugs the shared contract caught

`src/testing/project-contract.ts` is one suite both stores run, on the pattern
`store-contract.ts` and `hold-contract.ts` set. It earned its keep immediately:

1. **The memory store listed in write order, not creation order.** Its own doc
   comment claimed insertion order "happens to be oldest first", which confuses
   the order rows were written with the order they were created — a project
   recorded today with yesterday's `createdAt` is ordinary, and is exactly what
   seeding the default beside existing projects produces. The contract writes
   three out of order; Postgres passed on its `ORDER BY` and the `Map` did not.

2. **The Postgres store wrote past the schema.** `rename` set the columns it was
   given, and `text` accepts an empty string where `projectSchema` does not. A
   rename to `""` was written happily and then **could not be read back at all** —
   the row was corrupt, and the store that correctly refused was the one in a
   `Map`. It now reads, merges, parses and writes, so the two agree about what a
   project is rather than about what fits in a column.

Neither is a bug a store asserted against its own expectations would have found.

## The race, which is why PGlite and not a Map

`postgres-projects.test.ts` fires two creations of the same id with
`Promise.all` and asserts exactly one wins. A `Map` cannot have a unique
violation, so this is only checkable against a real Postgres — and it is the
failure that matters: the loser of that race would otherwise take ownership of
the winner's trees, holds and governance record.

## Four edits that silently did nothing

Worth recording because the cause is embarrassing and will recur. Four
`str.replace()` edits matched nothing and wrote the file unchanged, and I only
caught it by probing the result. The indentation I was matching on came from my
own `sed 's/^/  /'` display prefix, so I kept writing four spaces where the file
has two. **The habit that fixes it is asserting the edit landed**, which is what
the later ones do — a replace that matches nothing should be an error, not a
no-op.

## Tests

| | |
|---|---|
| the shared contract | 10 tests, run twice — memory and Postgres |
| beyond the contract | 4 Postgres-only: row level security, idempotent migration, the simultaneous-creation race, an unreachable database |
| the deployment page | 27, including the live PGlite check that every table the page names really exists |

`pnpm verify` — numbers in the pull request. Two generated artefacts were
regenerated with the repo's own tooling rather than by hand:
`pnpm --filter @loom/app docs:api` for `reference.generated.json`, which is what
makes the new exports reachable from the reference and is what the claims tests
read.

Nothing skipped, nothing weakened.

## What the maintainer has to do

**Run `pnpm db:push` before this deploys.** It adds `loom_projects`; it alters
nothing existing and drops nothing.

## What is next

The workspace screen, on this store, at `/portal` — and the route collision that
comes with it: `/portal/[project]` cannot coexist with the static
`/portal/pages`, `/portal/pieces` and `/portal/rules`, because Next resolves
static first. The old screens have to come down as each new one goes up rather
than after, which is the sequence `docs/portal.md` already describes.

## Open questions

- **Who may create a project, and from where?** Registering an application is
  the portal's primary purpose by the maintainer's own account, and the screen
  for it does not exist. `create` is ready for it.
- **`rename` has a read-modify-write race.** Two people renaming one project at
  the same instant get last-write-wins on a display name, which seems right;
  nothing downstream keys on it.
