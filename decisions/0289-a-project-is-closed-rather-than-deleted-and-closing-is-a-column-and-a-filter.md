# 0289. A project is closed rather than deleted, and closing is a column and a filter

**Status:** Accepted
**Date:** 2026-10-16
**Section:** §5 (the store), §3 (portal)

## Context

The portal plan's unit 3 reads *"the prototype's project list, wired: create,
delete, switch"*, and the delete is the one verb nothing in the store will
serve. Three stores refuse it, in the same words, and only one of them has
argued it:

- **`TreeStore`** —
  [0268](0268-a-page-is-put-back-by-proposing-the-change-that-puts-it-back-and-a-store-never-deletes.md):
  *"`TreeStore` does not grow a method. Not a delete, not a reseed, not a
  reset."* Going back is a change proposed through the Gate, because a path
  that writes a tree without being proposed is *"exactly the one whose entries
  nobody can account for later."*
- **`ApplicationStore`** — *"a delete would either orphan all of them or cascade
  through the governance record this product exists to keep."*
- **`ProjectStore`** — the same, one step removed, because deleting a project
  would do it to every application in it.

All three name the replacement without building it: ***the project says it was
closed* beats *the project is gone*** — *"and closing is not built here either,
because nothing can close what nothing has yet opened. When it is wanted it is
a column and a filter, not a `DELETE`."*

Something has opened now. Unit 3 put projects on a screen, and a screen with
projects on it is a screen somebody wants a project off.

## Decision

**A project and an application carry `closedAt`. Closing hides and disables;
nothing is destroyed, and reopening is the inverse.**

1. **`closedAt` is a nullable instant on `Project` and `Application`**, absent
   for everything that exists today. It is a column and a filter, exactly as the
   three refusals anticipated.

2. **Both stores take `close` and `reopen`**, which set and clear it. They are
   two methods rather than one taking a boolean, because *close* and *reopen*
   are the words a screen uses and a flag argument at a call site reads as
   neither.

3. **Closing a project closes the applications in it.** A delete would have
   cascaded; so does this, and reversibly — an application whose project is
   closed is unreachable, and leaving it open would be a row that is live
   according to itself and gone according to everything that lists it.

   **The cascade is composed above the stores**, in `src/project/closing.ts`,
   not inside `ProjectStore.close`. A project store that reached into an
   application store to finish its own write would be the coupling both are
   shaped to avoid, and the two are separate stores precisely because nothing
   is stored *under* a project.

4. **Reopening a project does not reopen its applications.** The cascade is not
   symmetric, and the asymmetry is deliberate: closing is a statement about the
   project, where reopening one application is a decision about that
   application. A reopen that revived everything would turn *I want that one
   back* into *start collecting on all nine again*.

5. **Nothing is read differently by id.** `get` answers a closed project exactly
   as it answers an open one. Closing is not a soft delete that makes a row
   pretend to be missing — a reader that asked for it by name asked about a
   thing that exists, and a `not-found` would be this store lying about its
   contents.

6. **What filters is `list`**, which gains `{ closed?: boolean }`: absent means
   open only, which is what every caller today means. A listing that defaulted
   to everything would put closed projects back on the screen that closed them.

7. **A closed application takes no signals.** That is the half with teeth —
   *stop it collecting* is what most people mean by delete — and it is **not
   built here**, because ingest does not yet know which application is posting.
   It lands with unit 4, which is the unit that gives it one.

## Consequences

- **The governance record survives the thing it is about.** A project's trees,
  revisions, holds and policy history stay exactly where they were, which is
  the property that made a delete unacceptable and is the whole of what this
  record buys.
- **The portal says Close, and means it.** A button labelled *Delete* that
  closed would be worse than either — it would teach that this product's words
  are approximate, on the screen where that matters most.
- **Erasure is a different feature and is not served by this.** A customer
  demanding their readers' data be erased is asking about the five signal
  tables, not about the account of what changed on their pages. That is
  retention's shape — `forget` already exists for the buffer — scoped to an
  application, and it is a unit of its own when somebody needs it. Conflating
  the two would have been the delete argument wearing a lawful hat.
- **A closed project keeps its name and its id.** Neither is unique and neither
  is reused, so nothing is blocked by it.
- **Every `list` caller means *open*,** and gets it without changing. The ones
  that will eventually want everything — an audit, a deployment-wide view — ask
  for it.

## Alternatives considered

**Delete, as the plan's wording says and as Supabase does.** The comparison is
instructive rather than persuasive: for Supabase the project *is* the database,
so deleting it and deleting its contents are one act. Here the project is the
folder the governance record lives in, and the record is what the product is
for. It would also destroy most thoroughly the history of the project somebody
was least happy with, which is the one a reader is most likely to want
afterwards.

**A `deleted` boolean rather than an instant.** Cheaper and says less. *When*
is the question anybody asks about a closed project — *did this stop before or
after the thing I am looking at* — and a boolean cannot answer it. The column
costs the same either way.

**One `setClosed(projectId, closed)` method.** Fewer methods, and it reads as
neither word at the call site. `close` and `reopen` are what the screen says.

**A `not-found` for a closed project, so every existing caller filters for
free.** Tempting and dishonest. A store that answers *no such project* about a
project it is holding is a store whose answers cannot be trusted about
anything, and the first casualty is the audit that goes looking for exactly
those rows.

**Leave the applications open when their project closes.** Rejected on clause
3's reasoning: it produces a row that is live according to itself and
unreachable according to every screen, which is the state that makes somebody
ask whether their data is still being collected and get two answers.
