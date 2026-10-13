# 0273. The reader tables take the application now and the audience when it is ratified

**Status:** Accepted
**Date:** 2026-10-12
**Section:** §5 (signals), §3 (portal)

> **Renumbered on 2026-10-13**, from 0270, when the branch that carried it
> (#614) was merged. `main` had meanwhile accepted a different 0270 — *a change
> to the words a kind of part says is read over the words both windows say* —
> and two records sharing a number is fatal (0097). This record was written on
> 12 October and nothing in it changed but its number; references on the branch
> were updated with it.

## Context

[0269](0269-an-application-is-the-unit-loom-governs-and-a-project-groups-them.md)
made the application the unit everything is stored and governed under. Five
tables took `application_id` on that record: `loom_trees`, `loom_revisions`,
`loom_holds`, `loom_policy_revisions` and `loom_telemetry`.

**Five were left out, deliberately.** The reader tables —
`loom_reader_signals`, `loom_reader_tallies`, `loom_reader_funnels`,
`loom_reader_regions`, `loom_reader_page_views` — were held back by a note in
`src/application/scoped.test.ts` and by
[0263](0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md)'s
consequences, which say it plainly:

> **The signal tables need the audience too**, per clause 5, and they are being
> scoped for the project dimension right now. **Both dimensions should land in
> one migration rather than two**, which is the single most actionable thing in
> this record.

That was the right call when it was made and it has stopped being one, for a
reason outside the argument: **0263 is `Proposed`.** It is not ratified, nobody
has built a variant, and `treeSourceFromStore` still returns one tree per id
whoever is asking. The audience column has no value to carry.

Meanwhile a lane is blocked. The finding that asked for this work is explicit
about the order:

> the portal must not offer a second project until these seven are scoped. A
> screen that lets somebody create one, over a signal ledger that cannot tell
> two apart, would be mixing two customers' readers on the first day, and the
> mixing is not recoverable from the rows afterwards.

So *wait for one migration* is not a choice between one migration and two. It
is a choice between two migrations and **a lane blocked for as long as 0263
sits unratified**, which is a length nobody in this repository can predict,
because ratifying it is the maintainer's.

## Decision

**The reader tables take `application_id` now, alone. The audience dimension
lands when 0263 is Accepted, as a second migration, and that cost is accepted
rather than avoided.**

- All five carry `application_id`, defaulted to `app_default`, led by it in
  every key and every index — the same shape the store's four took, so there is
  one pattern here rather than two.
- The buffer's key does **not** widen. It is `seq`, a `bigserial`, already
  unique across every application the database holds; its *index* widens,
  because the index is what the reads use.
- The three factories take `StoreScope` at construction, as every other store
  does (0220), so *spanning two applications* stays unexpressible rather than
  merely forbidden.
- **0263 is not superseded and clause 5 still stands.** What this record
  changes is when its half arrives, not whether.

## Consequences

- **The portal may offer a second application.** All nine tables outside the
  tree store are scoped; nothing else in `src/` reads across two.
- **A second migration is owed to the reader tables** if 0263 is ratified: one
  `ALTER TABLE … ADD COLUMN IF NOT EXISTS` and one key widening per table, on
  the pattern this change just proved, with the column default backfilling
  correctly and no row rewritten. The cost is five statements and a test pass,
  which is the whole of what was being saved by waiting.
- **If 0263 is refused**, this is simply finished, and the audience column that
  would have been added on its anticipation is one nobody has to remove. That
  asymmetry is part of the argument: an unratified record is cheaper to wait
  out than to build on.
- `scoped.test.ts` covers all nine tables, which makes it the one file that
  says what application scoping means across the whole store.

## Alternatives considered

**Wait for 0263 and land both dimensions together.** 0263's own
recommendation, and what this record overturns. It is right about the cost of
moving twice and wrong about what the alternative is: the wait is unbounded
because it ends at a decision nobody here can take, and the lane it blocks is
one whose next unit is the screen that creates an application.

**Add the audience column now, unused, so the second migration never happens.**
Rejected on two grounds. It builds on a `Proposed` record, which this lane's
standing rule forbids — *build what does not depend on it* — and it is dead
code in a schema, which is worse than dead code in a function: a column nothing
writes is one a later reader has to decide whether to trust. If 0263 is refused
in favour of its own fallback — a variant is a separate page — the column would
have been wrong as well as unused.

**Scope the two the finding named worst (`holds`, the policy log) and leave the
readers.** Already done and not this: those landed with 0269. The readers are
what is left, and they are the ones whose failure cannot be undone afterwards
— a hold in the wrong queue is visible on a screen, where two applications'
readers summed into one tally is a number that looks right forever.
