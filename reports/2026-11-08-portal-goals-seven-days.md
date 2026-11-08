# Portal run, 8 November 2026: each goal's 7-day rate and its trend on *Goals*

**Unit:** 8b (`docs/portal-wireframes.md`, *3 · Goals*: "the 7-day rate with its trend"). Pull request #812.

## What shipped

- *Goals* has a **Last 7 days** column in place of *Since counting began*: each goal's rate per 100 page views over the last 168 hours on the pages it covers (*8.8 per 100*), the count and page views it rests on, and its change on the 7 days before (*Up 100% on the 7 days before (4.4 per 100)*), in the same words and by the same rules as the primary goal's figure on *Signals* (`goalRangeOf`, `goalRangeWordsOf`). Counting begins with the later of page views and what readers did by hour, and a goal whose counters began inside the week says so.
- What each goal counted since counting began stays, beneath the 7-day figure.
- The hourly counters are read **once for every goal** (page views and what readers did on every part, project-wide), then filtered per goal. Counters that do not answer cost the 7-day figure alone: the row says so and keeps the rest.
- New `(portal)/_lib/goal-counters.ts`, `readGoalCounters(tallies, span, scope)`: the one read every goal-over-a-range figure uses (the primary goal on *Signals*, the *By page* drawer, now *Goals*). `signals/_lib/reading.ts` lost its two copies of the same three reads.

No table, no column, no environment variable, no `pnpm db:push`. No decision record: this draws an existing measure (0350, 0356, 0362) on the screen the wireframe puts it on.

## Tests

- `goal-counters.test.ts`, 5 tests: what is asked for with no scope, a part, or a page; when counting began is always the project's; either counter failing is `undefined`, never a nought.
- `pnpm verify`: 440 files, **7,129 tests passed**; typecheck, build and the prerender check clean.

## Screenshot

`reports/goals-seven-days-wide.webp` (seeded Postgres: two goals, 14 days of hourly counters).

## What is still missing from *3 · Goals*

- *2 waiting · 3 shipped*: how many changes for a goal went live (readable now from `loom_made_changes` and the site pulls; next).
- *Stays on it* as a goal kind (time on a part is not counted by the hour).
- The New goal drawer's page outline picker and its green band previewing the last 7 days.
