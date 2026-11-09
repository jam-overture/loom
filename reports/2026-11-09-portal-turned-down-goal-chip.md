# Unit 8b: *Turned down* names the goal each change served

**Lane:** `Loom portal` · **Date:** 9 November 2026 ·
**Branch:** `claude/project-thread-yjybid` ·
**Records:** none new ·
**Plan:** [`docs/portal.md`](../docs/portal.md) row 8b ·
**Target:** [`docs/portal-wireframes.md`](../docs/portal-wireframes.md) *The
goal chip* and *2 · For review* (*Turned down recently: N · see them*)

Claimed by a portal run at 2026-11-09 21:21 UTC (#846).

## Why this, and why now

No portal pull request was claimed by a run still going. #834 (record 0371,
Proposed) waits on the maintainer, with no comment from him on it. Everything
else left in the plan's order waits on him too: top-bar search, the predicted
effect on *For review*, *Stays on it* on *Goals*, and unit 9 behind 0371.

The wireframes put a goal chip on every change, and every list of changes had
one except *Turned down*. It could not: a turned-down change was kept by its
proposal id, and the goal a proposal served is kept by the intent it was made
from (0352). Once a change is turned down the held proposal is gone, so nothing
joined the two. This was the last gap in the wireframe sweep that did not wait
on the maintainer.

## What shipped

- **Turning a change down keeps its intent.** `loom_turned_down` gains a
  nullable `intent_id` column (`ALTER TABLE … ADD COLUMN IF NOT EXISTS`, run by
  `pnpm db:push` through the `ensureTurnedDownSchema` it already calls), and
  *Turn down* records `discarded.intent.intentId` with the change.
- **`intentsOf`** on the turned-down store: the intent each listed change was
  made from, leaving out a change turned down before intents were kept. Memory
  and Postgres pass the same contract.
- **The list leads with the goal.** `turnedDownGoalsOf` (pure) joins each
  change's intent to the goal kept by that intent in `loom_proposal_goals`:
  the goal's name, *No goal named* for a change that named none, and no chip for
  a change whose intent was never kept, rather than a guess.
- **Degrading until the push.** The reads name their columns, so remembering
  and weighing turned-down changes (0341) keeps working on a table without
  `intent_id`. Turning down falls back to an insert without the intent when the
  column is missing, so a *no* is still remembered. *Turned down* says the goals
  cannot be read, and that `pnpm db:push` fixes it, in the words *For review*
  already uses.
- **`isMissingColumn`** moved to `app/_lib/app/missing-column.ts`, shared by the
  site pulls store (which had its own copy) and this one, with its own test.

**Needs `pnpm db:push` on production** (from `apps/loom`): until then the list
names no goal and says why; nothing else changes.

## Decisions taken

- **A column, not a lookup of the refused proposal.** The held proposal is
  discarded on *Turn down*, so the intent has to be kept at that moment. A
  column on the row already kept per change is the smallest place for it; a
  second table would be one id per row with its own security and migration.
- **No chip rather than *No goal named* for older rows.** A change turned down
  before this has an unknown goal, not none. Saying *No goal named* would be
  invented data.
- **Either read failing names no goal anywhere.** An intent read without its
  goals would otherwise say *No goal named* of a change that named one.
- **No record.** No new screen, name or choice; the chip the wireframe already
  draws, on a list already built.

## Tests

See the pull request for the full `pnpm verify` numbers. New or changed:

- `turned-down.contract.ts` (memory and Postgres): the intent of each change,
  leaving out what is not held; the first record's intent kept when a change is
  turned down twice.
- `postgres.test.ts`: on a table pushed before `intent_id`, a change turned
  down is still remembered and read back for the AI; `intentsOf` fails rather
  than claim no intents; after the push, older rows name none and new ones do.
- `turned-down-list.test.ts`: `turnedDownGoalsOf` names the goal, says none was
  named, and knows nothing of an older change; rows carry their goal.
- `turned-down-card.test.tsx`: the card leads with the chip, says *No goal
  named*, and draws nothing for a goal not recorded.
- `missing-column.test.ts`: knows `42703` however deeply it is wrapped, and
  nothing else.

## Still missing from the wireframes

Everything left waits on the maintainer: what top-bar search finds, a predicted
effect on *For review*, *Stays on it* on *Goals*, and unit 9 (0371, #834).
